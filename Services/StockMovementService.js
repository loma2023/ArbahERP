// Services/StockMovementService.js
const StockMovement = require("../Models/StockMoveSchema");
const StockBalance = require("../Models/StockBalanceSchema");
const Warehouse = require("../Models/WarehouseSchema");
const Product = require("../Models/ProductSchema");
const Account = require("../Models/AccountSchema");
const AccountService = require("./AccountService");

class StockMovementService {
    /**
     * Get all stock movements with filtering
     */
    static async getAllMovements(filters = {}) {
        const query = {};

        if (filters.type) query.type = filters.type;
        if (filters.status) query.status = filters.status;
        if (filters.fromWarehouse) query.fromWarehouse = filters.fromWarehouse;
        if (filters.toWarehouse) query.toWarehouse = filters.toWarehouse;
        if (filters.startDate && filters.endDate) {
            query.date = {
                $gte: new Date(filters.startDate),
                $lte: new Date(filters.endDate)
            };
        }
        if (filters.reference) query.reference = { $regex: filters.reference, $options: "i" };

        const movements = await StockMovement.find(query)
            .populate("fromWarehouse", "code name")
            .populate("toWarehouse", "code name")
            .populate("items.product", "code name unit")
            .populate("journalEntry", "code date")
            .sort({ date: -1, createdAt: -1 })
            .lean();

        return movements;
    }

    /**
     * Get movement by ID
     */
    static async getMovementById(id) {
        const movement = await StockMovement.findById(id)
            .populate("fromWarehouse", "code name")
            .populate("toWarehouse", "code name")
            .populate("items.product", "code name unit category")
            .populate("journalEntry", "code date totalDebits totalCredits")
            .populate("entity", "code name");

        if (!movement) {
            throw new Error("الحركة المخزنية غير موجودة");
        }

        return movement;
    }

    /**
     * Create stock receipt (إضافة/استلام)
     */
    static async createReceipt(data, userId) {
        const {
            date, toWarehouse, items, reference, referenceType,
            referenceId, entityType, entity, notes
        } = data;

        if (!toWarehouse) throw new Error("المخزن الوجهة مطلوب");
        if (!items || items.length === 0) throw new Error("يجب إدخال أصناف");

        const warehouse = await Warehouse.findById(toWarehouse);
        if (!warehouse) throw new Error("المخزن غير موجود");

        const code = await this.generateMovementCode("RCPT");

        // ── التحقق من المنتجات وحساب التكاليف ──
        const processedItems = await this.processItems(items, toWarehouse, "receipt");

        const movement = await StockMovement.create({
            code,
            type: "receipt",
            toWarehouse,
            toWarehouseName: warehouse.name,
            date: date ? new Date(date) : new Date(),
            items: processedItems,
            reference: reference || "",
            referenceType: referenceType || "manual",
            referenceId: referenceId || null,
            entityType: entityType || "none",
            entity: entity || null,
            notes: notes || "",
            createdBy: userId,
            status: "draft"
        });

        return movement;
    }

    /**
     * Create stock issue (صرف)
     */
    static async createIssue(data, userId) {
        const {
            date, fromWarehouse, items, reference, referenceType,
            referenceId, entityType, entity, notes
        } = data;

        if (!fromWarehouse) throw new Error("المخزن المصدر مطلوب");
        if (!items || items.length === 0) throw new Error("يجب إدخال أصناف");

        const warehouse = await Warehouse.findById(fromWarehouse);
        if (!warehouse) throw new Error("المخزن غير موجود");

        // ── التحقق من توفر الرصيد ──
        await this.checkStockAvailability(fromWarehouse, items);

        const code = await this.generateMovementCode("ISSU");

        const processedItems = await this.processItems(items, fromWarehouse, "issue");

        const movement = await StockMovement.create({
            code,
            type: "issue",
            fromWarehouse,
            fromWarehouseName: warehouse.name,
            date: date ? new Date(date) : new Date(),
            items: processedItems,
            reference: reference || "",
            referenceType: referenceType || "manual",
            referenceId: referenceId || null,
            entityType: entityType || "none",
            entity: entity || null,
            notes: notes || "",
            createdBy: userId,
            status: "draft"
        });

        return movement;
    }

