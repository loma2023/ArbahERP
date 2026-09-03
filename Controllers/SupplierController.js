const SupplierService = require("../Services/SupplierService");

// =============================================
// CREATE - Add New Supplier + Auto Account
// =============================================
exports.create = async (req, res) => {
    try {
        const supplier = await SupplierService.createSupplier(req.body);

        res.status(201).json({
            success: true,
            message: "تم إضافة المورد وإنشاء حسابه في شجرة الحسابات بنجاح",
            data: supplier
        });

    } catch (error) {
        console.error("❌ Create Supplier Error:", error.message);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// LIST - Get All Suppliers
// =============================================
exports.list = async (req, res) => {
    try {
        const filters = {
            isActive: req.query.isActive,
            search: req.query.search
        };

        const suppliers = await SupplierService.getAllSuppliers(filters);

        res.json({
            success: true,
            count: suppliers.length,
            data: suppliers
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// GET ONE - Get Single Supplier
// =============================================
exports.getOne = async (req, res) => {
    try {
        const supplier = await SupplierService.getSupplierById(req.params.id);

        res.json({
            success: true,
            data: supplier
        });

    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// UPDATE - Update Supplier
// =============================================
exports.update = async (req, res) => {
    try {
        const supplier = await SupplierService.updateSupplier(req.params.id, req.body);

        res.json({
            success: true,
            message: "تم تحديث بيانات المورد بنجاح",
            data: supplier
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// HIDE - Soft Delete Supplier
// =============================================
exports.hide = async (req, res) => {
    try {
        const result = await SupplierService.hideSupplier(req.params.id);

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
// RESTORE - Show Hidden Supplier
// =============================================
exports.restore = async (req, res) => {
    try {
        const result = await SupplierService.restoreSupplier(req.params.id);

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
// DELETE - Hard Delete Supplier
// =============================================
exports.delete = async (req, res) => {
    try {
        const result = await SupplierService.deleteSupplier(req.params.id);

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
// SEARCH - Search Suppliers
// =============================================
exports.search = async (req, res) => {
    try {
        const suppliers = await SupplierService.searchSuppliers(req.params.keyword);

        res.json({
            success: true,
            count: suppliers.length,
            data: suppliers
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
        const nextCode = await SupplierService.getNextCode();

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
// GET STATS - Supplier Statistics
// =============================================
exports.getStats = async (req, res) => {
    try {
        const stats = await SupplierService.getStats();

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
// GET BY CODE - Get supplier by code
// =============================================
exports.getByCode = async (req, res) => {
    try {
        const supplier = await SupplierService.getSupplierByCode(req.params.code);

        res.json({
            success: true,
            data: supplier
        });

    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// SYNC BALANCES - Sync all supplier balances from linked accounts
// =============================================
exports.syncBalances = async (req, res) => {
    try {
        const results = await SupplierService.syncAllBalances();

        res.json({
            success: true,
            message: `تم مزامنة ${results.length} مورد`,
            data: results
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};