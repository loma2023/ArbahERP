const Account = require("../Models/AccountSchema");
const JournalLine = require("../Models/JournalLineSchema");
const mongoose = require("mongoose");

class BalanceSheetService {

    /**
     * Arabic category name mapping
     */
    static getCategoryLabel(type, category) {
        const typeLabels = {
            asset: {
                "current": "الأصول المتداولة",
                "fixed": "الأصول الثابتة",
                "intangible": "الأصول غير الملموسة",
                "other": "أصول أخرى",
                "assets": "الأصول",
                "الأصول المتداولة": "الأصول المتداولة",
                "الأصول الثابتة": "الأصول الثابتة",
                "أصول أخرى": "أصول أخرى"
            },
            liability: {
                "current": "الخصوم المتداولة",
                "long_term": "الخصوم طويلة الأجل",
                "other": "خصوم أخرى",
                "liabilities": "الخصوم",
                "الخصوم المتداولة": "الخصوم المتداولة",
                "الخصوم طويلة الأجل": "الخصوم طويلة الأجل"
            },
            equity: {
                "capital": "رأس المال",
                "retained": "الأرباح المحتجزة",
                "reserves": "الاحتياطيات",
                "other": "حقوق ملكية أخرى",
                "equity": "حقوق الملكية",
                "رأس المال": "رأس المال",
                "الأرباح المحتجزة": "الأرباح المحتجزة"
            }
        };

        if (typeLabels[type] && typeLabels[type][category]) {
            return typeLabels[type][category];
        }

        const fallbackMap = {
            "assets": "الأصول",
            "asset": "الأصول",
            "current assets": "الأصول المتداولة",
            "fixed assets": "الأصول الثابتة",
            "liabilities": "الخصوم",
            "liability": "الخصوم",
            "current liabilities": "الخصوم المتداولة",
            "long term liabilities": "الخصوم طويلة الأجل",
            "equity": "حقوق الملكية",
            "capital": "رأس المال",
            "retained earnings": "الأرباح المحتجزة"
        };

        const lowerCat = (category || "").toLowerCase().trim();
        if (fallbackMap[lowerCat]) {
            return fallbackMap[lowerCat];
        }

        if (/[\u0600-\u06FF]/.test(category || "")) {
            return category;
        }

        const typeFallback = {
            asset: "الأصول",
            liability: "الخصوم",
            equity: "حقوق الملكية"
        };
        return typeFallback[type] || category || "غير مصنف";
    }

    /**
     * Get Balance Sheet (الميزانية العمومية)
     * Shows: Level 2 = Categories, Level 3 = Items
     * Level 4+ aggregated into Level 3 parent
     */
    static async getBalanceSheet(reportDate, compareDate) {
        const reportDateFilter = reportDate
            ? { date: { $lte: new Date(reportDate + "T23:59:59") } }
            : {};

        const allAccounts = await Account.find({ isActive: true })
            .sort({ code: 1 })
            .lean();

        if (allAccounts.length === 0) {
            return this._buildEmptyResult();
        }

        const periodActivity = await this._getPeriodActivity(reportDateFilter);

        let compareActivity = new Map();
        if (compareDate) {
            const compareFilter = { date: { $lte: new Date(compareDate + "T23:59:59") } };
            compareActivity = await this._getPeriodActivity(compareFilter);
        }

        const accountMap = new Map();
        for (const acc of allAccounts) {
            const activity = periodActivity.get(acc._id.toString()) || { periodDebit: 0, periodCredit: 0 };
            const compareAct = compareActivity.get(acc._id.toString()) || { periodDebit: 0, periodCredit: 0 };

            const openingBalance = acc.openingBalance || 0;

            let closingBalance = 0;
            if (acc.normalBalance === "debit") {
                closingBalance = openingBalance + activity.periodDebit - activity.periodCredit;
            } else {
                closingBalance = openingBalance + activity.periodCredit - activity.periodDebit;
            }

            let compareBalance = 0;
            if (acc.normalBalance === "debit") {
                compareBalance = openingBalance + compareAct.periodDebit - compareAct.periodCredit;
            } else {
                compareBalance = openingBalance + compareAct.periodCredit - compareAct.periodDebit;
            }

            accountMap.set(acc.code, {
                ...acc,
                closingBalance,
                compareBalance,
                activity
            });
        }

        const tree = this._buildTree(accountMap);

        const assets = tree.filter(n => n.type === "asset");
        const liabilities = tree.filter(n => n.type === "liability");
        const equity = tree.filter(n => n.type === "equity");

        const netIncome = await this._calculateNetIncome(reportDate);
        const compareNetIncome = compareDate ? await this._calculateNetIncome(compareDate) : 0;

        const assetsSection = this._buildSection(assets, "الأصول", "asset");
        const liabilitiesSection = this._buildSection(liabilities, "الخصوم", "liability");
        const equitySection = this._buildSection(equity, "حقوق الملكية", "equity", netIncome, compareNetIncome);

        const assetsTotal = assetsSection.total;
        const liabilitiesTotal = liabilitiesSection.total;
        const equityTotal = equitySection.total;
        const totalLiabilitiesAndEquity = liabilitiesTotal + equityTotal;

        // Calculate overall change for summary
        const totalAssetsChange = assetsTotal - assetsSection.compareTotal;
        const totalLiabilitiesChange = liabilitiesTotal - liabilitiesSection.compareTotal;
        const totalEquityChange = equityTotal - equitySection.compareTotal;

        return {
            reportDate,
            compareDate,
            assets: assetsSection,
            liabilities: liabilitiesSection,
            equity: equitySection,
            summary: {
                totalAssets: assetsTotal,
                totalLiabilities: liabilitiesTotal,
                totalEquity: equityTotal,
                totalLiabilitiesAndEquity: totalLiabilitiesAndEquity,
                netIncome,
                compareNetIncome,
                isBalanced: Math.abs(assetsTotal - totalLiabilitiesAndEquity) < 0.01,
                // New summary change fields
                totalAssetsChange,
                totalAssetsChangePercent: this._calcPercent(assetsSection.compareTotal, assetsTotal),
                totalLiabilitiesChange,
                totalLiabilitiesChangePercent: this._calcPercent(liabilitiesSection.compareTotal, liabilitiesTotal),
                totalEquityChange,
                totalEquityChangePercent: this._calcPercent(equitySection.compareTotal, equityTotal)
            }
        };
    }

