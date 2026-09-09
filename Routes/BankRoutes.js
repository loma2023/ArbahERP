const express = require("express");
const router = express.Router();
const BankController = require("../Controllers/BankController");

// ═══════════════════════════════════════════════════════════
// GET /api/Banks - Get all banks
// ═══════════════════════════════════════════════════════════
router.get("/", BankController.list);

// ═══════════════════════════════════════════════════════════
// GET /api/Banks/stats - Get bank statistics
// ═══════════════════════════════════════════════════════════
router.get("/stats", BankController.getStats);

// ═══════════════════════════════════════════════════════════
// GET /api/Banks/next-code - Get next available code
// ═══════════════════════════════════════════════════════════
router.get("/next-code", BankController.getNextCode);

// ═══════════════════════════════════════════════════════════
// GET /api/Banks/search/:keyword - Search banks
// ═══════════════════════════════════════════════════════════
router.get("/search/:keyword", BankController.search);

// ═══════════════════════════════════════════════════════════
// GET /api/Banks/code/:code - Get bank by code
// ═══════════════════════════════════════════════════════════
router.get("/code/:code", BankController.getByCode);

// ═══════════════════════════════════════════════════════════
// GET /api/Banks/:id - Get single bank
// ═══════════════════════════════════════════════════════════
router.get("/:id", BankController.getOne);

// ═══════════════════════════════════════════════════════════
// POST /api/Banks/create - Create new bank
// ═══════════════════════════════════════════════════════════
router.post("/create", BankController.create);

// ═══════════════════════════════════════════════════════════
// PUT /api/Banks/:id - Update bank
// ═══════════════════════════════════════════════════════════
router.put("/:id", BankController.update);

// ═══════════════════════════════════════════════════════════
// PUT /api/Banks/hide/:id - Soft delete (hide) bank
// ═══════════════════════════════════════════════════════════
router.put("/hide/:id", BankController.hide);

// ═══════════════════════════════════════════════════════════
// PUT /api/Banks/restore/:id - Restore hidden bank
// ═══════════════════════════════════════════════════════════
router.put("/restore/:id", BankController.restore);


module.exports = router;