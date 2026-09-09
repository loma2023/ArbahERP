const express = require("express");
const router = express.Router();
const ExpenseController = require("../Controllers/ExpenseController");

// ═══════════════════════════════════════════════════════════
// GET /api/Expenses - Get all expenses
// ═══════════════════════════════════════════════════════════
router.get("/", ExpenseController.list);

// ═══════════════════════════════════════════════════════════
// GET /api/Expenses/stats - Get expense statistics
// ═══════════════════════════════════════════════════════════
router.get("/stats", ExpenseController.getStats);

// ═══════════════════════════════════════════════════════════
// ✅ GET /api/Expenses/main - Get main expenses (for dropdown)
// ═══════════════════════════════════════════════════════════
router.get("/main", ExpenseController.getMainExpenses);

// ═══════════════════════════════════════════════════════════
// ✅ GET /api/Expenses/next-code - Get next available code
// ═══════════════════════════════════════════════════════════
router.get("/next-code", ExpenseController.getNextCode);

// ═══════════════════════════════════════════════════════════
// GET /api/Expenses/search/:keyword - Search expenses
// ═══════════════════════════════════════════════════════════
router.get("/search/:keyword", ExpenseController.search);

// ═══════════════════════════════════════════════════════════
// GET /api/Expenses/code/:code - Get expense by code
// ═══════════════════════════════════════════════════════════
router.get("/code/:code", ExpenseController.getByCode);

// ═══════════════════════════════════════════════════════════
// GET /api/Expenses/:id - Get single expense
// ═══════════════════════════════════════════════════════════
router.get("/:id", ExpenseController.getOne);

// ═══════════════════════════════════════════════════════════
// POST /api/Expenses/create - Create new expense
// ═══════════════════════════════════════════════════════════
router.post("/create", ExpenseController.create);

// ═══════════════════════════════════════════════════════════
// PUT /api/Expenses/:id - Update expense
// ═══════════════════════════════════════════════════════════
router.put("/:id", ExpenseController.update);

// ═══════════════════════════════════════════════════════════
// PUT /api/Expenses/hide/:id - Soft delete (hide) expense
// ═══════════════════════════════════════════════════════════
router.put("/hide/:id", ExpenseController.hide);

// ═══════════════════════════════════════════════════════════
// PUT /api/Expenses/restore/:id - Restore hidden expense
// ═══════════════════════════════════════════════════════════
router.put("/restore/:id", ExpenseController.restore);

// ═══════════════════════════════════════════════════════════
// DELETE /api/Expenses/:id - Hard delete expense
// ═══════════════════════════════════════════════════════════
router.delete("/:id", ExpenseController.delete);

module.exports = router;