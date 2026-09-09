const express = require("express");
const router = express.Router();
const WarehouseController = require("../Controllers/WarehouseController");

// ═══════════════════════════════════════════════════════════
// Routes
// ═══════════════════════════════════════════════════════════

// List all warehouses (with optional filters)
router.get("/", WarehouseController.list);

// Get statistics
router.get("/stats", WarehouseController.getStats);

// Get next available code
router.get("/next-code", WarehouseController.getNextCode);

// Search warehouses
router.get("/search/:keyword", WarehouseController.search);

// Get single warehouse by ID (must be AFTER /search and /stats)
router.get("/:id", WarehouseController.getOne);

// Create new warehouse
router.post("/create", WarehouseController.create);

// Update warehouse
router.put("/:id", WarehouseController.update);

// Hide warehouse (soft delete)
router.put("/hide/:id", WarehouseController.hide);

// Restore hidden warehouse
router.put("/restore/:id", WarehouseController.restore);

// Hard delete warehouse
router.delete("/:id", WarehouseController.delete);

module.exports = router;