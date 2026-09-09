// Routes/FixedAssetRoutes.js
const express = require("express");
const router = express.Router();
const FixedAssetController = require("../Controllers/FixedAssetController");

// ═══════════════════════════════════════════════════════════
// GET /api/FixedAssets - Get all assets
// ═══════════════════════════════════════════════════════════
router.get("/", FixedAssetController.list);

// ═══════════════════════════════════════════════════════════
// GET /api/FixedAssets/stats - Get asset statistics
// ═══════════════════════════════════════════════════════════
router.get("/stats", FixedAssetController.getStats);

// ═══════════════════════════════════════════════════════════
// GET /api/FixedAssets/accounts - Get available asset accounts
// ═══════════════════════════════════════════════════════════
router.get("/accounts", FixedAssetController.getAssetAccounts);

// ═══════════════════════════════════════════════════════════
// GET /api/FixedAssets/payment-accounts - Get payment accounts
// ═══════════════════════════════════════════════════════════
router.get("/payment-accounts", FixedAssetController.getPaymentAccounts);

// ═══════════════════════════════════════════════════════════
// GET /api/FixedAssets/next-code - Get next available code
// ═══════════════════════════════════════════════════════════
router.get("/next-code", FixedAssetController.getNextCode);

// ═══════════════════════════════════════════════════════════
// GET /api/FixedAssets/search/:keyword - Search assets
// ═══════════════════════════════════════════════════════════
router.get("/search/:keyword", FixedAssetController.search);

// ═══════════════════════════════════════════════════════════
// GET /api/FixedAssets/code/:code - Get asset by code
// ═══════════════════════════════════════════════════════════
router.get("/code/:code", FixedAssetController.getByCode);

// ═══════════════════════════════════════════════════════════
// GET /api/FixedAssets/:id/depreciation - Calculate depreciation
// ═══════════════════════════════════════════════════════════
router.get("/:id/depreciation", FixedAssetController.calculateDepreciation);

// ═══════════════════════════════════════════════════════════
// GET /api/FixedAssets/:id - Get single asset
// ═══════════════════════════════════════════════════════════
router.get("/:id", FixedAssetController.getOne);

// ═══════════════════════════════════════════════════════════
// POST /api/FixedAssets/create - Create new asset
// ═══════════════════════════════════════════════════════════
router.post("/create", FixedAssetController.create);

// ═══════════════════════════════════════════════════════════
// POST /api/FixedAssets/:id/depreciation - Record depreciation
// ═══════════════════════════════════════════════════════════
router.post("/:id/depreciation", FixedAssetController.recordDepreciation);

// ═══════════════════════════════════════════════════════════
// PUT /api/FixedAssets/:id - Update asset
// ═══════════════════════════════════════════════════════════
router.put("/:id", FixedAssetController.update);

// ═══════════════════════════════════════════════════════════
// PUT /api/FixedAssets/hide/:id - Soft delete (hide) asset
// ═══════════════════════════════════════════════════════════
router.put("/hide/:id", FixedAssetController.hide);

// ═══════════════════════════════════════════════════════════
// PUT /api/FixedAssets/restore/:id - Restore hidden asset
// ═══════════════════════════════════════════════════════════
router.put("/restore/:id", FixedAssetController.restore);

// ═══════════════════════════════════════════════════════════
// POST /api/FixedAssets/:id/depreciation-journal - Record depreciation journal
// ═══════════════════════════════════════════════════════════
router.post("/:id/depreciation-journal", FixedAssetController.recordDepreciationJournal);

// ═══════════════════════════════════════════════════════════
// POST /api/FixedAssets/batch-depreciation - Batch depreciation for all assets
// ═══════════════════════════════════════════════════════════
router.post("/batch-depreciation", FixedAssetController.batchDepreciation);

// ═══════════════════════════════════════════════════════════
// DELETE /api/FixedAssets/:id - Hard delete asset
// ═══════════════════════════════════════════════════════════
router.delete("/:id", FixedAssetController.delete);

module.exports = router;