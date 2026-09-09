const mongoose = require("mongoose");

// ═══════════════════════════════════════════════════════════
// SalesRep Schema - تعريف المناديب
// ═══════════════════════════════════════════════════════════
const SalesRepSchema = new mongoose.Schema({
    // ── البيانات الأساسية ──
    code: {
        type: String,
        required: [true, "كود المندوب مطلوب"],
        unique: true,
        trim: true,
        uppercase: true
    },
    name: {
        type: String,
        required: [true, "اسم المندوب مطلوب"],
        trim: true
    },

    // ── بيانات التواصل ──
    phone: {
        type: String,
        trim: true,
        default: ""
    },
    email: {
        type: String,
        trim: true,
        lowercase: true,
        default: ""
    },

    // ── بيانات الهوية ──
    idNumber: {
        type: String,
        trim: true,
        default: ""
    },
    nationality: {
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
    creditLimit: {
        type: Number,
        default: 0,
        min: 0
    },

    // ── الحالة ──
    status: {
        type: String,
        enum: ["active", "inactive", "suspended"],
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
SalesRepSchema.index({ name: 1 });
SalesRepSchema.index({ phone: 1 });
SalesRepSchema.index({ isHidden: 1, isActive: 1 });
SalesRepSchema.index({ linkedAccount: 1 });

// ═══════════════════════════════════════════════════════════
// Static Methods
// ═══════════════════════════════════════════════════════════

/**
 * Generate next sales rep code
 */
SalesRepSchema.statics.getNextCode = async function() {
    const lastRep = await this.findOne()
        .sort({ code: -1 })
        .select("code");

    if (!lastRep || !lastRep.code) {
        return "REP-00001";
    }

    const match = lastRep.code.match(/(\d+)$/);
    if (!match) {
        return "REP-00001";
    }

    const nextNumber = parseInt(match[1], 10) + 1;
    return `REP-${String(nextNumber).padStart(5, '0')}`;
};

/**
 * Get sales rep statistics
 */
SalesRepSchema.statics.getStats = async function() {
    const total = await this.countDocuments({ isHidden: false });
    const active = await this.countDocuments({ isHidden: false, status: "active" });
    const inactive = await this.countDocuments({ isHidden: false, status: "inactive" });
    const suspended = await this.countDocuments({ isHidden: false, status: "suspended" });

    const reps = await this.find({ isHidden: false }).lean();
    const totalReceivables = reps.reduce((sum, r) => {
        const balance = (r.currentBalance || 0);
        return balance > 0 ? sum + balance : sum;
    }, 0);
    const overLimit = reps.filter(r => {
        const balance = (r.currentBalance || 0);
        const limit = parseFloat(r.creditLimit) || 0;
        return balance > limit && limit > 0;
    }).length;

    return {
        total,
        active,
        inactive,
        suspended,
        totalReceivables,
        overLimit
    };
};

module.exports = mongoose.model("SalesRep", SalesRepSchema);