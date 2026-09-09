// Models/VoucherSchema.js
const mongoose = require("mongoose");

const VoucherSchema = new mongoose.Schema({
    // ═══════════════════════════════════════════════════════
    //    البيانات الأساسية
    // ═══════════════════════════════════════════════════════
    voucherNumber: {
        type: String,
        required: [true, "رقم السند مطلوب"],
        trim: true
    },
    voucherType: {
        type: String,
        enum: ["receipt", "payment"],
        required: [true, "نوع السند مطلوب"]
    },
    date: {
        type: Date,
        required: [true, "تاريخ السند مطلوب"],
        default: Date.now
    },

    // ═══════════════════════════════════════════════════════
    //    الجهة (عميل أو مورد)
    // ═══════════════════════════════════════════════════════
    entityType: {
        type: String,
        enum: ["customer", "supplier", "other"],
        required: true
    },
    entityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Customer", // أو Supplier حسب النوع
        required: [true, "معرف الجهة مطلوب"]
    },
    entityName: { type: String, default: "" },
    entityCode: { type: String, default: "" },

    // ═══════════════════════════════════════════════════════
    //    المبلغ
    // ═══════════════════════════════════════════════════════
    amount: {
        type: Number,
        required: [true, "المبلغ مطلوب"],
        min: 0
    },
    amountInWords: { type: String, default: "" },

    // ═══════════════════════════════════════════════════════
    //    طريقة الدفع والخزينة/البنك
    // ═══════════════════════════════════════════════════════
    paymentMethod: {
        type: String,
        enum: ["cash", "transfer", "check"],
        default: "cash"
    },
    paymentAccountId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Account",
        required: [true, "حساب الدفع مطلوب"]
    },
    paymentAccountName: { type: String, default: "" },
    paymentAccountCode: { type: String, default: "" },

    // ═══════════════════════════════════════════════════════
    //    بيانات إضافية
    // ═══════════════════════════════════════════════════════
    referenceNumber: { type: String, default: "" }, // رقم الشيك/الحوالة
    notes: { type: String, default: "" },

    // ═══════════════════════════════════════════════════════
    //    القيد المرتبط
    // ═══════════════════════════════════════════════════════
    journalEntryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "JournalEntry",
        default: null
    },
    journalEntryNo: { type: String, default: "" },

    // ═══════════════════════════════════════════════════════
    //    الحالة والفروع
    // ═══════════════════════════════════════════════════════
    status: {
        type: String,
        enum: ["draft", "posted", "cancelled"],
        default: "posted"
    },
    branch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Branch",
        default: null
    },
    branchName: { type: String, default: "" },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    }
}, {
    timestamps: true
});

// Indexes
VoucherSchema.index({ voucherNumber: 1 }, { unique: true });
VoucherSchema.index({ voucherType: 1, date: -1 });
VoucherSchema.index({ entityId: 1 });
VoucherSchema.index({ status: 1 });

module.exports = mongoose.model("Voucher", VoucherSchema);