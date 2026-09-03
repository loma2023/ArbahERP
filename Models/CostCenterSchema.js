const mongoose = require("mongoose");

// ═══════════════════════════════════════════════════════════
// CostCenter Schema - تعريف مراكز التكلفة
// ═══════════════════════════════════════════════════════════
const CostCenterSchema = new mongoose.Schema({
    // ── البيانات الأساسية ──
    code: {
        type: String,
        required: [true, "كود مركز التكلفة مطلوب"],
        unique: true,
        trim: true,
        uppercase: true
    },
    name: {
        type: String,
        required: [true, "اسم مركز التكلفة مطلوب"],
        trim: true
    },

    // ── النوع والعلاقة الهرمية ──
    type: {
        type: String,
        enum: ["main", "sub"],
        default: "main"
    },
    parentCenter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CostCenter",
        default: null
    },
    parentCenterCode: {
        type: String,
        trim: true,
        default: null
    },

    // ── الفرع المرتبط ──
    branch: {
        type: String,
        trim: true,
        default: ""
    },

    // ── الميزانية والتكاليف ──
    budget: {
        type: Number,
        default: 0,
        min: 0
    },
    currentCost: {
        type: Number,
        default: 0
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
CostCenterSchema.index({ name: 1 });
CostCenterSchema.index({ type: 1 });
CostCenterSchema.index({ isHidden: 1, isActive: 1 });
CostCenterSchema.index({ parentCenter: 1 });
CostCenterSchema.index({ branch: 1 });

// ═══════════════════════════════════════════════════════════
// Static Methods
// ═══════════════════════════════════════════════════════════

/**
 * Generate next cost center code
 */
CostCenterSchema.statics.getNextCode = async function() {
    const lastCenter = await this.findOne()
        .sort({ code: -1 })
        .select("code");

    if (!lastCenter || !lastCenter.code) {
        return "CC-00001";
    }

    const match = lastCenter.code.match(/(\d+)$/);
    if (!match) {
        return "CC-00001";
    }

    const nextNumber = parseInt(match[1], 10) + 1;
    return `CC-${String(nextNumber).padStart(5, '0')}`;
};

/**
 * Get cost center statistics
 */
CostCenterSchema.statics.getStats = async function() {
    const total = await this.countDocuments({ isHidden: false });
    const active = await this.countDocuments({ isHidden: false, status: "active" });
    const mainCenters = await this.countDocuments({ isHidden: false, type: "main" });
    const subCenters = await this.countDocuments({ isHidden: false, type: "sub" });

    const centers = await this.find({ isHidden: false }).lean();
    const totalCosts = centers.reduce((sum, c) => sum + (c.currentCost || 0), 0);
    const totalBudget = centers.reduce((sum, c) => sum + (c.budget || 0), 0);

    return {
        total,
        active,
        mainCenters,
        subCenters,
        totalCosts,
        totalBudget
    };
};

module.exports = mongoose.model("CostCenter", CostCenterSchema);