    /**
     * Create stock transfer (تحويل بين المخازن)
     */
    static async createTransfer(data, userId) {
        const {
            date, fromWarehouse, toWarehouse, items, reference, notes
        } = data;

        if (!fromWarehouse) throw new Error("المخزن المصدر مطلوب");
        if (!toWarehouse) throw new Error("المخزن الوجهة مطلوب");
        if (fromWarehouse.toString() === toWarehouse.toString()) {
            throw new Error("لا يمكن التحويل لنفس المخزن");
        }
        if (!items || items.length === 0) throw new Error("يجب إدخال أصناف");

        const sourceWh = await Warehouse.findById(fromWarehouse);
        const destWh = await Warehouse.findById(toWarehouse);
        if (!sourceWh || !destWh) throw new Error("أحد المخازن غير موجود");

        // ── التحقق من توفر الرصيد ──
        await this.checkStockAvailability(fromWarehouse, items);

        const code = await this.generateMovementCode("TRNS");

        const processedItems = await this.processItems(items, fromWarehouse, "transfer_out");

        const movement = await StockMovement.create({
            code,
            type: "transfer_out",
            fromWarehouse,
            fromWarehouseName: sourceWh.name,
            toWarehouse,
            toWarehouseName: destWh.name,
            date: date ? new Date(date) : new Date(),
            items: processedItems,
            reference: reference || "",
            referenceType: "transfer_order",
            notes: notes || "",
            createdBy: userId,
            status: "draft"
        });

        return movement;
    }

    /**
     * Create stock adjustment (تسوية جرد)
     */
    static async createAdjustment(data, userId) {
        const {
            date, warehouse, items, adjustmentReason, notes
        } = data;

        if (!warehouse) throw new Error("المخزن مطلوب");
        if (!items || items.length === 0) throw new Error("يجب إدخال أصناف");

        const wh = await Warehouse.findById(warehouse);
        if (!wh) throw new Error("المخزن غير موجود");

        const code = await this.generateMovementCode("ADJT");

        const processedItems = [];
        for (const item of items) {
            const product = await Product.findById(item.product);
            if (!product) throw new Error("المنتج غير موجود: " + item.product);

            // حساب الفرق (الكمية الجديدة - الكمية الحالية)
            const currentBalance = await StockBalance.findOne({
                warehouse,
                product: item.product
            });

            const currentQty = currentBalance ? currentBalance.quantityAvailable : 0;
            const difference = item.newQuantity - currentQty;

            processedItems.push({
                product: item.product,
                productCode: product.code,
                productName: product.name,
                unit: product.unit || "pcs",
                quantity: Math.abs(difference),
                unitCost: item.unitCost || product.costPrice || 0,
                totalCost: Math.abs(difference) * (item.unitCost || product.costPrice || 0),
                movementUnitCost: item.unitCost || product.costPrice || 0,
                movementTotalCost: Math.abs(difference) * (item.unitCost || product.costPrice || 0),
                notes: item.notes || ""
            });
        }

        const movement = await StockMovement.create({
            code,
            type: "adjustment",
            fromWarehouse: warehouse,
            fromWarehouseName: wh.name,
            toWarehouse: warehouse,
            toWarehouseName: wh.name,
            date: date ? new Date(date) : new Date(),
            items: processedItems,
            reference: "",
            referenceType: "manual",
            adjustmentReason: adjustmentReason || "",
            notes: notes || "",
            createdBy: userId,
            status: "draft"
        });

        return movement;
    }

    /**
     * Confirm movement (تأكيد الحركة)
     */
    static async confirmMovement(id, userId) {
        const movement = await StockMovement.findById(id);
        if (!movement) throw new Error("الحركة غير موجودة");
        if (movement.status !== "draft") throw new Error("الحركة مؤكدة مسبقاً");

        // ── تحديث الأرصدة ──
        await this.updateStockBalances(movement);

        // ── إنشاء القيد المحاسبي ──
        const journalEntry = await this.createJournalEntry(movement);

        movement.status = "confirmed";
        movement.confirmedBy = userId;
        movement.confirmedAt = new Date();
        movement.journalEntry = journalEntry ? journalEntry._id : null;

        await movement.save();

        return await StockMovement.findById(id)
            .populate("fromWarehouse", "code name")
            .populate("toWarehouse", "code name")
            .populate("items.product", "code name");
    }

    /**
     * Cancel movement (إلغاء الحركة)
     */
    static async cancelMovement(id) {
        const movement = await StockMovement.findById(id);
        if (!movement) throw new Error("الحركة غير موجودة");
        if (movement.status === "cancelled") throw new Error("الحركة ملغاة مسبقاً");

        // ── عكس الحركة على الأرصدة ──
        await this.reverseStockBalances(movement);

        // ── عكس القيد المحاسبي إن وجد ──
        if (movement.journalEntry) {
            await this.reverseJournalEntry(movement.journalEntry);
        }

        movement.status = "cancelled";
        await movement.save();

        return { message: "تم إلغاء الحركة بنجاح" };
    }

