const TrialBalanceService = require("../Services/TrialBalanceService");

// =============================================
// GET TRIAL BALANCE — ميزان المراجعة
// Controller يستدعي Service فقط
// =============================================
exports.getTrialBalance = async (req, res) => {
    try {
        const { fromDate, toDate } = req.query;

        const result = await TrialBalanceService.getTrialBalance(fromDate, toDate);

        res.json({
            success: true,
            data: result.data,
            summary: result.summary,
            filters: { fromDate, toDate }
        });

    } catch (error) {
        console.error("❌ Trial Balance Error:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// GET TRIAL BALANCE — HTML PAGE (EJS Render)
// =============================================
exports.renderTrialBalancePage = async (req, res) => {
    try {
        res.render("Reports/TrialBalance", {
            title: "ميزان المراجعة",
            page: "trial-balance"
        });
    } catch (error) {
        res.status(500).send("خطأ في تحميل الصفحة");
    }
};
