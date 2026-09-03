const BalanceSheetService = require("../Services/BalanceSheetService");

// =============================================
// GET BALANCE SHEET — الميزانية العمومية
// Controller يستدعي Service فقط
// =============================================
exports.getBalanceSheet = async (req, res) => {
    try {
        const { reportDate, compareDate } = req.query;

        const result = await BalanceSheetService.getBalanceSheet(reportDate, compareDate);

        res.json({
            success: true,
            data: result,
            filters: { reportDate, compareDate }
        });

    } catch (error) {
        console.error("❌ Balance Sheet Error:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// RENDER BALANCE SHEET PAGE — EJS
// =============================================
exports.renderBalanceSheetPage = async (req, res) => {
    try {
        res.render("Reports/BalanceSheet", {
            title: "الميزانية العمومية",
            page: "balance-sheet"
        });
    } catch (error) {
        res.status(500).send("خطأ في تحميل الصفحة");
    }
};
