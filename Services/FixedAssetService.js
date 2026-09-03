// Services/FixedAssetService.js
const FixedAsset = require("../Models/FixedAssetSchema");
const JournalEntry = require("../Models/JournalEntrySchema");
const JournalLine = require("../Models/JournalLineSchema");
const Account = require("../Models/AccountSchema");
const AccountService = require("./AccountService");

// ═══════════════════════════════════════════════════════
//    Helper: جلب حساب بالكود
// ═══════════════════════════════════════════════════════
async function getAccountByCode(code) {
    try {
        const account = await Account.findOne({ code: code.trim() }).lean();
        return account ? account._id : null;
    } catch (error) {
        console.error("Error finding account by code:", error.message);
        return null;
    }
}

// ═══════════════════════════════════════════════════════
//    Helper: توليد رقم القيد التالي
// ═══════════════════════════════════════════════════════
async function getNextJournalEntryNo() {
    const lastEntry = await JournalEntry.findOne({ entryNo: { $regex: /^JV-/ } })
        .sort({ createdAt: -1 })
        .limit(1);

    if (!lastEntry) return "JV-0001";

    const match = lastEntry.entryNo.match(/JV-(\d+)/);
    if (match) {
        const nextNum = parseInt(match[1]) + 1;
        return "JV-" + String(nextNum).padStart(4, "0");
    }
    return "JV-0001";
}

// ═══════════════════════════════════════════════════════
//    Helper: إنشاء قيد يومي
// ═══════════════════════════════════════════════════════
async function createJournalEntry(data) {
    const {
        description,
        date,
        branch,
        lines,
        source = "fixed_asset",
        sourceId = null,
        type = "auto",
        reference = ""
    } = data;

    const entryNo = await getNextJournalEntryNo();

    const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
    const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
        throw new Error("القيد غير متوازن");
    }

    const entry = await JournalEntry.create({
        entryNo,
        date: date || new Date(),
        description,
        branch: branch || null,
        totalDebit,
        totalCredit,
        difference: 0,
        status: "posted",
        type,
        source,
        sourceId: sourceId ? String(sourceId) : null,
        reference: reference,
        isPosted: true,
        postedAt: new Date()
    });

    // Create journal lines
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        let accountId = line.accountId || null;

        if (!accountId && line.accountCode) {
            accountId = await getAccountByCode(line.accountCode);
        }

        await JournalLine.create({
            journalEntry: entry._id,
            account: accountId,
            accountCode: line.accountCode || "",
            accountName: line.accountName || "",
            description: line.description || description,
            debit: line.debit || 0,
            credit: line.credit || 0,
            date: entry.date,
            branch: entry.branch || null,
            sortOrder: i + 1
        });
    }

    // Update account balances
    for (const line of lines) {
        if (AccountService && AccountService.updateBalance) {
            try {
                let accountId = line.accountId;
                if (!accountId && line.accountCode) {
                    const acc = await Account.findOne({ code: line.accountCode.trim() }).lean();
                    if (acc) accountId = acc._id;
                }
                if (accountId) {
                    await AccountService.updateBalance(
                        accountId,
                        line.debit || 0,
                        line.credit || 0
                    );
                }
            } catch (balanceError) {
                console.error("⚠️ فشل تحديث رصيد الحساب:", balanceError.message);
            }
        }
    }

    return entry;
}

