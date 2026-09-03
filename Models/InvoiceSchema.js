const mongoose = require("mongoose");

// =============================================
// Invoice Item Schema (Embedded Sub-document)
// =============================================
const InvoiceItemSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: [true, "المنتج مطلوب"]
    },
    productName: { type: String, required: true, trim: true },
    productCode: { type: String, default: "", trim: true },
    unit: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, min: 0.001 },
    price: { type: Number, required: true, min: 0 },
    priceType: {
        type: String,
        enum: ["retail", "wholesale", "vip", "custom"],
        default: "retail"
    },
    subtotal: { type: Number, default: 0 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    discountAmount: { type: Number, default: 0, min: 0 },
    afterDiscount: { type: Number, default: 0 },
    taxPercent: { type: Number, default: 15, min: 0, max: 100 },
    taxAmount: { type: Number, default: 0, min: 0 },
    taxExempt: { type: Boolean, default: false },
    total: { type: Number, default: 0 },
    costPrice: { type: Number, default: 0 },
    profit: { type: Number, default: 0 },
    notes: { type: String, default: "", trim: true },
    sortOrder: { type: Number, default: 0 }
}, { _id: true });

// =============================================
// Invoice Payment Schema (Embedded)
// =============================================
const InvoicePaymentSchema = new mongoose.Schema({
    paymentMethod: {
        type: String,
        enum: ["cash", "transfer", "partial", "credit", "card", "cheque"],
        required: true
    },
    amount: { type: Number, required: true, min: 0 },
    cashBoxId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CashBox",
        default: null
    },
    cashBoxName: { type: String, default: "", trim: true },
    bankId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Bank",
        default: null
    },
    bankName: { type: String, default: "", trim: true },
    chequeNo: { type: String, default: "", trim: true },
    chequeDate: { type: Date, default: null },
    reference: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true }
}, { _id: true });

// =============================================
// Main Invoice Schema
// =============================================
const InvoiceSchema = new mongoose.Schema({
    // ── Basic Info ──
    invoiceNo: {
        type: String,
        required: [true, "رقم الفاتورة مطلوب"],
        unique: true,
        trim: true,
        index: true
    },
    invoiceType: {
        type: String,
        enum: ["sales", "purchase", "sales_return", "purchase_return"],
        required: true,
        index: true
    },
    date: {
        type: Date,
        required: true,
        default: Date.now,
        index: true
    },
    dueDate: { type: Date, default: null },
    referenceNumber: { type: String, default: "", trim: true },

    // ── Entity (Customer/Supplier) ──
    entityType: {
        type: String,
        enum: ["customer", "supplier"],
        required: true
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    entityName: { type: String, required: true, trim: true },
    entityCode: { type: String, default: "", trim: true },
    entityAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Account",
        default: null
    },

    // ── Sales Rep ──
    salesRepId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "SalesRep",
        default: null
    },
    salesRepName: { type: String, default: "", trim: true },

    // ── Branch & Warehouse ──
    branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Branch",
        default: null
    },
    branchName: { type: String, default: "", trim: true },
    warehouseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Warehouse",
        default: null
    },
    warehouseName: { type: String, default: "", trim: true },

    // ── Cost Center ──
    costCenterId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CostCenter",
        default: null
    },
    costCenterName: { type: String, default: "", trim: true },

    // ── Items ──
    items: [InvoiceItemSchema],

    // ── Totals ──
    subTotal: { type: Number, default: 0, min: 0 },
    totalItemDiscount: { type: Number, default: 0, min: 0 },
    generalDiscountPercent: { type: Number, default: 0, min: 0, max: 100 },
    generalDiscountAmount: { type: Number, default: 0, min: 0 },
    afterGeneralDiscount: { type: Number, default: 0, min: 0 },
    totalTax: { type: Number, default: 0, min: 0 },
    grandTotal: { type: Number, default: 0, min: 0 },
    totalCost: { type: Number, default: 0 },
    totalProfit: { type: Number, default: 0 },

    // ── Payment ──
    paymentMethod: {
        type: String,
        enum: ["cash", "transfer", "partial", "credit", "card", "cheque"],
        default: "cash"
    },
    paidAmount: { type: Number, default: 0, min: 0 },
    remainingAmount: { type: Number, default: 0 },
    payments: [InvoicePaymentSchema],

    // ── Price Includes Tax Flag ──
    priceIncludesTax: { type: Boolean, default: false },

    // ── Status ──
    status: {
        type: String,
        enum: ["draft", "confirmed", "cancelled", "partially_paid", "paid", "overdue"],
        default: "draft",
        index: true
    },

    // ── Journal Entry Link ──
    journalEntryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "JournalEntry",
        default: null
    },
    journalEntryNo: { type: String, default: "", trim: true },

    // ── Stock Movement Link ──
    stockMovementId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "StockMovement",
        default: null
    },

    // ── Notes ──
    notes: { type: String, default: "", trim: true },
    internalNotes: { type: String, default: "", trim: true },

    // ── Audit ──
    createdBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    confirmedBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    confirmedAt: { type: Date, default: null },
    cancelledBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    cancelledAt: { type: Date, default: null },
    cancellationReason: { type: String, default: "", trim: true }

}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// =============================================
// Virtuals
// =============================================
InvoiceSchema.virtual("isPaid").get(function () {
    return this.remainingAmount <= 0 && this.paidAmount >= this.grandTotal;
});

