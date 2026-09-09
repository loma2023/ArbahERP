const CostCenterService = require("../Services/CostCenterService");

// =============================================
// CREATE - Add New Cost Center
// =============================================
exports.create = async (req, res) => {
    try {
        const costCenter = await CostCenterService.createCostCenter(req.body);

        res.status(201).json({
            success: true,
            message: "تم إضافة مركز التكلفة بنجاح",
            data: costCenter
        });

    } catch (error) {
        console.error("❌ Create CostCenter Error:", error.message);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// LIST - Get All Cost Centers
// =============================================
exports.list = async (req, res) => {
    try {
        const filters = {
            status: req.query.status,
            type: req.query.type,
            branch: req.query.branch,
            search: req.query.search
        };

        const costCenters = await CostCenterService.getAllCostCenters(filters);

        res.json({
            success: true,
            count: costCenters.length,
            data: costCenters
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// GET ONE - Get Single Cost Center
// =============================================
exports.getOne = async (req, res) => {
    try {
        const costCenter = await CostCenterService.getCostCenterById(req.params.id);

        res.json({
            success: true,
            data: costCenter
        });

    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// GET BY CODE - Get cost center by code
// =============================================
exports.getByCode = async (req, res) => {
    try {
        const costCenter = await CostCenterService.getCostCenterByCode(req.params.code);

        res.json({
            success: true,
            data: costCenter
        });

    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// GET MAIN CENTERS - For dropdown
// =============================================
exports.getMainCenters = async (req, res) => {
    try {
        const mainCenters = await CostCenterService.getMainCenters();

        res.json({
            success: true,
            count: mainCenters.length,
            data: mainCenters
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// UPDATE - Update Cost Center
// =============================================
exports.update = async (req, res) => {
    try {
        const costCenter = await CostCenterService.updateCostCenter(req.params.id, req.body);

        res.json({
            success: true,
            message: "تم تحديث بيانات مركز التكلفة بنجاح",
            data: costCenter
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// HIDE - Soft Delete Cost Center
// =============================================
exports.hide = async (req, res) => {
    try {
        const result = await CostCenterService.hideCostCenter(req.params.id);

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
// RESTORE - Show Hidden Cost Center
// =============================================
exports.restore = async (req, res) => {
    try {
        const result = await CostCenterService.restoreCostCenter(req.params.id);

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
// SEARCH - Search Cost Centers
// =============================================
exports.search = async (req, res) => {
    try {
        const costCenters = await CostCenterService.searchCostCenters(req.params.keyword);

        res.json({
            success: true,
            count: costCenters.length,
            data: costCenters
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
        const nextCode = await CostCenterService.getNextCode();

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
// GET STATS - Cost Center Statistics
// =============================================
exports.getStats = async (req, res) => {
    try {
        const stats = await CostCenterService.getStats();

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