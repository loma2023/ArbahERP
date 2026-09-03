// Controllers/FixedAssetController.js
const FixedAssetService = require("../Services/FixedAssetService");

// ═══════════════════════════════════════════════════════════
// CREATE - Add New Fixed Asset
// ═══════════════════════════════════════════════════════════
exports.create = async (req, res) => {
    try {
        const asset = await FixedAssetService.createAsset(req.body);

        res.status(201).json({
            success: true,
            message: asset.assetType === "new" 
                ? "تم إضافة الأصل الثابت وإنشاء قيد الشراء بنجاح" 
                : "تم إضافة الأصل الثابت وإنشاء القيد الافتتاحي بنجاح",
            data: asset
        });

    } catch (error) {
        console.error("❌ Create Fixed Asset Error:", error.message);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════
// LIST - Get All Fixed Assets
// ═══════════════════════════════════════════════════════════
exports.list = async (req, res) => {
    try {
        const filters = {
            isActive: req.query.isActive,
            assetAccountCode: req.query.assetAccountCode,
            branch: req.query.branch,
            search: req.query.search
        };

        const assets = await FixedAssetService.getAllAssets(filters);

        res.json({
            success: true,
            count: assets.length,
            data: assets
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════
// GET ONE - Get Single Asset
// ═══════════════════════════════════════════════════════════
exports.getOne = async (req, res) => {
    try {
        const asset = await FixedAssetService.getAssetById(req.params.id);

        res.json({
            success: true,
            data: asset
        });

    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════
// UPDATE - Update Asset
// ═══════════════════════════════════════════════════════════
exports.update = async (req, res) => {
    try {
        const asset = await FixedAssetService.updateAsset(req.params.id, req.body);

        res.json({
            success: true,
            message: "تم تحديث بيانات الأصل بنجاح",
            data: asset
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════
// HIDE - Soft Delete Asset
// ═══════════════════════════════════════════════════════════
exports.hide = async (req, res) => {
    try {
        const result = await FixedAssetService.hideAsset(req.params.id);

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

// ═══════════════════════════════════════════════════════════
// RESTORE - Show Hidden Asset
// ═══════════════════════════════════════════════════════════
exports.restore = async (req, res) => {
    try {
        const result = await FixedAssetService.restoreAsset(req.params.id);

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

// ═══════════════════════════════════════════════════════════
// DELETE - Hard Delete Asset
// ═══════════════════════════════════════════════════════════
exports.delete = async (req, res) => {
    try {
        const result = await FixedAssetService.deleteAsset(req.params.id);

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

// ═══════════════════════════════════════════════════════════
// SEARCH - Search Assets
// ═══════════════════════════════════════════════════════════
exports.search = async (req, res) => {
    try {
        const assets = await FixedAssetService.searchAssets(req.params.keyword);

        res.json({
            success: true,
            count: assets.length,
            data: assets
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════
// GET NEXT CODE - Auto-generate next code
// ═══════════════════════════════════════════════════════════
exports.getNextCode = async (req, res) => {
    try {
        const nextCode = await FixedAssetService.getNextCode();

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

// ═══════════════════════════════════════════════════════════
// GET STATS - Asset Statistics
// ═══════════════════════════════════════════════════════════
exports.getStats = async (req, res) => {
    try {
        const stats = await FixedAssetService.getStats();

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

// ═══════════════════════════════════════════════════════════
// GET BY CODE - Get asset by code
// ═══════════════════════════════════════════════════════════
exports.getByCode = async (req, res) => {
    try {
        const asset = await FixedAssetService.getAssetByCode(req.params.code);

        res.json({
            success: true,
            data: asset
        });

    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════
// RECORD DEPRECIATION - Record depreciation entry
// ═══════════════════════════════════════════════════════════
exports.recordDepreciation = async (req, res) => {
    try {
        const { amount } = req.body;
        const asset = await FixedAssetService.recordDepreciation(req.params.id, amount);

        res.json({
            success: true,
            message: "تم تسجيل الإهلاك بنجاح",
            data: asset
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════
// CALCULATE DEPRECIATION - Get depreciation calculation
// ═══════════════════════════════════════════════════════════
exports.calculateDepreciation = async (req, res) => {
    try {
        const calculation = await FixedAssetService.calculateCurrentDepreciation(req.params.id);

        res.json({
            success: true,
            data: calculation
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════
// GET ASSET ACCOUNTS - Get available asset accounts
// ═══════════════════════════════════════════════════════════
exports.getAssetAccounts = async (req, res) => {
    try {
        const accounts = await FixedAssetService.getAssetAccounts();

        res.json({
            success: true,
            data: accounts
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════
// GET PAYMENT ACCOUNTS - Get available payment accounts
// ═══════════════════════════════════════════════════════════
exports.getPaymentAccounts = async (req, res) => {
    try {
        const accounts = await FixedAssetService.getPaymentAccounts();

        res.json({
            success: true,
            data: accounts
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════
// RECORD DEPRECIATION JOURNAL - تسجيل قيد إهلاك
// ═══════════════════════════════════════════════════════════
exports.recordDepreciationJournal = async (req, res) => {
    try {
        const { year, month, force } = req.body;
        const result = await FixedAssetService.recordDepreciationJournal(
            req.params.id,
            { year, month, force }
        );

        res.json({
            success: true,
            message: "تم تسجيل قيد الإهلاك بنجاح",
            data: result
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// ═══════════════════════════════════════════════════════════
// BATCH DEPRECIATION - إهلاك جميع الأصول
// ═══════════════════════════════════════════════════════════
exports.batchDepreciation = async (req, res) => {
    try {
        const { year, month } = req.body;
        const result = await FixedAssetService.batchDepreciation({ year, month });

        res.json({
            success: true,
            message: `تم معالجة ${result.successful.length} أصل، وفشل ${result.failed.length}`,
            data: result
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};