    /**
     * Get stock balance for warehouse
     */
    static async getStockBalance(warehouseId, filters = {}) {
        const query = { warehouse: warehouseId };

        if (filters.product) query.product = filters.product;
        if (filters.minQuantity !== undefined) query.quantityAvailable = { $gte: filters.minQuantity };
        if (filters.maxQuantity !== undefined) {
            query.quantityAvailable = query.quantityAvailable || {};
            query.quantityAvailable.$lte = filters.maxQuantity;
        }

        const balances = await StockBalance.find(query)
            .populate("product", "code name category unit costPrice salePrice")
            .populate("warehouse", "code name")
            .sort({ quantityAvailable: -1 })
            .lean();

        return balances;
    }

    /**
     * Get product balance across all warehouses
     */
    static async getProductBalance(productId) {
        const balances = await StockBalance.find({ product: productId })
            .populate("warehouse", "code name")
            .lean();

        const totalQty = balances.reduce((sum, b) => sum + b.quantityAvailable, 0);
        const totalCost = balances.reduce((sum, b) => sum + (b.quantityAvailable * b.averageUnitCost), 0);

        return {
            productId,
            balances,
            totalQuantity: totalQty,
            totalCost,
            averageUnitCost: totalQty > 0 ? totalCost / totalQty : 0
        };
    }

    // ═══════════════════════════════════════════════════════
    //    دوال مساعدة (Private)
    // ═══════════════════════════════════════════════════════

    /**
     * Check stock availability
     */
    static async checkStockAvailability(warehouseId, items) {
        for (const item of items) {
            const balance = await StockBalance.findOne({
                warehouse: warehouseId,
                product: item.product
            });

            const available = balance ? balance.quantityAvailable : 0;
            if (available < item.quantity) {
                const product = await Product.findById(item.product);
                throw new Error(
                    `رصيد غير كافٍ للمنتج "${product ? product.name : item.product}". ` +
                    `المطلوب: ${item.quantity} | المتاح: ${available}`
                );
            }
        }
    }

    /**
     * Process items with costing
     */
    static async processItems(items, warehouseId, movementType) {
        const processed = [];
        for (const item of items) {
            const product = await Product.findById(item.product);
            if (!product) throw new Error("المنتج غير موجود: " + item.product);

            // حساب تكلفة الوحدة (Average Costing)
            let unitCost = item.unitCost || product.costPrice || 0;
            const balance = await StockBalance.findOne({
                warehouse: warehouseId,
                product: item.product
            });

            if (balance && balance.averageUnitCost > 0) {
                unitCost = balance.averageUnitCost;
            }

            const totalCost = item.quantity * unitCost;

            processed.push({
                product: item.product,
                productCode: product.code,
                productName: product.name,
                unit: product.unit || item.unit || "pcs",
                quantity: item.quantity,
                unitCost: product.costPrice || 0,
                totalCost: item.quantity * (product.costPrice || 0),
                movementUnitCost: unitCost,
                movementTotalCost: totalCost,
                batchNumber: item.batchNumber || "",
                expiryDate: item.expiryDate || null,
                notes: item.notes || ""
            });
        }
        return processed;
    }

    /**
     * Update stock balances
     */
    static async updateStockBalances(movement) {
        for (const item of movement.items) {
            // المخزن المصدر (صرف أو تحويل صادر)
            if (movement.fromWarehouse && ["issue", "transfer_out", "return_out"].includes(movement.type)) {
                await this.updateBalance(movement.fromWarehouse, item, "out");
            }

            // المخزن الوجهة (إضافة أو تحويل وارد)
            if (movement.toWarehouse && ["receipt", "transfer_in", "return_in", "opening_balance"].includes(movement.type)) {
                await this.updateBalance(movement.toWarehouse, item, "in");
            }

            // تسوية جرد
            if (movement.type === "adjustment") {
                // يتم التعامل معها بشكل مختلف
                await this.updateAdjustmentBalance(movement.fromWarehouse, item);
            }
        }
    }

