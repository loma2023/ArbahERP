const mongoose = require("mongoose");

const SupplierSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, "كود العميل مطلوب"],
    unique: true,
    trim: true,
    index: true
  },
  name: {
    type: String,
    required: [true, "اسم العميل مطلوب"],
    trim: true
  },
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
  taxNumber: {
    type: String,
    trim: true,
    default: ""
  },
  commercialReg: {
    type: String,
    trim: true,
    default: ""
  },
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
  // الرصيد الافتتاحي
  openingBalance: {
    type: Number,
    default: 0,
    min: 0
  },
  // نوع الرصيد الافتتاحي (مدين/دائن)
  balanceType: {
    type: String,
    enum: ["debit", "credit"],
    default: "debit"
  },
  // الرصيد الحالي (محسوب تلقائياً)
  currentBalance: {
    type: Number,
    default: 0
  },
  // حد الائتمان
  creditLimit: {
    type: Number,
    default: 0,
    min: 0
  },
  // ربط بحساب شجرة الحسابات
  linkedAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Account",
    default: null,
    index: true
  },
  linkedAccountCode: {
    type: String,
    default: null,
    trim: true
  },
  // ملاحظات
  notes: {
    type: String,
    default: "",
    trim: true
  },
  // حالة العميل
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

// Virtual: حساب الرصيد الحالي
SupplierSchema.virtual("calculatedBalance").get(function () {
  return this.balanceType === "debit"
    ? this.openingBalance
    : -this.openingBalance;
});

// Index: compound for fast queries
SupplierSchema.index({ isActive: 1, isHidden: 1 });
SupplierSchema.index({ name: "text", code: "text", phone: "text" });

module.exports = mongoose.model("Supplier", SupplierSchema);