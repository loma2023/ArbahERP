const CashBox = require("../Models/CashBoxSchema");
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
 * Validate required fields for cash box creation
 */
const validateCashBoxData = (data) => {
    const { name } = data;

    if (!name || !name.trim()) {
        throw new Error("اسم الخزينة مطلوب");
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
    const existing = await CashBox.findOne(query);
    if (existing) {
        throw new Error(`كود الخزينة ${code} مستخدم بالفعل`);
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
    const existing = await CashBox.findOne(query);
    if (existing) {
        throw new Error(`اسم الخزينة "${name}" مستخدم بالفعل`);
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
 * Get next available cash box account code under 1201
 * التسلسل: 120101, 120102, 120103...
 */
const getNextCashBoxAccountCode = async () => {
    const accounts = await Account.find({
        parentCode: "1201"
    })
        .sort({ code: -1 })
        .limit(1)
        .lean();

    if (accounts.length === 0) {
        return "120101";
    }

    const lastCode = accounts[0].code;
    const prefix = lastCode.substring(0, 4); // "1201"
    const num = parseInt(lastCode.substring(4), 10);

    return prefix + String(num + 1).padStart(2, "0");
};

// =============================================
// CREATE
// =============================================
exports.createCashBox = async (data) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const {
            code, name, branch, responsible,
            openingBalance, balanceType, status, notes
        } = data;

        // ── التحقق من البيانات ──
        validateCashBoxData(data);

        // ── التحقق من عدم التكرار ──
        await checkDuplicateCode(code);
        await checkDuplicateName(name);

        // ── إنشاء الخزينة أولاً (بدون ربط الحساب) ──
        const [cashBox] = await CashBox.create([{
            code: code.trim(),
            name: name.trim(),
            branch: branch || null,
            responsible: responsible ? responsible.trim() : "",
            openingBalance: parseFloat(openingBalance) || 0,
            balanceType: balanceType || "debit",
            status: status || "active",
            currentBalance: parseFloat(openingBalance) || 0,
            notes: notes ? notes.trim() : "",
            linkedAccount: null,
            linkedAccountCode: null
        }], { session });

        // ── إنشاء حساب مرتبط في شجرة الحسابات ──
        // Check if parent account "1201" (النقدية بالصندوق) exists
        const parentAccount = await Account.findOne({ code: "1201" }).lean();
        if (!parentAccount) {
            throw new Error("حساب الأب '1201 - النقدية بالصندوق' غير موجود في شجرة الحسابات");
        }

        // نولد كود الحساب (مثال: 120101, 120102, 120103...)
        const nextAccountCode = await getNextCashBoxAccountCode();

        // ✅ FIXED: openingBalance = 0 — القيد الافتتاحي هو اللي هيحدد الرصيد
        const linkedAccount = await AccountService.createLinkedAccount("cashbox", {
            entityId: cashBox._id,
            entityCode: cashBox.code,
            entityName: cashBox.name,
            parentCode: "1201",
            customCode: nextAccountCode,
            openingBalance: 0  // ← ✅ مهم: 0 هنا، القيد هيحدد الرصيد
        });

        // ── تحديث الخزينة بربط الحساب ──
        cashBox.linkedAccount = linkedAccount._id;
        cashBox.linkedAccountCode = linkedAccount.code;
        await cashBox.save({ session });

        // ── إنشاء قيد يومية افتتاحي لو فيه رصيد ──
        if (cashBox.openingBalance > 0) {
            await createOpeningJournalEntry(cashBox, linkedAccount, session);
        }

        await session.commitTransaction();

        return await CashBox.findById(cashBox._id)
            .populate("linkedAccount", "code name currentBalance")
            .populate("branch", "name code");

    } catch (error) {
        await session.abortTransaction();
        throw new Error("فشل إنشاء الخزينة: " + error.message);
    } finally {
        session.endSession();
    }
};

// =============================================
// ✅ FIXED: CREATE OPENING JOURNAL ENTRY
// =============================================
const createOpeningJournalEntry = async (cashBox, linkedAccount, session) => {
    try {
        const JournalEntry = require("../Models/JournalEntrySchema");
        const JournalLine = require("../Models/JournalLineSchema");

        const openingBalance = parseFloat(cashBox.openingBalance) || 0;
        if (openingBalance === 0) return;

        const balanceType = cashBox.balanceType || "debit";

        // ✅ FIXED: استخدام 210106 بدل 210103
        const equityAccount = await Account.findOne({ code: "210106" }).lean();
        if (!equityAccount) {
            throw new Error("حساب '210106 - رأس مال أرصدة افتتاحية' غير موجود في شجرة الحسابات");
        }

        // تحديد المدين والدائن بناءً على نوع الرصيد
        let cashBoxDebit = 0;
        let cashBoxCredit = 0;
        let equityDebit = 0;
        let equityCredit = 0;

        if (balanceType === "debit") {
            // الخزينة مدينة (فلوس موجودة)
            cashBoxDebit = openingBalance;
            equityCredit = openingBalance;
        } else {
            // الخزينة دائنة (سلبية - نادر)
            cashBoxCredit = openingBalance;
            equityDebit = openingBalance;
        }
        const entryNo = await getNextJournalEntryNo();

        const [journalEntry] = await JournalEntry.create([{
            entryNo,
            date: new Date(),
            reference: "OPB-BOX-" + cashBox.code,
            description: "رصيد افتتاحي - " + cashBox.name,
            type: "opening_balance",
            source: "cashbox",
            sourceId: cashBox._id,
            totalDebit: openingBalance,
            totalCredit: openingBalance,
            status: "posted",
            isPosted: true,
            postedAt: new Date()
        }], { session });

        // سطر 1: حساب الخزينة
        await JournalLine.create([{
            journalEntry: journalEntry._id,
            account: linkedAccount._id,
            accountCode: linkedAccount.code,
            accountName: linkedAccount.name,
            description: "رصيد افتتاحي - " + cashBox.name,
            debit: cashBoxDebit,
            credit: cashBoxCredit,
            date: new Date(),
            sortOrder: 1
        }], { session });

        // سطر 2: حساب رأس المال الافتتاحي
        await JournalLine.create([{
            journalEntry: journalEntry._id,
            account: equityAccount._id,
            accountCode: equityAccount.code,
            accountName: equityAccount.name,
            description: "رصيد افتتاحي - " + cashBox.name,
            debit: equityDebit,
            credit: equityCredit,
            date: new Date(),
            sortOrder: 2
        }], { session });

        // ✅ تحديث أرصدة الحسابات
        await AccountService.updateBalance(linkedAccount._id, cashBoxDebit, cashBoxCredit);
        await AccountService.updateBalance(equityAccount._id, equityDebit, equityCredit);

        // ── تحديث رصيد الخزينة في CashBoxSchema ──
        const updatedAccount = await Account.findById(linkedAccount._id).lean();
        cashBox.currentBalance = updatedAccount ? updatedAccount.currentBalance : openingBalance;
        await cashBox.save({ session });

    } catch (error) {
        console.error("❌ Error creating opening journal entry:", error.message);
        throw error;
    }
};

// =============================================
// ✅ FIXED: UPDATE OPENING JOURNAL ENTRY
// =============================================
const updateCashBoxOpeningJournalEntry = async (cashBox, linkedAccount) => {
    try {
        const JournalEntry = require("../Models/JournalEntrySchema");
        const JournalLine = require("../Models/JournalLineSchema");

        const newBalance = parseFloat(cashBox.openingBalance) || 0;
        const newType = cashBox.balanceType || "debit";

        // ✅ 1. نحذف القيد الافتتاحي القديم ونرجع الأرصدة
        const oldEntries = await JournalEntry.find({
            source: "cashbox",
            sourceId: cashBox._id,
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
            cashBox.currentBalance = account ? account.currentBalance : 0;
            await cashBox.save();
            return { message: "تم إلغاء الرصيد الافتتاحي" };
        }

        // ✅ 3. ننشئ قيد افتتاحي جديد
        const equityAccount = await Account.findOne({ code: "210106" }).lean();
        if (!equityAccount) {
            throw new Error("حساب '210106 - رأس مال أرصدة افتتاحية' غير موجود");
        }

        let cashBoxDebit = 0;
        let cashBoxCredit = 0;
        let equityDebit = 0;
        let equityCredit = 0;

        if (newType === "debit") {
            cashBoxDebit = newBalance;
            equityCredit = newBalance;
        } else {
            cashBoxCredit = newBalance;
            equityDebit = newBalance;
        }
        const entryNo = await getNextJournalEntryNo();

        const journalEntry = await JournalEntry.create({
            entryNo,
            date: new Date(),
            reference: "OPB-BOX-" + cashBox.code,
            description: "رصيد افتتاحي (معدل) - " + cashBox.name,
            type: "opening_balance",
            source: "cashbox",
            sourceId: cashBox._id,
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
            accountName: linkedAccount.name || cashBox.name,
            description: "رصيد افتتاحي (معدل) - " + cashBox.name,
            debit: cashBoxDebit,
            credit: cashBoxCredit,
            date: new Date(),
            sortOrder: 1
        });

        await JournalLine.create({
            journalEntry: journalEntry._id,
            account: equityAccount._id,
            accountCode: equityAccount.code,
            accountName: equityAccount.name,
            description: "رصيد افتتاحي (معدل) - " + cashBox.name,
            debit: equityDebit,
            credit: equityCredit,
            date: new Date(),
            sortOrder: 2
        });

        // ✅ تحديث أرصدة الحسابات الجديدة
        await AccountService.updateBalance(linkedAccount._id || linkedAccount, cashBoxDebit, cashBoxCredit);
        await AccountService.updateBalance(equityAccount._id, equityDebit, equityCredit);

        // ✅ تحديث رصيد الخزينة
        const updatedAccount = await Account.findById(linkedAccount._id || linkedAccount).lean();
        cashBox.currentBalance = updatedAccount ? updatedAccount.currentBalance : newBalance;
        await cashBox.save();

        return { message: "تم تحديث القيد الافتتاحي بنجاح" };

    } catch (error) {
        console.error("❌ Error updating opening journal entry:", error.message);
        throw error;
    }
};

// =============================================
// LIST
// =============================================
exports.getAllCashBoxes = async (filters = {}) => {
    const query = { isHidden: { $ne: true } };

    if (filters.status) query.status = filters.status;
    if (filters.search) {
        query.$or = [
            { name: { $regex: filters.search, $options: "i" } },
            { code: { $regex: filters.search, $options: "i" } }
        ];
    }

    const cashBoxes = await CashBox.find(query)
        .populate("linkedAccount", "code name currentBalance totalDebits totalCredits")
        .populate("branch", "name code")
        .sort({ createdAt: -1 })
        .lean();

    // ✅ تحديث currentBalance لكل خزينة من الحساب المرتبط
    for (const box of cashBoxes) {
        if (box.linkedAccount && box.linkedAccount.currentBalance !== undefined) {
            box.currentBalance = box.linkedAccount.currentBalance;
        }
    }

    return cashBoxes;
};

// =============================================
// GET ONE
// =============================================
exports.getCashBoxById = async (id) => {
    const cashBox = await CashBox.findById(id)
        .populate("linkedAccount", "code name currentBalance totalDebits totalCredits")
        .populate("branch", "name code");

    if (!cashBox) {
        throw new Error("الخزينة غير موجودة");
    }

    // ✅ تحديث currentBalance من الحساب المرتبط
    if (cashBox.linkedAccount && cashBox.linkedAccount.currentBalance !== undefined) {
        cashBox.currentBalance = cashBox.linkedAccount.currentBalance;
        await cashBox.save();
    }

    return cashBox;
};

// =============================================
// GET BY CODE
// =============================================
exports.getCashBoxByCode = async (code) => {
    const cashBox = await CashBox.findOne({ code: code.trim(), isHidden: { $ne: true } })
        .populate("linkedAccount", "code name currentBalance totalDebits totalCredits")
        .populate("branch", "name code");

    if (!cashBox) {
        throw new Error("الخزينة غير موجودة");
    }

    // ✅ تحديث currentBalance من الحساب المرتبط
    if (cashBox.linkedAccount && cashBox.linkedAccount.currentBalance !== undefined) {
        cashBox.currentBalance = cashBox.linkedAccount.currentBalance;
        await cashBox.save();
    }

    return cashBox;
};

// =============================================
// ✅ FIXED: UPDATE
// =============================================
exports.updateCashBox = async (id, data) => {
    const cashBox = await CashBox.findById(id);
    if (!cashBox) {
        throw new Error("الخزينة غير موجودة");
    }

    // ── التحقق من عدم التكرار إذا تغير الكود ──
    if (data.code && data.code !== cashBox.code) {
        await checkDuplicateCode(data.code, id);
        cashBox.code = data.code.trim();
    }

    // ── التحقق من عدم تكرار الاسم إذا تغير ──
    if (data.name && data.name !== cashBox.name) {
        await checkDuplicateName(data.name, id);
        cashBox.name = data.name.trim();
    }

    // ── تحديث الحقول ──
    if (data.branch !== undefined) {
        cashBox.branch = data.branch ? data.branch.toString().trim() : null;
    }
    if (data.responsible !== undefined) cashBox.responsible = data.responsible.trim();
    if (data.status !== undefined) cashBox.status = data.status;
    if (data.notes !== undefined) cashBox.notes = data.notes.trim();
    if (data.isActive !== undefined) cashBox.isActive = data.isActive;

    // ── تحديث الرصيد الافتتاحي ──
    const oldOpeningBalance = parseFloat(cashBox.openingBalance) || 0;
    const oldBalanceType = cashBox.balanceType || "debit";

    if (data.openingBalance !== undefined) {
        cashBox.openingBalance = parseFloat(data.openingBalance) || 0;
    }
    if (data.balanceType) {
        cashBox.balanceType = data.balanceType;
    }

    const newOpeningBalance = parseFloat(cashBox.openingBalance) || 0;
    const newBalanceType = cashBox.balanceType || "debit";

    // ── إذا تغير الرصيد الافتتاحي أو نوعه ──
    if (data.openingBalance !== undefined || data.balanceType) {
        if (oldOpeningBalance !== newOpeningBalance || oldBalanceType !== newBalanceType) {
            try {
                if (cashBox.linkedAccount) {
                    const account = await Account.findById(cashBox.linkedAccount);
                    if (account) {
                        // ✅ FIXED: نستخدم updateCashBoxOpeningJournalEntry اللي بتحذف القديم وتنشئ جديد
                        await updateCashBoxOpeningJournalEntry(cashBox, account);
                    }
                }
            } catch (err) {
                console.error("❌ Error updating opening balance:", err.message);
                throw err;
            }
        }
    }

    await cashBox.save();

    // ── ✅ تحديث currentBalance من الحساب المرتبط ──
    if (cashBox.linkedAccount) {
        const account = await Account.findById(cashBox.linkedAccount);
        if (account) {
            cashBox.currentBalance = account.currentBalance;
            await cashBox.save();
        }
    }

    // ── تحديث اسم الحساب المرتبط ──
    if (data.name && cashBox.linkedAccount) {
        await Account.findByIdAndUpdate(cashBox.linkedAccount, {
            name: data.name.trim()
        });
    }

    return await CashBox.findById(cashBox._id)
        .populate("linkedAccount", "code name currentBalance")
        .populate("branch", "name code");
};

// =============================================
// HIDE (Soft Delete)
// =============================================
exports.hideCashBox = async (id) => {
    const cashBox = await CashBox.findById(id);
    if (!cashBox) {
        throw new Error("الخزينة غير موجودة");
    }

    // ── إخفاء الخزينة ──
    cashBox.isHidden = true;
    cashBox.isActive = false;
    cashBox.status = "closed";
    await cashBox.save();

    // ── إخفاء الحساب المرتبط ──
    if (cashBox.linkedAccount) {
        await Account.findByIdAndUpdate(cashBox.linkedAccount, { isActive: false });
    }

    return { message: "تم إخفاء الخزينة بنجاح" };
};

// =============================================
// RESTORE
// =============================================
exports.restoreCashBox = async (id) => {
    const cashBox = await CashBox.findById(id);
    if (!cashBox) {
        throw new Error("الخزينة غير موجودة");
    }

    cashBox.isHidden = false;
    cashBox.isActive = true;
    cashBox.status = "active";
    await cashBox.save();

    // ── إعادة تفعيل الحساب المرتبط ──
    if (cashBox.linkedAccount) {
        await Account.findByIdAndUpdate(cashBox.linkedAccount, { isActive: true });
    }

    return { message: "تم إظهار الخزينة بنجاح" };
};

// =============================================
// SEARCH
// =============================================
exports.searchCashBoxes = async (keyword) => {
    if (!keyword || keyword.trim().length === 0) {
        return [];
    }

    const regex = new RegExp(escapeRegex(keyword), "i");

    const cashBoxes = await CashBox.find({
        isHidden: { $ne: true },
        $or: [
            { name: regex },
            { code: regex },
            { responsible: regex }
        ]
    })
        .populate("linkedAccount", "code name currentBalance")
        .populate("branch", "name code")
        .sort({ name: 1 })
        .limit(50)
        .lean();

    // ✅ تحديث currentBalance لكل خزينة من الحساب المرتبط
    for (const box of cashBoxes) {
        if (box.linkedAccount && box.linkedAccount.currentBalance !== undefined) {
            box.currentBalance = box.linkedAccount.currentBalance;
        }
    }

    return cashBoxes;
};

// =============================================
// GET NEXT CODE
// =============================================
exports.getNextCode = async () => {
    const lastBox = await CashBox.findOne()
        .sort({ code: -1 })
        .select("code");

    if (!lastBox || !lastBox.code) {
        return "BOX-00001";
    }

    const match = lastBox.code.match(/(\d+)$/);
    if (!match) {
        return "BOX-00001";
    }

    const nextNumber = parseInt(match[1], 10) + 1;
    return `BOX-${String(nextNumber).padStart(5, '0')}`;
};

// =============================================
// GET STATS
// =============================================
exports.getStats = async () => {
    const total = await CashBox.countDocuments({ isHidden: { $ne: true } });
    const active = await CashBox.countDocuments({ isHidden: { $ne: true }, status: "active" });
    const frozen = await CashBox.countDocuments({ isHidden: { $ne: true }, status: "frozen" });
    const closed = await CashBox.countDocuments({ isHidden: { $ne: true }, status: "closed" });

    // ✅ حساب الإجمالي من الحسابات المرتبطة
    const boxes = await CashBox.find({ isHidden: { $ne: true } })
        .populate("linkedAccount", "currentBalance")
        .lean();
    const totalBalance = boxes.reduce((sum, b) => sum + (b.linkedAccount?.currentBalance || b.currentBalance || 0), 0);
    const negativeBalance = boxes.filter(b => (b.linkedAccount?.currentBalance || b.currentBalance || 0) < 0).length;

    return {
        total,
        active,
        frozen,
        closed,
        totalBalance,
        negativeBalance
    };
};