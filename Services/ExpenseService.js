const Expense = require("../Models/ExpenseSchema");
const Account = require("../Models/AccountSchema");
const AccountService = require("./AccountService");

class ExpenseService {
    /**
     * Get all expenses with optional filtering
     */
    static async getAllExpenses(filters = {}) {
        const query = { isHidden: false };

        if (filters.isActive !== undefined) query.isActive = filters.isActive;
        if (filters.type) query.type = filters.type;
        if (filters.search) {
            query.$or = [
                { name: { $regex: filters.search, $options: "i" } },
                { code: { $regex: filters.search, $options: "i" } }
            ];
        }

        const expenses = await Expense.find(query)
            .populate("parent", "code name type")
            .populate("linkedAccount", "code name currentBalance level")
            .sort({ linkedAccountCode: 1 })
            .lean();

        return expenses;
    }

    /**
     * Get main expenses (parents) for dropdown
     */
    static async getMainExpenses() {
        return await Expense.find({
            type: "main",
            isHidden: false,
            isActive: true
        })
            .select("code name linkedAccountCode")
            .sort({ linkedAccountCode: 1 })
            .lean();
    }

    /**
     * Get expense by ID
     */
    static async getExpenseById(id) {
        const expense = await Expense.findById(id)
            .populate("parent", "code name type linkedAccountCode")
            .populate("linkedAccount", "code name currentBalance totalDebits totalCredits");

        if (!expense) {
            throw new Error("المصروف غير موجود");
        }

        return expense;
    }

    /**
     * Get expense by code
     */
    static async getExpenseByCode(code) {
        const expense = await Expense.findOne({ code: code.trim(), isHidden: false })
            .populate("linkedAccount", "code name currentBalance");

        if (!expense) {
            throw new Error("المصروف غير موجود");
        }

        return expense;
    }

    /**
     * Create new expense + auto-create linked account in Chart of Accounts
     */
    static async createExpense(data) {
        const { name, type, parent, description } = data;

        // ── التحقق من البيانات ──
        if (!name || !name.trim()) {
            throw new Error("اسم المصروف مطلوب");
        }

        // ── توليد كود المصروف تلقائياً (EXP-001, EXP-002...) ──
        const code = await this.getNextCode();

        // ── التحقق من عدم تكرار الاسم ──
        const existingName = await Expense.findOne({
            name: { $regex: new RegExp("^" + name.trim() + "$", "i") }
        });
        if (existingName) {
            throw new Error('اسم المصروف ' + name + ' مستخدم بالفعل');
        }

        let parentData = null;
        let parentAccount = null;

        // ── لو مصروف فرعي، نتحقق من وجود الأب ──
        if (type === "sub" && parent) {
            parentData = await Expense.findById(parent);
            if (!parentData) {
                throw new Error("عنصر الأب غير موجود");
            }
            if (parentData.type !== "main") {
                throw new Error("عنصر الأب يجب أن يكون من نوع رئيسي");
            }

            // نجيب حساب الأب في شجرة الحسابات
            parentAccount = await Account.findById(parentData.linkedAccount);
            if (!parentAccount) {
                throw new Error("حساب الأب غير موجود في شجرة الحسابات");
            }
        }

        // ── إنشاء المصروف أولاً (بدون ربط الحساب) ──
        const expense = await Expense.create({
            code: code,
            name: name.trim(),
            type: type || "sub",
            parent: type === "sub" ? parent : null,
            parentAccountCode: parentData ? parentData.linkedAccountCode : null,
            linkedAccount: null,
            linkedAccountCode: null,
            description: description ? description.trim() : "",
            isActive: true,
            isHidden: false
        });

        // ── إنشاء حساب مرتبط في شجرة الحسابات ──
        let linkedAccount = null;
        try {
            if (type === "main") {
                // ── مصروف رئيسي: ننشئ حساب مستوى 2 تحت 43 (المصروفات) ──
                const expensesParentAccount = await Account.findOne({ code: "43" }).lean();
                if (!expensesParentAccount) {
                    throw new Error("حساب الأب '43 - المصروفات' غير موجود في شجرة الحسابات");
                }

                // نولد كود الحساب من شجرة الحسابات (مثال: 4301, 4302, 4303...)
                const nextAccountCode = await this.getNextAccountCode("43");

                linkedAccount = await AccountService.createLinkedAccount("expense", {
                    entityId: expense._id,
                    entityCode: expense.code,
                    entityName: expense.name,
                    parentCode: "43",
                    customCode: nextAccountCode,
                    level: 2,
                    category: "operating_expenses"
                });

            } else {
                // ── مصروف فرعي: ننشئ حساب مستوى 3 أو 4 تحت الأب ──
                const nextSubCode = await this.getNextAccountCode(parentAccount.code);

                linkedAccount = await AccountService.createLinkedAccount("expense", {
                    entityId: expense._id,
                    entityCode: expense.code,
                    entityName: expense.name,
                    parentCode: parentAccount.code,
                    customCode: nextSubCode,
                    level: parentAccount.level + 1,
                    category: "operating_expenses"
                });
            }

            // ── تحديث المصروف بربط الحساب ──
            expense.linkedAccount = linkedAccount._id;
            expense.linkedAccountCode = linkedAccount.code;
            await expense.save();

        } catch (accountError) {
            // في حالة فشل إنشاء الحساب، نحذف المصروف ونرجع الخطأ
            await Expense.findByIdAndDelete(expense._id);
            throw new Error("فشل إنشاء حساب المصروف في شجرة الحسابات: " + accountError.message);
        }

        return await Expense.findById(expense._id)
            .populate("linkedAccount", "code name currentBalance")
            .populate("parent", "code name");
    }

