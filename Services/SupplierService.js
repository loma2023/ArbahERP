const Supplier = require("../Models/SupplierSchema");
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


class SupplierService {
  /**
   * Get all suppliers with optional filtering
   */
  static async getAllSuppliers(filters = {}) {
    const query = { isHidden: false };

    if (filters.isActive !== undefined) query.isActive = filters.isActive;
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: "i" } },
        { code: { $regex: filters.search, $options: "i" } },
        { phone: { $regex: filters.search, $options: "i" } }
      ];
    }

    const suppliers = await Supplier.find(query)
      .populate("linkedAccount", "code name currentBalance totalDebits totalCredits")
      .sort({ createdAt: -1 })
      .lean();

    // تحديث currentBalance لكل مورد من الحساب المرتبط
    for (const supplier of suppliers) {
      if (supplier.linkedAccount && supplier.linkedAccount.currentBalance !== undefined) {
        supplier.currentBalance = supplier.linkedAccount.currentBalance;
      }
    }

    return suppliers;
  }

  /**
   * Get supplier by ID
   */
  static async getSupplierById(id) {
    const supplier = await Supplier.findById(id)
      .populate("linkedAccount", "code name currentBalance totalDebits totalCredits");

    if (!supplier) {
      throw new Error("المورد غير موجود");
    }

    return supplier;
  }

  /**
   * Get supplier by code
   */
  static async getSupplierByCode(code) {
    const supplier = await Supplier.findOne({ code: code.trim(), isHidden: false })
      .populate("linkedAccount", "code name currentBalance");

    if (!supplier) {
      throw new Error("المورد غير موجود");
    }

    return supplier;
  }

  /**
   * Create new supplier + auto-create linked account in Chart of Accounts
   * ✅ FIXED: openingBalance = 0 in linked account, journal entry sets the real balance
   */
  static async createSupplier(data) {
    const {
      code, name, phone, email, taxNumber, commercialReg,
      city, address, openingBalance, balanceType, creditLimit, notes
    } = data;

    // ── التحقق من البيانات ──
    if (!name || !name.trim()) {
      throw new Error("اسم المورد مطلوب");
    }

    // ── التحقق من عدم تكرار الكود ──
    const existingCode = await Supplier.findOne({ code: code.trim() });
    if (existingCode) {
      throw new Error("كود المورد " + code + " مستخدم بالفعل");
    }

    // ── التحقق من عدم تكرار الاسم ──
    const existingName = await Supplier.findOne({
      name: { $regex: new RegExp("^" + name.trim() + "$", "i") }
    });
    if (existingName) {
      throw new Error("اسم المورد \"" + name + "\" مستخدم بالفعل");
    }

    // ── إنشاء المورد أولا (بدون ربط الحساب) ──
    const supplier = await Supplier.create({
      code: code.trim(),
      name: name.trim(),
      phone: phone ? phone.trim() : "",
      email: email ? email.trim().toLowerCase() : "",
      taxNumber: taxNumber ? taxNumber.trim() : "",
      commercialReg: commercialReg ? commercialReg.trim() : "",
      city: city ? city.trim() : "",
      address: address ? address.trim() : "",
      openingBalance: parseFloat(openingBalance) || 0,
      balanceType: balanceType || "credit",
      creditLimit: parseFloat(creditLimit) || 0,
      currentBalance: parseFloat(openingBalance) || 0,
      notes: notes ? notes.trim() : "",
      linkedAccount: null,
      linkedAccountCode: null
    });

    // ── إنشاء حساب مرتبط في شجرة الحسابات ──
    let linkedAccount = null;
    try {
      // Check if parent account "2301" exists
      const parentAccount = await Account.findOne({ code: "2301" }).lean();
      if (!parentAccount) {
        throw new Error("حساب الأب '2301 - الموردين' غير موجود في شجرة الحسابات");
      }

      // نولد كود الحساب (مثال: 230101, 230102, 230103...)
      const nextAccountCode = await this.getNextSupplierAccountCode();

      // ✅ FIXED: نمرر openingBalance = 0 للحساب المرتبط
      // القيد الافتتاحي هو اللي هيحدد الرصيد الحقيقي
      linkedAccount = await AccountService.createLinkedAccount("supplier", {
        entityId: supplier._id,
        entityCode: supplier.code,
        entityName: supplier.name,
        parentCode: "2301",
        customCode: nextAccountCode,
        openingBalance: 0  // ← ✅ مهم: 0 هنا، القيد هيحدد الرصيد
      });

      // ── تحديث المورد بربط الحساب ──
      supplier.linkedAccount = linkedAccount._id;
      supplier.linkedAccountCode = linkedAccount.code;
      await supplier.save();

      // ── إذا فيه رصيد افتتاحي، نعمل قيد يومية افتتاحي ──
      if (supplier.openingBalance > 0) {
        await this.createOpeningJournalEntry(supplier, linkedAccount);
      }

    } catch (accountError) {
      // في حالة فشل إنشاء الحساب، نحذف المورد ونرجع الخطأ
      await Supplier.findByIdAndDelete(supplier._id);
      throw new Error("فشل إنشاء حساب المورد في شجرة الحسابات: " + accountError.message);
    }

    return await Supplier.findById(supplier._id)
      .populate("linkedAccount", "code name currentBalance");
  }

  /**
   * Get next available supplier account code under 2301
   * التسلسل: 120301, 120302, 120303...
   */
  static async getNextSupplierAccountCode() {
    const accounts = await Account.find({
      parentCode: "2301"
    })
      .sort({ code: -1 })
      .limit(1)
      .lean();

    if (accounts.length === 0) {
      return "230101";
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
   * ✅ FIXED: Create opening journal entry for supplier opening balance
   * 
   * المنطق المحاسبي الصحيح:
   * - إذا الرصيد افتتاحي مدين (دفعة مقدمة للمورد - غير طبيعي):
   *   مدين: حساب المورد (2301xx)  ← نقص التزام
   *   دائن: رأس مال أرصدة افتتاحية (210106)  ← توازن الميزانية
   * 
   * - إذا الرصيد افتتاحي دائن (مستحق للمورد - الطبيعي):
   *   مدين: رأس مال أرصدة افتتاحية (210106)
   *   دائن: حساب المورد (2301xx)  ← زيادة التزام
   */
  static async createOpeningJournalEntry(supplier, linkedAccount) {
    try {
      const JournalEntry = require("../Models/JournalEntrySchema");
      const JournalLine = require("../Models/JournalLineSchema");

      const openingBalance = parseFloat(supplier.openingBalance) || 0;
      if (openingBalance === 0) return;

      const balanceType = supplier.balanceType || "debit";

      // ✅ FIXED: استخدام حساب رأس المال الافتتاحي 210106 بدلاً من 210103
      const equityAccount = await Account.findOne({ code: "210106" }).lean();
      if (!equityAccount) {
        throw new Error("حساب '210106 - رأس مال أرصدة افتتاحية' غير موجود في شجرة الحسابات");
      }

      // تحديد المدين والدائن بناءً على نوع الرصيد
      let supplierDebit = 0;
      let supplierCredit = 0;
      let equityDebit = 0;
      let equityCredit = 0;

      if (balanceType === "debit") {
        // دفعة مقدمة للمورد (مدين - غير طبيعي)
        supplierDebit = openingBalance;
        equityCredit = openingBalance;
      } else {
        // مستحق للمورد (دائن - الطبيعي)
        supplierCredit = openingBalance;
        equityDebit = openingBalance;
      }
      const entryNo = await getNextJournalEntryNo();

      // إنشاء القيد الافتتاحي
      const journalEntry = await JournalEntry.create({
        entryNo,
        date: new Date(),
        reference: "OPB-" + supplier.code,
        description: "رصيد افتتاحي - " + supplier.name,
        type: "opening_balance",
        source: "supplier",
        sourceId: supplier._id,
        totalDebit: openingBalance,
        totalCredit: openingBalance,
        status: "posted",
        isPosted: true,
        postedAt: new Date()
      });

      // سطر 1: حساب المورد
      await JournalLine.create({
        journalEntry: journalEntry._id,
        account: linkedAccount._id,
        accountCode: linkedAccount.code,
        accountName: linkedAccount.name,
        description: "رصيد افتتاحي - " + supplier.name,
        debit: supplierDebit,
        credit: supplierCredit,
        date: new Date(),
        sortOrder: 1
      });

      // سطر 2: حساب رأس المال الافتتاحي
      await JournalLine.create({
        journalEntry: journalEntry._id,
        account: equityAccount._id,
        accountCode: equityAccount.code,
        accountName: equityAccount.name,
        description: "رصيد افتتاحي - " + supplier.name,
        debit: equityDebit,
        credit: equityCredit,
        date: new Date(),
        sortOrder: 2
      });

      // ✅ تحديث أرصدة الحسابات
      await AccountService.updateBalance(linkedAccount._id, supplierDebit, supplierCredit);
      await AccountService.updateBalance(equityAccount._id, equityDebit, equityCredit);

      // ✅ تحديث رصيد المورد
      const updatedAccount = await Account.findById(linkedAccount._id).lean();
      supplier.currentBalance = updatedAccount ? updatedAccount.currentBalance : openingBalance;
      await supplier.save();

      console.log("✅ تم إنشاء القيد الافتتاحي للمورد:", supplier.name, "- الرصيد:", openingBalance, balanceType);

    } catch (error) {
      console.error("❌ Error creating opening journal entry:", error);
      throw error;
    }
  }

  /**
   * ✅ FIXED: Update opening journal entry for supplier
   * 
   * المنطق:
   * 1. نحذف القيد الافتتاحي القديم ونرجع أرصدة الحسابات
   * 2. ننشئ قيد افتتاحي جديد بالرصيد الجديد
   */
  static async updateOpeningJournalEntry(supplier, linkedAccount) {
    try {
      const JournalEntry = require("../Models/JournalEntrySchema");
      const JournalLine = require("../Models/JournalLineSchema");

      const newBalance = parseFloat(supplier.openingBalance) || 0;
      const newType = supplier.balanceType || "debit";

      // ✅ 1. نحذف القيد الافتتاحي القديم ونرجع الأرصدة
      const oldEntries = await JournalEntry.find({
        source: "supplier",
        sourceId: supplier._id,
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

        supplier.currentBalance = account ? account.currentBalance : 0;
        await supplier.save();

        return { message: "تم إلغاء الرصيد الافتتاحي" };
      }

      // ✅ 3. ننشئ قيد افتتاحي جديد
      const equityAccount = await Account.findOne({ code: "210106" }).lean();
      if (!equityAccount) {
        throw new Error("حساب '210106 - رأس مال أرصدة افتتاحية' غير موجود");
      }

      let supplierDebit = 0;
      let supplierCredit = 0;
      let equityDebit = 0;
      let equityCredit = 0;

      if (newType === "debit") {
        // دفعة مقدمة للمورد
        supplierDebit = newBalance;
        equityCredit = newBalance;
      } else {
        // مستحق للمورد (الطبيعي)
        supplierCredit = newBalance;
        equityDebit = newBalance;
      }
      const entryNo = await getNextJournalEntryNo();

      const journalEntry = await JournalEntry.create({
        entryNo,
        date: new Date(),
        reference: "OPB-" + supplier.code,
        description: "رصيد افتتاحي (معدل) - " + supplier.name,
        type: "opening_balance",
        source: "supplier",
        sourceId: supplier._id,
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
        accountName: linkedAccount.name || supplier.name,
        description: "رصيد افتتاحي (معدل) - " + supplier.name,
        debit: supplierDebit,
        credit: supplierCredit,
        date: new Date(),
        sortOrder: 1
      });

      await JournalLine.create({
        journalEntry: journalEntry._id,
        account: equityAccount._id,
        accountCode: equityAccount.code,
        accountName: equityAccount.name,
        description: "رصيد افتتاحي (معدل) - " + supplier.name,
        debit: equityDebit,
        credit: equityCredit,
        date: new Date(),
        sortOrder: 2
      });

      // ✅ تحديث أرصدة الحسابات الجديدة
      await AccountService.updateBalance(linkedAccount._id || linkedAccount, supplierDebit, supplierCredit);
      await AccountService.updateBalance(equityAccount._id, equityDebit, equityCredit);

      // ✅ تحديث رصيد المورد
      const updatedAccount = await Account.findById(linkedAccount._id || linkedAccount).lean();
      supplier.currentBalance = updatedAccount ? updatedAccount.currentBalance : newBalance;
      await supplier.save();

      return { message: "تم تحديث القيد الافتتاحي بنجاح" };

    } catch (error) {
      console.error("❌ Error updating opening journal entry:", error.message);
      throw error;
    }
  }

  /**
   * Update supplier
   */
  static async updateSupplier(id, data) {
    const supplier = await Supplier.findById(id)
      .populate("linkedAccount", "code name currentBalance totalDebits totalCredits openingBalance normalBalance");

    if (!supplier) {
      throw new Error("المورد غير موجود");
    }

    // ── التحقق من عدم تكرار الكود إذا تغير ──
    if (data.code && data.code !== supplier.code) {
      const existing = await Supplier.findOne({ code: data.code.trim() });
      if (existing) {
        throw new Error("كود المورد " + data.code + " مستخدم بالفعل");
      }
      supplier.code = data.code.trim();
    }

    // ── التحقق من عدم تكرار الاسم إذا تغير ──
    if (data.name && data.name !== supplier.name) {
      const existing = await Supplier.findOne({
        name: { $regex: new RegExp("^" + data.name.trim() + "$", "i") }
      });
      if (existing) {
        throw new Error("اسم المورد \"" + data.name + "\" مستخدم بالفعل");
      }
      supplier.name = data.name.trim();
    }

    // ── تحديث الحقول العادية ──
    if (data.phone !== undefined) supplier.phone = data.phone.trim();
    if (data.email !== undefined) supplier.email = data.email.trim().toLowerCase();
    if (data.taxNumber !== undefined) supplier.taxNumber = data.taxNumber.trim();
    if (data.commercialReg !== undefined) supplier.commercialReg = data.commercialReg.trim();
    if (data.city !== undefined) supplier.city = data.city.trim();
    if (data.address !== undefined) supplier.address = data.address.trim();
    if (data.creditLimit !== undefined) supplier.creditLimit = parseFloat(data.creditLimit) || 0;
    if (data.notes !== undefined) supplier.notes = data.notes.trim();
    if (data.isActive !== undefined) supplier.isActive = data.isActive;

    // ── تحديث الرصيد الافتتاحي ──
    const oldOpeningBalance = parseFloat(supplier.openingBalance) || 0;
    const oldBalanceType = supplier.balanceType || "debit";

    if (data.openingBalance !== undefined) {
      supplier.openingBalance = parseFloat(data.openingBalance) || 0;
    }
    if (data.balanceType) {
      supplier.balanceType = data.balanceType;
    }

    const newOpeningBalance = parseFloat(supplier.openingBalance) || 0;
    const newBalanceType = supplier.balanceType || "debit";

    // ── إذا تغير الرصيد الافتتاحي أو نوعه، نحدّث الحساب والقيد ──
    if (data.openingBalance !== undefined || data.balanceType) {
      if (oldOpeningBalance !== newOpeningBalance || oldBalanceType !== newBalanceType) {
        try {
          if (supplier.linkedAccount) {
            const account = await Account.findById(supplier.linkedAccount._id || supplier.linkedAccount);
            if (account) {
              // ✅ تحديث القيد الافتتاحي (يحدث الحساب تلقائياً)
              await this.updateOpeningJournalEntry(supplier, account);
            }
          }
        } catch (err) {
          console.error("❌ Error updating opening balance:", err.message);
          throw err;
        }
      }
    }

    await supplier.save();

    // ── تحديث اسم الحساب المرتبط إذا تغير اسم المورد ──
    if (data.name && supplier.linkedAccount) {
      await Account.findByIdAndUpdate(
        supplier.linkedAccount._id || supplier.linkedAccount,
        { name: data.name.trim() }
      );
    }

    return await Supplier.findById(supplier._id)
      .populate("linkedAccount", "code name currentBalance");
  }

  /**
   * ✅ FIXED: Update supplier opening balance + sync journal entry & account balance
   */
  static async updateOpeningBalance(id, data) {
    const supplier = await Supplier.findById(id)
      .populate("linkedAccount", "code name currentBalance totalDebits totalCredits openingBalance normalBalance");

    if (!supplier) {
      throw new Error("المورد غير موجود");
    }

    if (!supplier.linkedAccount) {
      throw new Error("المورد غير مرتبط بحساب في شجرة الحسابات");
    }

    const newBalance = parseFloat(data.openingBalance) || 0;
    const newType = data.balanceType || supplier.balanceType || "debit";
    const oldBalance = parseFloat(supplier.openingBalance) || 0;
    const oldType = supplier.balanceType || "debit";

    // ── لو مفيش تغيير، نرجع بدون عمل حاجة ──
    if (newBalance === oldBalance && newType === oldType) {
      return {
        message: "لم يحدث تغيير في الرصيد الافتتاحي",
        supplierId: supplier._id,
        openingBalance: newBalance,
        balanceType: newType
      };
    }

    // ✅ تحديث بيانات المورد
    supplier.openingBalance = newBalance;
    supplier.balanceType = newType;

    // ✅ تحديث القيد الافتتاحي (يحدث الحساب تلقائياً)
    const account = await Account.findById(supplier.linkedAccount._id || supplier.linkedAccount);
    await this.updateOpeningJournalEntry(supplier, account);

    return {
      message: "تم تعديل الرصيد الافتتاحي وتحديث دفتر الاستاذ بنجاح",
      supplierId: supplier._id,
      oldBalance,
      newBalance,
      oldType,
      newType
    };
  }

  /**
   * Soft delete supplier (hide)
   */
  static async hideSupplier(id) {
    const supplier = await Supplier.findById(id);
    if (!supplier) {
      throw new Error("المورد غير موجود");
    }

    // ── التحقق من عدم وجود حركات مالية ──
    if (supplier.linkedAccount) {
      const account = await Account.findById(supplier.linkedAccount);
      if (account && (account.totalDebits > 0 || account.totalCredits > 0)) {
        // لو فيه حركات، نعمل إخفاء فقط
        supplier.isHidden = true;
        await supplier.save();
        return { message: "تم إخفاء المورد (يوجد حركات مالية عليه)", hidden: true };
      }
    }

    // ── إخفاء المورد ──
    supplier.isHidden = true;
    supplier.isActive = false;
    await supplier.save();

    // ── إخفاء الحساب المرتبط ──
    if (supplier.linkedAccount) {
      await Account.findByIdAndUpdate(supplier.linkedAccount, { isActive: false });
    }

    return { message: "تم إخفاء المورد بنجاح", hidden: true };
  }

  /**
   * Restore hidden supplier
   */
  static async restoreSupplier(id) {
    const supplier = await Supplier.findById(id);
    if (!supplier) {
      throw new Error("المورد غير موجود");
    }

    supplier.isHidden = false;
    supplier.isActive = true;
    await supplier.save();

    // ── إعادة تفعيل الحساب المرتبط ──
    if (supplier.linkedAccount) {
      await Account.findByIdAndUpdate(supplier.linkedAccount, { isActive: true });
    }

    return { message: "تم إظهار المورد بنجاح", restored: true };
  }

  /**
   * Hard delete supplier (only if no transactions)
   */
  static async deleteSupplier(id) {
    const supplier = await Supplier.findById(id);
    if (!supplier) {
      throw new Error("المورد غير موجود");
    }

    // ── التحقق من عدم وجود حركات مالية ──
    if (supplier.linkedAccount) {
      const account = await Account.findById(supplier.linkedAccount);
      if (account && (account.totalDebits > 0 || account.totalCredits > 0)) {
        throw new Error("لا يمكن حذف المورد لوجود حركات مالية مسجلة عليه");
      }

      // ── حذف الحساب المرتبط ──
      await Account.findByIdAndDelete(supplier.linkedAccount);
    }

    // ── حذف القيود الافتتاحية المرتبطة ──
    const JournalEntry = require("../Models/JournalEntrySchema");
    await JournalEntry.deleteMany({ source: "supplier", sourceId: supplier._id });

    // ── حذف المورد ──
    await Supplier.findByIdAndDelete(id);

    return { message: "تم حذف المورد نهائياً" };
  }

  /**
   * Search suppliers
   */
  static async searchSuppliers(keyword) {
    const regex = new RegExp(keyword, "i");
    return await Supplier.find({
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
   * Get next available supplier code
   */
  static async getNextCode() {
    const suppliers = await Supplier.find({})
      .sort({ createdAt: -1 })
      .limit(1);

    if (suppliers.length === 0) {
      return "SUPP-001";
    }

    const lastCode = suppliers[0].code;
    const match = lastCode.match(/(\d+)/);
    if (match) {
      const lastNumber = parseInt(match[0]);
      return "SUPP-" + String(lastNumber + 1).padStart(3, "0");
    }

    return "SUPP-" + String(suppliers.length + 1).padStart(3, "0");
  }

  /**
   * Get supplier statistics
   */
  static async getStats() {
    const total = await Supplier.countDocuments({ isHidden: false });
    const active = await Supplier.countDocuments({ isHidden: false, isActive: true });
    const hidden = await Supplier.countDocuments({ isHidden: true });

    // ✅ FIXED: إجمالي المديونيات من currentBalance الحقيقي
    const suppliers = await Supplier.find({ isHidden: false }).lean();
    let totalPayables = 0;
    suppliers.forEach(c => {
      const balance = parseFloat(c.currentBalance) || 0;
      if (balance > 0) totalPayables += balance;
    });

    return {
      total,
      active,
      hidden,
      totalPayables
    };
  }

  /**
   * Update supplier currentBalance from linked account
   */
  static async updateSupplierBalance(supplierId) {
    const supplier = await Supplier.findById(supplierId);
    if (!supplier || !supplier.linkedAccount) return null;

    const account = await Account.findById(supplier.linkedAccount).lean();
    if (!account) return null;

    const oldBalance = supplier.currentBalance;
    const newBalance = account.currentBalance || 0;

    if (oldBalance !== newBalance) {
      supplier.currentBalance = newBalance;
      await supplier.save();
    }

    return { supplierId, oldBalance, newBalance };
  }

  /**
   * Sync all suppliers balances from their linked accounts
   */
  static async syncAllBalances() {
    const suppliers = await Supplier.find({ isHidden: false, linkedAccount: { $ne: null } });
    const results = [];

    for (const supplier of suppliers) {
      const account = await Account.findById(supplier.linkedAccount).lean();
      if (account) {
        const oldBalance = supplier.currentBalance;
        supplier.currentBalance = account.currentBalance || 0;
        await supplier.save();
        results.push({
          supplierId: supplier._id,
          name: supplier.name,
          oldBalance,
          newBalance: supplier.currentBalance
        });
      }
    }

    return results;
  }

  /**
   * Get supplier with fresh balance
   */
  static async getSupplierWithBalance(id) {
    const supplier = await Supplier.findById(id)
      .populate("linkedAccount", "code name currentBalance totalDebits totalCredits");

    if (!supplier) {
      throw new Error("المورد غير موجود");
    }

    // تحديث الرصيد من الحساب المرتبط
    if (supplier.linkedAccount && supplier.linkedAccount.currentBalance !== undefined) {
      supplier.currentBalance = supplier.linkedAccount.currentBalance;
      await supplier.save();
    }

    return supplier;
  }
}

module.exports = SupplierService;