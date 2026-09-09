const InvoiceService = require("../Services/InvoiceService");

// =============================================
// Invoice Controller - ArbahERP
// WITH PERFORMANCE PROFILING
// =============================================

// =============================================
// CREATE - Add New Invoice
// =============================================
exports.create = async (req, res) => {
    const startTime = Date.now();
    console.log("🚀 [Controller] Create Invoice started");

    try {
        const result = await InvoiceService.createInvoice(req.body);

        const duration = Date.now() - startTime;
        console.log(`✅ [Controller] Create Invoice completed in ${duration}ms`);

        res.status(201).json({
            success: true,
            message: result.message,
            data: result.data,
            performance: {
                totalDuration: `${duration}ms`,
                serverTime: `${duration}ms`
            }
        });
    } catch (error) {
        const duration = Date.now() - startTime;
        console.error(`❌ [Controller] Create Invoice failed after ${duration}ms:`, error.message);

        res.status(400).json({
            success: false,
            message: error.message,
            performance: {
                totalDuration: `${duration}ms`
            }
        });
    }
};

// =============================================
// LIST - Get All Invoices
// =============================================
exports.list = async (req, res) => {
    try {
        const filters = {
            invoiceType: req.query.invoiceType,
            status: req.query.status,
            entityId: req.query.entityId,
            branchId: req.query.branchId,
            warehouseId: req.query.warehouseId,
            fromDate: req.query.fromDate,
            toDate: req.query.toDate,
            search: req.query.search
        };
        const invoices = await InvoiceService.getAllInvoices(filters);
        res.json({
            success: true,
            count: invoices.length,
            data: invoices
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// GET ONE - Get Single Invoice
// =============================================
exports.getOne = async (req, res) => {
    try {
        const invoice = await InvoiceService.getInvoiceById(req.params.id);
        res.json({
            success: true,
            data: invoice
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// UPDATE - Update Invoice
// =============================================
exports.update = async (req, res) => {
    try {
        const invoice = await InvoiceService.updateInvoice(req.params.id, req.body);
        res.json({
            success: true,
            message: "تم تحديث الفاتورة بنجاح",
            data: invoice
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// CANCEL - Cancel Invoice
// =============================================
exports.cancel = async (req, res) => {
    try {
        const result = await InvoiceService.cancelInvoice(req.params.id, req.body.reason || "");
        res.json({
            success: true,
            message: result.message,
            data: result.data
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// DELETE - Delete Invoice (Draft only)
// =============================================
exports.delete = async (req, res) => {
    try {
        const result = await InvoiceService.deleteInvoice(req.params.id);
        res.json({
            success: true,
            message: result.message
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// GET STATS - Invoice Statistics
// =============================================
exports.getStats = async (req, res) => {
    try {
        const filters = {
            invoiceType: req.query.invoiceType,
            fromDate: req.query.fromDate,
            toDate: req.query.toDate
        };
        const stats = await InvoiceService.getStats(filters);
        res.json({
            success: true,
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// GET NEXT INVOICE NUMBER
// =============================================
exports.getNextInvoiceNo = async (req, res) => {
    try {
        const invoiceType = req.query.invoiceType || "sales";
        const nextNo = await InvoiceService.getNextInvoiceNo(invoiceType);
        res.json({
            success: true,
            data: { nextNo }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};