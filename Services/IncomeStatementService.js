const Account = require("../Models/AccountSchema");
const JournalLine = require("../Models/JournalLineSchema");
const mongoose = require("mongoose");

class IncomeStatementService {

    /**
     * Get income statement data — LEVEL 3 ONLY
     * Proper accounting order:
     * 1. Operating Revenue
     * 2. Cost of Goods Sold
     * 3. Gross Profit
     * 4. Operating Expenses
     * 5. Operating Profit
     * 6. Other Revenues & Expenses
     * 7. Net Income Before Tax
     * 8. Tax
     * 9. Net Income
     */
    static async getIncomeStatement(fromDate, toDate, prevFromDate, prevToDate) {
        const allAccounts = await Account.find({
            isActive: true,
            type: { $in: ["revenue", "expense"] }
        }).sort({ code: 1 }).lean();

        if (allAccounts.length === 0) {
            return this._buildEmptyResult();
        }

        const currentActivity = await this._getPeriodActivity(allAccounts, fromDate, toDate);
        const prevActivity = await this._getPeriodActivity(allAccounts, prevFromDate, prevToDate);

        // Build account map with balances
        const accountMap = new Map();
        for (const acc of allAccounts) {
            const currentAct = currentActivity.get(acc._id.toString()) || { periodDebit: 0, periodCredit: 0 };
            const prevAct = prevActivity.get(acc._id.toString()) || { periodDebit: 0, periodCredit: 0 };

            const openingBalance = acc.openingBalance || 0;

            let currentClosing = 0;
            let prevClosing = 0;

            if (acc.normalBalance === "debit") {
                currentClosing = openingBalance + currentAct.periodDebit - currentAct.periodCredit;
                prevClosing = openingBalance + prevAct.periodDebit - prevAct.periodCredit;
            } else {
                currentClosing = openingBalance + currentAct.periodCredit - currentAct.periodDebit;
                prevClosing = openingBalance + prevAct.periodCredit - prevAct.periodDebit;
            }

            accountMap.set(acc.code, {
                ...acc,
                currentClosing,
                prevClosing,
                currentPeriodDebit: currentAct.periodDebit,
                currentPeriodCredit: currentAct.periodCredit,
                prevPeriodDebit: prevAct.periodDebit,
                prevPeriodCredit: prevAct.periodCredit
            });
        }

        const tree = this._buildTree(accountMap);

        // Extract Level 3 accounts
        const level3Accounts = [];
        this._extractLevel3(tree, level3Accounts);

        // Categorize accounts by section - TYPE FIRST, then code/category
        const categorized = this._categorizeAccounts(level3Accounts);

        return this._buildIncomeStatementRows(categorized);
    }

