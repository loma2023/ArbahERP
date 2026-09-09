const Account = require("../Models/AccountSchema");
const JournalLine = require("../Models/JournalLineSchema");
const mongoose = require("mongoose");

class TrialBalanceService {

    /**
     * Get trial balance data — LEVEL 3 ONLY
     * Level 4+ accounts are aggregated into their Level 3 parent
     */
    static async getTrialBalance(fromDate, toDate) {
        // ─── STEP 1: Build date filter ───
        const lineMatch = {};
        if (fromDate || toDate) {
            lineMatch.date = {};
            if (fromDate) lineMatch.date.$gte = new Date(fromDate + "T00:00:00");
            if (toDate) lineMatch.date.$lte = new Date(toDate + "T23:59:59");
        }

        // ─── STEP 2: Get ALL active accounts (not just leaf) ───
        const allAccounts = await Account.find({
            isActive: true
        }).sort({ code: 1 }).lean();

        if (allAccounts.length === 0) {
            return this._buildEmptyResult();
        }

        // ─── STEP 3: Get period activity ───
        const periodActivity = await this._getPeriodActivity(lineMatch);

        // ─── STEP 4: Calculate balances for each account ───
        const accountMap = new Map();
        for (const acc of allAccounts) {
            const activity = periodActivity.get(acc._id.toString()) || { periodDebit: 0, periodCredit: 0 };
            const openingBalance = acc.openingBalance || 0;

            let closingBalance = 0;
            if (acc.normalBalance === "debit") {
                closingBalance = openingBalance + activity.periodDebit - activity.periodCredit;
            } else {
                closingBalance = openingBalance + activity.periodCredit - activity.periodDebit;
            }

            accountMap.set(acc.code, {
                ...acc,
                closingBalance,
                periodDebit: activity.periodDebit,
                periodCredit: activity.periodCredit
            });
        }

        // ─── STEP 5: Build tree and aggregate ───
        const tree = this._buildTree(accountMap);

        // ─── STEP 6: Extract Level 3 accounts only ───
        const level3Accounts = [];
        this._extractLevel3(tree, level3Accounts);

        // ─── STEP 7: Build trial balance rows ───
        return this._buildTrialBalanceRows(level3Accounts);
    }

    static async _getPeriodActivity(lineMatch) {
        const matchStage = {};
        if (lineMatch && lineMatch.date) {
            matchStage.date = lineMatch.date;
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
                periodDebit: data.periodDebit || 0,
                periodCredit: data.periodCredit || 0,
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
                opening: node.openingBalance || 0,
                closing: node.closingBalance || 0,
                debit: node.periodDebit || 0,
                credit: node.periodCredit || 0
            };
        }

        let totalOpening = 0;
        let totalClosing = 0;
        let totalDebit = 0;
        let totalCredit = 0;

        for (const child of node.children) {
            const childTotals = this._aggregateBalances(child);
            totalOpening += childTotals.opening;
            totalClosing += childTotals.closing;
            totalDebit += childTotals.debit;
            totalCredit += childTotals.credit;
        }

        if (node.isGroup || node.children.length > 0) {
            node.openingBalance = totalOpening;
            node.closingBalance = totalClosing;
            node.periodDebit = totalDebit;
            node.periodCredit = totalCredit;
        }

        return {
            opening: node.openingBalance,
            closing: node.closingBalance,
            debit: node.periodDebit,
            credit: node.periodCredit
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

    static _buildTrialBalanceRows(level3Accounts) {
        const trialBalanceData = [];
        let grandTotalOpeningDebit = 0;
        let grandTotalOpeningCredit = 0;
        let grandTotalPeriodDebit = 0;
        let grandTotalPeriodCredit = 0;
        let grandTotalClosingDebit = 0;
        let grandTotalClosingCredit = 0;

        for (const account of level3Accounts) {
            const openingBalance = account.openingBalance || 0;
            const periodDebit = account.periodDebit || 0;
            const periodCredit = account.periodCredit || 0;
            const closingBalance = account.closingBalance || 0;

            // Convert balances to debit/credit format
            const openingDebit = openingBalance > 0 && account.normalBalance === "debit" ? openingBalance : 0;
            const openingCredit = openingBalance > 0 && account.normalBalance === "credit" ? openingBalance : 0;
            const openingDebitNeg = openingBalance < 0 && account.normalBalance === "credit" ? Math.abs(openingBalance) : 0;
            const openingCreditNeg = openingBalance < 0 && account.normalBalance === "debit" ? Math.abs(openingBalance) : 0;

            const closingDebit = closingBalance > 0 && account.normalBalance === "debit" ? closingBalance : 0;
            const closingCredit = closingBalance > 0 && account.normalBalance === "credit" ? closingBalance : 0;
            const closingDebitNeg = closingBalance < 0 && account.normalBalance === "credit" ? Math.abs(closingBalance) : 0;
            const closingCreditNeg = closingBalance < 0 && account.normalBalance === "debit" ? Math.abs(closingBalance) : 0;

            const row = {
                code: account.code,
                name: account.name,
                type: account.type,
                typeLabel: this.getTypeLabel(account.type),
                normalBalance: account.normalBalance,
                openingBalance: openingBalance,
                openingDebit: openingDebit + openingDebitNeg,
                openingCredit: openingCredit + openingCreditNeg,
                periodDebit: periodDebit,
                periodCredit: periodCredit,
                closingBalance: closingBalance,
                closingDebit: closingDebit + closingDebitNeg,
                closingCredit: closingCredit + closingCreditNeg
            };

            trialBalanceData.push(row);

            grandTotalOpeningDebit += row.openingDebit;
            grandTotalOpeningCredit += row.openingCredit;
            grandTotalPeriodDebit += periodDebit;
            grandTotalPeriodCredit += periodCredit;
            grandTotalClosingDebit += row.closingDebit;
            grandTotalClosingCredit += row.closingCredit;
        }

        return {
            data: trialBalanceData,
            summary: {
                totalOpeningDebit: grandTotalOpeningDebit,
                totalOpeningCredit: grandTotalOpeningCredit,
                totalPeriodDebit: grandTotalPeriodDebit,
                totalPeriodCredit: grandTotalPeriodCredit,
                totalClosingDebit: grandTotalClosingDebit,
                totalClosingCredit: grandTotalClosingCredit,
                openingDiff: grandTotalOpeningDebit - grandTotalOpeningCredit,
                periodDiff: grandTotalPeriodDebit - grandTotalPeriodCredit,
                closingDiff: grandTotalClosingDebit - grandTotalClosingCredit,
                isBalanced: Math.abs(grandTotalClosingDebit - grandTotalClosingCredit) < 0.01
            }
        };
    }

    static getTypeLabel(type) {
        const labels = {
            asset: "أصول",
            liability: "خصوم",
            equity: "حقوق ملكية",
            revenue: "إيرادات",
            expense: "مصروفات"
        };
        return labels[type] || type;
    }

    static _buildEmptyResult() {
        return {
            data: [],
            summary: {
                totalOpeningDebit: 0, totalOpeningCredit: 0,
                totalPeriodDebit: 0, totalPeriodCredit: 0,
                totalClosingDebit: 0, totalClosingCredit: 0,
                openingDiff: 0, periodDiff: 0, closingDiff: 0,
                isBalanced: true
            }
        };
    }
}

module.exports = TrialBalanceService;