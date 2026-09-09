const express = require("express");
const router = express.Router();
const SupplierController = require("../Controllers/SupplierController");

// ═══════════════════════════════════════════════════════════
// GET /api/Suppliers - Get all suppliers
// ═══════════════════════════════════════════════════════════
router.get("/", SupplierController.list);

// ═══════════════════════════════════════════════════════════
// GET /api/Suppliers/stats - Get supplier statistics
// ═══════════════════════════════════════════════════════════
router.get("/stats", SupplierController.getStats);

// ═══════════════════════════════════════════════════════════
// GET /api/Suppliers/next-code - Get next available code
// ═══════════════════════════════════════════════════════════
router.get("/next-code", SupplierController.getNextCode);

// ═══════════════════════════════════════════════════════════
// GET /api/Suppliers/search/:keyword - Search suppliers
// ═══════════════════════════════════════════════════════════
router.get("/search/:keyword", SupplierController.search);

// ═══════════════════════════════════════════════════════════
// GET /api/Suppliers/code/:code - Get supplier by code
// ═══════════════════════════════════════════════════════════
router.get("/code/:code", SupplierController.getByCode);

// ═══════════════════════════════════════════════════════════
// POST /api/Suppliers - Create new supplier
// ═══════════════════════════════════════════════════════════
router.post("/create", SupplierController.create);

// ═══════════════════════════════════════════════════════════
// PUT /api/Suppliers/:id - Update supplier
// ═══════════════════════════════════════════════════════════
router.put("/:id", SupplierController.update);

// ═══════════════════════════════════════════════════════════
// PUT /api/Suppliers/hide/:id - Soft delete (hide) supplier
// ═══════════════════════════════════════════════════════════
router.put("/hide/:id", SupplierController.hide);

// ═══════════════════════════════════════════════════════════
// PUT /api/Suppliers/restore/:id - Restore hidden supplier
// ═══════════════════════════════════════════════════════════
router.put("/restore/:id", SupplierController.restore);

// ═══════════════════════════════════════════════════════════
// DELETE /api/Suppliers/:id - Hard delete supplier
// ═══════════════════════════════════════════════════════════
router.delete("/:id", SupplierController.delete);

// ═══════════════════════════════════════════════════════════
// POST /api/Suppliers/sync-balances - Sync all supplier balances
// ═══════════════════════════════════════════════════════════
router.post("/sync-balances", SupplierController.syncBalances);

// ═══════════════════════════════════════════════════════════
// GET /api/Suppliers/:id - Get single supplier
// ═══════════════════════════════════════════════════════════
router.get("/:id", SupplierController.getOne);

module.exports = router;