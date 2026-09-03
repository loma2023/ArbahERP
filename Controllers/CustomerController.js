const CustomerService = require("../Services/CustomerService");

// =============================================
// CREATE - Add New Customer + Auto Account
// =============================================
exports.create = async (req, res) => {
    try {
        const customer = await CustomerService.createCustomer(req.body);

        res.status(201).json({
            success: true,
            message: "تم إضافة العميل وإنشاء حسابه في شجرة الحسابات بنجاح",
            data: customer
        });

    } catch (error) {
        console.error("❌ Create Customer Error:", error.message);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// LIST - Get All Customers
// =============================================
exports.list = async (req, res) => {
    try {
        const filters = {
            isActive: req.query.isActive,
            search: req.query.search
        };

        const customers = await CustomerService.getAllCustomers(filters);

        res.json({
            success: true,
            count: customers.length,
            data: customers
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// GET ONE - Get Single Customer
// =============================================
exports.getOne = async (req, res) => {
    try {
        const customer = await CustomerService.getCustomerById(req.params.id);

        res.json({
            success: true,
            data: customer
        });

    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// UPDATE - Update Customer
// =============================================
exports.update = async (req, res) => {
    try {
        const customer = await CustomerService.updateCustomer(req.params.id, req.body);

        res.json({
            success: true,
            message: "تم تحديث بيانات العميل بنجاح",
            data: customer
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// UPDATE OPENING BALANCE - تعديل الرصيد الافتتاحي مع دفتر الاستاذ
// =============================================
exports.updateOpeningBalance = async (req, res) => {
    try {
        const result = await CustomerService.updateOpeningBalance(req.params.id, req.body);

        res.json({
            success: true,
            message: result.message,
            data: result
        });

    } catch (error) {
        console.error("❌ Update Opening Balance Error:", error.message);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// HIDE - Soft Delete Customer
// =============================================
exports.hide = async (req, res) => {
    try {
        const result = await CustomerService.hideCustomer(req.params.id);

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
// RESTORE - Show Hidden Customer
// =============================================
exports.restore = async (req, res) => {
    try {
        const result = await CustomerService.restoreCustomer(req.params.id);

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
// DELETE - Hard Delete Customer
// =============================================
exports.delete = async (req, res) => {
    try {
        const result = await CustomerService.deleteCustomer(req.params.id);

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
// SEARCH - Search Customers
// =============================================
exports.search = async (req, res) => {
    try {
        const customers = await CustomerService.searchCustomers(req.params.keyword);

        res.json({
            success: true,
            count: customers.length,
            data: customers
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// GET NEXT CODE - Auto-generate next code
// =============================================
exports.getNextCode = async (req, res) => {
    try {
        const nextCode = await CustomerService.getNextCode();

        res.json({
            success: true,
            data: { nextCode }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// GET STATS - Customer Statistics
// =============================================
exports.getStats = async (req, res) => {
    try {
        const stats = await CustomerService.getStats();

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
// GET BY CODE - Get customer by code
// =============================================
exports.getByCode = async (req, res) => {
    try {
        const customer = await CustomerService.getCustomerByCode(req.params.code);

        res.json({
            success: true,
            data: customer
        });

    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// SYNC BALANCES - Sync all customer balances from linked accounts
// =============================================
exports.syncBalances = async (req, res) => {
    try {
        const results = await CustomerService.syncAllBalances();

        res.json({
            success: true,
            message: `تم مزامنة ${results.length} عميل`,
            data: results
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};