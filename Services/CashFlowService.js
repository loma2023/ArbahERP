const JournalEntry = require("../Models/JournalEntrySchema");
const JournalLine = require("../Models/JournalLineSchema");
const Account = require("../Models/AccountSchema");
const mongoose = require("mongoose");

class CashFlowService {
    // =============================================
    // ACCOUNT CODE MAPPING
    // =============================================
    static CF_CATEGORIES = {
        CASH_BOX:     { code: "1201", name: "النقدية بالصندوق", section: "cash", type: "balance" },
        CASH_BANK:    { code: "1202", name: "النقدية بالبنك",   section: "cash", type: "balance" },
        DEPRECIATION:       { code: "420100", name: "مصروف إهلاك الأصول الثابتة", section: "operating", type: "add_back" },
        BAD_DEBT_PROVISION: { code: "220101", name: "مخصص ديون مشكوك في تحصيلها", section: "operating", type: "add_back" },
        INVENTORY_PROVISION:{ code: "220102", name: "مخصص بضاعة راكدة", section: "operating", type: "add_back" },
        ACCOUNTS_RECEIVABLE:{ code: "1203", name: "العملاء", section: "operating", type: "wc_change" },
        INVENTORY:          { code: "1205", name: "المخزون", section: "operating", type: "wc_change" },
        PREPAID_EXPENSES:   { code: "1210", name: "مصاريف مدفوعة مقدماً", section: "operating", type: "wc_change" },
        ACCOUNTS_PAYABLE:   { code: "2301", name: "الموردين", section: "operating", type: "wc_change" },
        ACCRUED_EXPENSES:   { code: "2303", name: "مصاريف مستحقة وأرصدة دائنة أخرى", section: "operating", type: "wc_change" },
        TAXES_PAYABLE:      { code: "230306", name: "مصلحة الزكاة والضريبة - ضريبة ق مضافة", section: "operating", type: "wc_change" },
        SALARIES_PAYABLE:   { code: "230300", name: "رواتب مستحقة", section: "operating", type: "wc_change" },
        FIXED_ASSETS:       { code: "1102", name: "ممتلكات وآلات ومعدات", section: "investing", type: "cash_out" },
        LONG_TERM_LOANS:    { code: "2203", name: "قروض طويلة الأجل", section: "financing", type: "cash_in" },
        SHORT_TERM_LOANS:   { code: "2302", name: "قروض قصيرة الأجل", section: "financing", type: "cash_in" },
        SHARE_CAPITAL:      { code: "210100", name: "رأس المال", section: "financing", type: "cash_in" },
    };

    // =============================================
    // HELPERS - All static, called via CashFlowService.
    // =============================================

    static async getPostedEntryIds() {
        return await JournalEntry.find({ status: "posted" }).distinct("_id");
    }

    static async getAccountIdsByCodes(codes) {
        const accounts = await Account.find({ code: { $in: codes } }).lean();
        const map = {};
        for (const acc of accounts) map[acc.code] = acc._id;
        return map;
    }

    static async batchAccountMovements(accountIdMap, fromDate, toDate, postedIds) {
        const accountIds = Object.values(accountIdMap).filter(Boolean);
        if (accountIds.length === 0) return {};

        const movements = await JournalLine.aggregate([
            {
                $match: {
                    account: { $in: accountIds },
                    journalEntry: { $in: postedIds },
                    date: { $gte: new Date(fromDate), $lte: new Date(toDate) }
                }
            },
            {
                $group: {
                    _id: "$account",
                    totalDebit: { $sum: "$debit" },
                    totalCredit: { $sum: "$credit" }
                }
            }
        ]);

        const result = {};
        for (const [code, id] of Object.entries(accountIdMap)) {
            if (id) result[code] = { debit: 0, credit: 0, net: 0 };
        }

        const idToCode = {};
        for (const [code, id] of Object.entries(accountIdMap)) {
            if (id) idToCode[id.toString()] = code;
        }

        for (const m of movements) {
            const code = idToCode[m._id.toString()];
            if (code) {
                result[code] = {
                    debit: m.totalDebit || 0,
                    credit: m.totalCredit || 0,
                    net: (m.totalDebit || 0) - (m.totalCredit || 0)
                };
            }
        }
        return result;
    }

