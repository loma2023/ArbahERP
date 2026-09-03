const Bank = require("../Models/BankSchema");
const Account = require("../Models/AccountSchema");
const JournalEntry = require("../Models/JournalEntrySchema");
const JournalLine = require("../Models/JournalLineSchema");
const AccountService = require("./AccountService");
const mongoose = require("mongoose");

// =============================================
// HELPERS
// =============================================

/**
 * Escape regex special characters
 */
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Validate required fields for bank creation
 */
const validateBankData = (data) => {
    const { name } = data;

    if (!name || !name.trim()) {
        throw new Error("اسم البنك مطلوب");
    }
};

/**
 * Check for duplicate code
 */
const checkDuplicateCode = async (code, excludeId = null) => {
    const query = { code: code.trim() };
    if (excludeId) {
        query._id = { $ne: excludeId };
    }
    const existing = await Bank.findOne(query);
    if (existing) {
        throw new Error(`كود البنك ${code} مستخدم بالفعل`);
    }
};

/**
 * Check for duplicate name
 */
const checkDuplicateName = async (name, excludeId = null) => {
    const query = {
        name: { $regex: new RegExp("^" + escapeRegex(name.trim()) + "$", "i") }
    };
    if (excludeId) {
        query._id = { $ne: excludeId };
    }
    const existing = await Bank.findOne(query);
    if (existing) {
        throw new Error(`اسم البنك "${name}" مستخدم بالفعل`);
    }
};

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

/**
 * Get next available bank account code under 1202
 * التسلسل: 120201, 120202, 120203...
 */
const getNextBankAccountCode = async () => {
    const accounts = await Account.find({
        parentCode: "1202"
    })
        .sort({ code: -1 })
        .limit(1)
        .lean();

    if (accounts.length === 0) {
        return "120201";
    }

    const lastCode = accounts[0].code;
    const prefix = lastCode.substring(0, 4); // "1202"
    const num = parseInt(lastCode.substring(4), 10);

    return prefix + String(num + 1).padStart(2, "0");
};

// =============================================
// CREATE
// =============================================
exports.createBank = async (data) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const {
            code, name, branch, accountNo, accountNumber, iban,
            openingBalance, balanceType, status, notes
        } = data;

        // Map accountNumber to accountNo if needed (frontend might send accountNumber)
        const finalAccountNo = accountNo || accountNumber || "";

        // ── التحقق من البيانات ──
        validateBankData(data);

        // ── التحقق من عدم التكرار ──
        await checkDuplicateCode(code);
        await checkDuplicateName(name);

        // ── إنشاء البنك أولاً (بدون ربط الحساب) ──
        const [bank] = await Bank.create([{
            code: code.trim(),
            name: name.trim(),
            branch: branch || null,
            accountNo: accountNo ? accountNo.trim() : "",
            iban: iban ? iban.trim() : "",
            openingBalance: parseFloat(openingBalance) || 0,
            balanceType: balanceType || "debit",
            status: status || "active",
            currentBalance: parseFloat(openingBalance) || 0,
            notes: notes ? notes.trim() : "",
            linkedAccount: null,
            linkedAccountCode: null
        }], { session });

        // ── إنشاء حساب مرتبط في شجرة الحسابات ──
        // Check if parent account "1202" (النقدية بالبنك) exists
        const parentAccount = await Account.findOne({ code: "1202" }).lean();
        if (!parentAccount) {
            throw new Error("حساب الأب '1202 - النقدية بالبنك' غير موجود في شجرة الحسابات");
        }

        // نولد كود الحساب (مثال: 120201, 120202, 120203...)
        const nextAccountCode = await getNextBankAccountCode();

        // ✅ FIXED: openingBalance = 0 — القيد الافتتاحي هو اللي هيحدد الرصيد
        const linkedAccount = await AccountService.createLinkedAccount("bank", {
            entityId: bank._id,
            entityCode: bank.code,
            entityName: bank.name,
            parentCode: "1202",
            customCode: nextAccountCode,
            openingBalance: 0  // ← ✅ مهم: 0 هنا، القيد هيحدد الرصيد
        });

        // ── تحديث البنك بربط الحساب ──
        bank.linkedAccount = linkedAccount._id;
        bank.linkedAccountCode = linkedAccount.code;
        await bank.save({ session });

        // ── إنشاء قيد يومية افتتاحي لو فيه رصيد ──
        if (bank.openingBalance > 0) {
            await createOpeningJournalEntry(bank, linkedAccount, session);
        }

        await session.commitTransaction();

        return await Bank.findById(bank._id)
            .populate("linkedAccount", "code name currentBalance")
            .populate("branch", "name code");

    } catch (error) {
        await session.abortTransaction();
        throw new Error("فشل إنشاء البنك: " + error.message);
    } finally {
        session.endSession();
    }
};

