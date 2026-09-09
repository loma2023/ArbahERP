// Controllers/VoucherController.js
const VoucherService = require("../Services/VoucherService");

exports.list = async (req, res) => {
    try {
        // تحويل type → voucherType عشان الـ Service يفهمها
        const filters = { ...req.query };
        if (filters.type) {
            filters.voucherType = filters.type;
            delete filters.type;
        }
        const data = await VoucherService.getAllVouchers(filters);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getStats = async (req, res) => {
    try {
        const data = await VoucherService.getStats(req.query.type);
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ═══════════════════════════════════════════════════════
//    GET NEXT VOUCHER NUMBER
// ═══════════════════════════════════════════════════════
exports.getNextNumber = async (req, res) => {
    try {
        const { type } = req.query; // "receipt" أو "payment"
        const nextNumber = await VoucherService.getNextVoucherNumber(type);
        res.json({ success: true, data: { nextNumber } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getOne = async (req, res) => {
    try {
        const data = await VoucherService.getVoucherById(req.params.id);
        res.json({ success: true, data });
    } catch (error) {
        res.status(404).json({ success: false, message: error.message });
    }
};

exports.create = async (req, res) => {
    try {
        const data = await VoucherService.createVoucher(req.body);
        res.status(201).json({ success: true, data });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
};

exports.delete = async (req, res) => {
    try {
        const result = await VoucherService.deleteVoucher(req.params.id);
        res.json({ success: true, data: result });
    } catch (error) {
        res.status(404).json({ success: false, message: error.message });
    }
};