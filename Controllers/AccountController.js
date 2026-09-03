const Account = require("../Models/AccountSchema");
const AccountService = require("../Services/AccountService");

// =============================================
// CREATE - Add New Account
// =============================================
exports.create = async (req, res) => {
    try {
        const account = await AccountService.createAccount(req.body);

        res.status(201).json({
            success: true,
            message: "تم إنشاء الحساب بنجاح",
            data: account
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// LIST - Get All Accounts (Flat)
// =============================================
exports.list = async (req, res) => {
    try {
        const filters = {
            type: req.query.type,
            category: req.query.category,
            isLeaf: req.query.isLeaf,
            parentCode: req.query.parentCode,
            search: req.query.search
        };

        const accounts = await AccountService.getAllAccounts(filters);

        res.json({
            success: true,
            count: accounts.length,
            data: accounts
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// GET TREE - Get Hierarchical Tree (OPTIMIZED)
// =============================================
exports.getTree = async (req, res) => {
    const startTime = Date.now();

    try {
        const tree = await AccountService.getAccountTree();

        const duration = Date.now() - startTime;
        console.log(`✅ Tree fetched in ${duration}ms (${tree.length} root nodes)`);

        res.json({
            success: true,
            count: tree.length,
            loadTime: duration,
            data: tree
        });

    } catch (error) {
        console.error("❌ Tree fetch error:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// GET TREE STATS - Get Statistics
// =============================================
exports.getTreeStats = async (req, res) => {
    try {
        const accounts = await Account.find({
            isActive: true
        }).lean();

        const stats = {
            assets: accounts
                .filter(a => a.type === "asset" && a.isLeaf)
                .reduce((sum, a) => sum + (a.currentBalance || 0), 0),
            liabilities: accounts
                .filter(a => a.type === "liability" && a.isLeaf)
                .reduce((sum, a) => sum + (a.currentBalance || 0), 0),
            equity: accounts
                .filter(a => a.type === "equity" && a.isLeaf)
                .reduce((sum, a) => sum + (a.currentBalance || 0), 0),
            revenue: accounts
                .filter(a => a.type === "revenue" && a.isLeaf)
                .reduce((sum, a) => sum + (a.currentBalance || 0), 0),
            expenses: accounts
                .filter(a => a.type === "expense" && a.isLeaf)
                .reduce((sum, a) => sum + (a.currentBalance || 0), 0),
        };

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// GET ONE - Get Single Account
// =============================================
exports.getOne = async (req, res) => {
    try {
        const account = await AccountService.getAccountById(req.params.id);

        res.json({
            success: true,
            data: account
        });

    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// UPDATE - Update Account
// =============================================
exports.update = async (req, res) => {
    try {
        const account = await AccountService.updateAccount(req.params.id, req.body);

        res.json({
            success: true,
            message: "تم تحديث الحساب بنجاح",
            data: account
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// DELETE - Soft Delete Account
// =============================================
exports.delete = async (req, res) => {
    try {
        const result = await AccountService.deleteAccount(req.params.id);

        res.json({
            success: true,
            message: result.message
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// HARD DELETE - Permanent Delete (Optional)
// =============================================
exports.hardDelete = async (req, res) => {
    try {
        const account = await Account.findByIdAndDelete(req.params.id);

        if (!account) {
            return res.status(404).json({
                success: false,
                message: "الحساب غير موجود"
            });
        }

        res.json({
            success: true,
            message: "تم حذف الحساب نهائياً"
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// GET NEXT CODE - Auto-generate next account code
// ✅ FIXED: Handle "null" string as actual null
// =============================================
exports.getNextCode = async (req, res) => {
    try {
        const { parentId } = req.params;

        // Handle "null" string as actual null
        let parentCode = "";
        if (parentId && parentId !== "null" && parentId !== "undefined") {
            const parent = await Account.findById(parentId).lean();
            if (parent) {
                parentCode = parent.code;
            }
        }

        const nextCode = await Account.getNextCode(parentCode || null);

        res.json({
            success: true,
            data: { nextCode }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// SEARCH - Search accounts
// =============================================
exports.search = async (req, res) => {
    try {
        const accounts = await AccountService.searchAccounts(req.params.keyword);

        res.json({
            success: true,
            count: accounts.length,
            data: accounts
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// GET BY CODE - Get account by code
// =============================================
exports.getByCode = async (req, res) => {
    try {
        const account = await AccountService.getAccountByCode(req.params.code);

        res.json({
            success: true,
            data: account
        });

    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// GET LEAVES - Get leaf accounts
// =============================================
exports.getLeaves = async (req, res) => {
    try {
        const filter = {};
        if (req.query.type) filter.type = req.query.type;
        if (req.query.category) filter.category = req.query.category;

        const accounts = await AccountService.getLeafAccounts(filter);

        res.json({
            success: true,
            count: accounts.length,
            data: accounts
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// GET STATEMENT - Get account statement
// =============================================
exports.getStatement = async (req, res) => {
    try {
        const { fromDate, toDate } = req.query;
        const statement = await AccountService.getAccountStatement(
            req.params.id,
            fromDate,
            toDate
        );

        res.json({
            success: true,
            data: statement
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};