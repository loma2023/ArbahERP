// Controllers/StockMovementController.js
const StockMovementService = require("../Services/StockMovementService");

exports.list = async (req, res) => {
    try {
        const filters = {
            type: req.query.type,
            status: req.query.status,
            fromWarehouse: req.query.fromWarehouse,
            toWarehouse: req.query.toWarehouse,
            startDate: req.query.startDate,
            endDate: req.query.endDate,
            reference: req.query.reference
        };
        const movements = await StockMovementService.getAllMovements(filters);
        res.json({ success: true, count: movements.length, data: movements });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getOne = async (req, res) => {
    try {
        const movement = await StockMovementService.getMovementById(req.params.id);
        res.json({ success: true, data: movement });
    } catch (error) {
        res.status(404).json({ success: false, message: error.message });
    }
};

exports.createReceipt = async (req, res) => {
    try {
        const movement = await StockMovementService.createReceipt(req.body, req.user?._id);
        res.status(201).json({
            success: true,
            message: "تم إنشاء حركة الاستلام بنجاح. يرجى التأكيد لتطبيقها.",
            data: movement
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.createIssue = async (req, res) => {
    try {
        const movement = await StockMovementService.createIssue(req.body, req.user?._id);
        res.status(201).json({
            success: true,
            message: "تم إنشاء حركة الصرف بنجاح. يرجى التأكيد لتطبيقها.",
            data: movement
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.createTransfer = async (req, res) => {
    try {
        const movement = await StockMovementService.createTransfer(req.body, req.user?._id);
        res.status(201).json({
            success: true,
            message: "تم إنشاء حركة التحويل بنجاح. يرجى التأكيد لتطبيقها.",
            data: movement
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.createAdjustment = async (req, res) => {
    try {
        const movement = await StockMovementService.createAdjustment(req.body, req.user?._id);
        res.status(201).json({
            success: true,
            message: "تم إنشاء حركة التسوية بنجاح. يرجى التأكيد لتطبيقها.",
            data: movement
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.confirm = async (req, res) => {
    try {
        const movement = await StockMovementService.confirmMovement(req.params.id, req.user?._id);
        res.json({
            success: true,
            message: "تم تأكيد الحركة وتحديث الأرصدة والقيد المحاسبي بنجاح",
            data: movement
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.cancel = async (req, res) => {
    try {
        const result = await StockMovementService.cancelMovement(req.params.id);
        res.json({ success: true, message: result.message });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.getStockBalance = async (req, res) => {
    try {
        const filters = {
            product: req.query.product,
            minQuantity: req.query.minQuantity ? parseFloat(req.query.minQuantity) : undefined,
            maxQuantity: req.query.maxQuantity ? parseFloat(req.query.maxQuantity) : undefined
        };
        const balances = await StockMovementService.getStockBalance(req.params.warehouseId, filters);
        res.json({ success: true, count: balances.length, data: balances });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getProductBalance = async (req, res) => {
    try {
        const balance = await StockMovementService.getProductBalance(req.params.productId);
        res.json({ success: true, data: balance });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getStats = async (req, res) => {
    try {
        const filters = {
            startDate: req.query.startDate,
            endDate: req.query.endDate
        };
        const stats = await StockMovementService.getStats(filters);
        res.json({ success: true, data: stats });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};