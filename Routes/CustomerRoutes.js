const express = require("express");
const router = express.Router();
const CustomerController = require("../Controllers/CustomerController");

// ═══════════════════════════════════════════════════════════
// GET /api/Customers - Get all customers
// ═══════════════════════════════════════════════════════════
router.get("/", CustomerController.list);

// ═══════════════════════════════════════════════════════════
// GET /api/Customers/stats - Get customer statistics
// ═══════════════════════════════════════════════════════════
router.get("/stats", CustomerController.getStats);

// ═══════════════════════════════════════════════════════════
// GET /api/Customers/next-code - Get next available code
// ═══════════════════════════════════════════════════════════
router.get("/next-code", CustomerController.getNextCode);

// ═══════════════════════════════════════════════════════════
// GET /api/Customers/search/:keyword - Search customers
// ═══════════════════════════════════════════════════════════
router.get("/search/:keyword", CustomerController.search);

// ═══════════════════════════════════════════════════════════
// GET /api/Customers/code/:code - Get customer by code
// ═══════════════════════════════════════════════════════════
router.get("/code/:code", CustomerController.getByCode);

// ═══════════════════════════════════════════════════════════
// POST /api/Customers - Create new customer
// ═══════════════════════════════════════════════════════════
router.post("/create", CustomerController.create);

// ═══════════════════════════════════════════════════════════
// PUT /api/Customers/:id/opening-balance - Update opening balance
// ═══════════════════════════════════════════════════════════
router.put("/:id/opening-balance", CustomerController.updateOpeningBalance);

// ═══════════════════════════════════════════════════════════
// PUT /api/Customers/:id - Update customer
// ═══════════════════════════════════════════════════════════
router.put("/:id", CustomerController.update);

// ═══════════════════════════════════════════════════════════
// PUT /api/Customers/hide/:id - Soft delete (hide) customer
// ═══════════════════════════════════════════════════════════
router.put("/hide/:id", CustomerController.hide);

// ═══════════════════════════════════════════════════════════
// PUT /api/Customers/restore/:id - Restore hidden customer
// ═══════════════════════════════════════════════════════════
router.put("/restore/:id", CustomerController.restore);

// ═══════════════════════════════════════════════════════════
// DELETE /api/Customers/:id - Hard delete customer
// ═══════════════════════════════════════════════════════════
router.delete("/:id", CustomerController.delete);

// ═══════════════════════════════════════════════════════════
// POST /api/Customers/sync-balances - Sync all customer balances
// ═══════════════════════════════════════════════════════════
router.post("/sync-balances", CustomerController.syncBalances);

// ═══════════════════════════════════════════════════════════
// GET /api/Customers/:id - Get single customer
// ═══════════════════════════════════════════════════════════
router.get("/:id", CustomerController.getOne);

module.exports = router;