// ═══════════════════════════════════════════════════════
//    Helper: إنشاء قيد شراء أصل جديد
// ═══════════════════════════════════════════════════════
async function createPurchaseJournal(asset) {
    const accountNames = {
        "110200": "أراضي",
        "110201": "مباني",
        "110202": "سيارات",
        "110203": "أثاث وتجهيزات",
        "110204": "حاسب آلي وطابعات",
        "110205": "تحسينات على المأجور",
        "110206": "آلات ومعدات"
    };

    const assetAccountName = accountNames[asset.assetAccountCode] || asset.assetAccountCode;

    // تحديد اسم حساب الدفع
    let paymentAccountName = "حساب الدفع";
    const paymentNames = {
        "120100": "الصندوق",
        "120200": "البنك",
        "220100": "دائنون"
    };
    paymentAccountName = paymentNames[asset.paymentAccountCode] || paymentAccountName;

    // ✅ جلب اسم المورد لو كان الشراء آجل
    let supplierName = "";
    let creditDescription = `دفع ثمن ${asset.name}`;
    if (asset.paymentMethod === "credit" && asset.paymentEntityId) {
        try {
            const Supplier = require("../Models/SupplierSchema");
            const supplier = await Supplier.findById(asset.paymentEntityId).lean();
            if (supplier) {
                supplierName = supplier.name || supplier.fullName || "";
                creditDescription = `شراء ${asset.name} من ${supplierName} - آجل`;
                paymentAccountName = supplierName;
            }
        } catch (e) {
            console.error("⚠️ فشل جلب اسم المورد:", e.message);
        }
    }

    const journalEntry = await createJournalEntry({
        description: `شراء ${assetAccountName} - ${asset.name}`,
        date: asset.purchaseDate || new Date(),
        branch: asset.branch || null,
        source: "fixed_asset_purchase",
        sourceId: asset._id,
        type: "auto",
        reference: asset.code,
        lines: [
            {
                accountCode: asset.assetAccountCode,
                accountName: assetAccountName,
                debit: asset.originalValue,
                credit: 0,
                description: `شراء ${asset.name}`
            },
            {
                accountCode: asset.paymentAccountCode,
                accountName: paymentAccountName,
                debit: 0,
                credit: asset.originalValue,
                description: creditDescription
            }
        ]
    });

    return journalEntry;
}

// ═══════════════════════════════════════════════════════
//    Helper: إنشاء قيد افتتاحي لأصل موجود
// ═══════════════════════════════════════════════════════
async function createOpeningJournal(asset) {
    const accountNames = {
        "110200": "أراضي",
        "110201": "مباني",
        "110202": "سيارات",
        "110203": "أثاث وتجهيزات",
        "110204": "حاسب آلي وطابعات",
        "110205": "تحسينات على المأجور",
        "110206": "آلات ومعدات"
    };

    const assetAccountName = accountNames[asset.assetAccountCode] || asset.assetAccountCode;

    // ✅ حساب الإهلاك المجمع ديناميكياً للأصول الموجودة
    const dynamic = calculateDynamicDepreciation(asset);
    const accumulatedDepreciation = dynamic.accumulatedDepreciation;
    const bookValue = dynamic.bookValue;

    // بناء سطور القيد
    const lines = [
        {
            accountCode: asset.assetAccountCode,
            accountName: assetAccountName,
            debit: asset.originalValue,
            credit: 0,
            description: `أصل موجود - ${asset.name}`
        }
    ];

    // ✅ إضافة سطر مجمع الإهلاك لو فيه إهلاك مجمع
    if (accumulatedDepreciation > 0) {
        lines.push({
            accountCode: "110207",
            accountName: "مجمع إهلاك الأصول الثابتة",
            debit: 0,
            credit: accumulatedDepreciation,
            description: `إهلاك مجمع - ${asset.name}`
        });
    }

    // ✅ رأس المال = القيمة الدفترية (الأصلية - الإهلاك المجمع)
    lines.push({
        accountCode: "210100",
        accountName: "رأس المال",
        debit: 0,
        credit: bookValue,
        description: `قيد افتتاحي - ${asset.name}`
    });

    // ✅ تاريخ القيد الافتتاحي = بداية السنة الحالية
    const currentYear = new Date().getFullYear();
    const openingDate = new Date(currentYear, 0, 1);  // 1 يناير السنة الحالية

    const journalEntry = await createJournalEntry({
        description: `قيد افتتاحي - ${assetAccountName} - ${asset.name}`,
        date: openingDate,
        branch: asset.branch || null,
        source: "fixed_asset_opening",
        sourceId: asset._id,
        type: "auto",
        reference: asset.code,
        lines: lines
    });

    return journalEntry;
}

// ═══════════════════════════════════════════════════════
//    Helper: حساب القيمة الدفترية
// ═══════════════════════════════════════════════════════
function calculateBookValue(originalValue, accumulatedDepreciation) {
    return Math.max(0, (originalValue || 0) - (accumulatedDepreciation || 0));
}

