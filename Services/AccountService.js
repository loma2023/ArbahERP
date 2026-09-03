const Account = require("../Models/AccountSchema");

class AccountService {
    /**
     * Get all accounts with optional filtering
     */
    static async getAllAccounts(filters = {}) {
        const query = { isActive: true };

        if (filters.type) query.type = filters.type;
        if (filters.category) query.category = filters.category;
        if (filters.isLeaf !== undefined) query.isLeaf = filters.isLeaf;
        if (filters.parentCode) query.parentCode = filters.parentCode;
        if (filters.search) {
            query.$or = [
                { name: { $regex: filters.search, $options: "i" } },
                { code: { $regex: filters.search, $options: "i" } }
            ];
        }

        const accounts = await Account.find(query)
            .populate("parent", "code name")
            .sort({ code: 1 })
            .lean();

        return accounts;
    }

    /**
     * Get account by ID
     */
    static async getAccountById(id) {
        const account = await Account.findById(id)
            .populate("parent", "code name type")
            .populate("children", "code name type currentBalance");

        if (!account) {
            throw new Error("الحساب غير موجود");
        }

        return account;
    }

    /**
     * Get account by code
     */
    static async getAccountByCode(code) {
        const account = await Account.findOne({ code: code.trim(), isActive: true })
            .populate("parent", "code name");

        if (!account) {
            throw new Error("الحساب غير موجود");
        }

        return account;
    }

    /**
     * Create new account
     */
    static async createAccount(data) {
        const { code, name, type, category, parentCode, normalBalance,
            openingBalance, isLeaf, allowTransactions, notes } = data;

        // Check if code already exists
        const existing = await Account.findOne({ code: code.trim() });
        if (existing) {
            throw new Error("كود الحساب " + code + " مستخدم بالفعل");
        }

        let parent = null;
        let level = 1;
        let accountPath = code.trim();

        // If parentCode provided, find parent
        if (parentCode) {
            parent = await Account.findOne({ code: parentCode.trim() });
            if (!parent) {
                throw new Error("الحساب الأب " + parentCode + " غير موجود");
            }
            if (parent.isLeaf) {
                throw new Error("لا يمكن إضافة حساب فرعي لحساب نهائي");
            }
            level = parent.level + 1;
            accountPath = parent.accountPath + "/" + code.trim();
        }

        const account = await Account.create({
            code: code.trim(),
            name: name.trim(),
            type,
            category: category.trim(),
            parent: parent ? parent._id : null,
            parentCode: parent ? parent.code : null,
            level,
            accountPath,
            isGroup: !isLeaf,
            isLeaf: isLeaf || false,
            allowTransactions: allowTransactions || false,
            normalBalance: normalBalance || "debit",
            openingBalance: openingBalance || 0,
            currentBalance: openingBalance || 0,
            notes: notes || ""
        });

        // Update parent to be non-leaf if it was leaf
        if (parent && parent.isLeaf) {
            parent.isLeaf = false;
            parent.allowTransactions = false;
            parent.isGroup = true;
            await parent.save();
        }

        return await Account.findById(account._id).populate("parent", "code name");
    }

