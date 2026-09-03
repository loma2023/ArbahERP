const Invoice = require("../Models/InvoiceSchema");
const JournalEntry = require("../Models/JournalEntrySchema");
const JournalLine = require("../Models/JournalLineSchema");
const Account = require("../Models/AccountSchema");
const AccountService = require("./AccountService");
const JournalEntryService = require("./JournalEntryService");
const mongoose = require("mongoose");

// =============================================
// Invoice Service - ArbahERP
// Core Business Logic for Invoices & Auto Journal Entries
// =============================================
class InvoiceService {

    // ─────────────────────────────────────────────
    // ACCOUNT CODE CONSTANTS (from Chart of Accounts)
    // ─────────────────────────────────────────────
    static ACCOUNTS = {
        SALES_REVENUE: "310100",
        SALES_RETURNS: "310101",
        SALES_DISCOUNTS: "310102",
        PURCHASES: "410100",
        PURCHASE_RETURNS: "410105",
        PURCHASE_DISCOUNTS: "410106",
        COST_OF_SALES: "410101",
        INVENTORY: "120501",
        CASH: "1201",
        BANK: "1202",
        CUSTOMERS: "1203",
        SUPPLIERS: "2301",
        VAT_INPUT: "120900",
        VAT_OUTPUT: "230305",
        SALES_REPS: "1204",
    };

    // ✅ Cache for account lookups
    static _accountCache = new Map();
    static _cacheLoaded = false;

    // =============================================
    // PRELOAD ACCOUNT CACHE (Call once on startup)
    // =============================================
    static async preloadAccountCache() {
        if (this._cacheLoaded) return;

        const codes = Object.values(this.ACCOUNTS);
        const accounts = await Account.find({ code: { $in: codes } }).lean();

        for (const acc of accounts) {
            this._accountCache.set(acc.code, acc._id.toString());
        }
        this._cacheLoaded = true;
        console.log("✅ InvoiceService account cache loaded:", accounts.length, "accounts");

        // Log missing accounts
        const foundCodes = accounts.map(a => a.code);
        const missingCodes = codes.filter(c => !foundCodes.includes(c));
        if (missingCodes.length > 0) {
            console.warn("⚠️ Missing accounts in cache:", missingCodes);
        }
    }

