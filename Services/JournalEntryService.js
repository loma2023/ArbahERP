const JournalEntry = require("../Models/JournalEntrySchema");
const JournalLine = require("../Models/JournalLineSchema");
const Account = require("../Models/AccountSchema");
const AccountService = require("./AccountService");
const Customer = require("../Models/CustomerSchema");
const mongoose = require("mongoose");

class JournalEntryService {
    /**
     * Get all journal entries with optional filtering
     */
    static async getAllEntries(filters = {}) {
        const query = {};

        if (filters.fromDate || filters.toDate) {
            query.date = {};
            if (filters.fromDate) query.date.$gte = new Date(filters.fromDate);
            if (filters.toDate) query.date.$lte = new Date(filters.toDate);
        }

        if (filters.status && filters.status !== "all") {
            query.status = filters.status;
        }

        if (filters.type && filters.type !== "all") {
            query.type = filters.type;
        }

        if (filters.branch && filters.branch !== "all") {
            query.branch = filters.branch;
        }

        if (filters.costCenter && filters.costCenter !== "all") {
            query.costCenter = filters.costCenter;
        }

        if (filters.search) {
            query.$or = [
                { entryNo: { $regex: filters.search, $options: "i" } },
                { description: { $regex: filters.search, $options: "i" } },
                { reference: { $regex: filters.search, $options: "i" } }
            ];
        }

        const entries = await JournalEntry.find(query)
            .populate("branch", "name")
            .populate("costCenter", "name")
            .sort({ date: -1, createdAt: -1 })
            .lean();

        return entries;
    }

    /**
     * Get journal entry by ID with lines
     */
    static async getEntryById(id) {
        const entry = await JournalEntry.findById(id)
            .populate("branch", "name")
            .populate("costCenter", "name")

        if (!entry) {
            throw new Error("القيد غير موجود");
        }

        const lines = await JournalLine.find({ journalEntry: entry._id })
            .populate("account", "code name")
            .populate("branch", "name")
            .populate("costCenter", "name")
            .sort({ sortOrder: 1 })
            .lean();

        return {
            ...entry.toObject(),
            lines: lines
        };
    }

    /**
     * Get journal entry by entry number
     */
    static async getEntryByNo(entryNo) {
        const entry = await JournalEntry.findOne({ entryNo: entryNo.trim() })
            .populate("branch", "name")
            .populate("costCenter", "name")

        if (!entry) {
            throw new Error("القيد غير موجود");
        }

        const lines = await JournalLine.find({ journalEntry: entry._id })
            .populate("account", "code name")
            .sort({ sortOrder: 1 })
            .lean();

        return {
            ...entry.toObject(),
            lines: lines
        };
    }

    /**
     * Validate entry lines before saving
     */
    static validateEntryLines(lines) {
        if (!lines || !Array.isArray(lines) || lines.length < 2) {
            throw new Error("يجب إدخال سطرين على الأقل في القيد");
        }

        let totalDebit = 0;
        let totalCredit = 0;
        const errors = [];

        lines.forEach((line, index) => {
            const lineNum = index + 1;

            if (!line.account) {
                errors.push(`السطر ${lineNum}: يجب اختيار الحساب`);
            }

            const debit = parseFloat(line.debit) || 0;
            const credit = parseFloat(line.credit) || 0;

            if (debit === 0 && credit === 0) {
                errors.push(`السطر ${lineNum}: يجب إدخال قيمة مدين أو دائن`);
            }

            if (debit > 0 && credit > 0) {
                errors.push(`السطر ${lineNum}: لا يمكن إدخال مدين ودائن في نفس السطر`);
            }

            totalDebit += debit;
            totalCredit += credit;
        });

        if (Math.abs(totalDebit - totalCredit) > 0.001) {
            errors.push(`القيد غير متوازن: المدين (${totalDebit.toFixed(2)}) ≠ الدائن (${totalCredit.toFixed(2)}) - الفرق: ${(totalDebit - totalCredit).toFixed(2)}`);
        }

        if (errors.length > 0) {
            throw new Error(errors.join("\n"));
        }

        return { totalDebit, totalCredit };
    }

