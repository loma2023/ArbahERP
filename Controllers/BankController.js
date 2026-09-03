const BankService = require("../Services/BankService");

// =============================================
// CREATE - Add New Bank + Auto Account
// =============================================
exports.create = async (req, res) => {
    try {
        const bank = await BankService.createBank(req.body);

        res.status(201).json({
            success: true,
            message: "تم إضافة البنك وإنشاء حسابه في شجرة الحسابات بنجاح",
            data: bank
        });

    } catch (error) {
        console.error("❌ Create Bank Error:", error.message);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// LIST - Get All Banks
// =============================================
exports.list = async (req, res) => {
    try {
        const filters = {
            status: req.query.status,
            search: req.query.search
        };

        const banks = await BankService.getAllBanks(filters);

        res.json({
            success: true,
            count: banks.length,
            data: banks
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// GET ONE - Get Single Bank
// =============================================
exports.getOne = async (req, res) => {
    try {
        const bank = await BankService.getBankById(req.params.id);

        res.json({
            success: true,
            data: bank
        });

    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// GET BY CODE - Get bank by code
// =============================================
exports.getByCode = async (req, res) => {
    try {
        const bank = await BankService.getBankByCode(req.params.code);

        res.json({
            success: true,
            data: bank
        });

    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// UPDATE - Update Bank
// =============================================
exports.update = async (req, res) => {
    try {
        const bank = await BankService.updateBank(req.params.id, req.body);

        res.json({
            success: true,
            message: "تم تحديث بيانات البنك بنجاح",
            data: bank
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// HIDE - Soft Delete Bank
// =============================================
exports.hide = async (req, res) => {
    try {
        const result = await BankService.hideBank(req.params.id);

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
// RESTORE - Show Hidden Bank
// =============================================
exports.restore = async (req, res) => {
    try {
        const result = await BankService.restoreBank(req.params.id);

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
// SEARCH - Search Banks
// =============================================
exports.search = async (req, res) => {
    try {
        const banks = await BankService.searchBanks(req.params.keyword);

        res.json({
            success: true,
            count: banks.length,
            data: banks
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
        const nextCode = await BankService.getNextCode();

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
// GET STATS - Bank Statistics
// =============================================
exports.getStats = async (req, res) => {
    try {
        const stats = await BankService.getStats();

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