    static async batchAccountBalanceChanges(accountIdMap, fromDate, toDate, postedIds) {
        const accountIds = Object.values(accountIdMap).filter(Boolean);
        if (accountIds.length === 0) return {};

        const openingAgg = await JournalLine.aggregate([
            {
                $match: {
                    account: { $in: accountIds },
                    date: { $lt: new Date(fromDate) },
                    journalEntry: { $in: postedIds }
                }
            },
            {
                $group: {
                    _id: "$account",
                    totalDebit: { $sum: "$debit" },
                    totalCredit: { $sum: "$credit" }
                }
            }
        ]);

        const closingAgg = await JournalLine.aggregate([
            {
                $match: {
                    account: { $in: accountIds },
                    date: { $lte: new Date(toDate) },
                    journalEntry: { $in: postedIds }
                }
            },
            {
                $group: {
                    _id: "$account",
                    totalDebit: { $sum: "$debit" },
                    totalCredit: { $sum: "$credit" }
                }
            }
        ]);

        const idToCode = {};
        for (const [code, id] of Object.entries(accountIdMap)) {
            if (id) idToCode[id.toString()] = code;
        }

        const result = {};
        for (const [code, id] of Object.entries(accountIdMap)) {
            if (!id) continue;
            result[code] = { openingBalance: 0, closingBalance: 0, change: 0 };
        }

        for (const o of openingAgg) {
            const code = idToCode[o._id.toString()];
            if (code) result[code].openingBalance = (o.totalDebit || 0) - (o.totalCredit || 0);
        }
        for (const c of closingAgg) {
            const code = idToCode[c._id.toString()];
            if (code) result[code].closingBalance = (c.totalDebit || 0) - (c.totalCredit || 0);
        }
        for (const code of Object.keys(result)) {
            result[code].change = result[code].closingBalance - result[code].openingBalance;
        }

        return result;
    }

    static async getPatternMovement(pattern, fromDate, toDate, postedIds) {
        const accounts = await Account.find({ code: { $regex: pattern } }).lean();
        const accountIds = accounts.map(a => a._id);
        if (accountIds.length === 0) return { debit: 0, credit: 0, net: 0 };

        const movement = await JournalLine.aggregate([
            {
                $match: {
                    account: { $in: accountIds },
                    journalEntry: { $in: postedIds },
                    date: { $gte: new Date(fromDate), $lte: new Date(toDate) }
                }
            },
            {
                $group: {
                    _id: null,
                    totalDebit: { $sum: "$debit" },
                    totalCredit: { $sum: "$credit" }
                }
            }
        ]);

        const td = movement[0]?.totalDebit || 0;
        const tc = movement[0]?.totalCredit || 0;
        return { debit: td, credit: tc, net: td - tc };
    }