    /**
     * Categorize accounts into proper income statement sections
     * PRIORITY 1: account.type (revenue vs expense)
     * PRIORITY 2: account.code prefix or account.category for sub-classification
     *
     * Revenue accounts (type === "revenue"):
     *   - 41xxxx / category includes "تشغيلي" or "operating" or "مبيعات" or "sales"
     *     → Operating Revenue (إيرادات النشاط)
     *   - All other revenue
     *     → Other Revenue (إيرادات أخرى)
     *
     * Expense accounts (type === "expense"):
     *   - 51xxxx / category includes "تكلفة" or "cost" or "بضاعة" or "cogs"
     *     → Cost of Goods Sold (تكلفة البضاعة المباعة)
     *   - 52xxxx, 53xxxx / category includes "تشغيلي" or "operating" or "إداري" or "admin" or "بيع" or "selling"
     *     → Operating Expenses (مصاريف تشغيلية)
     *   - 55xxxx / category includes "ضريبة" or "tax"
     *     → Tax Expenses (مصاريف ضريبية)
     *   - All other expenses
     *     → Other Expenses (مصاريف أخرى)
     */
    static _categorizeAccounts(level3Accounts) {
        const result = {
            operatingRevenue: [],
            cogs: [],
            operatingExpenses: [],
            otherRevenue: [],
            otherExpenses: [],
            taxExpenses: []
        };

        for (const acc of level3Accounts) {
            const codePrefix2 = acc.code.substring(0, 2);
            const codePrefix3 = acc.code.substring(0, 3);
            const type = (acc.type || "").toLowerCase();
            const cat = (acc.category || "").toLowerCase();
            const name = (acc.name || "").toLowerCase();

            if (type === "revenue") {
                // ─── REVENUE ACCOUNTS ───
                const isOperating = (
                    codePrefix2 === "41" ||
                    codePrefix3 === "410" ||
                    cat.includes("تشغيل") || cat.includes("operating") ||
                    cat.includes("مبيعات") || cat.includes("sales") ||
                    cat.includes("نشاط") || cat.includes("activity") ||
                    name.includes("مبيعات") || name.includes("sales") ||
                    name.includes("نشاط") || name.includes("تشغيل")
                );

                if (isOperating) {
                    result.operatingRevenue.push(acc);
                } else {
                    result.otherRevenue.push(acc);
                }

            } else if (type === "expense") {
                // ─── EXPENSE ACCOUNTS ───
                const isCOGS = (
                    codePrefix2 === "51" ||
                    codePrefix3 === "510" ||
                    cat.includes("تكلفة") || cat.includes("cost") ||
                    cat.includes("بضاعة") || cat.includes("cogs") ||
                    cat.includes("مباعة") || cat.includes("sold") ||
                    name.includes("تكلفة البضاعة") || name.includes("cost of goods") ||
                    name.includes("بضاعة مباعة")
                );

                const isTax = (
                    codePrefix2 === "55" ||
                    cat.includes("ضريبة") || cat.includes("tax") ||
                    name.includes("ضريبة") || name.includes("tax")
                );

                const isOperating = (
                    codePrefix2 === "52" || codePrefix2 === "53" ||
                    cat.includes("تشغيل") || cat.includes("operating") ||
                    cat.includes("إداري") || cat.includes("admin") ||
                    cat.includes("بيع") || cat.includes("selling") ||
                    cat.includes("تسويق") || cat.includes("marketing") ||
                    name.includes("إداري") || name.includes("admin") ||
                    name.includes("بيع") || name.includes("selling") ||
                    name.includes("تسويق") || name.includes("marketing")
                );

                if (isCOGS) {
                    result.cogs.push(acc);
                } else if (isTax) {
                    result.taxExpenses.push(acc);
                } else if (isOperating) {
                    result.operatingExpenses.push(acc);
                } else {
                    result.otherExpenses.push(acc);
                }
            }
        }

        return result;
    }

    static async _getPeriodActivity(accounts, fromDate, toDate) {
        const accountIds = accounts.map(a => a._id);
        const accountObjectIds = accountIds.map(id => new mongoose.Types.ObjectId(id));

        const match = { account: { $in: accountObjectIds } };
        if (fromDate || toDate) {
            match.date = {};
            if (fromDate) match.date.$gte = new Date(fromDate + "T00:00:00");
            if (toDate) match.date.$lte = new Date(toDate + "T23:59:59");
        }

        const activity = await JournalLine.aggregate([
            { $match: match },
            {
                $group: {
                    _id: "$account",
                    periodDebit: { $sum: "$debit" },
                    periodCredit: { $sum: "$credit" }
                }
            }
        ]);

        const activityMap = new Map();
        activity.forEach(item => {
            activityMap.set(item._id.toString(), {
                periodDebit: item.periodDebit || 0,
                periodCredit: item.periodCredit || 0
            });
        });

        return activityMap;
    }

