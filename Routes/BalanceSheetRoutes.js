const express = require("express");
const router = express.Router();
const BalanceSheetController = require("../Controllers/BalanceSheetController");

// GET /api/BalanceSheet — JSON data
router.get("/", BalanceSheetController.getBalanceSheet);

module.exports = router;
