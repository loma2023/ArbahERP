// Routes/VoucherRoutes.js
const express = require("express");
const router = express.Router();
const VoucherController = require("../Controllers/VoucherController");

router.get("/", VoucherController.list);
router.get("/stats", VoucherController.getStats);
router.get("/next-number", VoucherController.getNextNumber); // ← قبل /:id
router.get("/:id", VoucherController.getOne);
router.post("/create", VoucherController.create);
router.delete("/:id", VoucherController.delete);

module.exports = router;