// =============================================
// ✅ FIXED: CREATE OPENING JOURNAL ENTRY
// =============================================
const createOpeningJournalEntry = async (bank, linkedAccount, session) => {
    try {
        const JournalEntry = require("../Models/JournalEntrySchema");
        const JournalLine = require("../Models/JournalLineSchema");

        const openingBalance = parseFloat(bank.openingBalance) || 0;
        if (openingBalance === 0) return;

        const balanceType = bank.balanceType || "debit";

        // ✅ FIXED: استخدام 210106 بدل 210103
        const equityAccount = await Account.findOne({ code: "210106" }).lean();
        if (!equityAccount) {
            throw new Error("حساب '210106 - رأس مال أرصدة افتتاحية' غير موجود في شجرة الحسابات");
        }

        // تحديد المدين والدائن بناءً على نوع الرصيد
        let bankDebit = 0;
        let bankCredit = 0;
        let equityDebit = 0;
        let equityCredit = 0;

        if (balanceType === "debit") {
            // البنك مدين (فلوس موجودة)
            bankDebit = openingBalance;
            equityCredit = openingBalance;
        } else {
            // البنك دائن (سلبية - نادر)
            bankCredit = openingBalance;
            equityDebit = openingBalance;
        }
        const entryNo = await getNextJournalEntryNo();

        const [journalEntry] = await JournalEntry.create([{
            entryNo,
            date: new Date(),
            reference: "OPB-BANK-" + bank.code,
            description: "رصيد افتتاحي - " + bank.name,
            type: "opening_balance",
            source: "bank",
            sourceId: bank._id,
            totalDebit: openingBalance,
            totalCredit: openingBalance,
            status: "posted",
            isPosted: true,
            postedAt: new Date()
        }], { session });

        // سطر 1: حساب البنك
        await JournalLine.create([{
            journalEntry: journalEntry._id,
            account: linkedAccount._id,
            accountCode: linkedAccount.code,
            accountName: linkedAccount.name,
            description: "رصيد افتتاحي - " + bank.name,
            debit: bankDebit,
            credit: bankCredit,
            date: new Date(),
            sortOrder: 1
        }], { session });

        // سطر 2: حساب رأس المال الافتتاحي
        await JournalLine.create([{
            journalEntry: journalEntry._id,
            account: equityAccount._id,
            accountCode: equityAccount.code,
            accountName: equityAccount.name,
            description: "رصيد افتتاحي - " + bank.name,
            debit: equityDebit,
            credit: equityCredit,
            date: new Date(),
            sortOrder: 2
        }], { session });

        // ✅ تحديث أرصدة الحسابات
        await AccountService.updateBalance(linkedAccount._id, bankDebit, bankCredit);
        await AccountService.updateBalance(equityAccount._id, equityDebit, equityCredit);

        // ── تحديث رصيد البنك في BankSchema ──
        const updatedAccount = await Account.findById(linkedAccount._id).lean();
        bank.currentBalance = updatedAccount ? updatedAccount.currentBalance : openingBalance;
        await bank.save({ session });

    } catch (error) {
        console.error("❌ Error creating opening journal entry:", error.message);
        throw error;
    }
};

