const WarehouseService = require("../Services/WarehouseService");

// ═══════════════════════════════════════════════════════════
// CREATE
// ═══════════════════════════════════════════════════════════
exports.create = async (req, res) => {
    try {
        const warehouse = await WarehouseService.createWarehouse(req.body);
        res.status(201).json({
            success: true,
            message: "تم إضافة المخزن بنجاح",
            data: warehouse
        });
    } catch (error) {
        console.error("❌ Create Warehouse Error:", error.message);
        res.status(400).json({ success: false, message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════
// LIST ALL
// ═══════════════════════════════════════════════════════════
exports.list = async (req, res) => {
    try {
        const filters = {
            status: req.query.status,
            search: req.query.search
        };
        const warehouses = await WarehouseService.getAllWarehouses(filters);
        res.json({ success: true, count: warehouses.length, data: warehouses });
    } catch (error) {
        console.error("❌ List Warehouses Error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════
// GET ONE
// ═══════════════════════════════════════════════════════════
exports.getOne = async (req, res) => {
    try {
        const warehouse = await WarehouseService.getWarehouseById(req.params.id);
        res.json({ success: true, data: warehouse });
    } catch (error) {
        console.error("❌ Get Warehouse Error:", error.message);
        res.status(404).json({ success: false, message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════
// UPDATE
// ═══════════════════════════════════════════════════════════
exports.update = async (req, res) => {
    try {
        const warehouse = await WarehouseService.updateWarehouse(req.params.id, req.body);
        res.json({ success: true, message: "تم تحديث بيانات المخزن بنجاح", data: warehouse });
    } catch (error) {
        console.error("❌ Update Warehouse Error:", error.message);
        res.status(400).json({ success: false, message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════
// HIDE (Soft Delete)
// ═══════════════════════════════════════════════════════════
exports.hide = async (req, res) => {
    try {
        const result = await WarehouseService.hideWarehouse(req.params.id);
        res.json({ success: true, message: result.message });
    } catch (error) {
        console.error("❌ Hide Warehouse Error:", error.message);
        res.status(400).json({ success: false, message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════
// RESTORE
// ═══════════════════════════════════════════════════════════
exports.restore = async (req, res) => {
    try {
        const result = await WarehouseService.restoreWarehouse(req.params.id);
        res.json({ success: true, message: result.message });
    } catch (error) {
        console.error("❌ Restore Warehouse Error:", error.message);
        res.status(400).json({ success: false, message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════
// DELETE (Hard Delete)
// ═══════════════════════════════════════════════════════════
exports.delete = async (req, res) => {
    try {
        const result = await WarehouseService.deleteWarehouse(req.params.id);
        res.json({ success: true, message: result.message });
    } catch (error) {
        console.error("❌ Delete Warehouse Error:", error.message);
        res.status(400).json({ success: false, message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════
// SEARCH
// ═══════════════════════════════════════════════════════════
exports.search = async (req, res) => {
    try {
        const warehouses = await WarehouseService.searchWarehouses(req.params.keyword);
        res.json({ success: true, count: warehouses.length, data: warehouses });
    } catch (error) {
        console.error("❌ Search Warehouses Error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════
// GET NEXT CODE
// ═══════════════════════════════════════════════════════════
exports.getNextCode = async (req, res) => {
    try {
        const nextCode = await WarehouseService.getNextCode();
        res.json({ success: true, data: { nextCode } });
    } catch (error) {
        console.error("❌ Get Next Code Error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ═══════════════════════════════════════════════════════════
// GET STATS
// ═══════════════════════════════════════════════════════════
exports.getStats = async (req, res) => {
    try {
        const stats = await WarehouseService.getStats();
        res.json({ success: true, data: stats });
    } catch (error) {
        console.error("❌ Get Stats Error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};