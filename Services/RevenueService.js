const Revenue = require("../Models/RevenueSchema");
const Account = require("../Models/AccountSchema");
const AccountService = require("./AccountService");

class RevenueService {
    /**
     * Get all revenues with optional filtering
     */
    static async getAllRevenues(filters = {}) {
        const query = { isHidden: false };

        if (filters.isActive !== undefined) query.isActive = filters.isActive;
        if (filters.type) query.type = filters.type;
        if (filters.search) {
            query.$or = [
                { name: { $regex: filters.search, $options: "i" } },
                { code: { $regex: filters.search, $options: "i" } }
            ];
        }

        const revenues = await Revenue.find(query)
            .populate("parent", "code name type")
            .populate("linkedAccount", "code name currentBalance level")
            .sort({ linkedAccountCode: 1 })
            .lean();

        return revenues;
    }

    /**
     * Get main revenues (parents) for dropdown
     */
    static async getMainRevenues() {
        return await Revenue.find({
            type: "main",
            isHidden: false,
            isActive: true
        })
            .select("code name linkedAccountCode")
            .sort({ linkedAccountCode: 1 })
            .lean();
    }

    /**
     * Get revenue by ID
     */
    static async getRevenueById(id) {
        const revenue = await Revenue.findById(id)
            .populate("parent", "code name type linkedAccountCode")
            .populate("linkedAccount", "code name currentBalance totalDebits totalCredits");

        if (!revenue) {
            throw new Error("الإيراد غير موجود");
        }

        return revenue;
    }

    /**
     * Get revenue by code
     */
    static async getRevenueByCode(code) {
        const revenue = await Revenue.findOne({ code: code.trim(), isHidden: false })
            .populate("linkedAccount", "code name currentBalance");

        if (!revenue) {
            throw new Error("الإيراد غير موجود");
        }

        return revenue;
    }

