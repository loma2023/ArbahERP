const SalesRep = require("../Models/SalesRepSchema");
const Account = require("../Models/AccountSchema");
const AccountService = require("./AccountService");

// =============================================
// HELPERS
// =============================================

const validateSalesRepData = (data) => {
    const { name, phone } = data;
    if (!name || !name.trim()) {
        throw new Error("اسم المندوب مطلوب");
    }
    if (!phone || !phone.trim()) {
        throw new Error("رقم الهاتف مطلوب");
    }
};

const checkDuplicateCode = async (code, excludeId = null) => {
    const query = { code: code.trim() };
    if (excludeId) query._id = { $ne: excludeId };
    const existing = await SalesRep.findOne(query);
    if (existing) throw new Error(`كود المندوب ${code} مستخدم بالفعل`);
};

const checkDuplicateName = async (name, excludeId = null) => {
    const query = { name: { $regex: new RegExp("^" + name.trim() + "$", "i") } };
    if (excludeId) query._id = { $ne: excludeId };
    const existing = await SalesRep.findOne(query);
    if (existing) throw new Error(`اسم المندوب "${name}" مستخدم بالفعل`);
};

const checkDuplicatePhone = async (phone, excludeId = null) => {
    const query = { phone: phone.trim() };
    if (excludeId) query._id = { $ne: excludeId };
    const existing = await SalesRep.findOne(query);
    if (existing) throw new Error("رقم الهاتف مستخدم بالفعل");
};

/**
 * Get next available sales rep account code under 1204
 * التسلسل: 120401, 120402, 120403...
 */
const getNextSalesRepAccountCode = async () => {
    const accounts = await Account.find({
        parentCode: "1204"
    })
        .sort({ code: -1 })
        .limit(1)
        .lean();

    if (accounts.length === 0) {
        return "120401";
    }

    const lastCode = accounts[0].code;
    const lastNum = parseInt(lastCode.slice(-2));
    const baseCode = lastCode.slice(0, -2);

    return baseCode + String(lastNum + 1).padStart(2, "0");
};

// =============================================
// CREATE
// =============================================
exports.createSalesRep = async (data) => {
    const {
        code, name, phone, email, idNumber, nationality,
        branch, city, openingBalance, balanceType, creditLimit,
        status, notes
    } = data;

    validateSalesRepData(data);
    await checkDuplicateCode(code);
    await checkDuplicateName(name);
    await checkDuplicatePhone(phone);

    const salesRep = await SalesRep.create({
        code: code.trim(),
        name: name.trim(),
        phone: phone.trim(),
        email: email ? email.trim().toLowerCase() : "",
        idNumber: idNumber ? idNumber.trim() : "",
        nationality: nationality ? nationality.trim() : "",
        branch: branch ? branch.trim() : "",
        city: city ? city.trim() : "",
        openingBalance: parseFloat(openingBalance) || 0,
        balanceType: balanceType || "debit",
        creditLimit: parseFloat(creditLimit) || 0,
        status: status || "active",
        currentBalance: parseFloat(openingBalance) || 0,
        notes: notes ? notes.trim() : "",
        linkedAccount: null,
        linkedAccountCode: null
    });

    // ── إنشاء حساب مرتبط في شجرة الحسابات تحت 1204 - المناديب ──
    let linkedAccount = null;
    try {
        const parentAccount = await Account.findOne({ code: "1204" }).lean();
        if (!parentAccount) {
            throw new Error("حساب الأب '1204 - المناديب' غير موجود في شجرة الحسابات");
        }

        // نولد كود الحساب (مثال: 120401, 120402, 120403...)
        const nextAccountCode = await getNextSalesRepAccountCode();

        linkedAccount = await AccountService.createLinkedAccount("salesrep", {
            entityId: salesRep._id,
            entityCode: salesRep.code,
            entityName: salesRep.name,
            parentCode: "1204",
            customCode: nextAccountCode  // ← استخدم الكود المولد
        });

        salesRep.linkedAccount = linkedAccount._id;
        salesRep.linkedAccountCode = linkedAccount.code;
        await salesRep.save();

        // ── قيد يومية افتتاحي لو فيه رصيد ──
        if (salesRep.openingBalance > 0) {
            await createOpeningJournalEntry(salesRep, linkedAccount);
        }

    } catch (accountError) {
        await SalesRep.findByIdAndDelete(salesRep._id);
        throw new Error("فشل إنشاء حساب المندوب في شجرة الحسابات: " + accountError.message);
    }

    return await SalesRep.findById(salesRep._id)
        .populate("linkedAccount", "code name currentBalance");
};

