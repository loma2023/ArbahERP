const mongoose = require("mongoose");

const AccountSchema = new mongoose.Schema({
    code: {
        type: String,
        required: [true, "كود الحساب مطلوب"],
        unique: true,
        trim: true,
        index: true
    },
    name: {
        type: String,
        required: [true, "اسم الحساب مطلوب"],
        trim: true
    },
    type: {
        type: String,
        required: true,
        enum: ["asset", "liability", "equity", "revenue", "expense"],
        index: true
    },
    category: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    parent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Account",
        default: null,
        index: true
    },
    parentCode: {
        type: String,
        default: null,
        trim: true
    },
    level: {
        type: Number,
        required: true,
        min: 1,
        max: 10
    },
    accountPath: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    isGroup: {
        type: Boolean,
        default: false
    },
    isLeaf: {
        type: Boolean,
        default: false
    },
    allowTransactions: {
        type: Boolean,
        default: false
    },
    normalBalance: {
        type: String,
        enum: ["debit", "credit"],
        required: true
    },
    openingBalance: {
        type: Number,
        default: 0
    },
    currentBalance: {
        type: Number,
        default: 0
    },
    totalDebits: {
        type: Number,
        default: 0
    },
    totalCredits: {
        type: Number,
        default: 0
    },
    // ✅ بدون enum - String بسيط
    linkedEntity: {
        type: {
            type: String,
            default: null
        },
        entityId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },
        entityCode: {
            type: String,
            default: null
        }
    },
    isActive: {
        type: Boolean,
        default: true
    },
    notes: {
        type: String,
        default: "",
        trim: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual: children accounts
AccountSchema.virtual("children", {
    ref: "Account",
    localField: "_id",
    foreignField: "parent"
});

// Virtual: parent account
AccountSchema.virtual("parentAccount", {
    ref: "Account",
    localField: "parent",
    foreignField: "_id",
    justOne: true
});

// Index: compound for fast tree queries
AccountSchema.index({ parent: 1, level: 1 });
AccountSchema.index({ code: 1, isActive: 1 });

// Method: get balance sign
AccountSchema.methods.getBalance = function() {
    if (this.normalBalance === "debit") {
        return this.totalDebits - this.totalCredits + this.openingBalance;
    } else {
        return this.totalCredits - this.totalDebits + this.openingBalance;
    }
};

// Static: find by code
AccountSchema.statics.findByCode = function(code) {
    return this.findOne({ code: code.trim() });
};

// Static: get tree structure
AccountSchema.statics.getTree = async function(parentCode = null) {
    const query = parentCode ? { parentCode } : { parentCode: null };
    const accounts = await this.find(query).sort({ code: 1 }).lean();

    for (const account of accounts) {
        account.children = await this.getTree(account.code);
        account.balance = account.openingBalance + account.totalDebits - account.totalCredits;
    }

    return accounts;
};

// Static: get next available code for a parent
AccountSchema.statics.getNextCode = async function(parentCode) {
    const parent = await this.findOne({ code: parentCode });
    if (!parent) throw new Error("Parent account not found");

    const siblings = await this.find({ parentCode }).sort({ code: -1 }).limit(1);
    if (siblings.length === 0) {
        return `${parentCode}1`;
    }

    const lastCode = siblings[0].code;
    const lastNumber = parseInt(lastCode.slice(parentCode.length)) || 0;
    return `${parentCode}${lastNumber + 1}`;
};

// Static: get leaf accounts (for dropdowns)
AccountSchema.statics.getLeafAccounts = function(filter = {}) {
    return this.find({ isLeaf: true, isActive: true, ...filter }).sort({ code: 1 });
};

// Static: get accounts by type
AccountSchema.statics.getByType = function(type) {
    return this.find({ type, isActive: true }).sort({ code: 1 });
};

module.exports = mongoose.model("Account", AccountSchema);