// ═══════════════════════════════════════════════════════
//    Helper: حساب الإهلاك المجمع ديناميكياً
// ═══════════════════════════════════════════════════════
function calculateDynamicDepreciation(asset) {
    const method = asset.depreciationMethod || "straight";
    const rate = Number(asset.depreciationRate) || 0;
    const originalValue = Number(asset.originalValue) || 0;
    const purchaseDate = asset.purchaseDate ? new Date(asset.purchaseDate) : null;

    if (!purchaseDate || originalValue <= 0 || rate <= 0) {
        return {
            accumulatedDepreciation: 0,
            bookValue: originalValue
        };
    }

    const now = new Date();
    const purchase = new Date(purchaseDate);

    let monthsElapsed = (now.getFullYear() - purchase.getFullYear()) * 12 + (now.getMonth() - purchase.getMonth());

    if (now.getDate() < purchase.getDate()) {
        monthsElapsed -= 1;
    }

    monthsElapsed = Math.max(0, monthsElapsed);

    let accumulatedDepreciation = 0;

    if (method === "straight") {
        const monthlyDepreciation = (originalValue * rate) / 100 / 12;
        accumulatedDepreciation = monthlyDepreciation * monthsElapsed;
    } else if (method === "declining") {
        let currentBookValue = originalValue;
        const monthlyRate = rate / 100 / 12;

        for (let i = 0; i < monthsElapsed; i++) {
            const monthDepreciation = currentBookValue * monthlyRate;
            accumulatedDepreciation += monthDepreciation;
            currentBookValue -= monthDepreciation;
            if (currentBookValue <= 0) break;
        }
    } else {
        const monthlyDepreciation = (originalValue * rate) / 100 / 12;
        accumulatedDepreciation = monthlyDepreciation * monthsElapsed;
    }

    accumulatedDepreciation = Math.min(originalValue, accumulatedDepreciation);
    const bookValue = Math.max(0, originalValue - accumulatedDepreciation);

    return {
        accumulatedDepreciation: Math.round(accumulatedDepreciation * 100) / 100,
        bookValue: Math.round(bookValue * 100) / 100
    };
}

class FixedAssetService {
    // ═══════════════════════════════════════════════════════
    //    GET ALL - جلب كل الأصول مع populate الفرع
    // ═══════════════════════════════════════════════════════
    static async getAllAssets(filters = {}) {
        const query = { isHidden: false };

        if (filters.isActive !== undefined) query.isActive = filters.isActive;
        if (filters.assetAccountCode) query.assetAccountCode = filters.assetAccountCode;
        if (filters.branch) query.branch = filters.branch;
        if (filters.search) {
            query.$or = [
                { name: { $regex: filters.search, $options: "i" } },
                { code: { $regex: filters.search, $options: "i" } }
            ];
        }

        const assets = await FixedAsset.find(query)
            .populate("branch", "name code")
            .sort({ createdAt: -1 })
            .lean();

        return assets.map(asset => {
            const dynamic = calculateDynamicDepreciation(asset);
            return {
                ...asset,
                accumulatedDepreciation: dynamic.accumulatedDepreciation,
                bookValue: dynamic.bookValue
            };
        });
    }

    // ═══════════════════════════════════════════════════════
    //    GET ONE - جلب أصل واحد مع populate الفرع
    // ═══════════════════════════════════════════════════════
    static async getAssetById(id) {
        const asset = await FixedAsset.findById(id)
            .populate("branch", "name code")
            .lean();

        if (!asset) {
            throw new Error("الأصل غير موجود");
        }

        const dynamic = calculateDynamicDepreciation(asset);
        return {
            ...asset,
            accumulatedDepreciation: dynamic.accumulatedDepreciation,
            bookValue: dynamic.bookValue
        };
    }

    // ═══════════════════════════════════════════════════════
    //    GET BY CODE - جلب بالكود
    // ═══════════════════════════════════════════════════════
    static async getAssetByCode(code) {
        const asset = await FixedAsset.findOne({ code: code.trim(), isHidden: false })
            .populate("branch", "name code")
            .lean();

        if (!asset) {
            throw new Error("الأصل غير موجود");
        }

        const dynamic = calculateDynamicDepreciation(asset);
        return {
            ...asset,
            accumulatedDepreciation: dynamic.accumulatedDepreciation,
            bookValue: dynamic.bookValue
        };
    }

