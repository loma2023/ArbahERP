// Models/FixedAssetSchema.js
const mongoose = require("mongoose");

const FixedAssetSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════
    //    البيانات الأساسية
    // ═══════════════════════════════════════════════════════
    code: {
        type: String,
        required: [true, "كود الأصل مطلوب"],
        trim: true
    },
    name: {
        type: String,
        required: [true, "اسم الأصل مطلوب"],
        trim: true
    },
    // ═══════════════════════════════════════════════════════
    //    نوع الأصل: جديد (شراء) أو موجود (افتتاحي)
    // ═══════════════════════════════════════════════════════
    assetType: {
        type: String,
        enum: ["new", "existing"],
        required: [true, "نوع الأصل مطلوب"],
        default: "new"
    },
    // ═══════════════════════════════════════════════════════
    //    ربط حساب الأصل من شجرة الحسابات (كود فقط)
    // ═══════════════════════════════════════════════════════
    assetAccountCode: {
        type: String,
        required: [true, "حساب الأصل مطلوب"],
        trim: true
    },
    // ═══════════════════════════════════════════════════════
    //    مجمع الإهلاك - حساب موحد 110207
    // ═══════════════════════════════════════════════════════
    depreciationAccountCode: {
        type: String,
        default: "110207",
        trim: true
    },
    // ═══════════════════════════════════════════════════════
    //    ربط الفرع (ref فقط - الاسم يجيب ديناميكياً)
    // ═══════════════════════════════════════════════════════
    branch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Branch",
        default: null
    },
    // ═══════════════════════════════════════════════════════
    //    القيمة والتكلفة
    // ═══════════════════════════════════════════════════════
    originalValue: {
        type: Number,
        required: [true, "القيمة الأصلية مطلوبة"],
        min: [0, "القيمة الأصلية لا يمكن أن تكون سالبة"],
        default: 0
    },
    purchaseDate: {
        type: Date,
        required: [true, "تاريخ الشراء مطلوب"],
        default: Date.now
    },
    // ═══════════════════════════════════════════════════════
    //    بيانات الدفع (للأصول الجديدة فقط)
    // ═══════════════════════════════════════════════════════
    paymentMethod: {
        type: String,
        enum: ["cash", "bank", "credit"],
        default: null
    },
    paymentAccountCode: {
        type: String,
        default: null,
        trim: true
    },
    paymentEntityId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null
    },
    // ═══════════════════════════════════════════════════════
    //    الإهلاك
    // ═══════════════════════════════════════════════════════
    depreciationRate: {
        type: Number,
        required: [true, "نسبة الإهلاك مطلوبة"],
        min: [0, "نسبة الإهلاك لا يمكن أن تكون سالبة"],
        max: [100, "نسبة الإهلاك لا يمكن أن تتجاوز 100%"],
        default: 10
    },
    depreciationMethod: {
        type: String,
        enum: ["straight", "declining", "units"],
        required: true,
        default: "straight"
    },
    accumulatedDepreciation: {
        type: Number,
        default: 0,
        min: 0
    },
    // ═══════════════════════════════════════════════════════
    //    القيمة الدفترية (محسوبة يدوياً في Service)
    // ═══════════════════════════════════════════════════════
    bookValue: {
        type: Number,
        default: 0
    },
    // ═══════════════════════════════════════════════════════
    //    البيانات الإضافية
    // ═══════════════════════════════════════════════════════
    notes: {
        type: String,
        default: "",
        trim: true
    },
    // ═══════════════════════════════════════════════════════
    //    الحالة
    // ═══════════════════════════════════════════════════════
    isActive: {
        type: Boolean,
        default: true
    },
    isHidden: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ═══════════════════════════════════════════════════════
//    NO HOOKS - bookValue calculated in Service
// ═══════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════
//    Indexes
// ═══════════════════════════════════════════════════════
FixedAssetSchema.index({ code: 1 }, { unique: true });
FixedAssetSchema.index({ assetAccountCode: 1 });
FixedAssetSchema.index({ branch: 1 });
FixedAssetSchema.index({ isActive: 1, isHidden: 1 });
FixedAssetSchema.index({ name: "text", code: "text" });

// ═══════════════════════════════════════════════════════
//    Virtual: نسبة الإهلاك كنص
// ═══════════════════════════════════════════════════════
FixedAssetSchema.virtual("depreciationRateText").get(function() {
    return this.depreciationRate + "% سنوي";
});

// ═══════════════════════════════════════════════════════
//    Virtual: اسم حساب الأصل (من شجرة الحسابات)
// ═══════════════════════════════════════════════════════
FixedAssetSchema.virtual("assetAccountName").get(function() {
    const accountNames = {
        "110200": "أراضي",
        "110201": "مباني",
        "110202": "سيارات",
        "110203": "أثاث وتجهيزات",
        "110204": "حاسب آلي وطابعات",
        "110205": "تحسينات على المأجور",
        "110206": "آلات ومعدات"
    };
    return accountNames[this.assetAccountCode] || this.assetAccountCode;
});

// ═══════════════════════════════════════════════════════
//    Virtual: اسم طريقة الإهلاك
// ═══════════════════════════════════════════════════════
FixedAssetSchema.virtual("methodName").get(function() {
    const names = {
        straight: "القسط الثابت",
        declining: "القيمة المتناقصة",
        units: "وحدات الإنتاج"
    };
    return names[this.depreciationMethod] || this.depreciationMethod;
});

// ═══════════════════════════════════════════════════════
//    Virtual: نوع الأصل كنص
// ═══════════════════════════════════════════════════════
FixedAssetSchema.virtual("assetTypeText").get(function() {
    return this.assetType === "new" ? "أصل جديد" : "أصل موجود";
});

// ═══════════════════════════════════════════════════════
//    Method: حساب الإهلاك السنوي
// ═══════════════════════════════════════════════════════
FixedAssetSchema.methods.calculateAnnualDepreciation = function() {
    if (this.depreciationMethod === "straight") {
        return (this.originalValue * this.depreciationRate) / 100;
    }
    if (this.depreciationMethod === "declining") {
        return (this.bookValue * this.depreciationRate) / 100;
    }
    return 0;
};

// ═══════════════════════════════════════════════════════
//    Method: تسجيل إهلاك جديد
// ═══════════════════════════════════════════════════════
FixedAssetSchema.methods.recordDepreciation = function(amount) {
    this.accumulatedDepreciation = Math.min(
        this.originalValue,
        this.accumulatedDepreciation + amount
    );
    this.bookValue = Math.max(0, this.originalValue - this.accumulatedDepreciation);
    return this.save();
};

module.exports = mongoose.model("FixedAsset", FixedAssetSchema);