const IncomeStatementService = require("../Services/IncomeStatementService");

// =============================================
// GET INCOME STATEMENT — قائمة الدخل المقارنة
// Controller يستدعي Service فقط
// =============================================
exports.getIncomeStatement = async (req, res) => {
    try {
        const { fromDate, toDate, prevFromDate, prevToDate } = req.query;

        const result = await IncomeStatementService.getIncomeStatement(
            fromDate, toDate, prevFromDate, prevToDate
        );

        res.json({
            success: true,
            data: result.data,
            summary: result.summary,
            filters: { fromDate, toDate, prevFromDate, prevToDate }
        });

    } catch (error) {
        console.error("❌ Income Statement Error:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// RENDER PAGE
// =============================================
exports.renderIncomeStatementPage = async (req, res) => {
    try {
        res.render("Reports/IncomeStatement", {
            title: "قائمة الدخل",
            page: "income-statement"
        });
    } catch (error) {
        res.status(500).send("خطأ في تحميل الصفحة");
    }
};