    // ═══════════════════════════════════════════════════════
    //    CREATE - إنشاء أصل جديد مع القيد المحاسبي
    // ═══════════════════════════════════════════════════════
    static async createAsset(data) {
        const {
            code,
            name,
            assetType = "new",
            assetAccountCode,
            branch,
            originalValue,
            purchaseDate,
            depreciationRate,
            depreciationMethod,
            notes,
            paymentMethod,
            paymentAccountCode,
            paymentEntityId
        } = data;

        // ── التحقق من البيانات ──
        if (!name || !name.trim()) {
            throw new Error("اسم الأصل مطلوب");
        }

        if (!code || !code.trim()) {
            throw new Error("كود الأصل مطلوب");
        }

        if (!assetAccountCode || !assetAccountCode.trim()) {
            throw new Error("حساب الأصل مطلوب");
        }

        if (!assetType || !["new", "existing"].includes(assetType)) {
            throw new Error("نوع الأصل مطلوب (جديد أو موجود)");
        }

        // ── التحقق من بيانات الدفع للأصول الجديدة ──
        if (assetType === "new") {
            if (!paymentAccountCode) {
                throw new Error("يرجى اختيار حساب الدفع للأصل الجديد");
            }
        }

        const ov = Number(originalValue) || 0;
        if (ov <= 0) {
            throw new Error("القيمة الأصلية مطلوبة ويجب أن تكون أكبر من صفر");
        }

        // ── التحقق من عدم تكرار الكود ──
        const existingCode = await FixedAsset.findOne({ code: code.trim() });
        if (existingCode) {
            throw new Error("كود الأصل " + code + " مستخدم بالفعل");
        }

        // ── التحقق من عدم تكرار الاسم ──
        const existingName = await FixedAsset.findOne({
            name: { $regex: new RegExp("^" + name.trim() + "$", "i") }
        });
        if (existingName) {
            throw new Error("اسم الأصل " + name + " مستخدم بالفعل");
        }

        // ── حساب القيمة الدفترية ──
        const bookValue = calculateBookValue(ov, 0);

        // ── حساب الإهلاك المجمع والقيمة الدفترية تلقائياً ──
        let accumulatedDepreciation = 0;
        let finalBookValue = bookValue;

        if (assetType === "existing" && purchaseDate) {
            const tempAsset = {
                originalValue: ov,
                purchaseDate: new Date(purchaseDate),
                depreciationRate: Number(depreciationRate) || 10,
                depreciationMethod: depreciationMethod || "straight"
            };
            const dynamic = calculateDynamicDepreciation(tempAsset);
            accumulatedDepreciation = dynamic.accumulatedDepreciation;
            finalBookValue = dynamic.bookValue;
        }

        // ── إنشاء الأصل ──
        const asset = await FixedAsset.create({
            code: code.trim(),
            name: name.trim(),
            assetType: assetType,
            assetAccountCode: assetAccountCode.trim(),
            depreciationAccountCode: "110207",
            branch: branch || null,
            originalValue: ov,
            purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
            depreciationRate: Number(depreciationRate) || 10,
            depreciationMethod: depreciationMethod || "straight",
            accumulatedDepreciation: accumulatedDepreciation,
            bookValue: finalBookValue,
            paymentMethod: assetType === "new" ? (paymentMethod || null) : null,
            paymentAccountCode: assetType === "new" ? (paymentAccountCode || null) : null,
            paymentEntityId: assetType === "new" ? (paymentEntityId || null) : null,
            notes: notes ? notes.trim() : "",
            isActive: true,
            isHidden: false
        });

        // ── إنشاء القيد المحاسبي ──
        let journalEntry = null;
        try {
            if (assetType === "new") {
                journalEntry = await createPurchaseJournal(asset);
            } else {
                journalEntry = await createOpeningJournal(asset);
            }
        } catch (journalError) {
            console.error("❌ فشل إنشاء القيد المحاسبي:", journalError.message);
            // لا نوقف العملية لو فشل القيد، نسجل فقط
        }

        const result = await FixedAsset.findById(asset._id)
            .populate("branch", "name code")
            .lean();

        return {
            ...result,
            journalEntry: journalEntry ? {
                entryNo: journalEntry.entryNo,
                description: journalEntry.description
            } : null
        };
    }

