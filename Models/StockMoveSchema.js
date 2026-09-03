// Models/StockMovementSchema.js
const mongoose = require("mongoose");

const StockMovementItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true
    // ❌ index: true تم حذفه
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
  unit: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  unitCost: {
    type: Number,
    default: 0,
    min: 0
  },
  totalCost: {
    type: Number,
    default: 0
  },
  movementUnitCost: {
    type: Number,
    default: 0
  },
  movementTotalCost: {
    type: Number,
    default: 0
  },
  batchNumber: {
    type: String,
    trim: true,
    default: ""
  },
  expiryDate: {
    type: Date,
    default: null
  },
  notes: {
    type: String,
    default: "",
    trim: true
  }
}, { _id: true });

const StockMovementSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    index: true
  },
  type: {
    type: String,
    enum: [
      "receipt",
      "issue",
      "transfer_in",
      "transfer_out",
      "return_in",
      "return_out",
      "adjustment",
      "opening_balance",
      "production_in",
      "production_out",
      "damage"
    ],
    required: true,
    index: true
  },
  fromWarehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Warehouse",
    default: null,
    index: true
  },
  fromWarehouseName: {
    type: String,
    trim: true,
    default: ""
  },
  toWarehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Warehouse",
    default: null,
    index: true
  },
  toWarehouseName: {
    type: String,
    trim: true,
    default: ""
  },
  date: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  reference: {
    type: String,
    trim: true,
    default: ""
  },
  referenceType: {
    type: String,
    enum: ["purchase_invoice", "sales_invoice", "transfer_order", "manual", "opening", "production", "return"],
    default: "manual"
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
    index: true
  },
  items: [StockMovementItemSchema],
  totalQuantity: {
    type: Number,
    default: 0
  },
  totalCost: {
    type: Number,
    default: 0
  },
  entityType: {
    type: String,
    enum: ["supplier", "customer", "none"],
    default: "none"
  },
  entity: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "entityType",
    default: null
  },
  entityName: {
    type: String,
    trim: true,
    default: ""
  },
  journalEntry: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "JournalEntry",
    default: null
  },
  costingMethod: {
    type: String,
    enum: ["fifo", "lifo", "average", "standard"],
    default: "average"
  },
  status: {
    type: String,
    enum: ["draft", "confirmed", "posted", "cancelled"],
    default: "draft"
  },
  adjustmentReason: {
    type: String,
    trim: true,
    default: ""
  },
  notes: {
    type: String,
    default: "",
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  confirmedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  confirmedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes ✅ (كلها هنا فقط)
StockMovementSchema.index({ type: 1, date: -1 });
StockMovementSchema.index({ fromWarehouse: 1, date: -1 });
StockMovementSchema.index({ toWarehouse: 1, date: -1 });
StockMovementSchema.index({ status: 1 });
StockMovementSchema.index({ "items.product": 1 });

// Pre-save
StockMovementSchema.pre("save", function (next) {
  if (this.items && this.items.length > 0) {
    this.totalQuantity = this.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    this.totalCost = this.items.reduce((sum, item) => sum + (item.movementTotalCost || item.totalCost || 0), 0);
  }
  next();
});

module.exports = mongoose.model("StockMovement", StockMovementSchema);