// =============================================
// CREATE OPENING JOURNAL ENTRY
// =============================================
const createOpeningJournalEntry = async (salesRep, linkedAccount) => {
    try {
        const JournalEntry = require("../Models/JournalEntrySchema");
        const JournalLine = require("../Models/JournalLineSchema");

        const debitAmount = salesRep.balanceType === "debit" ? salesRep.openingBalance : 0;
        const creditAmount = salesRep.balanceType === "credit" ? salesRep.openingBalance : 0;

        const journalEntry = await JournalEntry.create({
            date: new Date(),
            reference: "OPB-REP-" + salesRep.code,
            description: "رصيد افتتاحي - " + salesRep.name,
            type: "opening_balance",
            source: "salesrep",
            sourceId: salesRep._id,
            totalDebits: salesRep.openingBalance,
            totalCredits: salesRep.openingBalance,
            isPosted: true
        });

        await JournalLine.create({
            journalEntry: journalEntry._id,
            account: linkedAccount._id,
            description: "رصيد افتتاحي - " + salesRep.name,
            debit: debitAmount,
            credit: creditAmount,
            date: new Date()
        });

        const equityAccount = await Account.findOne({ code: "210103" }).lean();
        if (equityAccount) {
            await JournalLine.create({
                journalEntry: journalEntry._id,
                account: equityAccount._id,
                description: "رصيد افتتاحي - " + salesRep.name,
                debit: creditAmount,
                credit: debitAmount,
                date: new Date()
            });
        }

        await AccountService.updateBalance(linkedAccount._id, debitAmount, creditAmount);

    } catch (error) {
        console.error("⚠️ Error creating opening journal entry:", error.message);
    }
};

// =============================================
// LIST
// =============================================
exports.getAllSalesReps = async (filters = {}) => {
    const query = { isHidden: { $ne: true } };

    if (filters.status) query.status = filters.status;
    if (filters.branch) query.branch = filters.branch;
    if (filters.search) {
        query.$or = [
            { name: { $regex: filters.search, $options: "i" } },
            { code: { $regex: filters.search, $options: "i" } },
            { phone: { $regex: filters.search, $options: "i" } },
            { city: { $regex: filters.search, $options: "i" } }
        ];
    }

    return await SalesRep.find(query)
        .populate("linkedAccount", "code name currentBalance")
        .sort({ createdAt: -1 })
        .lean();
};

// =============================================
// GET ONE
// =============================================
exports.getSalesRepById = async (id) => {
    const salesRep = await SalesRep.findById(id)
        .populate("linkedAccount", "code name currentBalance totalDebits totalCredits");

    if (!salesRep) throw new Error("المندوب غير موجود");
    return salesRep;
};

// =============================================
// GET BY CODE
// =============================================
exports.getSalesRepByCode = async (code) => {
    const salesRep = await SalesRep.findOne({ code: code.trim(), isHidden: { $ne: true } })
        .populate("linkedAccount", "code name currentBalance");

    if (!salesRep) throw new Error("المندوب غير موجود");
    return salesRep;
};