    // =============================================
    // CREATE INVOICE + AUTO JOURNAL ENTRY
    // =============================================
    static async createInvoice(data) {
        const totalStart = Date.now();
        const timings = {};

        // ✅ Ensure cache is loaded
        if (!this._cacheLoaded) {
            const t0 = Date.now();
            await this.preloadAccountCache();
            timings.cacheLoad = Date.now() - t0;
        }

        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // 1. Generate Invoice Number
            let t0 = Date.now();
            const invoiceNo = await Invoice.getNextInvoiceNo(data.invoiceType);
            timings.step1_invoiceNo = Date.now() - t0;

            // 2. Get accounts (parallel for speed)
            t0 = Date.now();
            const [entityAccount, paymentAccount] = await Promise.all([
                this._getEntityAccount(data),
                this._getPaymentAccount(data)
            ]);
            timings.step2_accounts = Date.now() - t0;

            if (!entityAccount) {
                throw new Error(`لم يتم العثور على حساب ${data.entityType === "customer" ? "العميل" : "المورد"}. يرجى التأكد من ربط الحساب المحاسبي.`);
            }

            // 3. Build Invoice Document
            t0 = Date.now();
            const invoice = new Invoice({
                invoiceNo,
                invoiceType: data.invoiceType,
                date: data.date ? new Date(data.date) : new Date(),
                dueDate: data.dueDate ? new Date(data.dueDate) : null,
                referenceNumber: data.referenceNumber || "",
                entityType: data.entityType,
                entityId: data.entityId,
                entityName: data.entityName,
                entityCode: data.entityCode || "",
                entityAccountId: entityAccount._id,
                salesRepId: data.salesRepId || null,
                salesRepName: data.salesRepName || "",
                branchId: data.branchId || null,
                branchName: data.branchName || "",
                warehouseId: data.warehouseId || null,
                warehouseName: data.warehouseName || "",
                costCenterId: data.costCenterId || null,
                costCenterName: data.costCenterName || "",
                items: data.items.map((item, idx) => ({
                    productId: item.productId,
                    productName: item.productName,
                    productCode: item.productCode || "",
                    unit: item.unit,
                    quantity: parseFloat(item.quantity) || 1,
                    price: parseFloat(item.price) || 0,
                    priceType: item.priceType || "retail",
                    discountPercent: parseFloat(item.discountPercent) || 0,
                    discountAmount: parseFloat(item.discountAmount) || 0,
                    taxPercent: parseFloat(item.taxPercent) || 15,
                    taxExempt: item.taxExempt || false,
                    costPrice: parseFloat(item.costPrice) || 0,
                    notes: item.notes || "",
                    sortOrder: idx + 1
                })),
                generalDiscountPercent: parseFloat(data.generalDiscountPercent) || 0,
                paymentMethod: data.paymentMethod || "cash",
                paidAmount: parseFloat(data.paidAmount) || 0,
                priceIncludesTax: data.priceIncludesTax || false,
                notes: data.notes || "",
                internalNotes: data.internalNotes || "",
                status: "confirmed",
                payments: data.payments || []
            });
            timings.step3_buildDoc = Date.now() - t0;

            // ✅ Calculate totals manually
            t0 = Date.now();
            this._calculateInvoiceTotals(invoice);
            timings.step4_calculateTotals = Date.now() - t0;

            // Save invoice
            t0 = Date.now();
            await invoice.save({ session, middleware: false });
            timings.step5_saveInvoice = Date.now() - t0;

            // 4. Create Auto Journal Entry
            t0 = Date.now();
            const journalEntry = await this._createInvoiceJournalEntry(
                invoice, paymentAccount, entityAccount, session
            );
            timings.step6_journalEntry = Date.now() - t0;

            // Link journal entry to invoice
            t0 = Date.now();
            invoice.journalEntryId = journalEntry._id;
            invoice.journalEntryNo = journalEntry.entryNo;
            await invoice.save({ session, middleware: false });
            timings.step7_linkJournal = Date.now() - t0;

            // 5. Update Stock
            t0 = Date.now();
            await this._updateStock(invoice, session);
            timings.step8_stock = Date.now() - t0;

            // Commit transaction
            t0 = Date.now();
            await session.commitTransaction();
            timings.step9_commit = Date.now() - t0;

            const totalDuration = Date.now() - totalStart;

            // ✅ Print detailed timing report
            console.log("═══════════════════════════════════════════");
            console.log("📊 INVOICE CREATION TIMING REPORT");
            console.log("═══════════════════════════════════════════");
            console.log(`🕐 Total: ${totalDuration}ms`);
            Object.entries(timings).forEach(([key, val]) => {
                const pct = ((val / totalDuration) * 100).toFixed(1);
                const bar = "█".repeat(Math.round(pct / 2));
                console.log(`  ${key.padEnd(25)} ${val.toString().padStart(5)}ms (${pct}%) ${bar}`);
            });
            console.log("═══════════════════════════════════════════");

            return {
                success: true,
                message: `تم إنشاء ${this._getInvoiceTypeName(invoice.invoiceType)} رقم ${invoice.invoiceNo} بنجاح مع القيد المحاسبي ${journalEntry.entryNo}`,
                data: {
                    invoiceNo: invoice.invoiceNo,
                    journalEntryNo: journalEntry.entryNo,
                    duration: `${totalDuration}ms`,
                    timings
                }
            };

        } catch (error) {
            await session.abortTransaction();
            console.error("❌ Invoice Creation Error:", error);
            throw error;
        } finally {
            session.endSession();
        }
    }

    // =============================================
    // FAST TOTALS CALCULATION (replaces pre-save hook)
    // =============================================
    static _calculateInvoiceTotals(invoice) {
        let subTotal = 0;
        let totalItemDiscount = 0;
        let totalTax = 0;
        let grandTotal = 0;
        let totalCost = 0;
        let totalProfit = 0;

        invoice.items.forEach((item, index) => {
            item.sortOrder = index + 1;
            item.subtotal = item.price * item.quantity;
            item.discountAmount = (item.subtotal * item.discountPercent / 100) + (item.discountAmount || 0);
            item.afterDiscount = item.subtotal - item.discountAmount;
            item.taxAmount = item.taxExempt ? 0 : (item.afterDiscount * item.taxPercent / 100);
            item.total = item.afterDiscount + item.taxAmount;
            item.profit = item.total - (item.costPrice * item.quantity);

            subTotal += item.subtotal;
            totalItemDiscount += item.discountAmount;
            totalTax += item.taxAmount;
            grandTotal += item.total;
            totalCost += (item.costPrice * item.quantity);
            totalProfit += item.profit;
        });

        invoice.subTotal = subTotal;
        invoice.totalItemDiscount = totalItemDiscount;
        invoice.generalDiscountAmount = grandTotal * (invoice.generalDiscountPercent / 100);
        invoice.afterGeneralDiscount = grandTotal - invoice.generalDiscountAmount;
        invoice.totalTax = totalTax;
        invoice.grandTotal = invoice.afterGeneralDiscount;
        invoice.totalCost = totalCost;
        invoice.totalProfit = totalProfit;
        invoice.remainingAmount = invoice.grandTotal - invoice.paidAmount;

        if (invoice.remainingAmount <= 0) {
            invoice.status = "paid";
        } else if (invoice.paidAmount > 0 && invoice.remainingAmount > 0) {
            invoice.status = "partially_paid";
        }
    }

    // =============================================
    // GET ALL INVOICES
    // =============================================
    static async getAllInvoices(filters = {}) {
        const query = {};

        if (filters.invoiceType && filters.invoiceType !== "all") {
            query.invoiceType = filters.invoiceType;
        }
        if (filters.status && filters.status !== "all") {
            query.status = filters.status;
        }
        if (filters.entityId && filters.entityId !== "all") {
            query.entityId = filters.entityId;
        }
        if (filters.branchId && filters.branchId !== "all") {
            query.branchId = filters.branchId;
        }
        if (filters.warehouseId && filters.warehouseId !== "all") {
            query.warehouseId = filters.warehouseId;
        }
        if (filters.fromDate || filters.toDate) {
            query.date = {};
            if (filters.fromDate) query.date.$gte = new Date(filters.fromDate);
            if (filters.toDate) query.date.$lte = new Date(filters.toDate);
        }
        if (filters.search) {
            query.$or = [
                { invoiceNo: { $regex: filters.search, $options: "i" } },
                { referenceNumber: { $regex: filters.search, $options: "i" } },
                { entityName: { $regex: filters.search, $options: "i" } }
            ];
        }

        const invoices = await Invoice.find(query)
            .populate("entityId", "name phone email")
            .populate("salesRepId", "name")
            .populate("branchId", "name")
            .populate("warehouseId", "name")
            .populate("costCenterId", "name")
            .populate("journalEntryId", "entryNo status")
            .sort({ date: -1, createdAt: -1 })
            .lean();

        return invoices;
    }

    // =============================================
    // GET SINGLE INVOICE
    // =============================================
    static async getInvoiceById(id) {
        const invoice = await Invoice.findById(id)
            .populate("entityId", "name phone email code")
            .populate("salesRepId", "name")
            .populate("branchId", "name")
            .populate("warehouseId", "name")
            .populate("costCenterId", "name")
            .populate("journalEntryId", "entryNo status date")
            .lean();

        if (!invoice) {
            throw new Error("الفاتورة غير موجودة");
        }

        return invoice;
    }

    // =============================================
    // UPDATE INVOICE (Only if not cancelled)
    // =============================================
    static async updateInvoice(id, data) {
        const invoice = await Invoice.findById(id);
        if (!invoice) throw new Error("الفاتورة غير موجودة");
        if (invoice.status === "cancelled") throw new Error("لا يمكن تعديل فاتورة ملغاة");

        // If invoice has a journal entry, reverse it first
        if (invoice.journalEntryId) {
            await this._reverseInvoiceJournalEntry(invoice);
        }

        // Update fields
        if (data.date) invoice.date = new Date(data.date);
        if (data.dueDate) invoice.dueDate = new Date(data.dueDate);
        if (data.referenceNumber !== undefined) invoice.referenceNumber = data.referenceNumber;
        if (data.notes !== undefined) invoice.notes = data.notes;
        if (data.items && Array.isArray(data.items)) {
            invoice.items = data.items.map((item, idx) => ({
                productId: item.productId,
                productName: item.productName,
                productCode: item.productCode || "",
                unit: item.unit,
                quantity: parseFloat(item.quantity) || 1,
                price: parseFloat(item.price) || 0,
                priceType: item.priceType || "retail",
                discountPercent: parseFloat(item.discountPercent) || 0,
                discountAmount: parseFloat(item.discountAmount) || 0,
                taxPercent: parseFloat(item.taxPercent) || 15,
                taxExempt: item.taxExempt || false,
                costPrice: parseFloat(item.costPrice) || 0,
                notes: item.notes || "",
                sortOrder: idx + 1
            }));
        }
        if (data.generalDiscountPercent !== undefined) invoice.generalDiscountPercent = parseFloat(data.generalDiscountPercent) || 0;
        if (data.paidAmount !== undefined) invoice.paidAmount = parseFloat(data.paidAmount) || 0;
        if (data.paymentMethod) invoice.paymentMethod = data.paymentMethod;
        if (data.priceIncludesTax !== undefined) invoice.priceIncludesTax = data.priceIncludesTax;

        this._calculateInvoiceTotals(invoice);
        await invoice.save({ middleware: false });

        // Recreate journal entry
        const entityAccount = await Account.findById(invoice.entityAccountId);
        const paymentAccount = await this._getPaymentAccount({
            paymentMethod: invoice.paymentMethod,
            payments: invoice.payments
        });

        const journalEntry = await this._createInvoiceJournalEntry(invoice, paymentAccount, entityAccount);
        invoice.journalEntryId = journalEntry._id;
        invoice.journalEntryNo = journalEntry.entryNo;
        await invoice.save({ middleware: false });

        return await this.getInvoiceById(invoice._id);
    }

    // =============================================
    // CANCEL INVOICE
    // =============================================
    static async cancelInvoice(id, reason = "") {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const invoice = await Invoice.findById(id).session(session);
            if (!invoice) throw new Error("الفاتورة غير موجودة");
            if (invoice.status === "cancelled") throw new Error("الفاتورة ملغاة بالفعل");

            // Reverse journal entry if exists
            if (invoice.journalEntryId) {
                await this._reverseInvoiceJournalEntry(invoice, session);
            }

            // Reverse stock
            await this._reverseStock(invoice, session);

            invoice.status = "cancelled";
            invoice.cancellationReason = reason;
            invoice.cancelledAt = new Date();
            await invoice.save({ session, middleware: false });

            await session.commitTransaction();

            return {
                success: true,
                message: `تم إلغاء الفاتورة ${invoice.invoiceNo} بنجاح`,
                data: invoice
            };

        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    // =============================================
    // DELETE INVOICE (Hard delete - only draft)
    // =============================================
    static async deleteInvoice(id) {
        const invoice = await Invoice.findById(id);
        if (!invoice) throw new Error("الفاتورة غير موجودة");
        if (invoice.status !== "draft") throw new Error("لا يمكن حذف فاتورة مؤكدة. استخدم الإلغاء بدلاً من ذلك");

        await Invoice.findByIdAndDelete(id);
        return { success: true, message: "تم حذف الفاتورة بنجاح" };
    }

    // =============================================
    // GET INVOICE STATS
    // =============================================
    static async getStats(filters = {}) {
        return await Invoice.getStats(filters);
    }

    // =============================================
    // GET NEXT INVOICE NUMBER
    // =============================================
    static async getNextInvoiceNo(invoiceType) {
        return await Invoice.getNextInvoiceNo(invoiceType);
    }

    // =============================================
    // PRIVATE: Create Journal Entry for Invoice
    // =============================================
    static async _createInvoiceJournalEntry(invoice, paymentAccount, entityAccount, session = null) {
        const entryNo = await JournalEntryService.getNextEntryNo();

        const description = this._buildJournalDescription(invoice);
        const lines = this._buildJournalLines(invoice, paymentAccount, entityAccount);

        // ✅ Validate that we have at least 2 lines
        if (lines.length < 2) {
            const missingAccounts = [];

            // Check which accounts are missing
            if (invoice.invoiceType === "sales") {
                if (!this._getAccountIdSync(this.ACCOUNTS.SALES_REVENUE)) {
                    missingAccounts.push(`المبيعات (${this.ACCOUNTS.SALES_REVENUE})`);
                }
                if (invoice.totalTax > 0 && !this._getAccountIdSync(this.ACCOUNTS.VAT_OUTPUT)) {
                    missingAccounts.push(`ضريبة المخرجات (${this.ACCOUNTS.VAT_OUTPUT})`);
                }
            }

            throw new Error(
                `القيد يحتوي على ${lines.length} سطر فقط. ` +
                `الحسابات التالية غير موجودة في شجرة الحسابات: ${missingAccounts.join(", ")}. ` +
                `يرجى إنشاء الحسابات المطلوبة أولاً.`
            );
        }

        // Validate that all accounts exist
        for (const line of lines) {
            if (!line.account) {
                throw new Error(`الحساب غير موجود في سطر القيد: ${line.description}`);
            }
        }

        const journalData = {
            entryNo,
            date: invoice.date,
            description,
            branch: invoice.branchId,
            branchName: invoice.branchName,
            costCenter: invoice.costCenterId,
            costCenterName: invoice.costCenterName,
            lines,
            reference: invoice.invoiceNo,
            source: "invoice",
            sourceId: invoice._id,
            type: "auto",
            notes: invoice.notes || ""
        };

        // Use JournalEntryService to create and post
        const journalEntry = await JournalEntryService.saveAndPost(journalData);

        return journalEntry;
    }

    // =============================================
    // PRIVATE: Build Journal Description
    // =============================================
    static _buildJournalDescription(invoice) {
        const typeNames = {
            sales: "فاتورة مبيعات",
            purchase: "فاتورة مشتريات",
            sales_return: "مردود مبيعات",
            purchase_return: "مردود مشتريات"
        };
        return `${typeNames[invoice.invoiceType] || "فاتورة"} رقم ${invoice.invoiceNo} - ${invoice.entityName}`;
    }

    // =============================================
    // PRIVATE: Build Journal Lines (The Core Logic)
    // =============================================
    static _buildJournalLines(invoice, paymentAccount, entityAccount) {
        const lines = [];

        // ── Sales Invoice ──
        if (invoice.invoiceType === "sales") {
            // 1. Debit: Cash/Bank/Customer (based on payment method)
            if (invoice.paymentMethod === "cash" || invoice.paymentMethod === "transfer") {
                lines.push({
                    account: paymentAccount._id,
                    accountCode: paymentAccount.code,
                    accountName: paymentAccount.name,
                    debit: invoice.grandTotal,
                    credit: 0,
                    description: `استلام نقدية - فاتورة ${invoice.invoiceNo}`
                });
            } else if (invoice.paymentMethod === "credit") {
                lines.push({
                    account: entityAccount._id,
                    accountCode: entityAccount.code,
                    accountName: entityAccount.name,
                    debit: invoice.grandTotal,
                    credit: 0,
                    description: `مبيعات آجلة - ${invoice.entityName}`
                });
            } else if (invoice.paymentMethod === "partial") {
                lines.push({
                    account: paymentAccount._id,
                    accountCode: paymentAccount.code,
                    accountName: paymentAccount.name,
                    debit: invoice.paidAmount,
                    credit: 0,
                    description: `استلام نقدية جزئية - فاتورة ${invoice.invoiceNo}`
                });
                lines.push({
                    account: entityAccount._id,
                    accountCode: entityAccount.code,
                    accountName: entityAccount.name,
                    debit: invoice.remainingAmount,
                    credit: 0,
                    description: `مبيعات آجلة - ${invoice.entityName}`
                });
            }

            // 2. Credit: Sales Revenue (REQUIRED - must exist)
            const salesRevenueAccountId = this._getAccountIdSync(this.ACCOUNTS.SALES_REVENUE);
            if (salesRevenueAccountId) {
                lines.push({
                    account: salesRevenueAccountId,
                    accountCode: this.ACCOUNTS.SALES_REVENUE,
                    accountName: "المبيعات",
                    debit: 0,
                    credit: invoice.subTotal - invoice.totalItemDiscount - invoice.generalDiscountAmount,
                    description: `إيرادات مبيعات - فاتورة ${invoice.invoiceNo}`
                });
            }

            // 3. Credit: VAT Output (if applicable)
            if (invoice.totalTax > 0) {
                const vatOutputAccountId = this._getAccountIdSync(this.ACCOUNTS.VAT_OUTPUT);
                if (vatOutputAccountId) {
                    lines.push({
                        account: vatOutputAccountId,
                        accountCode: this.ACCOUNTS.VAT_OUTPUT,
                        accountName: "ضريبة القيمة المضافة للمخرجات",
                        debit: 0,
                        credit: invoice.totalTax,
                        description: `ضريبة مبيعات - فاتورة ${invoice.invoiceNo}`
                    });
                }
            }

            // 4. Credit: Sales Discounts (if applicable)
            if (invoice.generalDiscountAmount > 0) {
                const salesDiscountAccountId = this._getAccountIdSync(this.ACCOUNTS.SALES_DISCOUNTS);
                if (salesDiscountAccountId) {
                    lines.push({
                        account: salesDiscountAccountId,
                        accountCode: this.ACCOUNTS.SALES_DISCOUNTS,
                        accountName: "خصومات المبيعات",
                        debit: 0,
                        credit: invoice.generalDiscountAmount,
                        description: `خصم عام على المبيعات - فاتورة ${invoice.invoiceNo}`
                    });
                }
            }

            // 5. Cost of Goods Sold (COGS)
            if (invoice.totalCost > 0) {
                const cogsAccountId = this._getAccountIdSync(this.ACCOUNTS.COST_OF_SALES);
                const inventoryAccountId = this._getAccountIdSync(this.ACCOUNTS.INVENTORY);
                if (cogsAccountId && inventoryAccountId) {
                    lines.push({
                        account: cogsAccountId,
                        accountCode: this.ACCOUNTS.COST_OF_SALES,
                        accountName: "تكلفة المخزون",
                        debit: invoice.totalCost,
                        credit: 0,
                        description: `تكلفة البضاعة المباعة - فاتورة ${invoice.invoiceNo}`
                    });
                    lines.push({
                        account: inventoryAccountId,
                        accountCode: this.ACCOUNTS.INVENTORY,
                        accountName: "تكلفة المخزون",
                        debit: 0,
                        credit: invoice.totalCost,
                        description: `إخراج مخزون - فاتورة ${invoice.invoiceNo}`
                    });
                }
            }
        }

        // ── Purchase Invoice ──
        else if (invoice.invoiceType === "purchase") {
            const purchasesAccountId = this._getAccountIdSync(this.ACCOUNTS.PURCHASES);
            if (purchasesAccountId) {
                lines.push({
                    account: purchasesAccountId,
                    accountCode: this.ACCOUNTS.PURCHASES,
                    accountName: "المشتريات",
                    debit: invoice.subTotal - invoice.totalItemDiscount - invoice.generalDiscountAmount,
                    credit: 0,
                    description: `مشتريات - فاتورة ${invoice.invoiceNo}`
                });
            }

            if (invoice.totalTax > 0) {
                const vatInputAccountId = this._getAccountIdSync(this.ACCOUNTS.VAT_INPUT);
                if (vatInputAccountId) {
                    lines.push({
                        account: vatInputAccountId,
                        accountCode: this.ACCOUNTS.VAT_INPUT,
                        accountName: "ضريبة القيمة المضافة للمدخلات",
                        debit: invoice.totalTax,
                        credit: 0,
                        description: `ضريبة مشتريات - فاتورة ${invoice.invoiceNo}`
                    });
                }
            }

            if (invoice.paymentMethod === "cash" || invoice.paymentMethod === "transfer") {
                lines.push({
                    account: paymentAccount._id,
                    accountCode: paymentAccount.code,
                    accountName: paymentAccount.name,
                    debit: 0,
                    credit: invoice.grandTotal,
                    description: `دفع نقدية - فاتورة ${invoice.invoiceNo}`
                });
            } else if (invoice.paymentMethod === "credit") {
                lines.push({
                    account: entityAccount._id,
                    accountCode: entityAccount.code,
                    accountName: entityAccount.name,
                    debit: 0,
                    credit: invoice.grandTotal,
                    description: `مشتريات آجلة - ${invoice.entityName}`
                });
            } else if (invoice.paymentMethod === "partial") {
                lines.push({
                    account: paymentAccount._id,
                    accountCode: paymentAccount.code,
                    accountName: paymentAccount.name,
                    debit: 0,
                    credit: invoice.paidAmount,
                    description: `دفع نقدية جزئية - فاتورة ${invoice.invoiceNo}`
                });
                lines.push({
                    account: entityAccount._id,
                    accountCode: entityAccount.code,
                    accountName: entityAccount.name,
                    debit: 0,
                    credit: invoice.remainingAmount,
                    description: `مشتريات آجلة - ${invoice.entityName}`
                });
            }
        }

        // ── Sales Return ──
        else if (invoice.invoiceType === "sales_return") {
            const salesReturnsAccountId = this._getAccountIdSync(this.ACCOUNTS.SALES_RETURNS);
            if (salesReturnsAccountId) {
                lines.push({
                    account: salesReturnsAccountId,
                    accountCode: this.ACCOUNTS.SALES_RETURNS,
                    accountName: "مردودات المبيعات",
                    debit: invoice.subTotal - invoice.totalItemDiscount,
                    credit: 0,
                    description: `مردود مبيعات - فاتورة ${invoice.invoiceNo}`
                });
            }

            if (invoice.totalTax > 0) {
                const vatOutputAccountId = this._getAccountIdSync(this.ACCOUNTS.VAT_OUTPUT);
                if (vatOutputAccountId) {
                    lines.push({
                        account: vatOutputAccountId,
                        accountCode: this.ACCOUNTS.VAT_OUTPUT,
                        accountName: "ضريبة القيمة المضافة للمخرجات",
                        debit: invoice.totalTax,
                        credit: 0,
                        description: `ضريبة مردود مبيعات - فاتورة ${invoice.invoiceNo}`
                    });
                }
            }

            if (invoice.paymentMethod === "cash" || invoice.paymentMethod === "transfer") {
                lines.push({
                    account: paymentAccount._id,
                    accountCode: paymentAccount.code,
                    accountName: paymentAccount.name,
                    debit: 0,
                    credit: invoice.grandTotal,
                    description: `دفع مردود مبيعات - فاتورة ${invoice.invoiceNo}`
                });
            } else {
                lines.push({
                    account: entityAccount._id,
                    accountCode: entityAccount.code,
                    accountName: entityAccount.name,
                    debit: 0,
                    credit: invoice.grandTotal,
                    description: `مردود مبيعات آجل - ${invoice.entityName}`
                });
            }
        }

        // ── Purchase Return ──
        else if (invoice.invoiceType === "purchase_return") {
            const purchaseReturnsAccountId = this._getAccountIdSync(this.ACCOUNTS.PURCHASE_RETURNS);
            if (purchaseReturnsAccountId) {
                lines.push({
                    account: purchaseReturnsAccountId,
                    accountCode: this.ACCOUNTS.PURCHASE_RETURNS,
                    accountName: "مردودات المشتريات",
                    debit: 0,
                    credit: invoice.subTotal - invoice.totalItemDiscount,
                    description: `مردود مشتريات - فاتورة ${invoice.invoiceNo}`
                });
            }

            if (invoice.totalTax > 0) {
                const vatInputAccountId = this._getAccountIdSync(this.ACCOUNTS.VAT_INPUT);
                if (vatInputAccountId) {
                    lines.push({
                        account: vatInputAccountId,
                        accountCode: this.ACCOUNTS.VAT_INPUT,
                        accountName: "ضريبة القيمة المضافة للمدخلات",
                        debit: 0,
                        credit: invoice.totalTax,
                        description: `ضريبة مردود مشتريات - فاتورة ${invoice.invoiceNo}`
                    });
                }
            }

            if (invoice.paymentMethod === "cash" || invoice.paymentMethod === "transfer") {
                lines.push({
                    account: paymentAccount._id,
                    accountCode: paymentAccount.code,
                    accountName: paymentAccount.name,
                    debit: invoice.grandTotal,
                    credit: 0,
                    description: `استلام مردود مشتريات - فاتورة ${invoice.invoiceNo}`
                });
            } else {
                lines.push({
                    account: entityAccount._id,
                    accountCode: entityAccount.code,
                    accountName: entityAccount.name,
                    debit: invoice.grandTotal,
                    credit: 0,
                    description: `مردود مشتريات آجل - ${invoice.entityName}`
                });
            }
        }

        return lines;
    }

    // =============================================
    // PRIVATE: Get Entity Account (Customer/Supplier)
    // =============================================
    static async _getEntityAccount(data) {
        let account = null;

        if (data.entityAccountId && mongoose.Types.ObjectId.isValid(data.entityAccountId)) {
            account = await Account.findById(data.entityAccountId).lean();
        }

        if (!account && data.entityId) {
            account = await Account.findOne({
                "linkedEntity.entityId": data.entityId,
                "linkedEntity.type": data.entityType
            }).lean();
        }

        if (!account && data.entityAccountId) {
            account = await Account.findOne({ code: data.entityAccountId }).lean();
        }

        if (!account) {
            const groupCode = data.entityType === "customer" ? this.ACCOUNTS.CUSTOMERS : this.ACCOUNTS.SUPPLIERS;
            account = await Account.findOne({ code: groupCode }).lean();
        }

        return account;
    }

    // =============================================
    // PRIVATE: Get Payment Account (Cash/Bank)
    // =============================================
    static async _getPaymentAccount(data) {
        let account = null;

        if (data.payments && data.payments.length > 0) {
            const firstPayment = data.payments[0];

            if (firstPayment.cashBoxId) {
                if (mongoose.Types.ObjectId.isValid(firstPayment.cashBoxId)) {
                    account = await Account.findById(firstPayment.cashBoxId).lean();
                }
                if (!account) {
                    account = await Account.findOne({ code: firstPayment.cashBoxId }).lean();
                }
            }

            else if (firstPayment.bankId) {
                if (mongoose.Types.ObjectId.isValid(firstPayment.bankId)) {
                    account = await Account.findById(firstPayment.bankId).lean();
                }
                if (!account) {
                    account = await Account.findOne({ code: firstPayment.bankId }).lean();
                }
            }
        }

        if (!account) {
            if (data.paymentMethod === "transfer" || data.paymentMethod === "card") {
                account = await Account.findOne({ code: new RegExp("^" + this.ACCOUNTS.BANK) }).lean();
            } else {
                account = await Account.findOne({ code: new RegExp("^" + this.ACCOUNTS.CASH) }).lean();
            }
        }

        if (!account) {
            account = await Account.findOne({ code: this.ACCOUNTS.CASH }).lean();
        }

        return account;
    }

    // =============================================
    // PRIVATE: Get Account ID by Code (SYNC - cached)
    // =============================================
    static _getAccountIdSync(code) {
        return this._accountCache.get(code) || null;
    }

    static async _getAccountId(code) {
        if (this._accountCache.has(code)) {
            return this._accountCache.get(code);
        }
        const account = await Account.findOne({ code }).lean();
        if (account) {
            this._accountCache.set(code, account._id.toString());
            return account._id;
        }
        return null;
    }

    // =============================================
    // PRIVATE: Reverse Journal Entry
    // =============================================
    static async _reverseInvoiceJournalEntry(invoice, session = null) {
        if (!invoice.journalEntryId) return;

        const journalEntry = await JournalEntry.findById(invoice.journalEntryId);
        if (!journalEntry) return;

        await JournalEntryService.unpostEntry(invoice.journalEntryId);
        await JournalLine.deleteMany({ journalEntry: invoice.journalEntryId }, { session });
        await JournalEntry.findByIdAndDelete(invoice.journalEntryId, { session });
    }

    // =============================================
    // PRIVATE: Update Stock
    // =============================================
    static async _updateStock(invoice, session = null) {
        console.log(`📦 Stock update for ${invoice.invoiceType} invoice ${invoice.invoiceNo}`);
    }

    // =============================================
    // PRIVATE: Reverse Stock
    // =============================================
    static async _reverseStock(invoice, session = null) {
        console.log(`📦 Stock reversal for ${invoice.invoiceType} invoice ${invoice.invoiceNo}`);
    }

    // =============================================
    // PRIVATE: Helpers
    // =============================================
    static _getInvoiceTypeName(type) {
        const names = {
            sales: "فاتورة مبيعات",
            purchase: "فاتورة مشتريات",
            sales_return: "مردود مبيعات",
            purchase_return: "مردود مشتريات"
        };
        return names[type] || "فاتورة";
    }
}

// Preload account cache on startup
InvoiceService.preloadAccountCache().then(() => {
    console.log("✅ InvoiceService ready with cached accounts");
}).catch(err => {
    console.warn("⚠️ Failed to preload account cache:", err.message);
});

module.exports = InvoiceService;