    /**
     * Calculate change percentage safely
     */
    static _calcPercent(oldVal, newVal) {
        if (!oldVal || Math.abs(oldVal) < 0.001) {
            return newVal > 0 ? 100 : (newVal < 0 ? -100 : 0);
        }
        return ((newVal - oldVal) / Math.abs(oldVal)) * 100;
    }

    static async _getPeriodActivity(dateFilter) {
        const matchStage = {};
        if (dateFilter && dateFilter.date) {
            matchStage.date = dateFilter.date;
        }

        const activity = await JournalLine.aggregate([
            { $match: matchStage },
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

    static async _calculateNetIncome(toDate) {
        const dateFilter = toDate
            ? { date: { $lte: new Date(toDate + "T23:59:59") } }
            : {};

        const revExpAccounts = await Account.find({
            isActive: true,
            type: { $in: ["revenue", "expense"] }
        }).lean();

        if (revExpAccounts.length === 0) return 0;

        const revExpIds = revExpAccounts.map(a => a._id.toString());

        const activity = await JournalLine.aggregate([
            {
                $match: {
                    ...dateFilter,
                    account: { $in: revExpIds.map(id => new mongoose.Types.ObjectId(id)) }
                }
            },
            {
                $group: {
                    _id: "$account",
                    periodDebit: { $sum: "$debit" },
                    periodCredit: { $sum: "$credit" }
                }
            }
        ]);

        let totalRevenue = 0;
        let totalExpenses = 0;

        for (const item of activity) {
            const account = revExpAccounts.find(a => a._id.toString() === item._id.toString());
            if (!account) continue;

            let balance = 0;
            if (account.normalBalance === "debit") {
                balance = (account.openingBalance || 0) + item.periodDebit - item.periodCredit;
            } else {
                balance = (account.openingBalance || 0) + item.periodCredit - item.periodDebit;
            }

            if (account.type === "revenue") {
                totalRevenue += balance;
            } else {
                totalExpenses += balance;
            }
        }

        return totalRevenue - totalExpenses;
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
                closingBalance: data.closingBalance || 0,
                compareBalance: data.compareBalance || 0,
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
                closing: node.closingBalance || 0,
                compare: node.compareBalance || 0
            };
        }

        let totalClosing = 0;
        let totalCompare = 0;

        for (const child of node.children) {
            const childTotals = this._aggregateBalances(child);
            totalClosing += childTotals.closing;
            totalCompare += childTotals.compare;
        }

        if (node.isGroup || node.children.length > 0) {
            node.closingBalance = totalClosing;
            node.compareBalance = totalCompare;
        }

        return {
            closing: node.closingBalance,
            compare: node.compareBalance
        };
    }

    /**
     * Build section: Level 2 = Categories, Level 3 = Items
     * Level 1 = Section header (not shown as row)
     * Level 4+ = Aggregated into Level 3
     */
    static _buildSection(nodes, title, type, netIncome = 0, compareNetIncome = 0) {
        const categoryRows = [];
        let sectionTotal = 0;
        let sectionCompareTotal = 0;

        // nodes = level 1 accounts (e.g., 1 - الأصول)
        for (const level1 of nodes) {
            // level 2 = categories (e.g., 12 - أصول متداولة)
            const level2Children = level1.children || [];

            for (const level2 of level2Children) {
                const catName = level2.name;
                const catItems = [];
                let catTotal = 0;
                let catCompareTotal = 0;

                // level 3 = items (e.g., 1203 - العملاء)
                // Their balances already include level 4+ children
                const level3Children = level2.children || [];

                for (const level3 of level3Children) {
                    const balance = level3.closingBalance || 0;
                    const compareBal = level3.compareBalance || 0;
                    const change = balance - compareBal;
                    const changePercent = this._calcPercent(compareBal, balance);

                    // Show ALL items even with zero balance
                    catItems.push({
                        code: level3.code,
                        name: level3.name,
                        balance: balance,
                        compareBalance: compareBal,
                        change: change,
                        changePercent: changePercent,
                        isNegative: balance < 0,
                        isContra: this._isContraAccount(level3.name, level3.category)
                    });

                    catTotal += balance;
                    catCompareTotal += compareBal;
                }

                const catChange = catTotal - catCompareTotal;
                const catChangePercent = this._calcPercent(catCompareTotal, catTotal);

                // Show category even if all items are zero
                categoryRows.push({
                    name: catName,
                    items: catItems,
                    total: catTotal,
                    compareTotal: catCompareTotal,
                    change: catChange,
                    changePercent: catChangePercent
                });

                sectionTotal += catTotal;
                sectionCompareTotal += catCompareTotal;
            }
        }

        // Add net income to equity
        if (type === "equity" && Math.abs(netIncome) > 0.001) {
            const niChange = netIncome - compareNetIncome;
            const niChangePercent = this._calcPercent(compareNetIncome, netIncome);

            categoryRows.push({
                name: "صافي ربح/خسارة الفترة",
                items: [{
                    code: "",
                    name: netIncome >= 0 ? "صافي ربح الفترة" : "صافي خسارة الفترة",
                    balance: netIncome,
                    compareBalance: compareNetIncome,
                    change: niChange,
                    changePercent: niChangePercent,
                    isNegative: netIncome < 0,
                    isContra: false
                }],
                total: netIncome,
                compareTotal: compareNetIncome,
                change: niChange,
                changePercent: niChangePercent
            });
            sectionTotal += netIncome;
            sectionCompareTotal += compareNetIncome;
        }

        const sectionChange = sectionTotal - sectionCompareTotal;
        const sectionChangePercent = this._calcPercent(sectionCompareTotal, sectionTotal);

        return {
            title,
            type,
            categories: categoryRows,
            total: sectionTotal,
            compareTotal: sectionCompareTotal,
            change: sectionChange,
            changePercent: sectionChangePercent
        };
    }

    static _isContraAccount(name, category) {
        const contraKeywords = ["مجمع", "إهلاك", "خصم", "مسموح", "مخصص", "احتياطي"];
        const text = (name + " " + (category || "")).toLowerCase();
        return contraKeywords.some(kw => text.includes(kw.toLowerCase()));
    }

    static _buildEmptyResult() {
        return {
            reportDate: null,
            compareDate: null,
            assets: { 
                title: "الأصول", type: "asset", categories: [], 
                total: 0, compareTotal: 0, change: 0, changePercent: 0 
            },
            liabilities: { 
                title: "الخصوم", type: "liability", categories: [], 
                total: 0, compareTotal: 0, change: 0, changePercent: 0 
            },
            equity: { 
                title: "حقوق الملكية", type: "equity", categories: [], 
                total: 0, compareTotal: 0, change: 0, changePercent: 0 
            },
            summary: {
                totalAssets: 0,
                totalLiabilities: 0,
                totalEquity: 0,
                totalLiabilitiesAndEquity: 0,
                netIncome: 0,
                compareNetIncome: 0,
                isBalanced: true,
                totalAssetsChange: 0,
                totalAssetsChangePercent: 0,
                totalLiabilitiesChange: 0,
                totalLiabilitiesChangePercent: 0,
                totalEquityChange: 0,
                totalEquityChangePercent: 0
            }
        };
    }
}

module.exports = BalanceSheetService;