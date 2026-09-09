const express = require('express');
const router = express.Router();
const LedgerController = require('../controllers/LedgerController');

// ==================== API Routes ====================

// General Account Ledger (دفتر الأستاذ العام)
router.get('/api/AccountLedger/:accountId', LedgerController.getAccountLedger);

// Customer Ledger
router.get('/api/CustomerLedger/:customerId', LedgerController.getCustomerLedger);
router.get('/api/CustomerLedgers', LedgerController.getAllCustomerLedgers);

// Supplier Ledger
router.get('/api/SupplierLedger/:supplierId', LedgerController.getSupplierLedger);
router.get('/api/SupplierLedgers', LedgerController.getAllSupplierLedgers);

module.exports = router;