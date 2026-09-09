// Models/StockBalanceSchema.js
const mongoose = require("mongoose");

const StockBalanceSchema = new mongoose.Schema({
    // المخزن
    warehouse: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Warehouse",
        required: true,
        index: true
    },
    warehouseCode: {
        type: String,
        required: true,
        trim: true
    },
    warehouseName: {
        type: String,
        required: true,
        trim: true
    },
    // المنتج
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
        index: true
    },
    productCode: {
        type: String,
        required: true,
        trim: true
    },
    productName: {
        type: String,
        required: true,
        trim: true
    },
    // الوحدة
    unit: {
        type: String,
        required: true,
        trim: true
    },
    // الكميات
    quantityIn: {
        type: Number,
        default: 0
    },
    quantityOut: {
        type: Number,
        default: 0
    },
    quantityAvailable: {
        type: Number,
        default: 0
    },
    quantityReserved: {
        type: Number,
        default: 0
    },
    // التكاليف
    totalCostIn: {
        type: Number,
        default: 0
    },
    totalCostOut: {
        type: Number,
        default: 0
    },
    averageUnitCost: {
        type: Number,
        default: 0
    },
    // آخر تحديث
    lastMovementDate: {
        type: Date,
        default: Date.now
    },
    lastMovementType: {
        type: String,
        default: ""
    }
}, {
    timestamps: true
});

// Compound Index: مخزن + منتج = فريد
StockBalanceSchema.index({ warehouse: 1, product: 1 }, { unique: true });
StockBalanceSchema.index({ warehouse: 1, quantityAvailable: 1 });
StockBalanceSchema.index({ product: 1, quantityAvailable: 1 });

module.exports = mongoose.model("StockBalance", StockBalanceSchema);