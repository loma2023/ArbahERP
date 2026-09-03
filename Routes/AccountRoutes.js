const express = require("express");
const router = express.Router();
const AccountController = require("../Controllers/AccountController");

// GET /api/Accounts - Get all accounts (flat list)
router.get("/", AccountController.list);

// GET /api/Accounts/tree - Get hierarchical tree
router.get("/tree", AccountController.getTree);

// GET /api/Accounts/stats - Get tree statistics
router.get("/stats", AccountController.getTreeStats);

// GET /api/Accounts/next-code/:parentId - Get next available code
router.get("/next-code/:parentId", AccountController.getNextCode);

// GET /api/Accounts/search/:keyword - Search accounts
router.get("/search/:keyword", AccountController.search);

// GET /api/Accounts/leaves - Get leaf accounts
router.get("/leaves", AccountController.getLeaves);

// GET /api/Accounts/type/:type - Get accounts by type
// router.get("/type/:type", AccountController.getByType);

// GET /api/Accounts/code/:code - Get account by code
router.get("/code/:code", AccountController.getByCode);

// GET /api/Accounts/:id/statement - Get account statement
router.get("/:id/statement", AccountController.getStatement);

// GET /api/Accounts/:id - Get account by ID
router.get("/:id", AccountController.getOne);

// POST /api/Accounts - Create new account
router.post("/", AccountController.create);

// PUT /api/Accounts/:id - Update account
router.put("/:id", AccountController.update);

// DELETE /api/Accounts/:id - Soft delete account
router.delete("/:id", AccountController.delete);

// DELETE /api/Accounts/:id/hard - Hard delete account
router.delete("/:id/hard", AccountController.hardDelete);

module.exports = router;