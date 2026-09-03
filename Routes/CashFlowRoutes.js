const express = require("express");
const router = express.Router();
const CashFlowController = require("../Controllers/CashFlowController");

router.get("/", CashFlowController.getCashFlow);
router.get("/Summary", CashFlowController.getSummary);
router.get("/Export", CashFlowController.exportExcel);

module.exports = router;