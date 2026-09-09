const ExpenseService = require("../Services/ExpenseService");

// =============================================
// CREATE - Add New Expense + Auto Account
// =============================================
exports.create = async (req, res) => {
    try {
        const expense = await ExpenseService.createExpense(req.body);

        res.status(201).json({
            success: true,
            message: "تم إضافة المصروف وإنشاء حسابه في شجرة الحسابات بنجاح",
            data: expense
        });

    } catch (error) {
        console.error("❌ Create Expense Error:", error.message);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// LIST - Get All Expenses
// =============================================
exports.list = async (req, res) => {
    try {
        const filters = {
            isActive: req.query.isActive,
            type: req.query.type,
            search: req.query.search
        };

        const expenses = await ExpenseService.getAllExpenses(filters);

        res.json({
            success: true,
            count: expenses.length,
            data: expenses
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// GET ONE - Get Single Expense
// =============================================
exports.getOne = async (req, res) => {
    try {
        const expense = await ExpenseService.getExpenseById(req.params.id);

        res.json({
            success: true,
            data: expense
        });

    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// UPDATE - Update Expense
// =============================================
exports.update = async (req, res) => {
    try {
        const expense = await ExpenseService.updateExpense(req.params.id, req.body);

        res.json({
            success: true,
            message: "تم تحديث بيانات المصروف بنجاح",
            data: expense
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// HIDE - Soft Delete Expense
// =============================================
exports.hide = async (req, res) => {
    try {
        const result = await ExpenseService.hideExpense(req.params.id);

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
// RESTORE - Show Hidden Expense
// =============================================
exports.restore = async (req, res) => {
    try {
        const result = await ExpenseService.restoreExpense(req.params.id);

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
// DELETE - Hard Delete Expense
// =============================================
exports.delete = async (req, res) => {
    try {
        const result = await ExpenseService.deleteExpense(req.params.id);

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
// SEARCH - Search Expenses
// =============================================
exports.search = async (req, res) => {
    try {
        const expenses = await ExpenseService.searchExpenses(req.params.keyword);

        res.json({
            success: true,
            count: expenses.length,
            data: expenses
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// ✅ GET MAIN EXPENSES - For dropdown parent selection
// =============================================
exports.getMainExpenses = async (req, res) => {
    try {
        const expenses = await ExpenseService.getMainExpenses();

        res.json({
            success: true,
            count: expenses.length,
            data: expenses
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// ✅ GET NEXT CODE - Auto-generate next code
// =============================================
exports.getNextCode = async (req, res) => {
    try {
        const nextCode = await ExpenseService.getNextCode();

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
// GET STATS - Expense Statistics
// =============================================
exports.getStats = async (req, res) => {
    try {
        const stats = await ExpenseService.getStats();

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
// GET BY CODE - Get expense by code
// =============================================
exports.getByCode = async (req, res) => {
    try {
        const expense = await ExpenseService.getExpenseByCode(req.params.code);

        res.json({
            success: true,
            data: expense
        });

    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
};