InvoiceSchema.virtual("profitMargin").get(function () {
    if (this.grandTotal === 0) return 0;
    return ((this.totalProfit / this.grandTotal) * 100).toFixed(2);
});

// =============================================
// Indexes
// =============================================
InvoiceSchema.index({ invoiceNo: "text", referenceNumber: "text", entityName: "text" });
InvoiceSchema.index({ date: -1, status: 1 });
InvoiceSchema.index({ entityId: 1, invoiceType: 1, date: -1 });
InvoiceSchema.index({ invoiceType: 1, status: 1 });

// =============================================
// Pre-save: Calculate totals
// =============================================
InvoiceSchema.pre("save", async function () {
    let subTotal = 0;
    let totalItemDiscount = 0;
    let totalTax = 0;
    let grandTotal = 0;
    let totalCost = 0;
    let totalProfit = 0;

    this.items.forEach((item, index) => {
        item.sortOrder = index + 1;
        item.subtotal = item.price * item.quantity;
        item.discountAmount = (item.subtotal * item.discountPercent / 100) + (item.discountAmount || 0);
        item.afterDiscount = item.subtotal - item.discountAmount;
        item.taxAmount = item.taxExempt ? 0 : (item.afterDiscount * item.taxPercent / 100);
        item.total = item.afterDiscount + item.taxAmount;
        item.profit = item.total - (item.costPrice * item.quantity);

        subTotal += item.subtotal;
        totalItemDiscount += item.discountAmount;
        totalTax += item.taxAmount;
        grandTotal += item.total;
        totalCost += (item.costPrice * item.quantity);
        totalProfit += item.profit;
    });

    this.subTotal = subTotal;
    this.totalItemDiscount = totalItemDiscount;
    this.generalDiscountAmount = grandTotal * (this.generalDiscountPercent / 100);
    this.afterGeneralDiscount = grandTotal - this.generalDiscountAmount;
    this.totalTax = totalTax;
    this.grandTotal = this.afterGeneralDiscount;
    this.totalCost = totalCost;
    this.totalProfit = totalProfit;
    this.remainingAmount = this.grandTotal - this.paidAmount;

    // Auto-update status
    if (this.remainingAmount <= 0) {
        this.status = "paid";
    } else if (this.paidAmount > 0 && this.remainingAmount > 0) {
        this.status = "partially_paid";
    }
});

// =============================================
// Statics
// =============================================
// ✅ FIXED: Same pattern as VoucherService.getNextVoucherNumber
InvoiceSchema.statics.getNextInvoiceNo = async function (invoiceType, prefix) {
    const typePrefix = prefix || (invoiceType === "purchase" ? "PUR-" : invoiceType === "sales_return" ? "SRN-" : invoiceType === "purchase_return" ? "PRN-" : "SAL-");

    // ✅ Same pattern as VoucherService: findOne with regex + sort by createdAt + limit(1)
    const lastInvoice = await this.findOne({
        invoiceNo: { $regex: "^" + typePrefix }
    })
        .sort({ createdAt: -1 })
        .limit(1);

    if (!lastInvoice || !lastInvoice.invoiceNo) {
        return typePrefix + "0001";
    }

    const match = lastInvoice.invoiceNo.match(/(\d+)(?!.*\d)/);
    if (match) {
        const lastNumber = parseInt(match[0]);
        const prefixPart = lastInvoice.invoiceNo.substring(0, lastInvoice.invoiceNo.lastIndexOf(match[0]));
        return prefixPart + String(lastNumber + 1).padStart(4, "0");
    }

    return typePrefix + "0001";
};

InvoiceSchema.statics.getStats = async function (filters = {}) {
    const query = {};
    if (filters.invoiceType) query.invoiceType = filters.invoiceType;
    if (filters.fromDate || filters.toDate) {
        query.date = {};
        if (filters.fromDate) query.date.$gte = new Date(filters.fromDate);
        if (filters.toDate) query.date.$lte = new Date(filters.toDate);
    }

    const total = await this.countDocuments(query);
    const draft = await this.countDocuments({ ...query, status: "draft" });
    const confirmed = await this.countDocuments({ ...query, status: { $in: ["confirmed", "paid", "partially_paid"] } });
    const cancelled = await this.countDocuments({ ...query, status: "cancelled" });

    const agg = await this.aggregate([
        { $match: query },
        {
            $group: {
                _id: null,
                totalGrandTotal: { $sum: "$grandTotal" },
                totalPaid: { $sum: "$paidAmount" },
                totalRemaining: { $sum: "$remainingAmount" },
                totalProfit: { $sum: "$totalProfit" }
            }
        }
    ]);

    return {
        total,
        draft,
        confirmed,
        cancelled,
        totalGrandTotal: agg.length > 0 ? agg[0].totalGrandTotal : 0,
        totalPaid: agg.length > 0 ? agg[0].totalPaid : 0,
        totalRemaining: agg.length > 0 ? agg[0].totalRemaining : 0,
        totalProfit: agg.length > 0 ? agg[0].totalProfit : 0
    };
};

module.exports = mongoose.model("Invoice", InvoiceSchema);