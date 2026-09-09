const express = require("express");
const router = express.Router();
const InvoiceController = require("../Controllers/InvoiceController");

// =============================================
// Invoice Routes - ArbahERP
// Using PascalCase convention matching existing routes
// =============================================

// List & Create
router.get("/", InvoiceController.list);
router.post("/", InvoiceController.create);  // POST /api/Invoices

// Statistics & Next Number
router.get("/Stats", InvoiceController.getStats);
router.get("/NextInvoiceNo", InvoiceController.getNextInvoiceNo);

// Single Invoice Operations
router.get("/:id", InvoiceController.getOne);
router.put("/:id", InvoiceController.update);
router.put("/:id/Cancel", InvoiceController.cancel);
router.delete("/:id", InvoiceController.delete);

module.exports = router;