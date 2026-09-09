const express = require("express");
const router = express.Router();
const BranchController = require("../Controllers/BranchController");

// ═══════════════════════════════════════════════════════════
// GET /api/Branches - Get all branches
// ═══════════════════════════════════════════════════════════
router.get("/", BranchController.list);

// ═══════════════════════════════════════════════════════════
// GET /api/Branches/stats - Get branch statistics
// ═══════════════════════════════════════════════════════════
router.get("/stats", BranchController.getStats);

// ═══════════════════════════════════════════════════════════
// GET /api/Branches/next-code - Get next available code
// ═══════════════════════════════════════════════════════════
router.get("/next-code", BranchController.getNextCode);

// ═══════════════════════════════════════════════════════════
// GET /api/Branches/search/:keyword - Search branches
// ═══════════════════════════════════════════════════════════
router.get("/search/:keyword", BranchController.search);

// ═══════════════════════════════════════════════════════════
// GET /api/Branches/code/:code - Get branch by code
// ═══════════════════════════════════════════════════════════
router.get("/code/:code", BranchController.getByCode);

// ═══════════════════════════════════════════════════════════
// GET /api/Branches/:id - Get single branch
// ═══════════════════════════════════════════════════════════
router.get("/:id", BranchController.getOne);

// ═══════════════════════════════════════════════════════════
// POST /api/Branches/create - Create new branch
// ═══════════════════════════════════════════════════════════
router.post("/create", BranchController.create);

// ═══════════════════════════════════════════════════════════
// PUT /api/Branches/:id - Update branch
// ═══════════════════════════════════════════════════════════
router.put("/:id", BranchController.update);

// ═══════════════════════════════════════════════════════════
// PUT /api/Branches/hide/:id - Soft delete (hide) branch
// ═══════════════════════════════════════════════════════════
router.put("/hide/:id", BranchController.hide);

// ═══════════════════════════════════════════════════════════
// PUT /api/Branches/restore/:id - Restore hidden branch
// ═══════════════════════════════════════════════════════════
router.put("/restore/:id", BranchController.restore);

module.exports = router;