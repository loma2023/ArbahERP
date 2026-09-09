const express = require("express");
const router = express.Router();
const RevenueController = require("../Controllers/RevenueController");

// ═══════════════════════════════════════════════════════════
// GET /api/Revenues - Get all Revenues
// ═══════════════════════════════════════════════════════════
router.get("/", RevenueController.list);

// ═══════════════════════════════════════════════════════════
// GET /api/Revenues/stats - Get Revenue statistics
// ═══════════════════════════════════════════════════════════
router.get("/stats", RevenueController.getStats);

// ═══════════════════════════════════════════════════════════
// ✅ GET /api/Revenues/main - Get main Revenues (for dropdown)
// ═══════════════════════════════════════════════════════════
router.get("/main", RevenueController.getMainRevenues);

// ═══════════════════════════════════════════════════════════
// ✅ GET /api/Revenues/next-code - Get next available code
// ═══════════════════════════════════════════════════════════
router.get("/next-code", RevenueController.getNextCode);

// ═══════════════════════════════════════════════════════════
// GET /api/Revenues/search/:keyword - Search Revenues
// ═══════════════════════════════════════════════════════════
router.get("/search/:keyword", RevenueController.search);

// ═══════════════════════════════════════════════════════════
// GET /api/Revenues/code/:code - Get Revenue by code
// ═══════════════════════════════════════════════════════════
router.get("/code/:code", RevenueController.getByCode);

// ═══════════════════════════════════════════════════════════
// GET /api/Revenues/:id - Get single Revenue
// ═══════════════════════════════════════════════════════════
router.get("/:id", RevenueController.getOne);

// ═══════════════════════════════════════════════════════════
// POST /api/Revenues/create - Create new Revenue
// ═══════════════════════════════════════════════════════════
router.post("/create", RevenueController.create);

// ═══════════════════════════════════════════════════════════
// PUT /api/Revenues/:id - Update Revenue
// ═══════════════════════════════════════════════════════════
router.put("/:id", RevenueController.update);

// ═══════════════════════════════════════════════════════════
// PUT /api/Revenues/hide/:id - Soft delete (hide) Revenue
// ═══════════════════════════════════════════════════════════
router.put("/hide/:id", RevenueController.hide);

// ═══════════════════════════════════════════════════════════
// PUT /api/Revenues/restore/:id - Restore hidden Revenue
// ═══════════════════════════════════════════════════════════
router.put("/restore/:id", RevenueController.restore);

// ═══════════════════════════════════════════════════════════
// DELETE /api/Revenues/:id - Hard delete Revenue
// ═══════════════════════════════════════════════════════════
router.delete("/:id", RevenueController.delete);

module.exports = router;