// =============================================
// UPDATE
// =============================================
exports.updateSalesRep = async (id, data) => {
    const salesRep = await SalesRep.findById(id);
    if (!salesRep) throw new Error("المندوب غير موجود");

    if (data.code && data.code !== salesRep.code) {
        await checkDuplicateCode(data.code, id);
        salesRep.code = data.code.trim();
    }
    if (data.name && data.name !== salesRep.name) {
        await checkDuplicateName(data.name, id);
        salesRep.name = data.name.trim();
    }
    if (data.phone && data.phone !== salesRep.phone) {
        await checkDuplicatePhone(data.phone, id);
        salesRep.phone = data.phone.trim();
    }

    if (data.email !== undefined) salesRep.email = data.email.trim().toLowerCase();
    if (data.idNumber !== undefined) salesRep.idNumber = data.idNumber.trim();
    if (data.nationality !== undefined) salesRep.nationality = data.nationality.trim();
    if (data.branch !== undefined) salesRep.branch = data.branch.trim();
    if (data.city !== undefined) salesRep.city = data.city.trim();
    if (data.status !== undefined) salesRep.status = data.status;
    if (data.notes !== undefined) salesRep.notes = data.notes.trim();
    if (data.isActive !== undefined) salesRep.isActive = data.isActive;

    if (data.openingBalance !== undefined) {
        salesRep.openingBalance = parseFloat(data.openingBalance) || 0;
        salesRep.currentBalance = salesRep.openingBalance;
    }
    if (data.balanceType) salesRep.balanceType = data.balanceType;
    if (data.creditLimit !== undefined) salesRep.creditLimit = parseFloat(data.creditLimit) || 0;

    await salesRep.save();

    if (data.name && salesRep.linkedAccount) {
        await Account.findByIdAndUpdate(salesRep.linkedAccount, { name: data.name.trim() });
    }

    return await SalesRep.findById(salesRep._id)
        .populate("linkedAccount", "code name currentBalance");
};

// =============================================
// HIDE
// =============================================
exports.hideSalesRep = async (id) => {
    const salesRep = await SalesRep.findById(id);
    if (!salesRep) throw new Error("المندوب غير موجود");

    salesRep.isHidden = true;
    salesRep.isActive = false;
    salesRep.status = "suspended";
    await salesRep.save();

    if (salesRep.linkedAccount) {
        await Account.findByIdAndUpdate(salesRep.linkedAccount, { isActive: false });
    }

    return { message: "تم إخفاء المندوب بنجاح" };
};

// =============================================
// RESTORE
// =============================================
exports.restoreSalesRep = async (id) => {
    const salesRep = await SalesRep.findById(id);
    if (!salesRep) throw new Error("المندوب غير موجود");

    salesRep.isHidden = false;
    salesRep.isActive = true;
    salesRep.status = "active";
    await salesRep.save();

    if (salesRep.linkedAccount) {
        await Account.findByIdAndUpdate(salesRep.linkedAccount, { isActive: true });
    }

    return { message: "تم إظهار المندوب بنجاح" };
};

// =============================================
// SEARCH
// =============================================
exports.searchSalesReps = async (keyword) => {
    if (!keyword || keyword.trim().length === 0) return [];

    const regex = new RegExp(keyword, "i");

    return await SalesRep.find({
        isHidden: { $ne: true },
        $or: [
            { name: regex },
            { code: regex },
            { phone: regex },
            { city: regex }
        ]
    })
        .populate("linkedAccount", "code name currentBalance")
        .sort({ name: 1 })
        .limit(50);
};

// =============================================
// GET NEXT CODE
// =============================================
exports.getNextCode = async () => {
    const lastRep = await SalesRep.findOne()
        .sort({ code: -1 })
        .select("code");

    if (!lastRep || !lastRep.code) return "REP-00001";

    const match = lastRep.code.match(/(\d+)$/);
    if (!match) return "REP-00001";

    const nextNumber = parseInt(match[1], 10) + 1;
    return `REP-${String(nextNumber).padStart(5, '0')}`;
};

// =============================================
// GET STATS
// =============================================
exports.getStats = async () => {
    const total = await SalesRep.countDocuments({ isHidden: { $ne: true } });
    const active = await SalesRep.countDocuments({ isHidden: { $ne: true }, status: "active" });
    const inactive = await SalesRep.countDocuments({ isHidden: { $ne: true }, status: "inactive" });
    const suspended = await SalesRep.countDocuments({ isHidden: { $ne: true }, status: "suspended" });

    const reps = await SalesRep.find({ isHidden: false }).lean();
    const totalReceivables = reps.reduce((sum, r) => {
        const balance = (r.currentBalance || 0);
        return balance > 0 ? sum + balance : sum;
    }, 0);
    const overLimit = reps.filter(r => {
        const balance = (r.currentBalance || 0);
        const limit = parseFloat(r.creditLimit) || 0;
        return balance > limit && limit > 0;
    }).length;

    return { total, active, inactive, suspended, totalReceivables, overLimit };
};