    // ═══════════════════════════════════════════════════════
    //    UPDATE - تحديث أصل
    // ═══════════════════════════════════════════════════════
    static async updateAsset(id, data) {
        const asset = await FixedAsset.findById(id);
        if (!asset) {
            throw new Error("الأصل غير موجود");
        }

        // ── التحقق من عدم تكرار الكود إذا تغير ──
        if (data.code && data.code !== asset.code) {
            const existing = await FixedAsset.findOne({ code: data.code.trim() });
            if (existing) {
                throw new Error("كود الأصل " + data.code + " مستخدم بالفعل");
            }
            asset.code = data.code.trim();
        }

        // ── تحديث الحقول ──
        if (data.name) asset.name = data.name.trim();
        if (data.assetAccountCode) asset.assetAccountCode = data.assetAccountCode.trim();
        if (data.branch !== undefined) asset.branch = data.branch || null;
        if (data.assetType) asset.assetType = data.assetType;

        // ── تحديث القيمة الأصلية وإعادة حساب الإهلاك تلقائياً ──
        if (data.originalValue !== undefined) {
            asset.originalValue = Number(data.originalValue) || 0;
        }

        // إعادة حساب الإهلاك المجمع والقيمة الدفترية تلقائياً
        const dynamic = calculateDynamicDepreciation(asset);
        asset.accumulatedDepreciation = dynamic.accumulatedDepreciation;
        asset.bookValue = dynamic.bookValue;

        if (data.purchaseDate) asset.purchaseDate = new Date(data.purchaseDate);
        if (data.depreciationRate !== undefined) asset.depreciationRate = Number(data.depreciationRate) || 0;
        if (data.depreciationMethod) asset.depreciationMethod = data.depreciationMethod;
        if (data.paymentMethod !== undefined) asset.paymentMethod = data.paymentMethod;
        if (data.paymentAccountCode !== undefined) asset.paymentAccountCode = data.paymentAccountCode;
        if (data.paymentEntityId !== undefined) asset.paymentEntityId = data.paymentEntityId;
        if (data.notes !== undefined) asset.notes = data.notes.trim();
        if (data.isActive !== undefined) asset.isActive = data.isActive;

        await asset.save();

        return await FixedAsset.findById(asset._id)
            .populate("branch", "name code")
            .lean();
    }

    // ═══════════════════════════════════════════════════════
    //    HIDE - إخفاء (Soft Delete)
    // ═══════════════════════════════════════════════════════
    static async hideAsset(id) {
        const asset = await FixedAsset.findById(id);
        if (!asset) {
            throw new Error("الأصل غير موجود");
        }

        asset.isHidden = true;
        asset.isActive = false;
        await asset.save();

        return { message: "تم إخفاء الأصل بنجاح", hidden: true };
    }

    // ═══════════════════════════════════════════════════════
    //    RESTORE - إظهار
    // ═══════════════════════════════════════════════════════
    static async restoreAsset(id) {
        const asset = await FixedAsset.findById(id);
        if (!asset) {
            throw new Error("الأصل غير موجود");
        }

        asset.isHidden = false;
        asset.isActive = true;
        await asset.save();

        return { message: "تم إظهار الأصل بنجاح", restored: true };
    }

    // ═══════════════════════════════════════════════════════
    //    DELETE - حذف نهائي
    // ═══════════════════════════════════════════════════════
    static async deleteAsset(id) {
        const asset = await FixedAsset.findById(id);
        if (!asset) {
            throw new Error("الأصل غير موجود");
        }

        if (asset.accumulatedDepreciation > 0) {
            throw new Error("لا يمكن حذف الأصل لوجود إهلاك مسجل عليه");
        }

        await FixedAsset.findByIdAndDelete(id);

        return { message: "تم حذف الأصل نهائياً" };
    }

