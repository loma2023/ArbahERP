const express = require("express");
const path = require("path");
const dotenv = require("dotenv");
dotenv.config();
const connectDB = require("./Config/db");
const seedAccounts = require("./Config/SeedChartOfAccounts");
const cors = require("cors");
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const User = require('./Models/User');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'ArbahERP-Secret-Key-2026';

// ===== View Engine =====
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "Views"));

// ═══════════════════════════════════════════════════════════
//   Middleware
// ═══════════════════════════════════════════════════════════
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true }));

// ═══════════════════════════════════════════════════════════
//   Request Logger
// ═══════════════════════════════════════════════════════════
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ═══════════════════════════════════════════════════════════
//   API Routes
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
app.use('/api/Invoices', require('./Routes/InvoiceRoutes'));
app.use('/api/Users', require('./Routes/UserRouter'));

// ═══════════════════════════════════════════════════════════
//   Auth Middleware (حماية الصفحات ومنع الدخول بعد تسجيل الخروج)
// ═══════════════════════════════════════════════════════════
const protectPage = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }

    // إذا لم يوجد توكن، أو تم تسجيل الخروج (قيمته loggedout)
    if (!token || token === 'loggedout') {
      return res.redirect('/login');
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId || decoded.id);

    if (!user || !user.isActive) {
      return res.redirect('/login');
    }

    req.user = user;
    next();
  } catch (error) {
    return res.redirect('/login');
  }
};

// ═══════════════════════════════════════════════════════════
//   Pages Routes
// ═══════════════════════════════════════════════════════════
// الصفحات العامة (بدون حماية)
app.get("/login", (req, res) => { res.render("Pages/Login", { title: "تسجيل الدخول" }); });
app.get("/Register", (req, res) => { res.render("Pages/Register", { title: "تسجيل حساب جديد" }); });
app.get("/", (req, res) => { res.redirect('/login'); });