    /**
     * Update expense
     */
    static async updateExpense(id, data) {
        const expense = await Expense.findById(id);
        if (!expense) {
            throw new Error("المصروف غير موجود");
        }

        // ── تحديث الحقول ──
        if (data.name) expense.name = data.name.trim();
        if (data.description !== undefined) expense.description = data.description.trim();
        if (data.isActive !== undefined) expense.isActive = data.isActive;

        // ── ما ينفعش تغيير النوع من رئيسي لفرعي أو العكس لو فيه أبناء ──
        if (data.type && data.type !== expense.type) {
            if (expense.type === "main") {
                const hasChildren = await Expense.countDocuments({ parent: expense._id });
                if (hasChildren > 0) {
                    throw new Error("لا يمكن تغيير نوع المصروف لوجود مصروفات فرعية مرتبطة به");
                }
            }
            expense.type = data.type;
        }

        await expense.save();

        // ── تحديث اسم الحساب المرتبط إذا تغير اسم المصروف ──
        if (data.name && expense.linkedAccount) {
            await Account.findByIdAndUpdate(expense.linkedAccount, {
                name: data.name.trim()
            });
        }

        return await Expense.findById(expense._id)
            .populate("linkedAccount", "code name currentBalance")
            .populate("parent", "code name");
    }

    /**
     * Soft delete expense (hide)
     */
    static async hideExpense(id) {
        const expense = await Expense.findById(id);
        if (!expense) {
            throw new Error("المصروف غير موجود");
        }

        // ── التحقق من عدم وجود حركات مالية ──
        if (expense.linkedAccount) {
            const account = await Account.findById(expense.linkedAccount);
            if (account && (account.totalDebits > 0 || account.totalCredits > 0)) {
                expense.isHidden = true;
                await expense.save();
                return { message: "تم إخفاء المصروف (يوجد حركات مالية عليه)", hidden: true };
            }
        }

        // ── لو مصروف رئيسي، نتحقق من عدم وجود أبناء ──
        if (expense.type === "main") {
            const children = await Expense.countDocuments({ parent: expense._id, isHidden: false });
            if (children > 0) {
                throw new Error("لا يمكن إخفاء المصروف الرئيسي لوجود مصروفات فرعية مرتبطة به");
            }
        }

        // ── إخفاء المصروف ──
        expense.isHidden = true;
        expense.isActive = false;
        await expense.save();

        // ── إخفاء الحساب المرتبط ──
        if (expense.linkedAccount) {
            await Account.findByIdAndUpdate(expense.linkedAccount, { isActive: false });
        }

        return { message: "تم إخفاء المصروف بنجاح", hidden: true };
    }

    /**
     * Restore hidden expense
     */
    static async restoreExpense(id) {
        const expense = await Expense.findById(id);
        if (!expense) {
            throw new Error("المصروف غير موجود");
        }

        expense.isHidden = false;
        expense.isActive = true;
        await expense.save();

        // ── إعادة تفعيل الحساب المرتبط ──
        if (expense.linkedAccount) {
            await Account.findByIdAndUpdate(expense.linkedAccount, { isActive: true });
        }

        return { message: "تم إظهار المصروف بنجاح", restored: true };
    }

