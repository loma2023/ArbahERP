// Models/ExpenseSchema.js
const mongoose = require("mongoose");

const ExpenseSchema = new mongoose.Schema({
    code: {
        type: String,
        required: [true, "كود المصروف مطلوب"],
        unique: true,
        trim: true,
        index: true
    },
    name: {
        type: String,
        required: [true, "اسم المصروف مطلوب"],
        trim: true
    },
    // نوع المصروف: رئيسي (أب) أو فرعي (ابن)
    type: {
        type: String,
        enum: ["main", "sub"],
        required: true,
        default: "sub"
    },
    // حساب الأب (للمصروفات الفرعية فقط)
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Expense",
        default: null,
        index: true
    },
    // كود حساب الأب في شجرة الحسابات
    parentAccountCode: {
        type: String,
        default: null,
        trim: true
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
    // وصف/ملاحظات
    description: {
        type: String,
        default: "",
        trim: true
    },
    // حالة المصروف
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

// Virtual: اسم كامل مع مسافة بادئة حسب المستوى
ExpenseSchema.virtual("displayName").get(function() {
    const level = this.linkedAccountCode ? this.linkedAccountCode.split(".").length : 1;
    const indent = " ".repeat(Math.max(0, level - 1));
    return indent + this.name;
});

// Index: compound for fast queries
ExpenseSchema.index({ isActive: 1, isHidden: 1 });
ExpenseSchema.index({ name: "text", code: "text" });

module.exports = mongoose.model("Expense", ExpenseSchema);