// Routes/StockMovementRoutes.js
const express = require("express");
const router = express.Router();
const StockMovementController = require("../Controllers/StockMoveController");

router.get("/", StockMovementController.list);
router.get("/stats", StockMovementController.getStats);
router.get("/:id", StockMovementController.getOne);
router.post("/receipt", StockMovementController.createReceipt);
router.post("/issue", StockMovementController.createIssue);
router.post("/transfer", StockMovementController.createTransfer);
router.post("/adjustment", StockMovementController.createAdjustment);
router.put("/confirm/:id", StockMovementController.confirm);
router.put("/cancel/:id", StockMovementController.cancel);
router.get("/balance/warehouse/:warehouseId", StockMovementController.getStockBalance);
router.get("/balance/product/:productId", StockMovementController.getProductBalance);

module.exports = router;