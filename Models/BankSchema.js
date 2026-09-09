const mongoose = require("mongoose");

// ═══════════════════════════════════════════════════════════
// Bank Schema - تعريف البنوك
// ═══════════════════════════════════════════════════════════
const BankSchema = new mongoose.Schema({
    // ── البيانات الأساسية ──
    code: {
        type: String,
        required: [true, "كود البنك مطلوب"],
        unique: true,     // ← ده بيعمل index تلقائي، مش محتاج تكرار
        trim: true,
        uppercase: true
    },
    name: {
        type: String,
        required: [true, "اسم البنك مطلوب"],
        trim: true
    },

    // ── بيانات الحساب البنكي ──
    accountNo: {
        type: String,
        required: [true, "رقم الحساب البنكي مطلوب"],
        trim: true
    },
    localAccountNo: {
        type: String,
        trim: true,
        default: ""
    },
    iban: {
        type: String,
        trim: true,
        default: ""
    },
    swiftCode: {
        type: String,
        trim: true,
        default: ""
    },

    // ── الفرع والمنطقة ──
    branch: {
        type: String,
        trim: true,
        default: ""
    },
    city: {
        type: String,
        trim: true,
        default: ""
    },

    // ── الحساب المحاسبي المرتبط ──
    linkedAccount: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Account",
        default: null
    },
    linkedAccountCode: {
        type: String,
        trim: true,
        default: null
    },

    // ── الأرصدة ──
    openingBalance: {
        type: Number,
        default: 0,
        min: 0
    },
    currentBalance: {
        type: Number,
        default: 0
    },
    balanceType: {
        type: String,
        enum: ["debit", "credit"],
        default: "debit"
    },

    // ── الحالة ──
    status: {
        type: String,
        enum: ["active", "frozen", "closed"],
        default: "active"
    },
    isActive: {
        type: Boolean,
        default: true
    },
    isHidden: {
        type: Boolean,
        default: false
    },

    // ── ملاحظات ──
    notes: {
        type: String,
        trim: true,
        default: ""
    },

    // ── بيانات التواصل ──
    contactPerson: {
        type: String,
        trim: true,
        default: ""
    },
    contactPhone: {
        type: String,
        trim: true,
        default: ""
    },
    contactEmail: {
        type: String,
        trim: true,
        default: ""
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ═══════════════════════════════════════════════════════════
// Indexes
// ═══════════════════════════════════════════════════════════
// ❌ شيلنا BankSchema.index({ code: 1 }) لأن unique: true بيعمل index تلقائي
BankSchema.index({ name: 1 });
BankSchema.index({ isHidden: 1, isActive: 1 });
BankSchema.index({ linkedAccount: 1 });

// ═══════════════════════════════════════════════════════════
// Static Methods
// ═══════════════════════════════════════════════════════════

/**
 * Generate next bank code
 */
BankSchema.statics.getNextCode = async function () {
    const lastBank = await this.findOne()
        .sort({ code: -1 })
        .select("code");

    if (!lastBank || !lastBank.code) {
        return "BNK-00001";
    }

    const match = lastBank.code.match(/(\d+)$/);
    if (!match) {
        return "BNK-00001";
    }

    const nextNumber = parseInt(match[1], 10) + 1;
    return `BNK-${String(nextNumber).padStart(5, '0')}`;
};

/**
 * Get bank statistics
 */
BankSchema.statics.getStats = async function () {
    const total = await this.countDocuments({ isHidden: false });
    const active = await this.countDocuments({ isHidden: false, status: "active" });
    const frozen = await this.countDocuments({ isHidden: false, status: "frozen" });
    const closed = await this.countDocuments({ isHidden: false, status: "closed" });

    const banks = await this.find({ isHidden: false }).lean();
    const totalBalance = banks.reduce((sum, b) => sum + (b.currentBalance || 0), 0);

    return {
        total,
        active,
        frozen,
        closed,
        totalBalance
    };
};

module.exports = mongoose.model("Bank", BankSchema);