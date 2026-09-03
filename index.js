const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config();
const connectDB = require("./Config/db");
const seedAccounts = require("./Config/SeedChartOfAccounts");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 3000;

// ===== View Engine =====
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "Views"));

// ═══════════════════════════════════════════════════════════
//    Middleware
// ═══════════════════════════════════════════════════════════
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

// ═══════════════════════════════════════════════════════════
//    Request Logger (للـ debugging)
// ═══════════════════════════════════════════════════════════
app.use((req, res, next) => { console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`); next(); });

// ═══════════════════════════════════════════════════════════
//    API
// ═══════════════════════════════════════════════════════════
app.use("/api/Accounts", require("./Routes/AccountRoutes"));
app.use("/api/Customers", require("./Routes/CustomerRoutes"));
app.use("/api/Products", require("./Routes/ProductRoutes"));
app.use("/api/StockMovements", require("./Routes/StockMoveRoutes"));
app.use("/api/Suppliers", require("./Routes/SupplierRoutes"));
app.use("/api/Warehouses", require("./Routes/WarehouseRoutes"));
app.use("/api/Banks", require("./Routes/BankRoutes"));
app.use("/api/CashBoxes", require("./Routes/CashBoxRoutes"));
app.use("/api/Branches", require("./Routes/BranchRoutes"));
app.use("/api/CostCenters", require("./Routes/CostCenterRoutes"));
app.use("/api/SalesReps", require("./Routes/SalesRepRoutes"));
app.use("/api/Expenses", require("./Routes/ExpenseRoutes"));
app.use("/api/Revenues", require("./Routes/RevenueRoutes"));
app.use("/api/FixedAssets", require("./Routes/FixedAssetRoutes"));
app.use("/api/JournalEntries", require("./Routes/JournalEntryRoutes"));
app.use("/api/Vouchers", require("./Routes/VoucherRoutes"));
app.use('/', require('./routes/LedgerRoutes'));
app.use("/api/TrialBalance", require("./Routes/TrialBalanceRoutes"));
app.use("/api/IncomeStatement", require("./Routes/IncomeStatementRoutes"));
app.use("/api/BalanceSheet", require("./Routes/BalanceSheetRoutes"));
app.use("/api/CashFlow", require("./Routes/CashFlowRoutes"));
app.use('/api/Invoices', require('./Routes/InvoiceRoutes'));  // PascalCase




// ═══════════════════════════════════════════════════════════
//    Pages
// ═══════════════════════════════════════════════════════════
app.get("/", (req, res) => { res.render("Pages/index", { title: "لوحة التحكم" }); });
app.get("/index", (req, res) => { res.render("Pages/index", { title: "لوحة التحكم" }); });
app.get("/Products", (req, res) => { res.render("Pages/Products", { title: "المنتجات" }); });
app.get("/Transfer", (req, res) => { res.render("Pages/Transfer", { title: "التحويل المخزني" }); });
app.get("/Customers", (req, res) => { res.render("Pages/Customers", { title: "العملاء" }); });
app.get("/AgingReportCustomer", (req, res) => { res.render("Pages/AgingReportCustomer", { title: "" }); });
app.get("/Suppliers", (req, res) => { res.render("Pages/Suppliers", { title: "الموردين" }); });
app.get("/AgingReportSupplier", (req, res) => { res.render("Pages/AgingReportSupplier", { title: "" }); });
app.get("/Invoices", (req, res) => { res.render("Pages/Invoices", { title: "الفواتير" }); });
app.get("/SalesInvoice", (req, res) => { res.render("Pages/SalesInvoice", { title: "فاتورة مبيعات" }); });
app.get("/SalesReturn", (req, res) => { res.render("Pages/SalesReturn", { title: "فاتورة مرتجع مبيعات" }); });
app.get("/PurchaseInvoice", (req, res) => { res.render("Pages/PurchaseInvoice", { title: "فاتورة مشتريات" }); });
app.get("/PurchaseReturn", (req, res) => { res.render("Pages/PurchaseReturn", { title: "فاتورة مرتجع مشتريات" }); });
app.get("/VouchersReceipt", (req, res) => { res.render("Pages/VouchersReceipt", { title: "سند قبض" }); });
app.get("/VouchersPayment", (req, res) => { res.render("Pages/VouchersPayment", { title: "سند دفع" }); });
app.get("/Custody", (req, res) => { res.render("Pages/Custody", { title: "العهد" }); });
app.get("/Expenses", (req, res) => { res.render("Pages/Expenses", { title: "المصاريف" }); });
app.get("/Revenues", (req, res) => { res.render("Pages/Revenues", { title: "الايرادات" }); });
app.get("/ChartAccounts", (req, res) => { res.render("Pages/ChartAccounts", { title: "شجرة الحسابات" }); });
app.get("/Journal", (req, res) => { res.render("Pages/Journal", { title: "قيود اليومية" }); });
app.get("/Ledger", (req, res) => { res.render("Pages/Ledger", { title: "دفتر الاستاذ" }); });
app.get("/TrialBalance", (req, res) => { res.render("Pages/TrialBalance", { title: "ميزان المراجعة" }); });
app.get("/IncomeStatement", (req, res) => { res.render("Pages/IncomeStatement", { title: "قائمة الدخل" }); });
app.get("/BalanceSheet", (req, res) => { res.render("Pages/BalanceSheet", { title: "قائمة المركز المالي" }); });
app.get("/FixedAssets", (req, res) => { res.render("Pages/FixedAssets", { title: "الاصول الثابتة" }); });
app.get("/CashBoxes", (req, res) => { res.render("Pages/CashBoxes", { title: "تعريف الخزنة" }); });
app.get("/Banks", (req, res) => { res.render("Pages/Banks", { title: "تعريف البنوك" }); });
app.get("/Branches", (req, res) => { res.render("Pages/Branches", { title: "تعريف الفروع" }); });
app.get("/CostCenters", (req, res) => { res.render("Pages/CostCenters", { title: "تعريف مراكز التكلفة" }); });
app.get("/Settings", (req, res) => { res.render("Pages/Settings", { title: "الاعدادات" }); });
app.get("/Profile", (req, res) => { res.render("Pages/Profile", { title: "الصفحة الشخصية" }); });
app.get("/InvoiceShow", (req, res) => { res.render("Pages/InvoiceShow", { title: "فاتورة" }); });
app.get("/CashFlow", (req, res) => { res.render("Pages/CashFlow", { title: "قائمة التدفقات النقدية" }); });
app.get("/SalesReps", (req, res) => { res.render("Pages/SalesReps", { title: "المناديب" }); });
app.get("/StockMovements", (req, res) => { res.render("Pages/StockMovements", { title: "حركةالمخزون" }); });
app.get("/Warehouses", (req, res) => { res.render("Pages/Warehouses", { title: "المخازن" }); });
app.get("/login", (req, res) => { res.render("Pages/Login", { title: "تسجيل الدخول" }); });
app.get("/Register", (req, res) => { res.render("Pages/Register", { title: "تسجيل الدخول" }); });
app.get("/Notifications", (req, res) => { res.render("Pages/Notifications", { title: "مركز الاشعارات" }); });


// ═══════════════════════════════════════════════════════════
//    404
// ═══════════════════════════════════════════════════════════
app.use((req, res) => { res.status(404).render("Pages/404", { title: "الصفحة غير موجودة" }); });

// ═══════════════════════════════════════════════════════════
//    Error Handler (مهم جداً!)
// ═══════════════════════════════════════════════════════════
app.use((err, req, res, next) => {
    console.error("═══════════════════════════════════════════════════");
    console.error("❌ Server Error:");
    console.error("Message:", err.message);
    console.error("Stack:", err.stack);
    console.error("═══════════════════════════════════════════════════");

    res.status(500).json({
        success: false,
        message: "حدث خطأ في الخادم",
        error: process.env.NODE_ENV === "development" ? err.message : undefined
    });
});

// ═══════════════════════════════════════════════════════════
//    Start Server
// ═══════════════════════════════════════════════════════════
async function startServer() {
    try {
        // Connect to MongoDB first
        await connectDB();
        // Seed accounts after connection is ready
        try { await seedAccounts(); }
        // Don't crash the server if seeding fails
        catch (seedErr) { console.error("❌ Seed error:", seedErr.message); }
        // Start Express server
        app.listen(PORT, () => { console.log(`🚀🚀 Server running at: http://localhost:${PORT}  🚀🚀`); });

    } catch (err) {
        console.error("❌ Failed to start server:", err.message);
        process.exit(1);
    }
}

startServer();