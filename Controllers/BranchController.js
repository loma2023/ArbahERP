const BranchService = require("../Services/BranchService");

// =============================================
// CREATE - Add New Branch
// =============================================
exports.create = async (req, res) => {
    try {
        const branch = await BranchService.createBranch(req.body);

        res.status(201).json({
            success: true,
            message: "تم إضافة الفرع بنجاح",
            data: branch
        });

    } catch (error) {
        console.error("❌ Create Branch Error:", error.message);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// LIST - Get All Branches
// =============================================
exports.list = async (req, res) => {
    try {
        const filters = {
            status: req.query.status,
            search: req.query.search
        };

        const branches = await BranchService.getAllBranches(filters);

        res.json({
            success: true,
            count: branches.length,
            data: branches
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// GET ONE - Get Single Branch
// =============================================
exports.getOne = async (req, res) => {
    try {
        const branch = await BranchService.getBranchById(req.params.id);

        res.json({
            success: true,
            data: branch
        });

    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// GET BY CODE - Get branch by code
// =============================================
exports.getByCode = async (req, res) => {
    try {
        const branch = await BranchService.getBranchByCode(req.params.code);

        res.json({
            success: true,
            data: branch
        });

    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// UPDATE - Update Branch
// =============================================
exports.update = async (req, res) => {
    try {
        const branch = await BranchService.updateBranch(req.params.id, req.body);

        res.json({
            success: true,
            message: "تم تحديث بيانات الفرع بنجاح",
            data: branch
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// HIDE - Soft Delete Branch
// =============================================
exports.hide = async (req, res) => {
    try {
        const result = await BranchService.hideBranch(req.params.id);

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
// RESTORE - Show Hidden Branch
// =============================================
exports.restore = async (req, res) => {
    try {
        const result = await BranchService.restoreBranch(req.params.id);

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
// SEARCH - Search Branches
// =============================================
exports.search = async (req, res) => {
    try {
        const branches = await BranchService.searchBranches(req.params.keyword);

        res.json({
            success: true,
            count: branches.length,
            data: branches
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
        const nextCode = await BranchService.getNextCode();

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
// GET STATS - Branch Statistics
// =============================================
exports.getStats = async (req, res) => {
    try {
        const stats = await BranchService.getStats();

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