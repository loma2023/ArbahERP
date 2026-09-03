const mongoose = require("mongoose");

// ═══════════════════════════════════════════════════════════
// Branch Schema - تعريف الفروع
// ═══════════════════════════════════════════════════════════
const BranchSchema = new mongoose.Schema({
    // ── البيانات الأساسية ──
    code: {
        type: String,
        required: [true, "كود الفرع مطلوب"],
        unique: true,
        trim: true,
        uppercase: true
    },
    name: {
        type: String,
        required: [true, "اسم الفرع مطلوب"],
        trim: true
    },

    // ── العنوان والتواصل ──
    city: {
        type: String,
        trim: true,
        default: ""
    },
    address: {
        type: String,
        trim: true,
        default: ""
    },
    phone: {
        type: String,
        trim: true,
        default: ""
    },

    // ── المسؤول ──
    manager: {
        type: String,
        trim: true,
        default: ""
    },

    // ── المخزن الرئيسي المرتبط ──
    warehouse: {
        type: String,
        trim: true,
        default: ""
    },

    // ── الحالة ──
    status: {
        type: String,
        enum: ["active", "inactive", "closed"],
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
// code has unique: true (auto-index), no need for duplicate
BranchSchema.index({ name: 1 });
BranchSchema.index({ isHidden: 1, isActive: 1 });
BranchSchema.index({ city: 1 });

// ═══════════════════════════════════════════════════════════
// Static Methods
// ═══════════════════════════════════════════════════════════

/**
 * Generate next branch code
 */
BranchSchema.statics.getNextCode = async function() {
    const lastBranch = await this.findOne()
        .sort({ code: -1 })
        .select("code");

    if (!lastBranch || !lastBranch.code) {
        return "BR-00001";
    }

    const match = lastBranch.code.match(/(\d+)$/);
    if (!match) {
        return "BR-00001";
    }

    const nextNumber = parseInt(match[1], 10) + 1;
    return `BR-${String(nextNumber).padStart(5, '0')}`;
};

/**
 * Get branch statistics
 */
BranchSchema.statics.getStats = async function() {
    const total = await this.countDocuments({ isHidden: false });
    const active = await this.countDocuments({ isHidden: false, status: "active" });
    const inactive = await this.countDocuments({ isHidden: false, status: "inactive" });
    const closed = await this.countDocuments({ isHidden: false, status: "closed" });

    return {
        total,
        active,
        inactive,
        closed
    };
};

module.exports = mongoose.model("Branch", BranchSchema);