    static async getNetProfit(fromDate, toDate, postedIds) {
        const result = await JournalLine.aggregate([
            {
                $match: {
                    journalEntry: { $in: postedIds },
                    date: { $gte: new Date(fromDate), $lte: new Date(toDate) }
                }
            },
            {
                $lookup: {
                    from: "accounts",
                    localField: "account",
                    foreignField: "_id",
                    as: "acc"
                }
            },
            { $unwind: "$acc" },
            {
                $match: {
                    $or: [
                        { "acc.code": { $regex: "^3" } },
                        { "acc.code": { $regex: "^4" } }
                    ]
                }
            },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $regexMatch: { input: "$acc.code", regex: "^3" } },
                            "revenue",
                            "expense"
                        ]
                    },
                    total: {
                        $sum: {
                            $cond: [
                                { $eq: ["$_id", "revenue"] },
                                { $subtract: ["$credit", "$debit"] },
                                { $subtract: ["$debit", "$credit"] }
                            ]
                        }
                    }
                }
            }
        ]);

        let totalRevenue = 0, totalExpense = 0;
        for (const r of result) {
            if (r._id === "revenue") totalRevenue = r.total || 0;
            if (r._id === "expense") totalExpense = r.total || 0;
        }

        return { netProfit: totalRevenue - totalExpense, totalRevenue, totalExpense };
    }

    // =============================================
    // INDIRECT METHOD
    // =============================================
    static async generateIndirectMethod(fromDate, toDate) {
        const startTime = Date.now();

        // 1. Get posted entry IDs ONCE
        const postedIds = await CashFlowService.getPostedEntryIds();

        // 2. Get ALL needed account IDs in ONE query
        const allCodes = [
            "1201", "1202", "1203", "1205", "1210",
            "2203", "2302", "2301", "2303", "230306", "230300",
            "420100", "220101", "220102",
            "210100", "1102"
        ];
        const accountIdMap = await CashFlowService.getAccountIdsByCodes(allCodes);

        // 3. Fetch ALL movements and balance changes in PARALLEL
        const [movements, balanceChanges, netProfit] = await Promise.all([
            CashFlowService.batchAccountMovements(accountIdMap, fromDate, toDate, postedIds),
            CashFlowService.batchAccountBalanceChanges(accountIdMap, fromDate, toDate, postedIds),
            CashFlowService.getNetProfit(fromDate, toDate, postedIds)
        ]);

        // 4. Fetch pattern-based movements in parallel
        const [interestMov, taxMov] = await Promise.all([
            CashFlowService.getPatternMovement("^4.*فائ", fromDate, toDate, postedIds),
            CashFlowService.getPatternMovement("^4.*ضري", fromDate, toDate, postedIds)
        ]);

        // 5. Build the statement
        const operating = [];
        const investing = [];
        const financing = [];

        // Net Profit
        operating.push({ label: "صافي الربح", amount: netProfit.netProfit, type: "base" });

        // Adjustments
        const adjustments = [
            { code: "420100", label: "تسويات الاستهلاك" },
            { code: "220101", label: "مخصصات الديون المشكوك فيها" },
            { code: "220102", label: "مخصص انخفاض المخزون" }
        ];
        for (const adj of adjustments) {
            const mov = movements[adj.code];
            if (mov && mov.net !== 0) {
                operating.push({ label: adj.label, amount: Math.abs(mov.net), type: "add_back", accountCode: adj.code });
            }
        }

        // Working Capital
        const wcItems = [
            { code: "1203", label: "التغير في العملاء", isAsset: true },
            { code: "1205", label: "التغير في المخزون", isAsset: true },
            { code: "1210", label: "التغير في المصروفات المدفوعة مقدماً", isAsset: true },
            { code: "2301", label: "التغير في الموردين", isAsset: false },
            { code: "2303", label: "التغير في المصروفات المستحقة", isAsset: false },
            { code: "230306", label: "التغير في الضرائب المستحقة", isAsset: false },
            { code: "230300", label: "التغير في الرواتب المستحقة", isAsset: false }
        ];
        for (const item of wcItems) {
            const chg = balanceChanges[item.code];
            if (chg && chg.change !== 0) {
                const amount = item.isAsset ? -chg.change : chg.change;
                operating.push({ label: item.label, amount, type: "wc_change", accountCode: item.code });
            }
        }

        // Interest & Taxes
        if (interestMov.net !== 0) {
            operating.push({ label: "فوائد مدفوعة", amount: -interestMov.net, type: "cash_out" });
        }
        if (taxMov.net !== 0) {
            operating.push({ label: "ضرائب مدفوعة", amount: -taxMov.net, type: "cash_out" });
        }

        const operatingTotal = operating.reduce((sum, item) => sum + item.amount, 0);

        // =============================================
        // INVESTING
        // =============================================
        const fixedAssetsMov = movements["1102"];
        if (fixedAssetsMov && fixedAssetsMov.net !== 0) {
            const amount = -fixedAssetsMov.net;
            investing.push({
                label: amount > 0 ? "بيع أصول ثابتة" : "شراء أصول ثابتة",
                amount: amount,
                type: amount > 0 ? "cash_in" : "cash_out",
                accountCode: "1102"
            });
        }

        const investingTotal = investing.reduce((sum, item) => sum + item.amount, 0);

        // =============================================
        // FINANCING
        // =============================================
        const longTermChg = balanceChanges["2203"];
        const shortTermChg = balanceChanges["2302"];
        const totalLoanChange = (longTermChg?.change || 0) + (shortTermChg?.change || 0);

        if (totalLoanChange !== 0) {
            financing.push({
                label: totalLoanChange > 0 ? "قروض جديدة مستلمة" : "سداد قروض بنكية",
                amount: totalLoanChange,
                type: totalLoanChange > 0 ? "cash_in" : "cash_out",
                accountCode: "2203/2302"
            });
        }

        const capitalChg = balanceChanges["210100"];
        if (capitalChg && capitalChg.change !== 0) {
            financing.push({
                label: capitalChg.change > 0 ? "زيادة رأس المال" : "سحب رأس مال",
                amount: capitalChg.change,
                type: capitalChg.change > 0 ? "cash_in" : "cash_out",
                accountCode: "210100"
            });
        }

        const financingTotal = financing.reduce((sum, item) => sum + item.amount, 0);

        // =============================================
        // CASH BALANCES
        // =============================================
        const cashBoxChg = balanceChanges["1201"];
        const cashBankChg = balanceChanges["1202"];
        const openingCash = (cashBoxChg?.openingBalance || 0) + (cashBankChg?.openingBalance || 0);
        const closingCash = (cashBoxChg?.closingBalance || 0) + (cashBankChg?.closingBalance || 0);
        const netCashFlow = operatingTotal + investingTotal + financingTotal;

        const elapsed = Date.now() - startTime;
        console.log(`⚡ Cash Flow generated in ${elapsed}ms`);

        return {
            operating: { items: operating, total: operatingTotal },
            investing: { items: investing, total: investingTotal },
            financing: { items: financing, total: financingTotal },
            summary: {
                netCashFlow,
                openingCash,
                closingCash,
                verification: Math.abs(netCashFlow - (closingCash - openingCash)) < 0.01
            },
            period: { fromDate, toDate },
            meta: { generatedInMs: elapsed }
        };
    }

    // =============================================
    // DIRECT METHOD
    // =============================================
    static async generateDirectMethod(fromDate, toDate) {
        const startTime = Date.now();
        const postedIds = await CashFlowService.getPostedEntryIds();

        const cashAccounts = await Account.find({ $or: [{ code: { $regex: "^1201" } }, { code: { $regex: "^1202" } }] }).lean();
        const cashAccountIds = cashAccounts.map(a => a._id);

        const cashLines = await JournalLine.aggregate([
            {
                $match: {
                    account: { $in: cashAccountIds },
                    journalEntry: { $in: postedIds },
                    date: { $gte: new Date(fromDate), $lte: new Date(toDate) }
                }
            },
            {
                $lookup: {
                    from: "journalentries",
                    localField: "journalEntry",
                    foreignField: "_id",
                    as: "entry"
                }
            },
            { $unwind: "$entry" },
            { $sort: { "entry.date": 1 } }
        ]);

        const allEntryIds = [...new Set(cashLines.map(l => l.entry._id.toString()))];
        const allRelatedLines = await JournalLine.find({
            journalEntry: { $in: allEntryIds.map(id => mongoose.Types.ObjectId(id)) }
        }).populate("account", "code name").lean();

        const linesByEntry = {};
        for (const line of allRelatedLines) {
            const eid = line.journalEntry.toString();
            if (!linesByEntry[eid]) linesByEntry[eid] = [];
            linesByEntry[eid].push(line);
        }

        const operating = [], investing = [], financing = [];

        for (const line of cashLines) {
            const isCashIn = line.credit > 0;
            const amount = line.credit || line.debit;
            const entryId = line.entry._id.toString();
            const otherLines = (linesByEntry[entryId] || []).filter(l => l._id.toString() !== line._id.toString());

            for (const other of otherLines) {
                const otherCode = other.account?.code || "";
                const otherName = other.account?.name || "";

                let section = "operating";
                let label = otherName;

                if (otherCode.match(/^1102/)) {
                    section = "investing";
                    label = isCashIn ? "بيع أصول ثابتة" : "شراء أصول ثابتة";
                } else if (otherCode.match(/^2203|^2302/)) {
                    section = "financing";
                    label = isCashIn ? "قروض جديدة" : "سداد قروض";
                } else if (otherCode.match(/^2101/)) {
                    section = "financing";
                    label = isCashIn ? "زيادة رأس المال" : "سحب رأس مال";
                } else if (otherCode.match(/^2304/)) {
                    section = "financing";
                    label = isCashIn ? "إضافات الشركاء" : "مسحوبات الشركاء";
                } else if (otherCode.match(/^3/)) {
                    label = "إيرادات نقدية";
                } else if (otherCode.match(/^4/)) {
                    label = "مصروفات نقدية";
                }

                const item = {
                    label,
                    amount: isCashIn ? amount : -amount,
                    type: isCashIn ? "cash_in" : "cash_out",
                    accountCode: otherCode,
                    date: line.entry.date
                };

                if (section === "operating") operating.push(item);
                else if (section === "investing") investing.push(item);
                else if (section === "financing") financing.push(item);
            }
        }

        const aggregateItems = (items) => {
            const grouped = {};
            for (const item of items) {
                if (!grouped[item.label]) grouped[item.label] = { ...item, amount: 0 };
                grouped[item.label].amount += item.amount;
            }
            return Object.values(grouped).filter(i => Math.abs(i.amount) > 0.001);
        };

        const operatingAgg = aggregateItems(operating);
        const investingAgg = aggregateItems(investing);
        const financingAgg = aggregateItems(financing);

        const operatingTotal = operatingAgg.reduce((s, i) => s + i.amount, 0);
        const investingTotal = investingAgg.reduce((s, i) => s + i.amount, 0);
        const financingTotal = financingAgg.reduce((s, i) => s + i.amount, 0);

        const cashIdMap = await CashFlowService.getAccountIdsByCodes(["1201", "1202"]);
        const balanceChanges = await CashFlowService.batchAccountBalanceChanges(cashIdMap, fromDate, toDate, postedIds);

        const openingCash = (balanceChanges["1201"]?.openingBalance || 0) + (balanceChanges["1202"]?.openingBalance || 0);
        const closingCash = (balanceChanges["1201"]?.closingBalance || 0) + (balanceChanges["1202"]?.closingBalance || 0);
        const netCashFlow = operatingTotal + investingTotal + financingTotal;

        const elapsed = Date.now() - startTime;
        console.log(`⚡ Cash Flow (Direct) generated in ${elapsed}ms`);

        return {
            operating: { items: operatingAgg, total: operatingTotal },
            investing: { items: investingAgg, total: investingTotal },
            financing: { items: financingAgg, total: financingTotal },
            summary: {
                netCashFlow,
                openingCash,
                closingCash,
                verification: Math.abs(netCashFlow - (closingCash - openingCash)) < 0.01
            },
            period: { fromDate, toDate },
            meta: { generatedInMs: elapsed }
        };
    }

    // =============================================
    // MAIN METHOD
    // =============================================
    static async generateCashFlow(fromDate, toDate, method = "indirect") {
        if (method === "direct") return await CashFlowService.generateDirectMethod(fromDate, toDate);
        return await CashFlowService.generateIndirectMethod(fromDate, toDate);
    }

    static async getSummary(fromDate, toDate) {
        const cf = await CashFlowService.generateCashFlow(fromDate, toDate, "indirect");
        return {
            operating: cf.operating.total,
            investing: cf.investing.total,
            financing: cf.financing.total,
            netCashFlow: cf.summary.netCashFlow,
            openingCash: cf.summary.openingCash,
            closingCash: cf.summary.closingCash,
            period: cf.period
        };
    }

    static async exportToExcel(fromDate, toDate, method = "indirect") {
        const cf = await CashFlowService.generateCashFlow(fromDate, toDate, method);
        let csv = "قائمة التدفقات النقدية\n";
        csv += `الفترة: ${fromDate} إلى ${toDate}\n\n`;
        csv += "الأنشطة التشغيلية\n";
        for (const item of cf.operating.items) csv += `${item.label},${item.amount.toFixed(2)}\n`;
        csv += `صافي التدفق التشغيلي,${cf.operating.total.toFixed(2)}\n\n`;
        csv += "الأنشطة الاستثمارية\n";
        for (const item of cf.investing.items) csv += `${item.label},${item.amount.toFixed(2)}\n`;
        csv += `صافي التدفق الاستثماري,${cf.investing.total.toFixed(2)}\n\n`;
        csv += "الأنشطة التمويلية\n";
        for (const item of cf.financing.items) csv += `${item.label},${item.amount.toFixed(2)}\n`;
        csv += `صافي التدفق التمويلي,${cf.financing.total.toFixed(2)}\n\n`;
        csv += "الملخص\n";
        csv += `صافي الزيادة/النقصان,${cf.summary.netCashFlow.toFixed(2)}\n`;
        csv += `النقدية في بداية الفترة,${cf.summary.openingCash.toFixed(2)}\n`;
        csv += `النقدية في نهاية الفترة,${cf.summary.closingCash.toFixed(2)}\n`;
        return Buffer.from(csv, "utf-8");
    }
}

module.exports = CashFlowService;