const CashFlowService = require("../Services/CashFlowService");

exports.getCashFlow = async (req, res) => {
    try {
        const { fromDate, toDate, method = "indirect" } = req.query;
        if (!fromDate || !toDate) {
            return res.status(400).json({ success: false, message: "تاريخ البداية والنهاية مطلوبان" });
        }
        const cashFlow = await CashFlowService.generateCashFlow(fromDate, toDate, method);
        res.json({ success: true, data: cashFlow });
    } catch (error) {
        console.error("❌ Cash Flow Error:", error.message);
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.getSummary = async (req, res) => {
    try {
        const { fromDate, toDate } = req.query;
        if (!fromDate || !toDate) {
            return res.status(400).json({ success: false, message: "تاريخ البداية والنهاية مطلوبان" });
        }
        const summary = await CashFlowService.getSummary(fromDate, toDate);
        res.json({ success: true, data: summary });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.exportExcel = async (req, res) => {
    try {
        const { fromDate, toDate, method = "indirect" } = req.query;
        if (!fromDate || !toDate) {
            return res.status(400).json({ success: false, message: "تاريخ البداية والنهاية مطلوبان" });
        }
        const excelBuffer = await CashFlowService.exportToExcel(fromDate, toDate, method);
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename=CashFlow_${fromDate}_${toDate}.xlsx`);
        res.send(excelBuffer);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};