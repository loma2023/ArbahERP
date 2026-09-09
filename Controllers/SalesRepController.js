const SalesRepService = require("../Services/SalesRepService");

// =============================================
// CREATE
// =============================================
exports.create = async (req, res) => {
    try {
        const salesRep = await SalesRepService.createSalesRep(req.body);
        res.status(201).json({
            success: true,
            message: "تم إضافة المندوب وإنشاء حسابه في شجرة الحسابات بنجاح",
            data: salesRep
        });
    } catch (error) {
        console.error("❌ Create SalesRep Error:", error.message);
        res.status(400).json({ success: false, message: error.message });
    }
};

// =============================================
// LIST
// =============================================
exports.list = async (req, res) => {
    try {
        const filters = {
            status: req.query.status,
            branch: req.query.branch,
            search: req.query.search
        };
        const salesReps = await SalesRepService.getAllSalesReps(filters);
        res.json({ success: true, count: salesReps.length, data: salesReps });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// =============================================
// GET ONE
// =============================================
exports.getOne = async (req, res) => {
    try {
        const salesRep = await SalesRepService.getSalesRepById(req.params.id);
        res.json({ success: true, data: salesRep });
    } catch (error) {
        res.status(404).json({ success: false, message: error.message });
    }
};

// =============================================
// GET BY CODE
// =============================================
exports.getByCode = async (req, res) => {
    try {
        const salesRep = await SalesRepService.getSalesRepByCode(req.params.code);
        res.json({ success: true, data: salesRep });
    } catch (error) {
        res.status(404).json({ success: false, message: error.message });
    }
};

// =============================================
// UPDATE
// =============================================
exports.update = async (req, res) => {
    try {
        const salesRep = await SalesRepService.updateSalesRep(req.params.id, req.body);
        res.json({ success: true, message: "تم تحديث بيانات المندوب بنجاح", data: salesRep });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// =============================================
// HIDE
// =============================================
exports.hide = async (req, res) => {
    try {
        const result = await SalesRepService.hideSalesRep(req.params.id);
        res.json({ success: true, message: result.message });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// =============================================
// RESTORE
// =============================================
exports.restore = async (req, res) => {
    try {
        const result = await SalesRepService.restoreSalesRep(req.params.id);
        res.json({ success: true, message: result.message });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

// =============================================
// SEARCH
// =============================================
exports.search = async (req, res) => {
    try {
        const salesReps = await SalesRepService.searchSalesReps(req.params.keyword);
        res.json({ success: true, count: salesReps.length, data: salesReps });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// =============================================
// GET NEXT CODE
// =============================================
exports.getNextCode = async (req, res) => {
    try {
        const nextCode = await SalesRepService.getNextCode();
        res.json({ success: true, data: { nextCode } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// =============================================
// GET STATS
// =============================================
exports.getStats = async (req, res) => {
    try {
        const stats = await SalesRepService.getStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};