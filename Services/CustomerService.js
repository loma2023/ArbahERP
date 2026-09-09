const Customer = require("../Models/CustomerSchema");
const Account = require("../Models/AccountSchema");
const JournalEntry = require("../Models/JournalEntrySchema");
const JournalLine = require("../Models/JournalLineSchema");
const AccountService = require("./AccountService");

async function getNextJournalEntryNo() {
  const lastEntry = await JournalEntry.findOne({
    entryNo: { $regex: /^JV-/ }
  }).sort({ createdAt: -1 }).limit(1);

  if (!lastEntry) return "JV-0001";

  const match = lastEntry.entryNo.match(/JV-(\d+)/);
  if (match) {
    const nextNum = parseInt(match[1]) + 1;
    return "JV-" + String(nextNum).padStart(4, "0");
  }
  return "JV-0001";
}


class CustomerService {
  /**
   * Get all customers with optional filtering
   */
  static async getAllCustomers(filters = {}) {
    const query = { isHidden: false };

    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: "i" } },
        { code: { $regex: filters.search, $options: "i" } },
        { phone: { $regex: filters.search, $options: "i" } }
      ];
    }

    const customers = await Customer.find(query)
      .populate("linkedAccount", "code name currentBalance totalDebits totalCredits")
      .sort({ createdAt: -1 })
      .lean();

    // تحديث currentBalance لكل عميل من الحساب المرتبط
    for (const customer of customers) {
      if (customer.linkedAccount && customer.linkedAccount.currentBalance !== undefined) {
        customer.currentBalance = customer.linkedAccount.currentBalance;
      }
    }

    return customers;
  }

  /**
   * Get customer by ID
   */
  static async getCustomerById(id) {
    const customer = await Customer.findById(id)
      .populate("linkedAccount", "code name currentBalance totalDebits totalCredits");

    if (!customer) {
      throw new Error("العميل غير موجود");
    }

    return customer;
  }

  /**
   * Get customer by code
   */
  static async getCustomerByCode(code) {
    const customer = await Customer.findOne({ code: code.trim(), isHidden: false })
      .populate("linkedAccount", "code name currentBalance");

    if (!customer) {
      throw new Error("العميل غير موجود");
    }

    return customer;
  }

  /**
   * Create new customer + auto-create linked account in Chart of Accounts
   * ✅ FIXED: openingBalance = 0 in linked account, journal entry sets the real balance
   */
  static async createCustomer(data) {
    const {
      code, name, phone, email, taxNumber, commercialReg,
      city, address, openingBalance, balanceType, creditLimit, notes
    } = data;

    // ── التحقق من البيانات ──
    if (!name || !name.trim()) {
      throw new Error("اسم العميل مطلوب");
    }

    // ── التحقق من عدم تكرار الكود ──
    const existingCode = await Customer.findOne({ code: code.trim() });
    if (existingCode) {
      throw new Error("كود العميل " + code + " مستخدم بالفعل");
    }

    // ── التحقق من عدم تكرار الاسم ──
    const existingName = await Customer.findOne({
      name: { $regex: new RegExp("^" + name.trim() + "$", "i") }
    });
    if (existingName) {
      throw new Error("اسم العميل \"" + name + "\" مستخدم بالفعل");
    }

    // ── إنشاء العميل أولا (بدون ربط الحساب) ──
    const customer = await Customer.create({
      code: code.trim(),
      name: name.trim(),
      phone: phone ? phone.trim() : "",
      email: email ? email.trim().toLowerCase() : "",
      taxNumber: taxNumber ? taxNumber.trim() : "",
      commercialReg: commercialReg ? commercialReg.trim() : "",
      city: city ? city.trim() : "",
      address: address ? address.trim() : "",
      openingBalance: parseFloat(openingBalance) || 0,
      balanceType: balanceType || "debit",
      creditLimit: parseFloat(creditLimit) || 0,
      currentBalance: parseFloat(openingBalance) || 0,
      notes: notes ? notes.trim() : "",
      linkedAccount: null,
      linkedAccountCode: null
    });

    // ── إنشاء حساب مرتبط في شجرة الحسابات ──
    let linkedAccount = null;
    try {
      // Check if parent account "1203" exists
      const parentAccount = await Account.findOne({ code: "1203" }).lean();
      if (!parentAccount) {
        throw new Error("حساب الأب '1203 - العملاء' غير موجود في شجرة الحسابات");
      }

      // نولد كود الحساب (مثال: 120301, 120302, 120303...)
      const nextAccountCode = await this.getNextCustomerAccountCode();

      // ✅ FIXED: نمرر openingBalance = 0 للحساب المرتبط
      // القيد الافتتاحي هو اللي هيحدد الرصيد الحقيقي
      linkedAccount = await AccountService.createLinkedAccount("customer", {
        entityId: customer._id,
        entityCode: customer.code,
        entityName: customer.name,
        parentCode: "1203",
        customCode: nextAccountCode,
        openingBalance: 0  // ← ✅ مهم: 0 هنا، القيد هيحدد الرصيد
      });

      // ── تحديث العميل بربط الحساب ──
      customer.linkedAccount = linkedAccount._id;
      customer.linkedAccountCode = linkedAccount.code;
      await customer.save();

      // ── إذا فيه رصيد افتتاحي، نعمل قيد يومية افتتاحي ──
      if (customer.openingBalance > 0) {
        await this.createOpeningJournalEntry(customer, linkedAccount);
      }

    } catch (accountError) {
      // في حالة فشل إنشاء الحساب، نحذف العميل ونرجع الخطأ
      await Customer.findByIdAndDelete(customer._id);
      throw new Error("فشل إنشاء حساب العميل في شجرة الحسابات: " + accountError.message);
    }

    return await Customer.findById(customer._id)
      .populate("linkedAccount", "code name currentBalance");
  }

  /**
   * Get next available customer account code under 1203
   * التسلسل: 120301, 120302, 120303...
   */
  static async getNextCustomerAccountCode() {
    const accounts = await Account.find({
      parentCode: "1203"
    })
      .sort({ code: -1 })
      .limit(1)
      .lean();

    if (accounts.length === 0) {
      return "120301";
    }

    const lastCode = accounts[0].code;
    const lastNum = parseInt(lastCode.slice(-2));
    const baseCode = lastCode.slice(0, -2);

    return baseCode + String(lastNum + 1).padStart(2, "0");
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ✅ FIXED: القيد الافتتاحي الصحيح محاسبياً
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * ✅ FIXED: Create opening journal entry for customer opening balance
   * 
   * المنطق المحاسبي الصحيح:
   * - إذا الرصيد افتتاحي مدين (العميل عليه فلوس = مدينون):
   *   مدين: حساب العميل (1203xx)  ← زيادة مدينون
   *   دائن: رأس مال أرصدة افتتاحية (210106)  ← توازن الميزانية
   * 
   * - إذا الرصيد افتتاحي دائن (العميل مدين لنا = دائنون):
   *   مدين: رأس مال أرصدة افتتاحية (210106)
   *   دائن: حساب العميل (1203xx)
   */
  static async createOpeningJournalEntry(customer, linkedAccount) {
    try {
      const JournalEntry = require("../Models/JournalEntrySchema");
      const JournalLine = require("../Models/JournalLineSchema");

      const openingBalance = parseFloat(customer.openingBalance) || 0;
      if (openingBalance === 0) return;

      const balanceType = customer.balanceType || "debit";

      // ✅ FIXED: استخدام حساب رأس المال الافتتاحي 210106 بدلاً من 210103
      const equityAccount = await Account.findOne({ code: "210106" }).lean();
      if (!equityAccount) {
        throw new Error("حساب '210106 - رأس مال أرصدة افتتاحية' غير موجود في شجرة الحسابات");
      }

      // تحديد المدين والدائن بناءً على نوع الرصيد
      let customerDebit = 0;
      let customerCredit = 0;
      let equityDebit = 0;
      let equityCredit = 0;

      if (balanceType === "debit") {
        // العميل مدين (عليه فلوس)
        customerDebit = openingBalance;
        equityCredit = openingBalance;
      } else {
        // العميل دائن (مدين لنا)
        customerCredit = openingBalance;
        equityDebit = openingBalance;
      }
      const entryNo = await getNextJournalEntryNo();

      // إنشاء القيد الافتتاحي
      const journalEntry = await JournalEntry.create({
        entryNo,
        date: new Date(),
        reference: "OPB-" + customer.code,
        description: "رصيد افتتاحي - " + customer.name,
        type: "opening_balance",
        source: "customer",
        sourceId: customer._id,
        totalDebit: openingBalance,
        totalCredit: openingBalance,
        status: "posted",
        isPosted: true,
        postedAt: new Date()
      });

      // سطر 1: حساب العميل
      await JournalLine.create({
        journalEntry: journalEntry._id,
        account: linkedAccount._id,
        accountCode: linkedAccount.code,
        accountName: linkedAccount.name,
        description: "رصيد افتتاحي - " + customer.name,
        debit: customerDebit,
        credit: customerCredit,
        date: new Date(),
        sortOrder: 1
      });

      // سطر 2: حساب رأس المال الافتتاحي
      await JournalLine.create({
        journalEntry: journalEntry._id,
        account: equityAccount._id,
        accountCode: equityAccount.code,
        accountName: equityAccount.name,
        description: "رصيد افتتاحي - " + customer.name,
        debit: equityDebit,
        credit: equityCredit,
        date: new Date(),
        sortOrder: 2
      });

      // ✅ تحديث أرصدة الحسابات
      await AccountService.updateBalance(linkedAccount._id, customerDebit, customerCredit);
      await AccountService.updateBalance(equityAccount._id, equityDebit, equityCredit);

      // ✅ تحديث رصيد العميل
      const updatedAccount = await Account.findById(linkedAccount._id).lean();
      customer.currentBalance = updatedAccount ? updatedAccount.currentBalance : openingBalance;
      await customer.save();

      console.log("✅ تم إنشاء القيد الافتتاحي للعميل:", customer.name, "- الرصيد:", openingBalance, balanceType);

    } catch (error) {
      console.error("❌ Error creating opening journal entry:", error);
      throw error;
    }
  }

  /**
   * ✅ FIXED: Update opening journal entry for customer
   * 
   * المنطق:
   * 1. نحذف القيد الافتتاحي القديم ونرجع أرصدة الحسابات
   * 2. ننشئ قيد افتتاحي جديد بالرصيد الجديد
   */
  static async updateOpeningJournalEntry(customer, linkedAccount) {
    try {
      const JournalEntry = require("../Models/JournalEntrySchema");
      const JournalLine = require("../Models/JournalLineSchema");

      const newBalance = parseFloat(customer.openingBalance) || 0;
      const newType = customer.balanceType || "debit";

      // ✅ 1. نحذف القيد الافتتاحي القديم ونرجع الأرصدة
      const oldEntries = await JournalEntry.find({
        source: "customer",
        sourceId: customer._id,
        type: "opening_balance"
      }).lean();

      for (const entry of oldEntries) {
        const oldLines = await JournalLine.find({ journalEntry: entry._id }).lean();

        // نرجع أرصدة الحسابات القديمة (عكس الإشارة)
        for (const line of oldLines) {
          if (line.account) {
            await AccountService.updateBalance(
              line.account,
              -(line.debit || 0),
              -(line.credit || 0)
            );
          }
        }

        // نحذف أسطر القيد والقيد نفسه
        await JournalLine.deleteMany({ journalEntry: entry._id });
        await JournalEntry.findByIdAndDelete(entry._id);
      }

      // ✅ 2. لو الرصيد صفر، مفيش قيد جديد
      if (newBalance === 0) {
        // نحدث رصيد الحساب المرتبط
        const account = await Account.findById(linkedAccount._id || linkedAccount);
        if (account) {
          account.openingBalance = 0;
          account.currentBalance = account.normalBalance === "debit"
            ? account.totalDebits - account.totalCredits
            : account.totalCredits - account.totalDebits;
          await account.save();
        }

        customer.currentBalance = account ? account.currentBalance : 0;
        await customer.save();

        return { message: "تم إلغاء الرصيد الافتتاحي" };
      }

      // ✅ 3. ننشئ قيد افتتاحي جديد
      const equityAccount = await Account.findOne({ code: "210106" }).lean();
      if (!equityAccount) {
        throw new Error("حساب '210106 - رأس مال أرصدة افتتاحية' غير موجود");
      }

      let customerDebit = 0;
      let customerCredit = 0;
      let equityDebit = 0;
      let equityCredit = 0;

      if (newType === "debit") {
        customerDebit = newBalance;
        equityCredit = newBalance;
      } else {
        customerCredit = newBalance;
        equityDebit = newBalance;
      }
      const entryNo = await getNextJournalEntryNo();

      const journalEntry = await JournalEntry.create({
        entryNo,
        date: new Date(),
        reference: "OPB-" + customer.code,
        description: "رصيد افتتاحي (معدل) - " + customer.name,
        type: "opening_balance",
        source: "customer",
        sourceId: customer._id,
        totalDebit: newBalance,
        totalCredit: newBalance,
        status: "posted",
        isPosted: true,
        postedAt: new Date()
      });

      await JournalLine.create({
        journalEntry: journalEntry._id,
        account: linkedAccount._id || linkedAccount,
        accountCode: linkedAccount.code || "",
        accountName: linkedAccount.name || customer.name,
        description: "رصيد افتتاحي (معدل) - " + customer.name,
        debit: customerDebit,
        credit: customerCredit,
        date: new Date(),
        sortOrder: 1
      });

      await JournalLine.create({
        journalEntry: journalEntry._id,
        account: equityAccount._id,
        accountCode: equityAccount.code,
        accountName: equityAccount.name,
        description: "رصيد افتتاحي (معدل) - " + customer.name,
        debit: equityDebit,
        credit: equityCredit,
        date: new Date(),
        sortOrder: 2
      });

      // ✅ تحديث أرصدة الحسابات الجديدة
      await AccountService.updateBalance(linkedAccount._id || linkedAccount, customerDebit, customerCredit);
      await AccountService.updateBalance(equityAccount._id, equityDebit, equityCredit);

      // ✅ تحديث رصيد العميل
      const updatedAccount = await Account.findById(linkedAccount._id || linkedAccount).lean();
      customer.currentBalance = updatedAccount ? updatedAccount.currentBalance : newBalance;
      await customer.save();

      return { message: "تم تحديث القيد الافتتاحي بنجاح" };

    } catch (error) {
      console.error("❌ Error updating opening journal entry:", error.message);
      throw error;
    }
  }

  /**
   * Update customer
   */
  static async updateCustomer(id, data) {
    const customer = await Customer.findById(id)
      .populate("linkedAccount", "code name currentBalance totalDebits totalCredits openingBalance normalBalance");

    if (!customer) {
      throw new Error("العميل غير موجود");
    }

    // ── التحقق من عدم تكرار الكود إذا تغير ──
    if (data.code && data.code !== customer.code) {
      const existing = await Customer.findOne({ code: data.code.trim() });
      if (existing) {
        throw new Error("كود العميل " + data.code + " مستخدم بالفعل");
      }
      customer.code = data.code.trim();
    }

    // ── التحقق من عدم تكرار الاسم إذا تغير ──
    if (data.name && data.name !== customer.name) {
      const existing = await Customer.findOne({
        name: { $regex: new RegExp("^" + data.name.trim() + "$", "i") }
      });
      if (existing) {
        throw new Error("اسم العميل \"" + data.name + "\" مستخدم بالفعل");
      }
      customer.name = data.name.trim();
    }

    // ── تحديث الحقول العادية ──
    if (data.phone !== undefined) customer.phone = data.phone.trim();
    if (data.email !== undefined) customer.email = data.email.trim().toLowerCase();
    if (data.taxNumber !== undefined) customer.taxNumber = data.taxNumber.trim();
    if (data.commercialReg !== undefined) customer.commercialReg = data.commercialReg.trim();
    if (data.city !== undefined) customer.city = data.city.trim();
    if (data.address !== undefined) customer.address = data.address.trim();
    if (data.creditLimit !== undefined) customer.creditLimit = parseFloat(data.creditLimit) || 0;
    if (data.notes !== undefined) customer.notes = data.notes.trim();
    if (data.isActive !== undefined) customer.isActive = data.isActive;

    // ── تحديث الرصيد الافتتاحي ──
    const oldOpeningBalance = parseFloat(customer.openingBalance) || 0;
    const oldBalanceType = customer.balanceType || "debit";

    if (data.openingBalance !== undefined) {
      customer.openingBalance = parseFloat(data.openingBalance) || 0;
    }
    if (data.balanceType) {
      customer.balanceType = data.balanceType;
    }

    const newOpeningBalance = parseFloat(customer.openingBalance) || 0;
    const newBalanceType = customer.balanceType || "debit";

    // ── إذا تغير الرصيد الافتتاحي أو نوعه، نحدّث الحساب والقيد ──
    if (data.openingBalance !== undefined || data.balanceType) {
      if (oldOpeningBalance !== newOpeningBalance || oldBalanceType !== newBalanceType) {
        try {
          if (customer.linkedAccount) {
            const account = await Account.findById(customer.linkedAccount._id || customer.linkedAccount);
            if (account) {
              // ✅ تحديث القيد الافتتاحي (يحدث الحساب تلقائياً)
              await this.updateOpeningJournalEntry(customer, account);
            }
          }
        } catch (err) {
          console.error("❌ Error updating opening balance:", err.message);
          throw err;
        }
      }
    }

    await customer.save();

    // ── تحديث اسم الحساب المرتبط إذا تغير اسم العميل ──
    if (data.name && customer.linkedAccount) {
      await Account.findByIdAndUpdate(
        customer.linkedAccount._id || customer.linkedAccount,
        { name: data.name.trim() }
      );
    }

    return await Customer.findById(customer._id)
      .populate("linkedAccount", "code name currentBalance");
  }

  /**
   * ✅ FIXED: Update customer opening balance + sync journal entry & account balance
   */
  static async updateOpeningBalance(id, data) {
    const customer = await Customer.findById(id)
      .populate("linkedAccount", "code name currentBalance totalDebits totalCredits openingBalance normalBalance");

    if (!customer) {
      throw new Error("العميل غير موجود");
    }

    if (!customer.linkedAccount) {
      throw new Error("العميل غير مرتبط بحساب في شجرة الحسابات");
    }

    const newBalance = parseFloat(data.openingBalance) || 0;
    const newType = data.balanceType || customer.balanceType || "debit";
    const oldBalance = parseFloat(customer.openingBalance) || 0;
    const oldType = customer.balanceType || "debit";

    // ── لو مفيش تغيير، نرجع بدون عمل حاجة ──
    if (newBalance === oldBalance && newType === oldType) {
      return {
        message: "لم يحدث تغيير في الرصيد الافتتاحي",
        customerId: customer._id,
        openingBalance: newBalance,
        balanceType: newType
      };
    }

    // ✅ تحديث بيانات العميل
    customer.openingBalance = newBalance;
    customer.balanceType = newType;

    // ✅ تحديث القيد الافتتاحي (يحدث الحساب تلقائياً)
    const account = await Account.findById(customer.linkedAccount._id || customer.linkedAccount);
    await this.updateOpeningJournalEntry(customer, account);

    return {
      message: "تم تعديل الرصيد الافتتاحي وتحديث دفتر الاستاذ بنجاح",
      customerId: customer._id,
      oldBalance,
      newBalance,
      oldType,
      newType
    };
  }

  /**
   * Soft delete customer (hide)
   */
  static async hideCustomer(id) {
    const customer = await Customer.findById(id);
    if (!customer) {
      throw new Error("العميل غير موجود");
    }

    // ── التحقق من عدم وجود حركات مالية ──
    if (customer.linkedAccount) {
      const account = await Account.findById(customer.linkedAccount);
      if (account && (account.totalDebits > 0 || account.totalCredits > 0)) {
        // لو فيه حركات، نعمل إخفاء فقط
        customer.isHidden = true;
        await customer.save();
        return { message: "تم إخفاء العميل (يوجد حركات مالية عليه)", hidden: true };
      }
    }

    // ── إخفاء العميل ──
    customer.isHidden = true;
    customer.isActive = false;
    await customer.save();

    // ── إخفاء الحساب المرتبط ──
    if (customer.linkedAccount) {
      await Account.findByIdAndUpdate(customer.linkedAccount, { isActive: false });
    }

    return { message: "تم إخفاء العميل بنجاح", hidden: true };
  }

  /**
   * Restore hidden customer
   */
  static async restoreCustomer(id) {
    const customer = await Customer.findById(id);
    if (!customer) {
      throw new Error("العميل غير موجود");
    }

    customer.isHidden = false;
    customer.isActive = true;
    await customer.save();

    // ── إعادة تفعيل الحساب المرتبط ──
    if (customer.linkedAccount) {
      await Account.findByIdAndUpdate(customer.linkedAccount, { isActive: true });
    }

    return { message: "تم إظهار العميل بنجاح", restored: true };
  }

  /**
   * Hard delete customer (only if no transactions)
   */
  static async deleteCustomer(id) {
    const customer = await Customer.findById(id);
    if (!customer) {
      throw new Error("العميل غير موجود");
    }

    // ── التحقق من عدم وجود حركات مالية ──
    if (customer.linkedAccount) {
      const account = await Account.findById(customer.linkedAccount);
      if (account && (account.totalDebits > 0 || account.totalCredits > 0)) {
        throw new Error("لا يمكن حذف العميل لوجود حركات مالية مسجلة عليه");
      }

      // ── حذف الحساب المرتبط ──
      await Account.findByIdAndDelete(customer.linkedAccount);
    }

    // ── حذف القيود الافتتاحية المرتبطة ──
    const JournalEntry = require("../Models/JournalEntrySchema");
    await JournalEntry.deleteMany({ source: "customer", sourceId: customer._id });

    // ── حذف العميل ──
    await Customer.findByIdAndDelete(id);

    return { message: "تم حذف العميل نهائياً" };
  }

  /**
   * Search customers
   */
  static async searchCustomers(keyword) {
    const regex = new RegExp(keyword, "i");
    return await Customer.find({
      isHidden: false,
      $or: [
        { name: regex },
        { code: regex },
        { phone: regex }
      ]
    }).populate("linkedAccount", "code name currentBalance")
      .sort({ name: 1 })
      .limit(50);
  }

  /**
   * Get next available customer code
   */
  static async getNextCode() {
    const customers = await Customer.find({})
      .sort({ createdAt: -1 })
      .limit(1);

    if (customers.length === 0) {
      return "CUST-001";
    }

    const lastCode = customers[0].code;
    const match = lastCode.match(/(\d+)/);
    if (match) {
      const lastNumber = parseInt(match[0]);
      return "CUST-" + String(lastNumber + 1).padStart(3, "0");
    }

    return "CUST-" + String(customers.length + 1).padStart(3, "0");
  }

  /**
   * Get customer statistics
   */
  static async getStats() {
    const total = await Customer.countDocuments({ isHidden: false });
    const active = await Customer.countDocuments({ isHidden: false, isActive: true });
    const hidden = await Customer.countDocuments({ isHidden: true });

    // ✅ FIXED: إجمالي المديونيات من currentBalance الحقيقي
    const customers = await Customer.find({ isHidden: false }).lean();
    let totalReceivables = 0;
    customers.forEach(c => {
      const balance = parseFloat(c.currentBalance) || 0;
      if (balance > 0) totalReceivables += balance;
    });

    return {
      total,
      active,
      hidden,
      totalReceivables
    };
  }

  /**
   * Update customer currentBalance from linked account
   */
  static async updateCustomerBalance(customerId) {
    const customer = await Customer.findById(customerId);
    if (!customer || !customer.linkedAccount) return null;

    const account = await Account.findById(customer.linkedAccount).lean();
    if (!account) return null;

    const oldBalance = customer.currentBalance;
    const newBalance = account.currentBalance || 0;

    if (oldBalance !== newBalance) {
      customer.currentBalance = newBalance;
      await customer.save();
    }

    return { customerId, oldBalance, newBalance };
  }

  /**
   * Sync all customers balances from their linked accounts
   */
  static async syncAllBalances() {
    const customers = await Customer.find({ isHidden: false, linkedAccount: { $ne: null } });
    const results = [];

    for (const customer of customers) {
      const account = await Account.findById(customer.linkedAccount).lean();
      if (account) {
        const oldBalance = customer.currentBalance;
        customer.currentBalance = account.currentBalance || 0;
        await customer.save();
        results.push({
          customerId: customer._id,
          name: customer.name,
          oldBalance,
          newBalance: customer.currentBalance
        });
      }
    }

    return results;
  }

  /**
   * Get customer with fresh balance
   */
  static async getCustomerWithBalance(id) {
    const customer = await Customer.findById(id)
      .populate("linkedAccount", "code name currentBalance totalDebits totalCredits");

    if (!customer) {
      throw new Error("العميل غير موجود");
    }

    // تحديث الرصيد من الحساب المرتبط
    if (customer.linkedAccount && customer.linkedAccount.currentBalance !== undefined) {
      customer.currentBalance = customer.linkedAccount.currentBalance;
      await customer.save();
    }

    return customer;
  }
}

module.exports = CustomerService;