    /**
     * Create auto-account for entity (Customer, Supplier, etc.)
     */
    static async createLinkedAccount(entityType, entityData) {
        const { entityId, entityCode, entityName, parentCode, customCode, openingBalance = 0 } = entityData;

        if (!parentCode) {
            throw new Error("parentCode is required for createLinkedAccount");
        }
        if (!entityName) {
            throw new Error("entityName is required for createLinkedAccount");
        }
        if (!entityId) {
            throw new Error("entityId is required for createLinkedAccount");
        }

        // Find parent account
        const parent = await Account.findOne({ code: parentCode.trim() }).lean();
        if (!parent) {
            throw new Error("حساب الأب " + parentCode + " غير موجود");
        }

        let nextCode;
        if (customCode) {
            nextCode = customCode;
        } else {
            try {
                nextCode = await Account.getNextCode(parentCode.trim());
            } catch (codeError) {
                throw new Error("فشل توليد الكود التالي: " + codeError.message);
            }
        }

        // Double-check code doesn't exist
        const existing = await Account.findOne({ code: nextCode }).lean();
        if (existing) {
            if (customCode) {
                throw new Error("كود الحساب " + nextCode + " مستخدم بالفعل");
            }

            const siblings = await Account.find({ parentCode: parentCode.trim() })
                .sort({ code: -1 })
                .limit(1)
                .lean();
            const lastCode = siblings[0] ? siblings[0].code : parentCode;
            const lastNumber = parseInt(lastCode.slice(parentCode.length)) || 0;
            const fallbackCode = parentCode + (lastNumber + 2);

            const fallbackExists = await Account.findOne({ code: fallbackCode }).lean();
            if (fallbackExists) {
                throw new Error("تعذر إنشاء كود فريد للحساب");
            }
            nextCode = fallbackCode;
        }

        const accountData = {
            code: nextCode,
            name: entityName,
            type: parent.type,
            category: entityType,
            parent: parent._id,
            parentCode: parent.code,
            level: parent.level + 1,
            accountPath: parent.accountPath + "/" + nextCode,
            isGroup: false,
            isLeaf: true,
            allowTransactions: true,
            normalBalance: parent.normalBalance,
            openingBalance: openingBalance || 0,
            currentBalance: openingBalance || 0,
            totalDebits: 0,
            totalCredits: 0,
            linkedEntity: {
                type: entityType,
                entityId: entityId,
                entityCode: entityCode || ""
            },
            isActive: true,
            notes: "",
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Insert using native driver - bypasses ALL Mongoose middleware
        const result = await Account.collection.insertOne(accountData);

        if (!result.acknowledged) {
            throw new Error("فشل إدراج الحساب في قاعدة البيانات");
        }

        // Fetch the created account
        const account = await Account.findById(result.insertedId).lean();
        if (!account) {
            throw new Error("الحساب تم إنشاؤه لكن لا يمكن جلبه");
        }

        // Update parent to be non-leaf if it was leaf
        if (parent.isLeaf) {
            await Account.updateOne(
                { _id: parent._id },
                {
                    $set: {
                        isLeaf: false,
                        allowTransactions: false,
                        isGroup: true
                    }
                }
            );
        }

        return account;
    }

    /**
     * Update account
     */
    static async updateAccount(id, data) {
        const account = await Account.findById(id);
        if (!account) {
            throw new Error("الحساب غير موجود");
        }

        // Don't allow changing code if account has transactions
        if (data.code && data.code !== account.code) {
            const hasTransactions = account.totalDebits > 0 || account.totalCredits > 0;
            if (hasTransactions) {
                throw new Error("لا يمكن تغيير كود الحساب بعد إجراء حركات عليه");
            }

            const existing = await Account.findOne({ code: data.code.trim() });
            if (existing && existing._id.toString() !== id) {
                throw new Error("كود الحساب " + data.code + " مستخدم بالفعل");
            }
        }

        // Update fields
        if (data.name) account.name = data.name.trim();
        if (data.code) account.code = data.code.trim();
        if (data.category) account.category = data.category.trim();
        if (data.notes !== undefined) account.notes = data.notes;
        if (data.isActive !== undefined) account.isActive = data.isActive;

        // Update balance if no transactions yet
        if (data.openingBalance !== undefined &&
            account.totalDebits === 0 && account.totalCredits === 0) {
            account.openingBalance = data.openingBalance;
            account.currentBalance = data.openingBalance;
        }

        await account.save();

        return await Account.findById(account._id).populate("parent", "code name");
    }

    /**
     * Delete account (soft delete)
     */
    static async deleteAccount(id) {
        const account = await Account.findById(id);
        if (!account) {
            throw new Error("الحساب غير موجود");
        }

        // Check if has children
        const children = await Account.countDocuments({ parent: id });
        if (children > 0) {
            throw new Error("لا يمكن حذف حساب له حسابات فرعية");
        }

        // Check if has transactions
        if (account.totalDebits > 0 || account.totalCredits > 0) {
            throw new Error("لا يمكن حذف حساب له حركات مالية");
        }

        // Check if linked to entity
        if (account.linkedEntity && account.linkedEntity.entityId) {
            throw new Error("لا يمكن حذف حساب مرتبط بكيان (عميل/مورد/منتج)");
        }

        await Account.findByIdAndDelete(id);

        return { message: "تم حذف الحساب بنجاح" };
    }

    /**
     * Get account tree structure - OPTIMIZED
     */
    static async getAccountTree(parentCode = null) {
        const allAccounts = await Account.find({ isActive: true })
            .sort({ code: 1 })
            .lean();

        const accountMap = new Map();
        allAccounts.forEach(acc => {
            accountMap.set(acc.code, {
                id: acc._id.toString(),
                _id: acc._id,
                code: acc.code,
                name: acc.name,
                type: acc.type,
                category: acc.category,
                level: acc.level,
                isLeaf: acc.isLeaf,
                isGroup: acc.isGroup,
                allowTransactions: acc.allowTransactions,
                normalBalance: acc.normalBalance,
                currentBalance: acc.currentBalance || 0,
                openingBalance: acc.openingBalance || 0,
                totalDebits: acc.totalDebits || 0,
                totalCredits: acc.totalCredits || 0,
                parentCode: acc.parentCode,
                children: []
            });
        });

        const tree = [];
        accountMap.forEach(node => {
            if (node.parentCode && accountMap.has(node.parentCode)) {
                accountMap.get(node.parentCode).children.push(node);
            } else {
                tree.push(node);
            }
        });

        return tree;
    }

    /**
     * Get leaf accounts for dropdowns
     */
    static async getLeafAccounts(filter = {}) {
        return await Account.getLeafAccounts(filter);
    }

    /**
     * Get accounts by type
     */
    static async getAccountsByType(type) {
        return await Account.getByType(type);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ✅ FIXED: updateBalance - يتعامل مع string ObjectId ويحسب الرصيد صح
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * ✅ FIXED: Update account balance from journal entry
     * - يتعامل مع string ObjectId
     * - يحسب الرصيد الحالي صحيحاً
     * - يحدث totalDebits و totalCredits
     */
    static async updateBalance(accountId, debitAmount, creditAmount, updateParents = false) {
        const mongoose = require("mongoose");

        // Convert to ObjectId if string
        const id = typeof accountId === "string" ? new mongoose.Types.ObjectId(accountId) : accountId;

        const account = await Account.findById(id);
        if (!account) {
            throw new Error("الحساب غير موجود");
        }

        if (!account.allowTransactions) {
            throw new Error("لا يمكن إجراء حركات على هذا الحساب");
        }

        // ✅ تحديث إجمالي المدين والدائن
        account.totalDebits += (debitAmount || 0);
        account.totalCredits += (creditAmount || 0);

        // ✅ إعادة حساب الرصيد الحالي
        if (account.normalBalance === "debit") {
            // للحسابات المدينة: الرصيد = الافتتاحي + المدين - الدائن
            account.currentBalance = account.openingBalance + account.totalDebits - account.totalCredits;
        } else {
            // للحسابات الدائنة: الرصيد = الافتتاحي + الدائن - المدين
            account.currentBalance = account.openingBalance + account.totalCredits - account.totalDebits;
        }

        await account.save();

        // Update parent balances recursively (optional - skip for performance)
        if (updateParents && account.parent) {
            this.updateParentBalance(account.parent).catch(err =>
                console.error("Parent balance update error:", err.message)
            );
        }

        return account;
    }

    /**
     * ✅ FIXED: Reverse account balance (for unposting)
     */
    static async reverseBalance(accountId, debitAmount, creditAmount) {
        return await this.updateBalance(accountId, -(debitAmount || 0), -(creditAmount || 0));
    }

    /**
     * ✅ NEW: Reset account balance (remove opening balance effects)
     */
    static async resetBalance(accountId) {
        const account = await Account.findById(accountId);
        if (!account) {
            throw new Error("الحساب غير موجود");
        }

        account.openingBalance = 0;
        account.totalDebits = 0;
        account.totalCredits = 0;
        account.currentBalance = 0;

        await account.save();
        return account;
    }

    /**
     * Update opening balance for an account
     */
    static async updateOpeningBalance(accountId, newOpeningBalance) {
        const account = await Account.findById(accountId);
        if (!account) {
            throw new Error("الحساب غير موجود");
        }

        const oldOpeningBalance = account.openingBalance;
        const diff = newOpeningBalance - oldOpeningBalance;

        account.openingBalance = newOpeningBalance;

        if (account.normalBalance === "debit") {
            account.currentBalance = account.openingBalance + account.totalDebits - account.totalCredits;
        } else {
            account.currentBalance = account.openingBalance + account.totalCredits - account.totalDebits;
        }

        await account.save();
        return account;
    }

    /**
     * Update parent balance (recursive)
     */
    static async updateParentBalance(parentId) {
        if (!parentId) return;

        const parent = await Account.findById(parentId);
        if (!parent) return;

        const children = await Account.find({ parent: parentId });

        let totalDebits = 0;
        let totalCredits = 0;

        children.forEach(child => {
            totalDebits += child.totalDebits;
            totalCredits += child.totalCredits;
        });

        parent.totalDebits = totalDebits;
        parent.totalCredits = totalCredits;

        if (parent.normalBalance === "debit") {
            parent.currentBalance = parent.openingBalance + totalDebits - totalCredits;
        } else {
            parent.currentBalance = parent.openingBalance + totalCredits - totalDebits;
        }

        await parent.save();

        // Recursively update higher parents
        if (parent.parent) {
            await this.updateParentBalance(parent.parent);
        }
    }

    /**
     * Get account statement
     */
    static async getAccountStatement(accountId, fromDate, toDate) {
        const JournalLine = require("../Models/JournalLineSchema");

        const query = { account: accountId };
        if (fromDate || toDate) {
            query.date = {};
            if (fromDate) query.date.$gte = new Date(fromDate);
            if (toDate) query.date.$lte = new Date(toDate);
        }

        const lines = await JournalLine.find(query)
            .populate({
                path: "journalEntry",
                select: "date reference description"
            })
            .populate("account", "code name")
            .sort({ "journalEntry.date": 1 })
            .lean();

        let runningBalance = 0;
        const statement = lines.map(line => {
            runningBalance += (line.debit || 0) - (line.credit || 0);
            return {
                date: line.journalEntry ? line.journalEntry.date : null,
                reference: line.journalEntry ? line.journalEntry.reference : null,
                description: (line.journalEntry ? line.journalEntry.description : null) || line.description,
                debit: line.debit || 0,
                credit: line.credit || 0,
                balance: runningBalance
            };
        });

        return statement;
    }

    /**
     * Search accounts
     */
    static async searchAccounts(keyword) {
        const regex = new RegExp(keyword, "i");
        return await Account.find({
            isActive: true,
            $or: [
                { name: regex },
                { code: regex },
                { category: regex }
            ]
        }).sort({ code: 1 }).limit(50);
    }
    // =============================================
    // AccountService - ADDON METHODS
    // Add these two methods to your existing AccountService class
    // BEFORE the "module.exports" line
    // =============================================

    /**
     * Update account balance after a transaction (for Journal Entries & Invoices)
     * @param {string} accountId - Account ID (ObjectId)
     * @param {number} debit - Debit amount to add
     * @param {number} credit - Credit amount to add
     */
    static async updateBalance(accountId, debit, credit) {
        if (!accountId) return;

        const account = await Account.findById(accountId);
        if (!account) {
            console.warn(`⚠️ Account not found: ${accountId}`);
            return;
        }

        // Update totals
        account.totalDebits = (account.totalDebits || 0) + debit;
        account.totalCredits = (account.totalCredits || 0) + credit;

        // Calculate current balance based on normal balance
        if (account.normalBalance === "debit") {
            account.currentBalance = account.openingBalance + account.totalDebits - account.totalCredits;
        } else {
            account.currentBalance = account.openingBalance + account.totalCredits - account.totalDebits;
        }

        await account.save();
        console.log(`✅ Updated balance for ${account.code} - ${account.name}: ${account.currentBalance.toFixed(2)}`);
    }

    /**
     * Get current account balance
     * @param {string} accountId - Account ID
     * @returns {number} Current balance
     */
    static async getBalance(accountId) {
        const account = await Account.findById(accountId).lean();
        if (!account) return 0;
        return account.currentBalance || 0;
    }
}


module.exports = AccountService;