    // ═══════════════════════════════════════════════════════
    //    SEARCH - بحث
    // ═══════════════════════════════════════════════════════
    static async searchAssets(keyword) {
        const regex = new RegExp(keyword, "i");
        const assets = await FixedAsset.find({
            isHidden: false,
            $or: [
                { name: regex },
                { code: regex }
            ]
        })
            .populate("branch", "name code")
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        return assets.map(asset => {
            const dynamic = calculateDynamicDepreciation(asset);
            return {
                ...asset,
                accumulatedDepreciation: dynamic.accumulatedDepreciation,
                bookValue: dynamic.bookValue
            };
        });
    }

    // ═══════════════════════════════════════════════════════
    //    GET NEXT CODE - الكود التالي
    // ═══════════════════════════════════════════════════════
    static async getNextCode() {
        const assets = await FixedAsset.find({})
            .sort({ createdAt: -1 })
            .limit(1);

        if (assets.length === 0) {
            return "AST-001";
        }

        const lastCode = assets[0].code;
        const match = lastCode.match(/(\d+)/);
        if (match) {
            const lastNumber = parseInt(match[0]);
            return "AST-" + String(lastNumber + 1).padStart(3, "0");
        }

        return "AST-" + String(assets.length + 1).padStart(3, "0");
    }

    // ═══════════════════════════════════════════════════════
    //    GET STATS - إحصائيات
    // ═══════════════════════════════════════════════════════
    static async getStats() {
        const total = await FixedAsset.countDocuments({ isHidden: false });
        const active = await FixedAsset.countDocuments({ isHidden: false, isActive: true });
        const inactive = await FixedAsset.countDocuments({ isHidden: false, isActive: false });

        const assets = await FixedAsset.find({ isHidden: false }).lean();
        let totalOriginal = 0;
        let totalAccumulated = 0;
        let totalBookValue = 0;

        assets.forEach(asset => {
            const dynamic = calculateDynamicDepreciation(asset);
            totalOriginal += Number(asset.originalValue) || 0;
            totalAccumulated += dynamic.accumulatedDepreciation;
            totalBookValue += dynamic.bookValue;
        });

        return {
            total,
            active,
            inactive,
            totalOriginalValue: totalOriginal,
            totalAccumulatedDepreciation: totalAccumulated,
            totalBookValue: totalBookValue
        };
    }

    // ═══════════════════════════════════════════════════════
    //    RECORD DEPRECIATION - تسجيل إهلاك
    // ═══════════════════════════════════════════════════════
    static async recordDepreciation(id, amount) {
        const asset = await FixedAsset.findById(id);
        if (!asset) {
            throw new Error("الأصل غير موجود");
        }

        const depAmount = Number(amount);
        if (isNaN(depAmount) || depAmount <= 0) {
            throw new Error("مبلغ الإهلاك يجب أن يكون أكبر من صفر");
        }

        const newAccumulated = asset.accumulatedDepreciation + depAmount;
        if (newAccumulated > asset.originalValue) {
            throw new Error("مجمع الإهلاك لا يمكن أن يتجاوز القيمة الأصلية");
        }

        asset.accumulatedDepreciation = newAccumulated;
        asset.bookValue = calculateBookValue(asset.originalValue, newAccumulated);
        await asset.save();

        return await FixedAsset.findById(asset._id)
            .populate("branch", "name code")
            .lean();
    }

    // ═══════════════════════════════════════════════════════
    //    CALCULATE DEPRECIATION - حساب الإهلاك الحالي
    // ═══════════════════════════════════════════════════════
    static async calculateCurrentDepreciation(id) {
        const asset = await FixedAsset.findById(id);
        if (!asset) {
            throw new Error("الأصل غير موجود");
        }

        const annualDepreciation = asset.calculateAnnualDepreciation();
        const monthlyDepreciation = annualDepreciation / 12;

        let monthsElapsed = 0;
        if (asset.purchaseDate) {
            const now = new Date();
            const purchase = new Date(asset.purchaseDate);
            monthsElapsed = (now.getFullYear() - purchase.getFullYear()) * 12 + (now.getMonth() - purchase.getMonth());
            if (now.getDate() < purchase.getDate()) {
                monthsElapsed -= 1;
            }
            monthsElapsed = Math.max(0, monthsElapsed);
        }

        const currentAccumulated = Math.min(
            asset.originalValue,
            monthlyDepreciation * monthsElapsed
        );
        const currentBookValue = calculateBookValue(asset.originalValue, currentAccumulated);
        const remainingDepreciation = calculateBookValue(asset.originalValue, currentAccumulated);

        return {
            originalValue: asset.originalValue,
            accumulatedDepreciation: asset.accumulatedDepreciation,
            bookValue: asset.bookValue,
            annualDepreciation,
            monthlyDepreciation,
            monthsElapsed,
            calculatedAccumulated: currentAccumulated,
            calculatedBookValue: currentBookValue,
            remainingDepreciation,
            depreciationRate: asset.depreciationRate,
            method: asset.depreciationMethod
        };
    }

