const express = require("express");
const router = express.Router();
const CashBoxController = require("../Controllers/CashBoxController");

// ═══════════════════════════════════════════════════════════
// GET /api/CashBoxes/stats - Get cash box statistics
// ═══════════════════════════════════════════════════════════
router.get("/stats", CashBoxController.getStats);

// ═══════════════════════════════════════════════════════════
// GET /api/CashBoxes/next-code - Get next available code
// ═══════════════════════════════════════════════════════════
router.get("/next-code", CashBoxController.getNextCode);

// ═══════════════════════════════════════════════════════════
// GET /api/CashBoxes/search/:keyword - Search cash boxes
// ═══════════════════════════════════════════════════════════
router.get("/search/:keyword", CashBoxController.search);

// ═══════════════════════════════════════════════════════════
// GET /api/CashBoxes/code/:code - Get cash box by code
// ═══════════════════════════════════════════════════════════
router.get("/code/:code", CashBoxController.getByCode);

// ═══════════════════════════════════════════════════════════
// GET /api/CashBoxes - Get all cash boxes
// ═══════════════════════════════════════════════════════════
router.get("/", CashBoxController.list);

// ═══════════════════════════════════════════════════════════
// GET /api/CashBoxes/:id - Get single cash box
// ═══════════════════════════════════════════════════════════
router.get("/:id", CashBoxController.getOne);

// ═══════════════════════════════════════════════════════════
// POST /api/CashBoxes/create - Create new cash box
// ═══════════════════════════════════════════════════════════
router.post("/create", CashBoxController.create);

// ═══════════════════════════════════════════════════════════
// PUT /api/CashBoxes/:id - Update cash box
// ═══════════════════════════════════════════════════════════
router.put("/:id", CashBoxController.update);

// ═══════════════════════════════════════════════════════════
// PUT /api/CashBoxes/hide/:id - Soft delete (hide) cash box
// ═══════════════════════════════════════════════════════════
router.put("/hide/:id", CashBoxController.hide);

// ═══════════════════════════════════════════════════════════
// PUT /api/CashBoxes/restore/:id - Restore hidden cash box
// ═══════════════════════════════════════════════════════════
router.put("/restore/:id", CashBoxController.restore);

module.exports = router;