    /**
     * Update single balance
     */
    static async updateBalance(warehouseId, item, direction) {
        let balance = await StockBalance.findOne({
            warehouse: warehouseId,
            product: item.product
        });

        const warehouse = await Warehouse.findById(warehouseId);

        if (!balance) {
            balance = await StockBalance.create({
                warehouse: warehouseId,
                warehouseCode: warehouse.code,
                warehouseName: warehouse.name,
                product: item.product,
                productCode: item.productCode,
                productName: item.productName,
                unit: item.unit,
                quantityIn: 0,
                quantityOut: 0,
                quantityAvailable: 0,
                totalCostIn: 0,
                totalCostOut: 0,
                averageUnitCost: 0
            });
        }

        if (direction === "in") {
            balance.quantityIn += item.quantity;
            balance.totalCostIn += item.movementTotalCost;
            balance.quantityAvailable += item.quantity;

            // إعادة حساب متوسط التكلفة
            const totalQty = balance.quantityAvailable;
            const totalCost = (balance.quantityAvailable - item.quantity) * balance.averageUnitCost + item.movementTotalCost;
            balance.averageUnitCost = totalQty > 0 ? totalCost / totalQty : item.movementUnitCost;

        } else {
            balance.quantityOut += item.quantity;
            balance.totalCostOut += item.movementTotalCost;
            balance.quantityAvailable -= item.quantity;
        }

        balance.lastMovementDate = new Date();
        balance.lastMovementType = direction === "in" ? "receipt" : "issue";

        await balance.save();
    }

    /**
     * Update balance for adjustment
     */
    static async updateAdjustmentBalance(warehouseId, item) {
        // التسوية تتم بشكل منفصل حسب المنطق
        const balance = await StockBalance.findOne({
            warehouse: warehouseId,
            product: item.product
        });

        if (balance) {
            // تحديث حسب الفرق الفعلي
            // (يتم التعامل معها في confirmMovement)
        }
    }

    /**
     * Reverse stock balances
     */
    static async reverseStockBalances(movement) {
        for (const item of movement.items) {
            if (movement.fromWarehouse && ["issue", "transfer_out", "return_out"].includes(movement.type)) {
                await this.updateBalance(movement.fromWarehouse, item, "in");
            }
            if (movement.toWarehouse && ["receipt", "transfer_in", "return_in"].includes(movement.type)) {
                await this.updateBalance(movement.toWarehouse, item, "out");
            }
        }
    }

    /**
     * Create journal entry for movement
     */
    static async createJournalEntry(movement) {
        try {
            const JournalEntry = require("../Models/JournalEntrySchema");
            const JournalLine = require("../Models/JournalLineSchema");

            const lines = [];
            let description = "";
            let totalAmount = movement.totalCost || 0;

            switch (movement.type) {
                case "receipt":
                    description = `استلام مخزني - ${movement.reference || movement.code}`;
                    // مدين: المخزون | دائن: الموردين / نقدية
                    lines.push({
                        account: await this.getWarehouseAccount(movement.toWarehouse),
                        debit: totalAmount,
                        credit: 0,
                        description
                    });
                    // الدائن يعتمد على المرجع
                    if (movement.referenceType === "purchase_invoice") {
                        lines.push({
                            account: await this.getSupplierAccount(movement.entity),
                            debit: 0,
                            credit: totalAmount,
                            description
                        });
                    } else {
                        // نقدية أو رأس مال
                        lines.push({
                            account: await this.getDefaultCreditAccount(),
                            debit: 0,
                            credit: totalAmount,
                            description
                        });
                    }
                    break;

                case "issue":
                    description = `صرف مخزني - ${movement.reference || movement.code}`;
                    // مدين: تكلفة البضاعة المباعة | دائن: المخزون
                    lines.push({
                        account: await this.getCostOfSalesAccount(),
                        debit: totalAmount,
                        credit: 0,
                        description
                    });
                    lines.push({
                        account: await this.getWarehouseAccount(movement.fromWarehouse),
                        debit: 0,
                        credit: totalAmount,
                        description
                    });
                    break;

                case "transfer_out":
                    description = `تحويل مخزني - ${movement.code}`;
                    // مدين: مخزون الوجهة | دائن: مخزون المصدر
                    lines.push({
                        account: await this.getWarehouseAccount(movement.toWarehouse),
                        debit: totalAmount,
                        credit: 0,
                        description: `${description} (وارد)`
                    });
                    lines.push({
                        account: await this.getWarehouseAccount(movement.fromWarehouse),
                        debit: 0,
                        credit: totalAmount,
                        description: `${description} (صادر)`
                    });
                    break;

                case "adjustment":
                    description = `تسوية جرد - ${movement.code}`;
                    // يتم تحديد الجانب المدين/الدائن حسب نوع التسوية
                    break;
            }

            if (lines.length === 0) return null;

            const journalEntry = await JournalEntry.create({
                date: movement.date,
                reference: movement.code,
                description,
                type: "stock_movement",
                source: "stock",
                sourceId: movement._id,
                totalDebits: totalAmount,
                totalCredits: totalAmount,
                isPosted: true
            });

            for (const line of lines) {
                await JournalLine.create({
                    journalEntry: journalEntry._id,
                    account: line.account,
                    description: line.description,
                    debit: line.debit,
                    credit: line.credit,
                    date: movement.date
                });

                // تحديث رصيد الحساب
                await AccountService.updateBalance(line.account, line.debit, line.credit);
            }

            return journalEntry;

        } catch (error) {
            console.error("Error creating journal entry:", error);
            return null;
        }
    }