    // ═══════════════════════════════════════════════════════
    //    RECORD DEPRECIATION JOURNAL - تسجيل قيد إهلاك
    // ═══════════════════════════════════════════════════════
    static async recordDepreciationJournal(id, options = {}) {
        const asset = await FixedAsset.findById(id);
        if (!asset) {
            throw new Error("الأصل غير موجود");
        }

        const { year, month, force = false } = options;
        const now = new Date();
        const targetYear = year || now.getFullYear();
        const targetMonth = month !== undefined ? month : now.getMonth();

        const existingEntry = await JournalEntry.findOne({
            source: "fixed_asset_depreciation",
            sourceId: String(asset._id),
            reference: { $regex: new RegExp(`${targetYear}/${String(targetMonth + 1).padStart(2, "0")}`) }
        });

        if (existingEntry && !force) {
            throw new Error(`قيد إهلاك ${asset.name} لشهر ${targetMonth + 1}/${targetYear} مسجل بالفعل في القيد ${existingEntry.entryNo}`);
        }

        const annualDepreciation = asset.calculateAnnualDepreciation();
        const monthlyDepreciation = annualDepreciation / 12;

        if (monthlyDepreciation <= 0) {
            throw new Error("لا يوجد إهلاك لحسابه لهذا الأصل");
        }

        const newAccumulated = asset.accumulatedDepreciation + monthlyDepreciation;
        if (newAccumulated > asset.originalValue) {
            throw new Error("مجمع الإهلاك سيتجاوز القيمة الأصلية");
        }

        asset.accumulatedDepreciation = newAccumulated;
        asset.bookValue = calculateBookValue(asset.originalValue, newAccumulated);
        await asset.save();

        const accountNames = {
            "110200": "أراضي",
            "110201": "مباني",
            "110202": "سيارات",
            "110203": "أثاث وتجهيزات",
            "110204": "حاسب آلي وطابعات",
            "110205": "تحسينات على المأجور",
            "110206": "آلات ومعدات"
        };

        const assetAccountName = accountNames[asset.assetAccountCode] || asset.assetAccountCode;

        const journalEntry = await createJournalEntry({
            description: `إهلاك ${assetAccountName} - ${asset.name} - ${targetYear}/${String(targetMonth + 1).padStart(2, "0")}`,
            date: new Date(targetYear, targetMonth, 1),
            branch: asset.branch || null,
            source: "fixed_asset_depreciation",
            sourceId: asset._id,
            type: "auto",
            lines: [
                {
                    accountCode: "420100",
                    accountName: "مصروف إهلاك الأصول الثابتة",
                    debit: monthlyDepreciation,
                    credit: 0,
                    description: `إهلاك ${asset.name}`
                },
                {
                    accountCode: "110207",
                    accountName: "مجمع إهلاك الأصول الثابتة",
                    debit: 0,
                    credit: monthlyDepreciation,
                    description: `إهلاك ${asset.name} - ${asset.code}`
                }
            ]
        });

        return {
            asset: await FixedAsset.findById(asset._id)
                .populate("branch", "name code")
                .lean(),
            journalEntry: {
                entryNo: journalEntry.entryNo,
                date: journalEntry.date,
                description: journalEntry.description,
                amount: monthlyDepreciation
            }
        };
    }

