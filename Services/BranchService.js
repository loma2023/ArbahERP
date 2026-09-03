const Branch = require("../Models/BranchSchema");

// =============================================
// HELPERS
// =============================================

/**
 * Validate required fields for branch creation
 */
const validateBranchData = (data) => {
    const { name } = data;

    if (!name || !name.trim()) {
        throw new Error("اسم الفرع مطلوب");
    }
};

/**
 * Check for duplicate code
 */
const checkDuplicateCode = async (code, excludeId = null) => {
    const query = { code: code.trim() };
    if (excludeId) {
        query._id = { $ne: excludeId };
    }
    const existing = await Branch.findOne(query);
    if (existing) {
        throw new Error(`كود الفرع ${code} مستخدم بالفعل`);
    }
};

/**
 * Check for duplicate name
 */
const checkDuplicateName = async (name, excludeId = null) => {
    const query = {
        name: { $regex: new RegExp("^" + name.trim() + "$", "i") }
    };
    if (excludeId) {
        query._id = { $ne: excludeId };
    }
    const existing = await Branch.findOne(query);
    if (existing) {
        throw new Error(`اسم الفرع "${name}" مستخدم بالفعل`);
    }
};

// =============================================
// CREATE
// =============================================
exports.createBranch = async (data) => {
    const {
        code, name, city, address, phone,
        manager, warehouse, status, notes
    } = data;

    // ── التحقق من البيانات ──
    validateBranchData(data);

    // ── التحقق من عدم التكرار ──
    await checkDuplicateCode(code);
    await checkDuplicateName(name);

    // ── إنشاء الفرع ──
    const branch = await Branch.create({
        code: code.trim(),
        name: name.trim(),
        city: city ? city.trim() : "",
        address: address ? address.trim() : "",
        phone: phone ? phone.trim() : "",
        manager: manager ? manager.trim() : "",
        warehouse: warehouse ? warehouse.trim() : "",
        status: status || "active",
        notes: notes ? notes.trim() : ""
    });

    return branch;
};

// =============================================
// LIST
// =============================================
exports.getAllBranches = async (filters = {}) => {
    const query = { isHidden: { $ne: true } };

    if (filters.status) query.status = filters.status;
    if (filters.search) {
        query.$or = [
            { name: { $regex: filters.search, $options: "i" } },
            { code: { $regex: filters.search, $options: "i" } },
            { city: { $regex: filters.search, $options: "i" } },
            { address: { $regex: filters.search, $options: "i" } }
        ];
    }

    return await Branch.find(query)
        .sort({ createdAt: -1 })
        .lean();
};

// =============================================
// GET ONE
// =============================================
exports.getBranchById = async (id) => {
    const branch = await Branch.findById(id);

    if (!branch) {
        throw new Error("الفرع غير موجود");
    }

    return branch;
};

// =============================================
// GET BY CODE
// =============================================
exports.getBranchByCode = async (code) => {
    const branch = await Branch.findOne({ code: code.trim(), isHidden: { $ne: true } });

    if (!branch) {
        throw new Error("الفرع غير موجود");
    }

    return branch;
};

// =============================================
// UPDATE
// =============================================
exports.updateBranch = async (id, data) => {
    const branch = await Branch.findById(id);
    if (!branch) {
        throw new Error("الفرع غير موجود");
    }

    // ── التحقق من عدم التكرار إذا تغير الكود ──
    if (data.code && data.code !== branch.code) {
        await checkDuplicateCode(data.code, id);
        branch.code = data.code.trim();
    }

    // ── التحقق من عدم تكرار الاسم إذا تغير ──
    if (data.name && data.name !== branch.name) {
        await checkDuplicateName(data.name, id);
        branch.name = data.name.trim();
    }

    // ── تحديث الحقول ──
    if (data.city !== undefined) branch.city = data.city.trim();
    if (data.address !== undefined) branch.address = data.address.trim();
    if (data.phone !== undefined) branch.phone = data.phone.trim();
    if (data.manager !== undefined) branch.manager = data.manager.trim();
    if (data.warehouse !== undefined) branch.warehouse = data.warehouse.trim();
    if (data.status !== undefined) branch.status = data.status;
    if (data.notes !== undefined) branch.notes = data.notes.trim();
    if (data.isActive !== undefined) branch.isActive = data.isActive;

    await branch.save();

    return branch;
};

// =============================================
// HIDE (Soft Delete) - الوحيد المتاح للفروع
// =============================================
exports.hideBranch = async (id) => {
    const branch = await Branch.findById(id);
    if (!branch) {
        throw new Error("الفرع غير موجود");
    }

    branch.isHidden = true;
    branch.isActive = false;
    branch.status = "closed";
    await branch.save();

    return { message: "تم إخفاء الفرع بنجاح" };
};

// =============================================
// RESTORE
// =============================================
exports.restoreBranch = async (id) => {
    const branch = await Branch.findById(id);
    if (!branch) {
        throw new Error("الفرع غير موجود");
    }

    branch.isHidden = false;
    branch.isActive = true;
    branch.status = "active";
    await branch.save();

    return { message: "تم إظهار الفرع بنجاح" };
};

// =============================================
// SEARCH
// =============================================
exports.searchBranches = async (keyword) => {
    if (!keyword || keyword.trim().length === 0) {
        return [];
    }

    const regex = new RegExp(keyword, "i");

    return await Branch.find({
        isHidden: { $ne: true },
        $or: [
            { name: regex },
            { code: regex },
            { city: regex },
            { address: regex },
            { manager: regex }
        ]
    })
    .sort({ name: 1 })
    .limit(50);
};

// =============================================
// GET NEXT CODE
// =============================================
exports.getNextCode = async () => {
    const lastBranch = await Branch.findOne()
        .sort({ code: -1 })
        .select("code");

    if (!lastBranch || !lastBranch.code) {
        return "BR-00001";
    }

    const match = lastBranch.code.match(/(\d+)$/);
    if (!match) {
        return "BR-00001";
    }

    const nextNumber = parseInt(match[1], 10) + 1;
    return `BR-${String(nextNumber).padStart(5, '0')}`;
};

// =============================================
// GET STATS
// =============================================
exports.getStats = async () => {
    const total = await Branch.countDocuments({ isHidden: { $ne: true } });
    const active = await Branch.countDocuments({ isHidden: { $ne: true }, status: "active" });
    const inactive = await Branch.countDocuments({ isHidden: { $ne: true }, status: "inactive" });
    const closed = await Branch.countDocuments({ isHidden: { $ne: true }, status: "closed" });

    return {
        total,
        active,
        inactive,
        closed
    };
};