    static _buildTree(accountMap) {
        const nodeMap = new Map();

        accountMap.forEach((data, code) => {
            const node = {
                id: data._id.toString(),
                code: data.code,
                name: data.name,
                type: data.type,
                category: data.category,
                level: data.level,
                isLeaf: data.isLeaf,
                isGroup: data.isGroup,
                normalBalance: data.normalBalance,
                openingBalance: data.openingBalance || 0,
                currentClosing: data.currentClosing || 0,
                prevClosing: data.prevClosing || 0,
                currentPeriodDebit: data.currentPeriodDebit || 0,
                currentPeriodCredit: data.currentPeriodCredit || 0,
                prevPeriodDebit: data.prevPeriodDebit || 0,
                prevPeriodCredit: data.prevPeriodCredit || 0,
                children: [],
                parentCode: data.parentCode
            };
            nodeMap.set(code, node);
        });

        const rootNodes = [];
        nodeMap.forEach(node => {
            if (node.parentCode && nodeMap.has(node.parentCode)) {
                nodeMap.get(node.parentCode).children.push(node);
            } else {
                rootNodes.push(node);
            }
        });

        rootNodes.forEach(node => this._aggregateBalances(node));

        return rootNodes;
    }

    static _aggregateBalances(node) {
        if (!node.children || node.children.length === 0) {
            return {
                currentClosing: node.currentClosing || 0,
                prevClosing: node.prevClosing || 0
            };
        }

        let currentTotal = 0;
        let prevTotal = 0;

        for (const child of node.children) {
            const childTotals = this._aggregateBalances(child);
            currentTotal += childTotals.currentClosing;
            prevTotal += childTotals.prevClosing;
        }

        if (node.isGroup || node.children.length > 0) {
            node.currentClosing = currentTotal;
            node.prevClosing = prevTotal;
        }

        return {
            currentClosing: node.currentClosing,
            prevClosing: node.prevClosing
        };
    }

    static _extractLevel3(nodes, result) {
        for (const node of nodes) {
            if (node.level === 3) {
                result.push(node);
            }
            if (node.children && node.children.length > 0) {
                this._extractLevel3(node.children, result);
            }
        }
    }

    static _buildItem(account) {
        const currentNet = account.currentClosing || 0;
        const prevNet = account.prevClosing || 0;

        return {
            code: account.code,
            name: account.name,
            currentYear: Math.abs(currentNet),
            prevYear: Math.abs(prevNet),
            changeAmount: currentNet - prevNet,
            changePercent: prevNet !== 0 ? (((currentNet - prevNet) / Math.abs(prevNet)) * 100) : (currentNet !== 0 ? 100 : 0),
            isPositive: currentNet >= 0,
            rawCurrent: currentNet,
            rawPrev: prevNet
        };
    }

    static _addSection(sections, title, icon, color, items, totalCurrent, totalPrev, totalTitle, isPositive = true) {
        if (items.length === 0) return 0;

        sections.push({
            type: "category",
            title: title,
            icon: icon,
            color: color
        });

        items.forEach(item => {
            sections.push({ type: "item", ...this._buildItem(item) });
        });

        sections.push({
            type: "subtotal",
            title: totalTitle,
            currentYear: Math.abs(totalCurrent),
            prevYear: Math.abs(totalPrev),
            changeAmount: totalCurrent - totalPrev,
            changePercent: totalPrev !== 0 ? (((totalCurrent - totalPrev) / Math.abs(totalPrev)) * 100) : (totalCurrent !== 0 ? 100 : 0),
            isPositive: isPositive
        });

        return totalCurrent;
    }

