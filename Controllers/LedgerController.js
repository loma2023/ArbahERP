const LedgerService = require('../services/LedgerService');

// ==================== GENERAL LEDGER API ====================

exports.getAccountLedger = async (req, res) => {
  try {
    const { accountId } = req.params;
    const { fromDate, toDate, branch } = req.query;

    const data = await LedgerService.getAccountLedger(accountId, fromDate, toDate, branch);

    res.status(200).json({
      success: true,
      data
    });

  } catch (error) {
    res.status(error.message === 'الحساب غير موجود' ? 404 : 500).json({
      success: false,
      message: error.message || 'خطأ في جلب دفتر الأستاذ',
      error: error.message
    });
  }
};

// ==================== CUSTOMER LEDGER API ====================

exports.getCustomerLedger = async (req, res) => {
  try {
    const { customerId } = req.params;
    const { fromDate, toDate, branch } = req.query;

    const data = await LedgerService.getCustomerLedger(customerId, fromDate, toDate, branch);

    res.status(200).json({
      success: true,
      data
    });

  } catch (error) {
    const statusCode = error.message.includes('غير موجود') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'خطأ في جلب كشف حساب العميل',
      error: error.message
    });
  }
};

// ==================== SUPPLIER LEDGER API ====================

exports.getSupplierLedger = async (req, res) => {
  try {
    const { supplierId } = req.params;
    const { fromDate, toDate, branch } = req.query;

    const data = await LedgerService.getSupplierLedger(supplierId, fromDate, toDate, branch);

    res.status(200).json({
      success: true,
      data
    });

  } catch (error) {
    const statusCode = error.message.includes('غير موجود') ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'خطأ في جلب كشف حساب المورد',
      error: error.message
    });
  }
};

// ==================== ALL LEDGERS SUMMARY ====================

exports.getAllCustomerLedgers = async (req, res) => {
  try {
    const data = await LedgerService.getAllCustomerLedgers();

    res.status(200).json({
      success: true,
      data
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب كشوفات العملاء',
      error: error.message
    });
  }
};

exports.getAllSupplierLedgers = async (req, res) => {
  try {
    const data = await LedgerService.getAllSupplierLedgers();

    res.status(200).json({
      success: true,
      data
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'خطأ في جلب كشوفات الموردين',
      error: error.message
    });
  }
};