// الصفحات المحمية بالكامل عبر protectPage
app.get("/index", protectPage, (req, res) => { res.render("Pages/index", { title: "لوحة التحكم", user: req.user }); });
app.get("/Products", protectPage, (req, res) => { res.render("Pages/Products", { title: "المنتجات", user: req.user }); });
app.get("/Transfer", protectPage, (req, res) => { res.render("Pages/Transfer", { title: "التحويل المخزني", user: req.user }); });
app.get("/Customers", protectPage, (req, res) => { res.render("Pages/Customers", { title: "العملاء", user: req.user }); });
app.get("/AgingReportCustomer", protectPage, (req, res) => { res.render("Pages/AgingReportCustomer", { title: "اعمار الديون للعملاء", user: req.user }); });
app.get("/Suppliers", protectPage, (req, res) => { res.render("Pages/Suppliers", { title: "الموردين", user: req.user }); });
app.get("/AgingReportSupplier", protectPage, (req, res) => { res.render("Pages/AgingReportSupplier", { title: "اعمار الديون للموردين", user: req.user }); });
app.get("/Invoices", protectPage, (req, res) => { res.render("Pages/Invoices", { title: "الفواتير", user: req.user }); });
app.get("/SalesInvoice", protectPage, (req, res) => { res.render("Pages/SalesInvoice", { title: "فاتورة مبيعات", user: req.user }); });
app.get("/SalesReturn", protectPage, (req, res) => { res.render("Pages/SalesReturn", { title: "فاتورة مرتجع مبيعات", user: req.user }); });
app.get("/PurchaseInvoice", protectPage, (req, res) => { res.render("Pages/PurchaseInvoice", { title: "فاتورة مشتريات", user: req.user }); });
app.get("/PurchaseReturn", protectPage, (req, res) => { res.render("Pages/PurchaseReturn", { title: "فاتورة مرتجع مشتريات", user: req.user }); });
app.get("/VouchersReceipt", protectPage, (req, res) => { res.render("Pages/VouchersReceipt", { title: "سند قبض", user: req.user }); });
app.get("/VouchersPayment", protectPage, (req, res) => { res.render("Pages/VouchersPayment", { title: "سند دفع", user: req.user }); });
app.get("/Custody", protectPage, (req, res) => { res.render("Pages/Custody", { title: "العهد", user: req.user }); });
app.get("/Expenses", protectPage, (req, res) => { res.render("Pages/Expenses", { title: "المصاريف", user: req.user }); });
app.get("/Revenues", protectPage, (req, res) => { res.render("Pages/Revenues", { title: "الايرادات", user: req.user }); });
app.get("/ChartAccounts", protectPage, (req, res) => { res.render("Pages/ChartAccounts", { title: "شجرة الحسابات", user: req.user }); });
app.get("/Journal", protectPage, (req, res) => { res.render("Pages/Journal", { title: "قيود اليومية", user: req.user }); });
app.get("/Ledger", protectPage, (req, res) => { res.render("Pages/Ledger", { title: "دفتر الاستاذ", user: req.user }); });
app.get("/TrialBalance", protectPage, (req, res) => { res.render("Pages/TrialBalance", { title: "ميزان المراجعة", user: req.user }); });
app.get("/IncomeStatement", protectPage, (req, res) => { res.render("Pages/IncomeStatement", { title: "قائمة الدخل", user: req.user }); });
app.get("/BalanceSheet", protectPage, (req, res) => { res.render("Pages/BalanceSheet", { title: "قائمة المركز المالي", user: req.user }); });
app.get("/FixedAssets", protectPage, (req, res) => { res.render("Pages/FixedAssets", { title: "الاصول الثابتة", user: req.user }); });
app.get("/CashBoxes", protectPage, (req, res) => { res.render("Pages/CashBoxes", { title: "تعريف الخزنة", user: req.user }); });
app.get("/Banks", protectPage, (req, res) => { res.render("Pages/Banks", { title: "تعريف البنوك", user: req.user }); });
app.get("/Branches", protectPage, (req, res) => { res.render("Pages/Branches", { title: "تعريف الفروع", user: req.user }); });
app.get("/CostCenters", protectPage, (req, res) => { res.render("Pages/CostCenters", { title: "تعريف مراكز التكلفة", user: req.user }); });
app.get("/Settings", protectPage, (req, res) => { res.render("Pages/Settings", { title: "الاعدادات", user: req.user }); });
app.get("/Profile", protectPage, (req, res) => { res.render("Pages/Profile", { title: "الصفحة الشخصية", user: req.user }); });
app.get("/InvoiceShow", protectPage, (req, res) => { res.render("Pages/InvoiceShow", { title: "فاتورة", user: req.user }); });
app.get("/CashFlow", protectPage, (req, res) => { res.render("Pages/CashFlow", { title: "قائمة التدفقات النقدية", user: req.user }); });
app.get("/SalesReps", protectPage, (req, res) => { res.render("Pages/SalesReps", { title: "المناديب", user: req.user }); });
app.get("/StockMovements", protectPage, (req, res) => { res.render("Pages/StockMovements", { title: "حركة المخزون", user: req.user }); });
app.get("/Warehouses", protectPage, (req, res) => { res.render("Pages/Warehouses", { title: "المخازن", user: req.user }); });
app.get("/Notifications", protectPage, (req, res) => { res.render("Pages/Notifications", { title: "مركز الاشعارات", user: req.user }); });

// ═══════════════════════════════════════════════════════════
//   404 Page
// ═══════════════════════════════════════════════════════════
app.use((req, res) => { res.status(404).render("Pages/404", { title: "الصفحة غير موجودة" }); });

// ═══════════════════════════════════════════════════════════
//   Error Handler
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
//   Start Server
// ═══════════════════════════════════════════════════════════
async function startServer() {
  try {
    await connectDB();
    try { await seedAccounts(); }
    catch (seedErr) { console.error("❌ Seed error:", seedErr.message); }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🔗 http://localhost:${PORT}/login`);
    });

  } catch (err) {
    console.error("❌ Failed to start server:", err.message);
    process.exit(1);
  }
}

startServer();

module.exports = app;