    /**
     * Create new revenue + auto-create linked account in Chart of Accounts
     */
    static async createRevenue(data) {
        const { name, type, parent, description } = data;

        // ── التحقق من البيانات ──
        if (!name || !name.trim()) {
            throw new Error("اسم الإيراد مطلوب");
        }

        // ── توليد كود الإيراد تلقائياً (REV-001, REV-002...) ──
        const code = await this.getNextCode();

        // ── التحقق من عدم تكرار الاسم ──
        const existingName = await Revenue.findOne({
            name: { $regex: new RegExp("^" + name.trim() + "$", "i") }
        });
        if (existingName) {
            throw new Error('اسم الإيراد ' + name + ' مستخدم بالفعل');
        }

        let parentData = null;
        let parentAccount = null;

        // ── لو إيراد فرعي، نتحقق من وجود الأب ──
        if (type === "sub" && parent) {
            parentData = await Revenue.findById(parent);
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

        // ── إنشاء الإيراد أولاً (بدون ربط الحساب) ──
        const revenue = await Revenue.create({
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
                // ── إيراد رئيسي: ننشئ حساب مستوى 2 تحت 32 (الإيرادات) ──
                const revenuesParentAccount = await Account.findOne({ code: "32" }).lean();
                if (!revenuesParentAccount) {
                    throw new Error("حساب الأب '32 - الإيرادات' غير موجود في شجرة الحسابات");
                }

                // نولد كود الحساب من شجرة الحسابات (مثال: 3201, 3202, 3203...)
                const nextAccountCode = await this.getNextAccountCode("32");

                linkedAccount = await AccountService.createLinkedAccount("revenue", {
                    entityId: revenue._id,
                    entityCode: revenue.code,
                    entityName: revenue.name,
                    parentCode: "32",
                    customCode: nextAccountCode,
                    level: 2,
                    category: "operating_revenues"
                });

            } else {
                // ── إيراد فرعي: ننشئ حساب مستوى 3 أو 4 تحت الأب ──
                const nextSubCode = await this.getNextAccountCode(parentAccount.code);

                linkedAccount = await AccountService.createLinkedAccount("revenue", {
                    entityId: revenue._id,
                    entityCode: revenue.code,
                    entityName: revenue.name,
                    parentCode: parentAccount.code,
                    customCode: nextSubCode,
                    level: parentAccount.level + 1,
                    category: "operating_revenues"
                });
            }

            // ── تحديث الإيراد بربط الحساب ──
            revenue.linkedAccount = linkedAccount._id;
            revenue.linkedAccountCode = linkedAccount.code;
            await revenue.save();

        } catch (accountError) {
            // في حالة فشل إنشاء الحساب، نحذف الإيراد ونرجع الخطأ
            await Revenue.findByIdAndDelete(revenue._id);
            throw new Error("فشل إنشاء حساب الإيراد في شجرة الحسابات: " + accountError.message);
        }

        return await Revenue.findById(revenue._id)
            .populate("linkedAccount", "code name currentBalance")
            .populate("parent", "code name");
    }

    /**
     * Update revenue
     */
    static async updateRevenue(id, data) {
        const revenue = await Revenue.findById(id);
        if (!revenue) {
            throw new Error("الإيراد غير موجود");
        }

        // ── تحديث الحقول ──
        if (data.name) revenue.name = data.name.trim();
        if (data.description !== undefined) revenue.description = data.description.trim();
        if (data.isActive !== undefined) revenue.isActive = data.isActive;

        // ── ما ينفعش تغيير النوع من رئيسي لفرعي أو العكس لو فيه أبناء ──
        if (data.type && data.type !== revenue.type) {
            if (revenue.type === "main") {
                const hasChildren = await Revenue.countDocuments({ parent: revenue._id });
                if (hasChildren > 0) {
                    throw new Error("لا يمكن تغيير نوع الإيراد لوجود إيرادات فرعية مرتبطة به");
                }
            }
            revenue.type = data.type;
        }

        await revenue.save();

        // ── تحديث اسم الحساب المرتبط إذا تغير اسم الإيراد ──
        if (data.name && revenue.linkedAccount) {
            await Account.findByIdAndUpdate(revenue.linkedAccount, {
                name: data.name.trim()
            });
        }

        return await Revenue.findById(revenue._id)
            .populate("linkedAccount", "code name currentBalance")
            .populate("parent", "code name");
    }

    /**
     * Soft delete revenue (hide)
     */
    static async hideRevenue(id) {
        const revenue = await Revenue.findById(id);
        if (!revenue) {
            throw new Error("الإيراد غير موجود");
        }

        // ── التحقق من عدم وجود حركات مالية ──
        if (revenue.linkedAccount) {
            const account = await Account.findById(revenue.linkedAccount);
            if (account && (account.totalDebits > 0 || account.totalCredits > 0)) {
                revenue.isHidden = true;
                await revenue.save();
                return { message: "تم إخفاء الإيراد (يوجد حركات مالية عليه)", hidden: true };
            }
        }

        // ── لو إيراد رئيسي، نتحقق من عدم وجود أبناء ──
        if (revenue.type === "main") {
            const children = await Revenue.countDocuments({ parent: revenue._id, isHidden: false });
            if (children > 0) {
                throw new Error("لا يمكن إخفاء الإيراد الرئيسي لوجود إيرادات فرعية مرتبطة به");
            }
        }

        // ── إخفاء الإيراد ──
        revenue.isHidden = true;
        revenue.isActive = false;
        await revenue.save();

        // ── إخفاء الحساب المرتبط ──
        if (revenue.linkedAccount) {
            await Account.findByIdAndUpdate(revenue.linkedAccount, { isActive: false });
        }

        return { message: "تم إخفاء الإيراد بنجاح", hidden: true };
    }

    /**
     * Restore hidden revenue
     */
    static async restoreRevenue(id) {
        const revenue = await Revenue.findById(id);
        if (!revenue) {
            throw new Error("الإيراد غير موجود");
        }

        revenue.isHidden = false;
        revenue.isActive = true;
        await revenue.save();

        // ── إعادة تفعيل الحساب المرتبط ──
        if (revenue.linkedAccount) {
            await Account.findByIdAndUpdate(revenue.linkedAccount, { isActive: true });
        }

        return { message: "تم إظهار الإيراد بنجاح", restored: true };
    }

    /**
     * Hard delete revenue (only if no transactions)
     */
    static async deleteRevenue(id) {
        const revenue = await Revenue.findById(id);
        if (!revenue) {
            throw new Error("الإيراد غير موجود");
        }

        // ── التحقق من عدم وجود حركات مالية ──
        if (revenue.linkedAccount) {
            const account = await Account.findById(revenue.linkedAccount);
            if (account && (account.totalDebits > 0 || account.totalCredits > 0)) {
                throw new Error("لا يمكن حذف الإيراد لوجود حركات مالية مسجلة عليه");
            }

            // ── حذف الحساب المرتبط ──
            await Account.findByIdAndDelete(revenue.linkedAccount);
        }

        // ── لو إيراد رئيسي، نحذف الأبناء لو مالهاش حركات ──
        if (revenue.type === "main") {
            const children = await Revenue.find({ parent: revenue._id });
            for (const child of children) {
                if (child.linkedAccount) {
                    const childAccount = await Account.findById(child.linkedAccount);
                    if (childAccount && (childAccount.totalDebits > 0 || childAccount.totalCredits > 0)) {
                        throw new Error("لا يمكن حذف الإيراد لوجود حركات على أحد الإيرادات الفرعية");
                    }
                    await Account.findByIdAndDelete(child.linkedAccount);
                }
                await Revenue.findByIdAndDelete(child._id);
            }
        }

        // ── حذف الإيراد ──
        await Revenue.findByIdAndDelete(id);

        return { message: "تم حذف الإيراد نهائياً" };
    }

    /**
     * Search revenues
     */
    static async searchRevenues(keyword) {
        const regex = new RegExp(keyword, "i");
        return await Revenue.find({
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
     * parentCode: كود الحساب الأب (مثال: "32" للإيرادات الرئيسية، "3201" للفرعية)
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
     * ✅ Get next available revenue code (like REV-001)
     */
    static async getNextCode() {
        const revenues = await Revenue.find({})
            .sort({ createdAt: -1 })
            .limit(1);

        if (revenues.length === 0) {
            return "REV-001";
        }

        const lastCode = revenues[0].code;
        
        // لو الكود القديم رقمي (من نظام قديم)، نبدأ من جديد
        if (/^\d+$/.test(lastCode)) {
            return "REV-001";
        }
        
        const match = lastCode.match(/(\d+)/);
        if (match) {
            const lastNumber = parseInt(match[0]);
            return "REV-" + String(lastNumber + 1).padStart(3, "0");
        }

        return "REV-001";
    }

    /**
     * Get revenue statistics
     */
    static async getStats() {
        const total = await Revenue.countDocuments({ isHidden: false });
        const main = await Revenue.countDocuments({ isHidden: false, type: "main" });
        const sub = await Revenue.countDocuments({ isHidden: false, type: "sub" });
        const active = await Revenue.countDocuments({ isHidden: false, isActive: true });

        return {
            total,
            main,
            sub,
            active
        };
    }
}

module.exports = RevenueService;