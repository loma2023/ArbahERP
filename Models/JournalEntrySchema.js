const mongoose = require("mongoose");

const JournalEntrySchema = new mongoose.Schema({
    entryNo: {
        type: String,
        required: [true, "رقم القيد مطلوب"],
        unique: true,
        trim: true,
        index: true
    },
    date: {
        type: Date,
        required: [true, "تاريخ القيد مطلوب"],
        default: Date.now
    },
    description: {
        type: String,
        trim: true,
        default: ""
    },
    branch: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Branch",
        default: null,
        index: true
    },
    branchName: { type: String, default: "", trim: true },
    costCenter: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CostCenter",
        default: null,
        index: true
    },
    costCenterName: { type: String, default: "", trim: true },
    totalDebit: { type: Number, default: 0, min: 0 },
    totalCredit: { type: Number, default: 0, min: 0 },
    difference: { type: Number, default: 0 },
    status: {
        type: String,
        enum: ["draft", "posted"],
        default: "draft",
        index: true
    },
    type: {
        type: String,
        enum: ["manual", "auto", "opening_balance"],
        default: "manual",
        index: true
    },
    source: { type: String, default: "", trim: true },
    sourceId: { type: mongoose.Schema.Types.ObjectId, default: null },
    reference: { type: String, default: "", trim: true },
    isPosted: { type: Boolean, default: false },
    postedAt: { type: Date, default: null },
    notes: { type: String, default: "", trim: true },
    // ✅ بدون ref - لحد ما تعمل User Schema
    createdBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    postedBy: { type: mongoose.Schema.Types.ObjectId, default: null }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

JournalEntrySchema.virtual("balanceDiff").get(function() {
    return this.totalDebit - this.totalCredit;
});

JournalEntrySchema.virtual("isBalanced").get(function() {
    return this.totalDebit === this.totalCredit;
});

JournalEntrySchema.index({ date: -1, status: 1 });
JournalEntrySchema.index({ entryNo: "text", description: "text", reference: "text" });

module.exports = mongoose.model("JournalEntry", JournalEntrySchema);