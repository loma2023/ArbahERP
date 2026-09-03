const Warehouse = require("../Models/WarehouseSchema");
const Account = require("../Models/AccountSchema");

class WarehouseService {
    /**
     * Get all warehouses with optional filtering
     */
    static async getAllWarehouses(filters = {}) {
        const query = { isHidden: false };

        if (filters.status) query.status = filters.status;
        if (filters.search) {
            query.$or = [
                { name: { $regex: filters.search, $options: "i" } },
                { code: { $regex: filters.search, $options: "i" } }
            ];
        }

        const warehouses = await Warehouse.find(query)
            .populate("branch", "name code")  // ← populate للفرع
            .sort({ createdAt: -1 })
            .lean();

        return warehouses;
    }

    /**
     * Get warehouse by ID
     */
    static async getWarehouseById(id) {
        const warehouse = await Warehouse.findById(id)
            .populate("branch", "name code");  // ← populate للفرع

        if (!warehouse) {
            throw new Error("المخزن غير موجود");
        }

        return warehouse;
    }

    /**
     * Get warehouse by code
     */
    static async getWarehouseByCode(code) {
        const warehouse = await Warehouse.findOne({ code: code.trim(), isHidden: false })
            .populate("branch", "name code");

        if (!warehouse) {
            throw new Error("المخزن غير موجود");
        }

        return warehouse;
    }

    /**
     * Create new warehouse
     */
    static async createWarehouse(data) {
        const { code, name, branch, manager, phone, address, notes } = data;

        // ── التحقق من البيانات ──
        if (!name || !name.trim()) {
            throw new Error("اسم المخزن مطلوب");
        }

        if (!code || !code.trim()) {
            throw new Error("كود المخزن مطلوب");
        }

        // ── التحقق من عدم تكرار الكود ──
        const existingCode = await Warehouse.findOne({ code: code.trim() });
        if (existingCode) {
            throw new Error("كود المخزن " + code + " مستخدم بالفعل");
        }

        // ── التحقق من عدم تكرار الاسم ──
        const existingName = await Warehouse.findOne({
            name: { $regex: new RegExp("^" + name.trim() + "$", "i") }
        });
        if (existingName) {
            throw new Error('اسم المخزن "' + name + '" مستخدم بالفعل');
        }

        // ── إنشاء المخزن ──
        const warehouse = await Warehouse.create({
            code: code.trim(),
            name: name.trim(),
            branch: branch || null,  // ← تخزين ID الفرع
            manager: manager ? manager.trim() : "",
            phone: phone ? phone.trim() : "",
            address: address ? address.trim() : "",
            notes: notes ? notes.trim() : "",
            status: "active",
            isActive: true,
            isHidden: false
        });

        return await Warehouse.findById(warehouse._id)
            .populate("branch", "name code");
    }

    /**
     * Update warehouse
     */
    static async updateWarehouse(id, data) {
        const warehouse = await Warehouse.findById(id);
        if (!warehouse) {
            throw new Error("المخزن غير موجود");
        }

        // ── التحقق من عدم تكرار الكود إذا تغير ──
        if (data.code && data.code !== warehouse.code) {
            const existing = await Warehouse.findOne({ code: data.code.trim() });
            if (existing) {
                throw new Error("كود المخزن " + data.code + " مستخدم بالفعل");
            }
            warehouse.code = data.code.trim();
        }

        // ── التحقق من عدم تكرار الاسم إذا تغير ──
        if (data.name && data.name !== warehouse.name) {
            const existing = await Warehouse.findOne({
                name: { $regex: new RegExp("^" + data.name.trim() + "$", "i") }
            });
            if (existing) {
                throw new Error('اسم المخزن "' + data.name + '" مستخدم بالفعل');
            }
            warehouse.name = data.name.trim();
        }

        // ── تحديث الحقول ──
        if (data.branch !== undefined) warehouse.branch = data.branch || null;
        if (data.manager !== undefined) warehouse.manager = data.manager.trim();
        if (data.phone !== undefined) warehouse.phone = data.phone.trim();
        if (data.address !== undefined) warehouse.address = data.address.trim();
        if (data.status !== undefined) warehouse.status = data.status;
        if (data.notes !== undefined) warehouse.notes = data.notes.trim();
        if (data.isActive !== undefined) warehouse.isActive = data.isActive;

        await warehouse.save();

        return await Warehouse.findById(warehouse._id)
            .populate("branch", "name code");
    }

    /**
     * Soft delete warehouse (hide)
     */
    static async hideWarehouse(id) {
        const warehouse = await Warehouse.findById(id);
        if (!warehouse) {
            throw new Error("المخزن غير موجود");
        }

        warehouse.isHidden = true;
        warehouse.isActive = false;
        warehouse.status = "closed";
        await warehouse.save();

        return { message: "تم إخفاء المخزن بنجاح", hidden: true };
    }

    /**
     * Restore hidden warehouse
     */
    static async restoreWarehouse(id) {
        const warehouse = await Warehouse.findById(id);
        if (!warehouse) {
            throw new Error("المخزن غير موجود");
        }

        warehouse.isHidden = false;
        warehouse.isActive = true;
        warehouse.status = "active";
        await warehouse.save();

        return { message: "تم إظهار المخزن بنجاح", restored: true };
    }

    /**
     * Hard delete warehouse
     */
    static async deleteWarehouse(id) {
        const warehouse = await Warehouse.findById(id);
        if (!warehouse) {
            throw new Error("المخزن غير موجود");
        }

        await Warehouse.findByIdAndDelete(id);

        return { message: "تم حذف المخزن نهائياً" };
    }

    /**
     * Search warehouses
     */
    static async searchWarehouses(keyword) {
        const regex = new RegExp(keyword, "i");
        return await Warehouse.find({
            isHidden: false,
            $or: [
                { name: regex },
                { code: regex }
            ]
        })
            .populate("branch", "name code")
            .sort({ name: 1 })
            .limit(50);
    }

    /**
     * Get next available warehouse code
     */
    static async getNextCode() {
        const warehouses = await Warehouse.find({})
            .sort({ createdAt: -1 })
            .limit(1);

        if (warehouses.length === 0) {
            return "WH-001";
        }

        const lastCode = warehouses[0].code;
        const match = lastCode.match(/(\d+)/);
        if (match) {
            const lastNumber = parseInt(match[0]);
            return "WH-" + String(lastNumber + 1).padStart(3, "0");
        }

        return "WH-" + String(warehouses.length + 1).padStart(3, "0");
    }

    /**
     * Get warehouse statistics
     */
    static async getStats() {
        const total = await Warehouse.countDocuments({ isHidden: false });
        const active = await Warehouse.countDocuments({ isHidden: false, status: "active" });
        const frozen = await Warehouse.countDocuments({ isHidden: false, status: "frozen" });
        const closed = await Warehouse.countDocuments({ isHidden: false, status: "closed" });

        return {
            total,
            active,
            frozen,
            closed
        };
    }
}

module.exports = WarehouseService;