    // ═══════════════════════════════════════════════════════
    //    BATCH DEPRECIATION - إهلاك جميع الأصول في قيد واحد
    // ═══════════════════════════════════════════════════════
    static async batchDepreciation(options = {}) {
        const { year, month } = options;
        const now = new Date();
        const targetYear = year || now.getFullYear();
        const targetMonth = month !== undefined ? month : now.getMonth();

        const monthNames = [
            "يناير", "فبراير", "مارس", "إبريل", "مايو", "يونيو",
            "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
        ];
        const monthName = monthNames[targetMonth];

        const refPattern = "batch_" + targetYear + "_" + targetMonth;
        const descPattern = new RegExp(`إهلاك الأصول الثابتة - ${monthName} ${targetYear}`);

        const existingEntry = await JournalEntry.findOne({
            $or: [
                { source: "fixed_asset_depreciation", reference: refPattern },
                { source: "fixed_asset_depreciation", description: descPattern }
            ],
            status: "posted"
        });

        if (existingEntry) {
            throw new Error(`تم تسجيل إهلاك ${monthName} ${targetYear} بالفعل في القيد ${existingEntry.entryNo}`);
        }

        const assets = await FixedAsset.find({
            isHidden: false,
            isActive: true,
            originalValue: { $gt: 0 }
        });

        if (assets.length === 0) {
            throw new Error("لا توجد أصول نشطة لحساب الإهلاك");
        }

        const accountNames = {
            "110200": "أراضي",
            "110201": "مباني",
            "110202": "سيارات",
            "110203": "أثاث وتجهيزات",
            "110204": "حاسب آلي وطابعات",
            "110205": "تحسينات على المأجور",
            "110206": "آلات ومعدات"
        };

        let totalDepreciation = 0;
        const assetDetails = [];

        for (const asset of assets) {
            const annualDepreciation = asset.calculateAnnualDepreciation();
            const monthlyDepreciation = annualDepreciation / 12;

            if (monthlyDepreciation <= 0) continue;

            const newAccumulated = asset.accumulatedDepreciation + monthlyDepreciation;
            if (newAccumulated > asset.originalValue) continue;

            asset.accumulatedDepreciation = newAccumulated;
            asset.bookValue = calculateBookValue(asset.originalValue, newAccumulated);
            await asset.save();

            totalDepreciation += monthlyDepreciation;
            const accName = accountNames[asset.assetAccountCode] || asset.assetAccountCode;
            assetDetails.push({
                code: asset.code,
                name: asset.name,
                accountName: accName,
                amount: monthlyDepreciation
            });
        }

        if (totalDepreciation <= 0) {
            throw new Error("لا يوجد إهلاك لحسابه");
        }

        const journalLines = [];

        for (const detail of assetDetails) {
            journalLines.push({
                accountCode: "420100",
                accountName: "مصروف إهلاك الأصول الثابتة",
                debit: detail.amount,
                credit: 0,
                description: `إهلاك ${detail.accountName} - ${detail.name}`
            });
        }

        journalLines.push({
            accountCode: "110207",
            accountName: "مجمع إهلاك الأصول الثابتة",
            debit: 0,
            credit: totalDepreciation,
            description: `إهلاك ${assetDetails.length} أصل - ${monthName} ${targetYear}`
        });

        const journalEntry = await createJournalEntry({
            description: `إهلاك الأصول الثابتة - ${monthName} ${targetYear}`,
            date: new Date(targetYear, targetMonth, 1),
            branch: null,
            source: "fixed_asset_depreciation",
            sourceId: null,
            reference: "batch_" + targetYear + "_" + targetMonth,
            type: "auto",
            lines: journalLines
        });

        return {
            successful: assetDetails,
            failed: [],
            totalAmount: totalDepreciation,
            journalEntry: {
                entryNo: journalEntry.entryNo,
                date: journalEntry.date,
                description: journalEntry.description
            }
        };
    }

    // ═══════════════════════════════════════════════════════
    //    GET ASSET ACCOUNTS - جلب حسابات الأصول المتاحة
    // ═══════════════════════════════════════════════════════
    static async getAssetAccounts() {
        return [
            { code: "110200", name: "أراضي" },
            { code: "110201", name: "مباني" },
            { code: "110202", name: "سيارات" },
            { code: "110203", name: "أثاث وتجهيزات" },
            { code: "110204", name: "حاسب آلي وطابعات" },
            { code: "110205", name: "تحسينات على المأجور" },
            { code: "110206", name: "آلات ومعدات" }
        ];
    }
}

module.exports = FixedAssetService;