    /**
     * Hard delete expense (only if no transactions)
     */
    static async deleteExpense(id) {
        const expense = await Expense.findById(id);
        if (!expense) {
            throw new Error("المصروف غير موجود");
        }

        // ── التحقق من عدم وجود حركات مالية ──
        if (expense.linkedAccount) {
            const account = await Account.findById(expense.linkedAccount);
            if (account && (account.totalDebits > 0 || account.totalCredits > 0)) {
                throw new Error("لا يمكن حذف المصروف لوجود حركات مالية مسجلة عليه");
            }

            // ── حذف الحساب المرتبط ──
            await Account.findByIdAndDelete(expense.linkedAccount);
        }

        // ── لو مصروف رئيسي، نحذف الأبناء لو مالهاش حركات ──
        if (expense.type === "main") {
            const children = await Expense.find({ parent: expense._id });
            for (const child of children) {
                if (child.linkedAccount) {
                    const childAccount = await Account.findById(child.linkedAccount);
                    if (childAccount && (childAccount.totalDebits > 0 || childAccount.totalCredits > 0)) {
                        throw new Error("لا يمكن حذف المصروف لوجود حركات على أحد المصروفات الفرعية");
                    }
                    await Account.findByIdAndDelete(child.linkedAccount);
                }
                await Expense.findByIdAndDelete(child._id);
            }
        }

        // ── حذف المصروف ──
        await Expense.findByIdAndDelete(id);

        return { message: "تم حذف المصروف نهائياً" };
    }

    /**
     * Search expenses
     */
    static async searchExpenses(keyword) {
        const regex = new RegExp(keyword, "i");
        return await Expense.find({
            isHidden: false,
            $or: [
                { name: regex },
                { code: regex }
            ]
        })
            .populate("linkedAccount", "code name currentBalance")
            .populate("parent", "code name")
            .sort({ linkedAccountCode: 1 })
            .limit(50);
    }

    /**
     * ✅ Get next available account code in Chart of Accounts
     * بتولد كود حساب جديد في شجرة الحسابات مع التأكد إنه مش مستخدم
     * 
     * parentCode: كود الحساب الأب (مثال: "43" للمصروفات الرئيسية، "4301" للفرعية)
     */
    static async getNextAccountCode(parentCode) {
        // نجيب كل الحسابات اللي أبوها = parentCode
        const accounts = await Account.find({
            parentCode: parentCode
        })
            .sort({ code: -1 })
            .lean();

        if (accounts.length === 0) {
            // أول حساب: نضيف 01 للأب
            return parentCode + "01";
        }

        // نجيب آخر كود ونزود عليه
        const lastCode = accounts[0].code;
        const lastNum = parseInt(lastCode.slice(-2));
        const baseCode = lastCode.slice(0, -2);
        
        let nextNum = lastNum + 1;
        let nextCode = baseCode + String(nextNum).padStart(2, "0");

        // ✅ نتأكد إن الكود الجديد مش مستخدم (loop لحد ما نلاقي كود فاضي)
        let isUsed = await Account.findOne({ code: nextCode }).lean();
        while (isUsed) {
            nextNum++;
            nextCode = baseCode + String(nextNum).padStart(2, "0");
            isUsed = await Account.findOne({ code: nextCode }).lean();
        }

        return nextCode;
    }

    /**
     * ✅ Get next available expense code (like EXP-001)
     */
    static async getNextCode() {
        const expenses = await Expense.find({})
            .sort({ createdAt: -1 })
            .limit(1);

        if (expenses.length === 0) {
            return "EXP-001";
        }

        const lastCode = expenses[0].code;
        
        // لو الكود القديم رقمي (من نظام قديم)، نبدأ من جديد
        if (/^\d+$/.test(lastCode)) {
            return "EXP-001";
        }
        
        const match = lastCode.match(/(\d+)/);
        if (match) {
            const lastNumber = parseInt(match[0]);
            return "EXP-" + String(lastNumber + 1).padStart(3, "0");
        }

        return "EXP-001";
    }

    /**
     * Get expense statistics
     */
    static async getStats() {
        const total = await Expense.countDocuments({ isHidden: false });
        const main = await Expense.countDocuments({ isHidden: false, type: "main" });
        const sub = await Expense.countDocuments({ isHidden: false, type: "sub" });
        const active = await Expense.countDocuments({ isHidden: false, isActive: true });

        return {
            total,
            main,
            sub,
            active
        };
    }
}

module.exports = ExpenseService;