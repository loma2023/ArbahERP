const express = require("express");
const router = express.Router();
const CostCenterController = require("../Controllers/CostCenterController");

// ═══════════════════════════════════════════════════════════
// GET /api/CostCenters - Get all cost centers
// ═══════════════════════════════════════════════════════════
router.get("/", CostCenterController.list);

// ═══════════════════════════════════════════════════════════
// GET /api/CostCenters/stats - Get cost center statistics
// ═══════════════════════════════════════════════════════════
router.get("/stats", CostCenterController.getStats);

// ═══════════════════════════════════════════════════════════
// GET /api/CostCenters/next-code - Get next available code
// ═══════════════════════════════════════════════════════════
router.get("/next-code", CostCenterController.getNextCode);

// ═══════════════════════════════════════════════════════════
// GET /api/CostCenters/main-centers - Get main centers for dropdown
// ═══════════════════════════════════════════════════════════
router.get("/main-centers", CostCenterController.getMainCenters);

// ═══════════════════════════════════════════════════════════
// GET /api/CostCenters/search/:keyword - Search cost centers
// ═══════════════════════════════════════════════════════════
router.get("/search/:keyword", CostCenterController.search);

// ═══════════════════════════════════════════════════════════
// GET /api/CostCenters/code/:code - Get cost center by code
// ═══════════════════════════════════════════════════════════
router.get("/code/:code", CostCenterController.getByCode);

// ═══════════════════════════════════════════════════════════
// GET /api/CostCenters/:id - Get single cost center
// ═══════════════════════════════════════════════════════════
router.get("/:id", CostCenterController.getOne);

// ═══════════════════════════════════════════════════════════
// POST /api/CostCenters/create - Create new cost center
// ═══════════════════════════════════════════════════════════
router.post("/create", CostCenterController.create);

// ═══════════════════════════════════════════════════════════
// PUT /api/CostCenters/:id - Update cost center
// ═══════════════════════════════════════════════════════════
router.put("/:id", CostCenterController.update);

// ═══════════════════════════════════════════════════════════
// PUT /api/CostCenters/hide/:id - Soft delete (hide) cost center
// ═══════════════════════════════════════════════════════════
router.put("/hide/:id", CostCenterController.hide);

// ═══════════════════════════════════════════════════════════
// PUT /api/CostCenters/restore/:id - Restore hidden cost center
// ═══════════════════════════════════════════════════════════
router.put("/restore/:id", CostCenterController.restore);

module.exports = router;