    /**
     * Reverse journal entry
     */
    static async reverseJournalEntry(journalEntryId) {
        try {
            const JournalEntry = require("../Models/JournalEntrySchema");
            const JournalLine = require("../Models/JournalLineSchema");

            const original = await JournalEntry.findById(journalEntryId);
            if (!original) return;

            const lines = await JournalLine.find({ journalEntry: journalEntryId });

            const reversal = await JournalEntry.create({
                date: new Date(),
                reference: "REV-" + original.reference,
                description: "عكس " + original.description,
                type: "reversal",
                source: "stock",
                sourceId: original.sourceId,
                totalDebits: original.totalCredits,
                totalCredits: original.totalDebits,
                isPosted: true
            });

            for (const line of lines) {
                await JournalLine.create({
                    journalEntry: reversal._id,
                    account: line.account,
                    description: "عكس: " + line.description,
                    debit: line.credit,
                    credit: line.debit,
                    date: new Date()
                });

                await AccountService.updateBalance(line.account, line.credit, line.debit);
            }

        } catch (error) {
            console.error("Error reversing journal entry:", error);
        }
    }

    /**
     * Generate movement code
     */
    static async generateMovementCode(prefix) {
        const date = new Date();
        const dateStr = date.getFullYear().toString() +
            String(date.getMonth() + 1).padStart(2, "0") +
            String(date.getDate()).padStart(2, "0");

        const count = await StockMovement.countDocuments({
            code: { $regex: "^" + prefix + "-" + dateStr }
        });

        return `${prefix}-${dateStr}-${String(count + 1).padStart(4, "0")}`;
    }

    // ═══════════════════════════════════════════════════════
    //    حسابات مساعدة
    // ═══════════════════════════════════════════════════════

    static async getWarehouseAccount(warehouseId) {
        const warehouse = await Warehouse.findById(warehouseId).populate("linkedAccount");
        if (warehouse && warehouse.linkedAccount) {
            return warehouse.linkedAccount._id;
        }
        // fallback: حساب المخزون العام
        const account = await Account.findOne({ code: "1205" });
        return account ? account._id : null;
    }

    static async getCostOfSalesAccount() {
        const account = await Account.findOne({ code: "4101" });
        return account ? account._id : null;
    }

    static async getSupplierAccount(supplierId) {
        if (!supplierId) {
            const account = await Account.findOne({ code: "2301" });
            return account ? account._id : null;
        }
        const Supplier = require("../Models/SupplierSchema");
        const supplier = await Supplier.findById(supplierId).populate("linkedAccount");
        return supplier && supplier.linkedAccount ? supplier.linkedAccount._id : null;
    }

    static async getDefaultCreditAccount() {
        const account = await Account.findOne({ code: "210100" });
        return account ? account._id : null;
    }

    /**
     * Get movement statistics
     */
    static async getStats(filters = {}) {
        const match = {};
        if (filters.startDate && filters.endDate) {
            match.date = {
                $gte: new Date(filters.startDate),
                $lte: new Date(filters.endDate)
            };
        }

        const stats = await StockMovement.aggregate([
            { $match: match },
            {
                $group: {
                    _id: "$type",
                    count: { $sum: 1 },
                    totalQuantity: { $sum: "$totalQuantity" },
                    totalCost: { $sum: "$totalCost" }
                }
            }
        ]);

        const totalMovements = await StockMovement.countDocuments(match);
        const pendingConfirm = await StockMovement.countDocuments({ ...match, status: "draft" });

        return {
            totalMovements,
            pendingConfirm,
            byType: stats
        };
    }
}

module.exports = StockMovementService;