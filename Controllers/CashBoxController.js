const CashBoxService = require("../Services/CashBoxService");

// =============================================
// CREATE - Add New CashBox + Auto Account
// =============================================
exports.create = async (req, res) => {
    try {
        const cashBox = await CashBoxService.createCashBox(req.body);

        res.status(201).json({
            success: true,
            message: "تم إضافة الخزينة وإنشاء حسابها في شجرة الحسابات بنجاح",
            data: cashBox
        });

    } catch (error) {
        console.error("❌ Create CashBox Error:", error.message);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// LIST - Get All CashBoxes
// =============================================
exports.list = async (req, res) => {
    try {
        const filters = {
            status: req.query.status,
            search: req.query.search
        };

        const cashBoxes = await CashBoxService.getAllCashBoxes(filters);

        res.json({
            success: true,
            count: cashBoxes.length,
            data: cashBoxes
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// GET ONE - Get Single CashBox
// =============================================
exports.getOne = async (req, res) => {
    try {
        const cashBox = await CashBoxService.getCashBoxById(req.params.id);

        res.json({
            success: true,
            data: cashBox
        });

    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// GET BY CODE - Get cash box by code
// =============================================
exports.getByCode = async (req, res) => {
    try {
        const cashBox = await CashBoxService.getCashBoxByCode(req.params.code);

        res.json({
            success: true,
            data: cashBox
        });

    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// UPDATE - Update CashBox
// =============================================
exports.update = async (req, res) => {
    try {
        const cashBox = await CashBoxService.updateCashBox(req.params.id, req.body);

        res.json({
            success: true,
            message: "تم تحديث بيانات الخزينة بنجاح",
            data: cashBox
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// HIDE - Soft Delete CashBox
// =============================================
exports.hide = async (req, res) => {
    try {
        const result = await CashBoxService.hideCashBox(req.params.id);

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
// RESTORE - Show Hidden CashBox
// =============================================
exports.restore = async (req, res) => {
    try {
        const result = await CashBoxService.restoreCashBox(req.params.id);

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
// SEARCH - Search CashBoxes
// =============================================
exports.search = async (req, res) => {
    try {
        const cashBoxes = await CashBoxService.searchCashBoxes(req.params.keyword);

        res.json({
            success: true,
            count: cashBoxes.length,
            data: cashBoxes
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// GET NEXT CODE - Auto-generate next code
// =============================================
exports.getNextCode = async (req, res) => {
    try {
        const nextCode = await CashBoxService.getNextCode();

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
// GET STATS - CashBox Statistics
// =============================================
exports.getStats = async (req, res) => {
    try {
        const stats = await CashBoxService.getStats();

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