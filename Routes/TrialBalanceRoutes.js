const express = require("express");
const router = express.Router();
const TrialBalanceController = require("../Controllers/TrialBalanceController");

// GET /api/TrialBalance — JSON data
router.get("/", TrialBalanceController.getTrialBalance);

module.exports = router;
