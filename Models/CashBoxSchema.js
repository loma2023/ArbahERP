const mongoose = require("mongoose");

// ═══════════════════════════════════════════════════════════
// CashBox Schema - تعريف الخزنات والصناديق النقدية
// ═══════════════════════════════════════════════════════════
const CashBoxSchema = new mongoose.Schema({
    // ── البيانات الأساسية ──
    code: {
        type: String,
        required: [true, "كود الخزينة مطلوب"],
        unique: true,
        trim: true,
        uppercase: true
    },
    name: {
        type: String,
        required: [true, "اسم الخزينة مطلوب"],
        trim: true
    },

    // ── الفرع والمسؤول ──
    branch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Branch",
        default: null
    },
    responsible: {
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
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// ═══════════════════════════════════════════════════════════
// Indexes
// ═══════════════════════════════════════════════════════════
CashBoxSchema.index({ name: 1 });
CashBoxSchema.index({ isHidden: 1, isActive: 1 });
CashBoxSchema.index({ linkedAccount: 1 });
CashBoxSchema.index({ branch: 1 });

// ═══════════════════════════════════════════════════════════
// Static Methods
// ═══════════════════════════════════════════════════════════

/**
 * Generate next cash box code
 */
CashBoxSchema.statics.getNextCode = async function() {
    const lastBox = await this.findOne()
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

/**
 * Get cash box statistics
 */
CashBoxSchema.statics.getStats = async function() {
    const total = await this.countDocuments({ isHidden: false });
    const active = await this.countDocuments({ isHidden: false, status: "active" });
    const frozen = await this.countDocuments({ isHidden: false, status: "frozen" });
    const closed = await this.countDocuments({ isHidden: false, status: "closed" });

    const boxes = await this.find({ isHidden: false }).lean();
    const totalBalance = boxes.reduce((sum, b) => sum + (b.currentBalance || 0), 0);
    const negativeBalance = boxes.filter(b => (b.currentBalance || 0) < 0).length;

    return {
        total,
        active,
        frozen,
        closed,
        totalBalance,
        negativeBalance
    };
};

module.exports = mongoose.model("CashBox", CashBoxSchema);