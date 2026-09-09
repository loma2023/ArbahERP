// Models/RevenueSchema.js
const mongoose = require("mongoose");

const RevenueSchema = new mongoose.Schema({
    code: {
        type: String,
        required: [true, "كود الايراد مطلوب"],
        unique: true,
        trim: true,
        index: true
    },
    name: {
        type: String,
        required: [true, "اسم الايراد مطلوب"],
        trim: true
    },
    // نوع الايراد: رئيسي (أب) أو فرعي (ابن)
    type: {
        type: String,
        enum: ["main", "sub"],
        required: true,
        default: "sub"
    },
    // حساب الأب (للايرادات الفرعية فقط)
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Revenue",
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
    // حالة الايراد
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
RevenueSchema.virtual("displayName").get(function() {
    const level = this.linkedAccountCode ? this.linkedAccountCode.split(".").length : 1;
    const indent = " ".repeat(Math.max(0, level - 1));
    return indent + this.name;
});

// Index: compound for fast queries
RevenueSchema.index({ isActive: 1, isHidden: 1 });
RevenueSchema.index({ name: "text", code: "text" });

module.exports = mongoose.model("Revenue", RevenueSchema);