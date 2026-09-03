const express = require("express");
const router = express.Router();
const IncomeStatementController = require("../Controllers/IncomeStatementController");

router.get("/", IncomeStatementController.getIncomeStatement);

module.exports = router;