// =============================================
// ✅ FIXED: UPDATE OPENING JOURNAL ENTRY
// =============================================
const updateBankOpeningJournalEntry = async (bank, linkedAccount) => {
    try {
        const JournalEntry = require("../Models/JournalEntrySchema");
        const JournalLine = require("../Models/JournalLineSchema");

        const newBalance = parseFloat(bank.openingBalance) || 0;
        const newType = bank.balanceType || "debit";

        // ✅ 1. نحذف القيد الافتتاحي القديم ونرجع الأرصدة
        const oldEntries = await JournalEntry.find({
            source: "bank",
            sourceId: bank._id,
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

            await JournalLine.deleteMany({ journalEntry: entry._id });
            await JournalEntry.findByIdAndDelete(entry._id);
        }

        // ✅ 2. لو الرصيد صفر، مفيش قيد جديد
        if (newBalance === 0) {
            const account = await Account.findById(linkedAccount._id || linkedAccount);
            if (account) {
                account.openingBalance = 0;
                account.currentBalance = account.normalBalance === "debit"
                    ? account.totalDebits - account.totalCredits
                    : account.totalCredits - account.totalDebits;
                await account.save();
            }
            bank.currentBalance = account ? account.currentBalance : 0;
            await bank.save();
            return { message: "تم إلغاء الرصيد الافتتاحي" };
        }

        // ✅ 3. ننشئ قيد افتتاحي جديد
        const equityAccount = await Account.findOne({ code: "210106" }).lean();
        if (!equityAccount) {
            throw new Error("حساب '210106 - رأس مال أرصدة افتتاحية' غير موجود");
        }

        let bankDebit = 0;
        let bankCredit = 0;
        let equityDebit = 0;
        let equityCredit = 0;

        if (newType === "debit") {
            bankDebit = newBalance;
            equityCredit = newBalance;
        } else {
            bankCredit = newBalance;
            equityDebit = newBalance;
        }
        const entryNo = await getNextJournalEntryNo();

        const journalEntry = await JournalEntry.create({
            entryNo,
            date: new Date(),
            reference: "OPB-BANK-" + bank.code,
            description: "رصيد افتتاحي (معدل) - " + bank.name,
            type: "opening_balance",
            source: "bank",
            sourceId: bank._id,
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
            accountName: linkedAccount.name || bank.name,
            description: "رصيد افتتاحي (معدل) - " + bank.name,
            debit: bankDebit,
            credit: bankCredit,
            date: new Date(),
            sortOrder: 1
        });

        await JournalLine.create({
            journalEntry: journalEntry._id,
            account: equityAccount._id,
            accountCode: equityAccount.code,
            accountName: equityAccount.name,
            description: "رصيد افتتاحي (معدل) - " + bank.name,
            debit: equityDebit,
            credit: equityCredit,
            date: new Date(),
            sortOrder: 2
        });

        // ✅ تحديث أرصدة الحسابات الجديدة
        await AccountService.updateBalance(linkedAccount._id || linkedAccount, bankDebit, bankCredit);
        await AccountService.updateBalance(equityAccount._id, equityDebit, equityCredit);

        // ✅ تحديث رصيد البنك
        const updatedAccount = await Account.findById(linkedAccount._id || linkedAccount).lean();
        bank.currentBalance = updatedAccount ? updatedAccount.currentBalance : newBalance;
        await bank.save();

        return { message: "تم تحديث القيد الافتتاحي بنجاح" };

    } catch (error) {
        console.error("❌ Error updating opening journal entry:", error.message);
        throw error;
    }
};

// =============================================
// LIST
// =============================================
exports.getAllBanks = async (filters = {}) => {
    const query = { isHidden: { $ne: true } };

    if (filters.status) query.status = filters.status;
    if (filters.search) {
        query.$or = [
            { name: { $regex: filters.search, $options: "i" } },
            { code: { $regex: filters.search, $options: "i" } }
        ];
    }

    const banks = await Bank.find(query)
        .populate("linkedAccount", "code name currentBalance totalDebits totalCredits")
        .populate("branch", "name code")
        .sort({ createdAt: -1 })
        .lean();

    // ✅ تحديث currentBalance لكل بنك من الحساب المرتبط
    for (const bank of banks) {
        if (bank.linkedAccount && bank.linkedAccount.currentBalance !== undefined) {
            bank.currentBalance = bank.linkedAccount.currentBalance;
        }
    }

    return banks;
};

// =============================================
// GET ONE
// =============================================
exports.getBankById = async (id) => {
    const bank = await Bank.findById(id)
        .populate("linkedAccount", "code name currentBalance totalDebits totalCredits")
        .populate("branch", "name code");

    if (!bank) {
        throw new Error("البنك غير موجود");
    }

    // ✅ تحديث currentBalance من الحساب المرتبط
    if (bank.linkedAccount && bank.linkedAccount.currentBalance !== undefined) {
        bank.currentBalance = bank.linkedAccount.currentBalance;
        await bank.save();
    }

    return bank;
};

// =============================================
// GET BY CODE
// =============================================
exports.getBankByCode = async (code) => {
    const bank = await Bank.findOne({ code: code.trim(), isHidden: { $ne: true } })
        .populate("linkedAccount", "code name currentBalance totalDebits totalCredits")
        .populate("branch", "name code");

    if (!bank) {
        throw new Error("البنك غير موجود");
    }

    // ✅ تحديث currentBalance من الحساب المرتبط
    if (bank.linkedAccount && bank.linkedAccount.currentBalance !== undefined) {
        bank.currentBalance = bank.linkedAccount.currentBalance;
        await bank.save();
    }

    return bank;
};

// =============================================
// ✅ FIXED: UPDATE
// =============================================
exports.updateBank = async (id, data) => {
    const bank = await Bank.findById(id);
    if (!bank) {
        throw new Error("البنك غير موجود");
    }

    // ── التحقق من عدم التكرار إذا تغير الكود ──
    if (data.code && data.code !== bank.code) {
        await checkDuplicateCode(data.code, id);
        bank.code = data.code.trim();
    }

    // ── التحقق من عدم تكرار الاسم إذا تغير ──
    if (data.name && data.name !== bank.name) {
        await checkDuplicateName(data.name, id);
        bank.name = data.name.trim();
    }

    // ── تحديث الحقول ──
    if (data.branch !== undefined) {
        bank.branch = data.branch ? data.branch.toString().trim() : null;
    }
    if (data.accountNo !== undefined) bank.accountNo = data.accountNo.trim();
    if (data.iban !== undefined) bank.iban = data.iban.trim();
    if (data.status !== undefined) bank.status = data.status;
    if (data.notes !== undefined) bank.notes = data.notes.trim();
    if (data.isActive !== undefined) bank.isActive = data.isActive;

    // ── تحديث الرصيد الافتتاحي ──
    const oldOpeningBalance = parseFloat(bank.openingBalance) || 0;
    const oldBalanceType = bank.balanceType || "debit";

    if (data.openingBalance !== undefined) {
        bank.openingBalance = parseFloat(data.openingBalance) || 0;
    }
    if (data.balanceType) {
        bank.balanceType = data.balanceType;
    }

    const newOpeningBalance = parseFloat(bank.openingBalance) || 0;
    const newBalanceType = bank.balanceType || "debit";

    // ── إذا تغير الرصيد الافتتاحي أو نوعه ──
    if (data.openingBalance !== undefined || data.balanceType) {
        if (oldOpeningBalance !== newOpeningBalance || oldBalanceType !== newBalanceType) {
            try {
                if (bank.linkedAccount) {
                    const account = await Account.findById(bank.linkedAccount);
                    if (account) {
                        // ✅ FIXED: نستخدم updateBankOpeningJournalEntry
                        await updateBankOpeningJournalEntry(bank, account);
                    }
                }
            } catch (err) {
                console.error("❌ Error updating opening balance:", err.message);
                throw err;
            }
        }
    }

    await bank.save();

    // ── ✅ تحديث currentBalance من الحساب المرتبط ──
    if (bank.linkedAccount) {
        const account = await Account.findById(bank.linkedAccount);
        if (account) {
            bank.currentBalance = account.currentBalance;
            await bank.save();
        }
    }

    // ── تحديث اسم الحساب المرتبط ──
    if (data.name && bank.linkedAccount) {
        await Account.findByIdAndUpdate(bank.linkedAccount, {
            name: data.name.trim()
        });
    }

    return await Bank.findById(bank._id)
        .populate("linkedAccount", "code name currentBalance")
        .populate("branch", "name code");
};

// =============================================
// HIDE (Soft Delete)
// =============================================
exports.hideBank = async (id) => {
    const bank = await Bank.findById(id);
    if (!bank) {
        throw new Error("البنك غير موجود");
    }

    // ── إخفاء البنك ──
    bank.isHidden = true;
    bank.isActive = false;
    bank.status = "closed";
    await bank.save();

    // ── إخفاء الحساب المرتبط ──
    if (bank.linkedAccount) {
        await Account.findByIdAndUpdate(bank.linkedAccount, { isActive: false });
    }

    return { message: "تم إخفاء البنك بنجاح" };
};

// =============================================
// RESTORE
// =============================================
exports.restoreBank = async (id) => {
    const bank = await Bank.findById(id);
    if (!bank) {
        throw new Error("البنك غير موجود");
    }

    bank.isHidden = false;
    bank.isActive = true;
    bank.status = "active";
    await bank.save();

    // ── إعادة تفعيل الحساب المرتبط ──
    if (bank.linkedAccount) {
        await Account.findByIdAndUpdate(bank.linkedAccount, { isActive: true });
    }

    return { message: "تم إظهار البنك بنجاح" };
};

// =============================================
// SEARCH
// =============================================
exports.searchBanks = async (keyword) => {
    if (!keyword || keyword.trim().length === 0) {
        return [];
    }

    const regex = new RegExp(escapeRegex(keyword), "i");

    const banks = await Bank.find({
        isHidden: { $ne: true },
        $or: [
            { name: regex },
            { code: regex },
            { accountNo: regex },
            { iban: regex }
        ]
    })
        .populate("linkedAccount", "code name currentBalance")
        .populate("branch", "name code")
        .sort({ name: 1 })
        .limit(50)
        .lean();

    // ✅ تحديث currentBalance لكل بنك من الحساب المرتبط
    for (const bank of banks) {
        if (bank.linkedAccount && bank.linkedAccount.currentBalance !== undefined) {
            bank.currentBalance = bank.linkedAccount.currentBalance;
        }
    }

    return banks;
};

// =============================================
// GET NEXT CODE
// =============================================
exports.getNextCode = async () => {
    const lastBank = await Bank.findOne()
        .sort({ code: -1 })
        .select("code");

    if (!lastBank || !lastBank.code) {
        return "BANK-00001";
    }

    const match = lastBank.code.match(/(\d+)$/);
    if (!match) {
        return "BANK-00001";
    }

    const nextNumber = parseInt(match[1], 10) + 1;
    return `BANK-${String(nextNumber).padStart(5, '0')}`;
};

// =============================================
// GET STATS
// =============================================
exports.getStats = async () => {
    const total = await Bank.countDocuments({ isHidden: { $ne: true } });
    const active = await Bank.countDocuments({ isHidden: { $ne: true }, status: "active" });
    const inactive = await Bank.countDocuments({ isHidden: { $ne: true }, status: "inactive" });
    const closed = await Bank.countDocuments({ isHidden: { $ne: true }, status: "closed" });

    // ✅ حساب الإجمالي من الحسابات المرتبطة
    const banks = await Bank.find({ isHidden: { $ne: true } })
        .populate("linkedAccount", "currentBalance")
        .lean();
    const totalBalance = banks.reduce((sum, b) => sum + (b.linkedAccount?.currentBalance || b.currentBalance || 0), 0);
    const negativeBalance = banks.filter(b => (b.linkedAccount?.currentBalance || b.currentBalance || 0) < 0).length;

    return {
        total,
        active,
        inactive,
        closed,
        totalBalance,
        negativeBalance
    };
};