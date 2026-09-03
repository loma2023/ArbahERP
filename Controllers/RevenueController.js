const RevenueService = require("../Services/RevenueService");

// =============================================
// CREATE - Add New Revenue + Auto Account
// =============================================
exports.create = async (req, res) => {
    try {
        const Revenue = await RevenueService.createRevenue(req.body);

        res.status(201).json({
            success: true,
            message: "تم إضافة المصروف وإنشاء حسابه في شجرة الحسابات بنجاح",
            data: Revenue
        });

    } catch (error) {
        console.error("❌ Create Revenue Error:", error.message);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// LIST - Get All Revenues
// =============================================
exports.list = async (req, res) => {
    try {
        const filters = {
            isActive: req.query.isActive,
            type: req.query.type,
            search: req.query.search
        };

        const Revenues = await RevenueService.getAllRevenues(filters);

        res.json({
            success: true,
            count: Revenues.length,
            data: Revenues
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// GET ONE - Get Single Revenue
// =============================================
exports.getOne = async (req, res) => {
    try {
        const Revenue = await RevenueService.getRevenueById(req.params.id);

        res.json({
            success: true,
            data: Revenue
        });

    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// UPDATE - Update Revenue
// =============================================
exports.update = async (req, res) => {
    try {
        const Revenue = await RevenueService.updateRevenue(req.params.id, req.body);

        res.json({
            success: true,
            message: "تم تحديث بيانات المصروف بنجاح",
            data: Revenue
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// HIDE - Soft Delete Revenue
// =============================================
exports.hide = async (req, res) => {
    try {
        const result = await RevenueService.hideRevenue(req.params.id);

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
// RESTORE - Show Hidden Revenue
// =============================================
exports.restore = async (req, res) => {
    try {
        const result = await RevenueService.restoreRevenue(req.params.id);

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
// DELETE - Hard Delete Revenue
// =============================================
exports.delete = async (req, res) => {
    try {
        const result = await RevenueService.deleteRevenue(req.params.id);

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
// SEARCH - Search Revenues
// =============================================
exports.search = async (req, res) => {
    try {
        const Revenues = await RevenueService.searchRevenues(req.params.keyword);

        res.json({
            success: true,
            count: Revenues.length,
            data: Revenues
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// ✅ GET MAIN RevenueS - For dropdown parent selection
// =============================================
exports.getMainRevenues = async (req, res) => {
    try {
        const Revenues = await RevenueService.getMainRevenues();

        res.json({
            success: true,
            count: Revenues.length,
            data: Revenues
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
        const nextCode = await RevenueService.getNextCode();

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
// GET STATS - Revenue Statistics
// =============================================
exports.getStats = async (req, res) => {
    try {
        const stats = await RevenueService.getStats();

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
// GET BY CODE - Get Revenue by code
// =============================================
exports.getByCode = async (req, res) => {
    try {
        const Revenue = await RevenueService.getRevenueByCode(req.params.code);

        res.json({
            success: true,
            data: Revenue
        });

    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
};