    /**
     * Create journal entry (internal helper)
     */
    static async _createEntry(data, status = "draft") {
        const {
            entryNo, date, description, branch, costCenter,
            lines, reference, notes, source, sourceId, type = "manual"
        } = data;

        if (!entryNo || !entryNo.trim()) {
            throw new Error("رقم القيد مطلوب");
        }

        const existingNo = await JournalEntry.findOne({ entryNo: entryNo.trim() });
        if (existingNo) {
            throw new Error("رقم القيد " + entryNo + " مستخدم بالفعل");
        }

        const { totalDebit, totalCredit } = this.validateEntryLines(lines);

        const entry = await JournalEntry.create({
            entryNo: entryNo.trim(),
            date: date ? new Date(date) : new Date(),
            description: description ? description.trim() : "",
            branch: branch || null,
            costCenter: costCenter || null,
            totalDebit: totalDebit,
            totalCredit: totalCredit,
            difference: totalDebit - totalCredit,
            status: status,
            type: type,
            source: source || "",
            sourceId: sourceId || null,
            reference: reference ? reference.trim() : "",
            notes: notes ? notes.trim() : "",
            isPosted: status === "posted",
            postedAt: status === "posted" ? new Date() : null
        });

        const lineDocs = [];
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const account = await Account.findById(line.account).lean();

            const lineDoc = await JournalLine.create({
                journalEntry: entry._id,
                account: line.account,
                accountCode: account ? account.code : "",
                accountName: account ? account.name : "",
                description: line.description ? line.description.trim() : "",
                debit: parseFloat(line.debit) || 0,
                credit: parseFloat(line.credit) || 0,
                date: entry.date,
                branch: entry.branch,
                costCenter: entry.costCenter,
                reference: entry.reference,
                notes: "",
                sortOrder: i + 1
            });

            lineDocs.push(lineDoc);
        }

        if (status === "posted") {
            await this._updateAccountBalances(entry._id);
        }

