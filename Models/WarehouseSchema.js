const mongoose = require("mongoose");

// ═══════════════════════════════════════════════════════════
// Warehouse Schema - تعريف المخازن
// ═══════════════════════════════════════════════════════════
const WarehouseSchema = new mongoose.Schema({
    // ── البيانات الأساسية ──
    code: {
        type: String,
        required: [true, "كود المخزن مطلوب"],
        unique: true,
        trim: true,
        uppercase: true,
        index: true
    },
    name: {
        type: String,
        required: [true, "اسم المخزن مطلوب"],
        trim: true
    },

    // ── الفرع (مخزن كـ ObjectId) ──
    branch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Branch",
        default: null
        // ← شلت index: true من هنا عشان متحطش index مكرر
    },

    // ── المسؤول والتواصل ──
    manager: {
        type: String,
        trim: true,
        default: ""
    },
    phone: {
        type: String,
        trim: true,
        default: ""
    },
    address: {
        type: String,
        trim: true,
        default: ""
    },

    // ── نوع المخزن ──
    type: {
        type: String,
        enum: ["main", "branch", "virtual", "damaged"],
        default: "main"
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
WarehouseSchema.index({ isActive: 1, isHidden: 1 });
WarehouseSchema.index({ name: "text", code: "text" });
WarehouseSchema.index({ branch: 1 });  // ← index واحد بس هنا

// ═══════════════════════════════════════════════════════════
// Static Methods
// ═══════════════════════════════════════════════════════════

/**
 * Generate next warehouse code
 */
WarehouseSchema.statics.getNextCode = async function() {
    const lastWarehouse = await this.findOne()
        .sort({ code: -1 })
        .select("code");

    if (!lastWarehouse || !lastWarehouse.code) {
        return "WH-001";
    }

    const match = lastWarehouse.code.match(/(\d+)$/);
    if (!match) {
        return "WH-001";
    }

    const nextNumber = parseInt(match[1], 10) + 1;
    return `WH-${String(nextNumber).padStart(3, '0')}`;
};

/**
 * Get warehouse statistics
 */
WarehouseSchema.statics.getStats = async function() {
    const total = await this.countDocuments({ isHidden: false });
    const active = await this.countDocuments({ isHidden: false, status: "active" });
    const frozen = await this.countDocuments({ isHidden: false, status: "frozen" });
    const closed = await this.countDocuments({ isHidden: false, status: "closed" });

    return {
        total,
        active,
        frozen,
        closed
    };
};

module.exports = mongoose.model("Warehouse", WarehouseSchema);