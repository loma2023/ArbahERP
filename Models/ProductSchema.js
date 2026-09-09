const mongoose = require("mongoose");

const unitSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true },
  conversionFactor: { type: Number, default: 1 },
  purchasePrice: { type: Number, default: 0 },
  // ✅ سعر التجزئة (سعر البيع القديم)
  retailPrice: { type: Number, default: 0 },
  // ✅ سعر الجملة (جديد)
  wholesalePrice: { type: Number, default: 0 },
  // ✅ سعر VIP (جديد)
  vipPrice: { type: Number, default: 0 },
  isDefault: { type: Boolean, default: false }
}, { _id: true });

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    code: { type: String, unique: true, required: true },
    barcode: { type: String, default: "" },
    category: { type: String },
    units: [unitSchema],
    baseUnit: { type: String, default: "قطعة" },
    stock: { type: Number, default: 0 },
    minStock: { type: Number, default: 0 },
    maxStock: { type: Number, default: 0 },
    avgCost: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    isHidden: { type: Boolean, default: false }
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', code: 'text', 'units.barcode': 'text' });

module.exports = mongoose.model("Product", productSchema);