        return await this.getEntryById(entry._id);
    }

    static async createEntry(data) { return await this._createEntry(data, "draft"); }
    static async saveDraft(data) { return await this._createEntry(data, "draft"); }
    static async saveAndPost(data) { return await this._createEntry(data, "posted"); }

    /**
     * Update journal entry (only if draft)
     */
    static async updateEntry(id, data) {
        const entry = await JournalEntry.findById(id);
        if (!entry) {
            throw new Error("القيد غير موجود");
        }

        if (entry.status === "posted") {
            throw new Error("لا يمكن تعديل قيد مرحل. يرجى إلغاء الترحيل أولاً");
        }

        const {
            entryNo, date, description, branch, costCenter,
            lines, reference, notes
        } = data;

        if (entryNo && entryNo.trim() !== entry.entryNo) {
            const existing = await JournalEntry.findOne({ entryNo: entryNo.trim() });
            if (existing && existing._id.toString() !== id) {
                throw new Error("رقم القيد " + entryNo + " مستخدم بالفعل");
            }
            entry.entryNo = entryNo.trim();
        }

        if (date) entry.date = new Date(date);
        if (description !== undefined) entry.description = description.trim();
        if (branch !== undefined) entry.branch = branch || null;
        if (costCenter !== undefined) entry.costCenter = costCenter || null;
        if (reference !== undefined) entry.reference = reference.trim();
        if (notes !== undefined) entry.notes = notes.trim();

        if (lines && Array.isArray(lines) && lines.length > 0) {
            const { totalDebit, totalCredit } = this.validateEntryLines(lines);

            entry.totalDebit = totalDebit;
            entry.totalCredit = totalCredit;
            entry.difference = totalDebit - totalCredit;

            await JournalLine.deleteMany({ journalEntry: entry._id });

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const account = await Account.findById(line.account).lean();

                await JournalLine.create({
                    journalEntry: entry._id,
                    account: line.account,
                    accountCode: account ? account.code : "",
                    accountName: account ? account.name : "",
                    description: line.description ? line.description.trim() : "",
                    debit: parseFloat(line.debit) || 0,
                    credit: parseFloat(line.credit) || 0,
                    date: entry.date,
                    branch: entry.branch,
                    costCenter: entry.costCenter,
                    reference: entry.reference,
                    sortOrder: i + 1
                });
            }
        }

        await entry.save();
        return await this.getEntryById(entry._id);
    }

    /**
     * Post journal entry (ترحيل)
     */
    static async postEntry(id) {
        const entry = await JournalEntry.findById(id);
        if (!entry) {
            throw new Error("القيد غير موجود");
        }

        if (entry.status === "posted") {
            throw new Error("القيد مرحل بالفعل");
        }

        if (Math.abs(entry.totalDebit - entry.totalCredit) > 0.001) {
            throw new Error("القيد غير متوازن ولا يمكن ترحيله");
        }

        entry.status = "posted";
        entry.isPosted = true;
        entry.postedAt = new Date();
        await entry.save();

        await this._updateAccountBalances(entry._id);

        return {
            message: "تم ترحيل القيد بنجاح",
            entry: await this.getEntryById(entry._id)
        };
    }

    /**
     * Unpost journal entry (إلغاء الترحيل)
     */
    static async unpostEntry(id) {
        const entry = await JournalEntry.findById(id);
        if (!entry) {
            throw new Error("القيد غير موجود");
        }

        if (entry.status !== "posted") {
            throw new Error("القيد غير مرحل");
        }

        if (entry.type === "auto") {
            throw new Error("لا يمكن إلغاء ترحيل قيد تلقائي");
        }

        await this._reverseAccountBalances(entry._id);

        entry.status = "draft";
        entry.isPosted = false;
        entry.postedAt = null;
        await entry.save();

        return {
            message: "تم إلغاء ترحيل القيد بنجاح",
            entry: await this.getEntryById(entry._id)
        };
    }

    /**
     * Delete journal entry
     */
    static async deleteEntry(id) {
        const entry = await JournalEntry.findById(id);
        if (!entry) {
            throw new Error("القيد غير موجود");
        }

        if (entry.status === "posted") {
            await this._reverseAccountBalances(entry._id);
        }

        await JournalLine.deleteMany({ journalEntry: entry._id });
        await JournalEntry.findByIdAndDelete(id);

        return { message: "تم حذف القيد بنجاح" };
    }

    /**
     * Update account balances after posting
     */
    static async _updateAccountBalances(entryId) {
        const lines = await JournalLine.find({ journalEntry: entryId }).lean();

        for (const line of lines) {
            await AccountService.updateBalance(
                line.account,
                line.debit,
                line.credit
            );
        }

        // ── تحديث رصيد العملاء المرتبطين بالحسابات ──
        await this._syncCustomerBalances(lines);
    }

    /**
     * Sync customer balances after journal entry posting/unposting
     * تحديث رصيد العملاء المرتبطين بالحسابات المستخدمة في القيد
     */
    static async _syncCustomerBalances(lines) {
        try {
            const accountIds = lines.map(l => l.account?.toString()).filter(Boolean);
            if (accountIds.length === 0) return;

            // Find customers linked to these accounts
            const customers = await Customer.find({
                linkedAccount: { $in: accountIds }
            }).lean();

            for (const customer of customers) {
                const account = await Account.findById(customer.linkedAccount).lean();
                if (account) {
                    await Customer.findByIdAndUpdate(customer._id, {
                        currentBalance: account.currentBalance || 0
                    });
                }
            }
        } catch (error) {
            console.error("Error syncing customer balances:", error);
            // Don't throw - balance sync is secondary
        }
    }

    /**
     * Reverse account balances when unposting
     */
    static async _reverseAccountBalances(entryId) {
        const lines = await JournalLine.find({ journalEntry: entryId }).lean();

        for (const line of lines) {
            await AccountService.updateBalance(
                line.account,
                -line.debit,
                -line.credit
            );
        }

        // ── تحديث رصيد العملاء المرتبطين بالحسابات ──
        await this._syncCustomerBalances(lines);
    }

    /**
     * Get next available entry number
     * ✅ FIXED: Proper regex for extracting number
     */
    static async getNextEntryNo() {
        const entries = await JournalEntry.find({})
            .sort({ createdAt: -1 })
            .limit(1);

        if (entries.length === 0) {
            return "JV-0001";
        }

        const lastNo = entries[0].entryNo;
        // Extract the last number sequence from the string
        const match = lastNo.match(/(\d+)(?!.*\d)/);
        if (match) {
            const lastNumber = parseInt(match[0]);
            const prefix = lastNo.substring(0, lastNo.lastIndexOf(match[0]));
            return prefix + String(lastNumber + 1).padStart(4, "0");
        }

        return "JV-" + String(entries.length + 1).padStart(4, "0");
    }

    /**
     * Get journal statistics
     */
    static async getStats() {
        const total = await JournalEntry.countDocuments({});
        const posted = await JournalEntry.countDocuments({ status: "posted" });
        const draft = await JournalEntry.countDocuments({ status: "draft" });

        const agg = await JournalEntry.aggregate([
            {
                $group: {
                    _id: null,
                    totalDebit: { $sum: "$totalDebit" },
                    totalCredit: { $sum: "$totalCredit" }
                }
            }
        ]);

        const totalDebit = agg.length > 0 ? agg[0].totalDebit : 0;
        const totalCredit = agg.length > 0 ? agg[0].totalCredit : 0;

        return {
            total,
            posted,
            draft,
            totalDebit,
            totalCredit,
            balanceDiff: totalDebit - totalCredit
        };
    }
}

module.exports = JournalEntryService;