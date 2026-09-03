const mongoose = require("mongoose");

const JournalLineSchema = new mongoose.Schema({
    journalEntry: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "JournalEntry",
        required: [true, "القيد الرئيسي مطلوب"],
        index: true
    },
    account: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Account",
        default: null,
        index: true
    },
    accountCode: { type: String, default: "", trim: true },
    accountName: { type: String, default: "", trim: true },
    description: { type: String, default: "", trim: true },
    debit: { type: Number, default: 0, min: 0 },
    credit: { type: Number, default: 0, min: 0 },
    date: { type: Date, required: true, default: Date.now },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: "Branch", default: null },
    branchName: { type: String, default: "", trim: true },
    costCenter: { type: mongoose.Schema.Types.ObjectId, ref: "CostCenter", default: null },
    costCenterName: { type: String, default: "", trim: true },
    reference: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
    sortOrder: { type: Number, default: 0 }
}, { timestamps: true });

// Index: compound for fast queries
JournalLineSchema.index({ journalEntry: 1, sortOrder: 1 });
JournalLineSchema.index({ account: 1, date: -1 });
JournalLineSchema.index({ accountCode: 1, date: -1 });

module.exports = mongoose.model("JournalLine", JournalLineSchema);