    static _buildIncomeStatementRows(categorized) {
        const sections = [];

        // ─── 1. OPERATING REVENUE (إيرادات النشاط) ───
        let currentOpRev = 0, prevOpRev = 0;
        categorized.operatingRevenue.forEach(acc => {
            currentOpRev += (acc.currentClosing || 0);
            prevOpRev += (acc.prevClosing || 0);
        });

        this._addSection(
            sections,
            "إيرادات النشاط",
            "fa-arrow-trend-up",
            "var(--accent-green)",
            categorized.operatingRevenue,
            currentOpRev,
            prevOpRev,
            "إجمالي إيرادات النشاط",
            true
        );

        // ─── 2. COST OF GOODS SOLD (تكلفة البضاعة المباعة) ───
        let currentCOGS = 0, prevCOGS = 0;
        categorized.cogs.forEach(acc => {
            currentCOGS += Math.abs(acc.currentClosing || 0);
            prevCOGS += Math.abs(acc.prevClosing || 0);
        });

        this._addSection(
            sections,
            "تكلفة البضاعة المباعة",
            "fa-box-open",
            "var(--accent-red)",
            categorized.cogs,
            currentCOGS,
            prevCOGS,
            "إجمالي تكلفة البضاعة المباعة",
            false
        );

        // ─── 3. GROSS PROFIT (مجمل الربح) ───
        const currentGross = currentOpRev - currentCOGS;
        const prevGross = prevOpRev - prevCOGS;

        if (categorized.operatingRevenue.length > 0 || categorized.cogs.length > 0) {
            sections.push({
                type: "total",
                title: currentGross >= 0 ? "مجمل الربح" : "مجمل الخسارة",
                currentYear: Math.abs(currentGross),
                prevYear: Math.abs(prevGross),
                changeAmount: currentGross - prevGross,
                changePercent: prevGross !== 0 ? (((currentGross - prevGross) / Math.abs(prevGross)) * 100) : (currentGross !== 0 ? 100 : 0),
                isPositive: currentGross >= 0
            });
        }

        // ─── 4. OPERATING EXPENSES (المصاريف التشغيلية) ───
        let currentOpExp = 0, prevOpExp = 0;
        categorized.operatingExpenses.forEach(acc => {
            currentOpExp += Math.abs(acc.currentClosing || 0);
            prevOpExp += Math.abs(acc.prevClosing || 0);
        });

        this._addSection(
            sections,
            "المصاريف التشغيلية",
            "fa-gear",
            "var(--accent-red)",
            categorized.operatingExpenses,
            currentOpExp,
            prevOpExp,
            "إجمالي المصاريف التشغيلية",
            false
        );

        // ─── 5. OPERATING PROFIT (ربح النشاط التشغيلي) ───
        const currentOpProfit = currentGross - currentOpExp;
        const prevOpProfit = prevGross - prevOpExp;

        if (categorized.operatingRevenue.length > 0 || categorized.cogs.length > 0 || categorized.operatingExpenses.length > 0) {
            sections.push({
                type: "total",
                title: currentOpProfit >= 0 ? "ربح النشاط التشغيلي" : "خسارة النشاط التشغيلي",
                currentYear: Math.abs(currentOpProfit),
                prevYear: Math.abs(prevOpProfit),
                changeAmount: currentOpProfit - prevOpProfit,
                changePercent: prevOpProfit !== 0 ? (((currentOpProfit - prevOpProfit) / Math.abs(prevOpProfit)) * 100) : (currentOpProfit !== 0 ? 100 : 0),
                isPositive: currentOpProfit >= 0
            });
        }

        // ─── 6. OTHER REVENUES (إيرادات أخرى) ───
        let currentOtherRev = 0, prevOtherRev = 0;
        categorized.otherRevenue.forEach(acc => {
            currentOtherRev += (acc.currentClosing || 0);
            prevOtherRev += (acc.prevClosing || 0);
        });

        this._addSection(
            sections,
            "إيرادات أخرى",
            "fa-plus-circle",
            "var(--accent-green)",
            categorized.otherRevenue,
            currentOtherRev,
            prevOtherRev,
            "إجمالي الإيرادات الأخرى",
            true
        );

        // ─── 7. OTHER EXPENSES (مصاريف أخرى) ───
        let currentOtherExp = 0, prevOtherExp = 0;
        categorized.otherExpenses.forEach(acc => {
            currentOtherExp += Math.abs(acc.currentClosing || 0);
            prevOtherExp += Math.abs(acc.prevClosing || 0);
        });

        this._addSection(
            sections,
            "مصاريف أخرى",
            "fa-minus-circle",
            "var(--accent-red)",
            categorized.otherExpenses,
            currentOtherExp,
            prevOtherExp,
            "إجمالي المصاريف الأخرى",
            false
        );

        // ─── 8. NET INCOME BEFORE TAX (صافي الربح قبل الضريبة) ───
        const currentPreTax = currentOpProfit + currentOtherRev - currentOtherExp;
        const prevPreTax = prevOpProfit + prevOtherRev - prevOtherExp;

        if (categorized.otherRevenue.length > 0 || categorized.otherExpenses.length > 0) {
            sections.push({
                type: "total",
                title: currentPreTax >= 0 ? "صافي الربح قبل الضريبة" : "صافي الخسارة قبل الضريبة",
                currentYear: Math.abs(currentPreTax),
                prevYear: Math.abs(prevPreTax),
                changeAmount: currentPreTax - prevPreTax,
                changePercent: prevPreTax !== 0 ? (((currentPreTax - prevPreTax) / Math.abs(prevPreTax)) * 100) : (currentPreTax !== 0 ? 100 : 0),
                isPositive: currentPreTax >= 0
            });
        }

        // ─── 9. TAX EXPENSES (مصاريف ضريبية) ───
        let currentTax = 0, prevTax = 0;
        categorized.taxExpenses.forEach(acc => {
            currentTax += Math.abs(acc.currentClosing || 0);
            prevTax += Math.abs(acc.prevClosing || 0);
        });

        this._addSection(
            sections,
            "مصاريف ضريبية",
            "fa-file-invoice-dollar",
            "var(--accent-red)",
            categorized.taxExpenses,
            currentTax,
            prevTax,
            "إجمالي المصاريف الضريبية",
            false
        );

        // ─── 10. NET INCOME (صافي الربح) ───
        const currentNetIncome = currentPreTax - currentTax;
        const prevNetIncome = prevPreTax - prevTax;

        sections.push({
            type: "grand-total",
            title: currentNetIncome >= 0 ? "صافي الربح" : "صافي الخسارة",
            currentYear: Math.abs(currentNetIncome),
            prevYear: Math.abs(prevNetIncome),
            changeAmount: currentNetIncome - prevNetIncome,
            changePercent: prevNetIncome !== 0 ? (((currentNetIncome - prevNetIncome) / Math.abs(prevNetIncome)) * 100) : (currentNetIncome !== 0 ? 100 : 0),
            isPositive: currentNetIncome >= 0
        });

        return {
            data: { sections },
            summary: {
                currentYear: {
                    totalRevenue: Math.abs(currentOpRev),
                    totalCOGS: currentCOGS,
                    grossProfit: Math.abs(currentGross),
                    totalOperatingExpense: currentOpExp,
                    operatingProfit: Math.abs(currentOpProfit),
                    otherRevenue: Math.abs(currentOtherRev),
                    otherExpense: currentOtherExp,
                    preTaxProfit: Math.abs(currentPreTax),
                    taxExpense: currentTax,
                    netIncome: Math.abs(currentNetIncome),
                    isProfit: currentNetIncome >= 0
                },
                prevYear: {
                    totalRevenue: Math.abs(prevOpRev),
                    totalCOGS: prevCOGS,
                    grossProfit: Math.abs(prevGross),
                    totalOperatingExpense: prevOpExp,
                    operatingProfit: Math.abs(prevOpProfit),
                    otherRevenue: Math.abs(prevOtherRev),
                    otherExpense: prevOtherExp,
                    preTaxProfit: Math.abs(prevPreTax),
                    taxExpense: prevTax,
                    netIncome: Math.abs(prevNetIncome),
                    isProfit: prevNetIncome >= 0
                }
            }
        };
    }

    static _buildEmptyResult() {
        return {
            data: { sections: [] },
            summary: {
                currentYear: {
                    totalRevenue: 0, totalCOGS: 0, grossProfit: 0,
                    totalOperatingExpense: 0, operatingProfit: 0,
                    otherRevenue: 0, otherExpense: 0,
                    preTaxProfit: 0, taxExpense: 0, netIncome: 0, isProfit: true
                },
                prevYear: {
                    totalRevenue: 0, totalCOGS: 0, grossProfit: 0,
                    totalOperatingExpense: 0, operatingProfit: 0,
                    otherRevenue: 0, otherExpense: 0,
                    preTaxProfit: 0, taxExpense: 0, netIncome: 0, isProfit: true
                }
            }
        };
    }
}

module.exports = IncomeStatementService;