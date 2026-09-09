const CostCenter = require("../Models/CostCenterSchema");

// =============================================
// HELPERS
// =============================================

/**
 * Validate required fields for cost center creation
 */
const validateCostCenterData = (data) => {
    const { name, type } = data;

    if (!name || !name.trim()) {
        throw new Error("اسم مركز التكلفة مطلوب");
    }
    if (!type || !["main", "sub"].includes(type)) {
        throw new Error("نوع مركز التكلفة مطلوب (رئيسي أو فرعي)");
    }
    // لو فرعي، لازم يكون فيه مركز أب
    if (type === "sub" && !data.parentCenter) {
        throw new Error("المركز الفرعي يجب أن يكون مرتبط بمركز رئيسي");
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
    const existing = await CostCenter.findOne(query);
    if (existing) {
        throw new Error(`كود مركز التكلفة ${code} مستخدم بالفعل`);
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
    const existing = await CostCenter.findOne(query);
    if (existing) {
        throw new Error(`اسم مركز التكلفة "${name}" مستخدم بالفعل`);
    }
};

// =============================================
// CREATE
// =============================================
exports.createCostCenter = async (data) => {
    const {
        code, name, type, parentCenter, parentCenterCode,
        branch, budget, status, notes
    } = data;

    // ── التحقق من البيانات ──
    validateCostCenterData(data);

    // ── التحقق من عدم التكرار ──
    await checkDuplicateCode(code);
    await checkDuplicateName(name);

    // ── التحقق من وجود المركز الأب لو فرعي ──
    if (type === "sub" && parentCenter) {
        const parent = await CostCenter.findById(parentCenter);
        if (!parent) {
            throw new Error("المركز الأب غير موجود");
        }
        if (parent.type !== "main") {
            throw new Error("المركز الأب يجب أن يكون من النوع رئيسي");
        }
    }

    // ── إنشاء مركز التكلفة ──
    const costCenter = await CostCenter.create({
        code: code.trim(),
        name: name.trim(),
        type: type,
        parentCenter: type === "sub" ? parentCenter : null,
        parentCenterCode: type === "sub" ? parentCenterCode : null,
        branch: branch ? branch.trim() : "",
        budget: parseFloat(budget) || 0,
        currentCost: 0,
        status: status || "active",
        notes: notes ? notes.trim() : ""
    });

    return await CostCenter.findById(costCenter._id)
        .populate("parentCenter", "code name");
};

// =============================================
// LIST
// =============================================
exports.getAllCostCenters = async (filters = {}) => {
    const query = { isHidden: { $ne: true } };

    if (filters.status) query.status = filters.status;
    if (filters.type) query.type = filters.type;
    if (filters.branch) query.branch = filters.branch;
    if (filters.search) {
        query.$or = [
            { name: { $regex: filters.search, $options: "i" } },
            { code: { $regex: filters.search, $options: "i" } },
            { branch: { $regex: filters.search, $options: "i" } }
        ];
    }

    return await CostCenter.find(query)
        .populate("parentCenter", "code name")
        .sort({ type: -1, createdAt: -1 })
        .lean();
};

// =============================================
// GET ONE
// =============================================
exports.getCostCenterById = async (id) => {
    const costCenter = await CostCenter.findById(id)
        .populate("parentCenter", "code name type");

    if (!costCenter) {
        throw new Error("مركز التكلفة غير موجود");
    }

    return costCenter;
};

// =============================================
// GET BY CODE
// =============================================
exports.getCostCenterByCode = async (code) => {
    const costCenter = await CostCenter.findOne({ code: code.trim(), isHidden: { $ne: true } })
        .populate("parentCenter", "code name");

    if (!costCenter) {
        throw new Error("مركز التكلفة غير موجود");
    }

    return costCenter;
};

// =============================================
// GET MAIN CENTERS (for dropdown)
// =============================================
exports.getMainCenters = async () => {
    return await CostCenter.find({
        type: "main",
        isHidden: { $ne: true },
        status: "active"
    })
    .select("_id code name")
    .sort({ name: 1 })
    .lean();
};

// =============================================
// UPDATE
// =============================================
exports.updateCostCenter = async (id, data) => {
    const costCenter = await CostCenter.findById(id);
    if (!costCenter) {
        throw new Error("مركز التكلفة غير موجود");
    }

    // ── التحقق من عدم التكرار إذا تغير الكود ──
    if (data.code && data.code !== costCenter.code) {
        await checkDuplicateCode(data.code, id);
        costCenter.code = data.code.trim();
    }

    // ── التحقق من عدم تكرار الاسم إذا تغير ──
    if (data.name && data.name !== costCenter.name) {
        await checkDuplicateName(data.name, id);
        costCenter.name = data.name.trim();
    }

    // ── تحديث النوع والمركز الأب ──
    if (data.type) {
        costCenter.type = data.type;
        if (data.type === "sub" && data.parentCenter) {
            const parent = await CostCenter.findById(data.parentCenter);
            if (!parent) {
                throw new Error("المركز الأب غير موجود");
            }
            if (parent.type !== "main") {
                throw new Error("المركز الأب يجب أن يكون من النوع رئيسي");
            }
            costCenter.parentCenter = data.parentCenter;
            costCenter.parentCenterCode = parent.code;
        } else {
            costCenter.parentCenter = null;
            costCenter.parentCenterCode = null;
        }
    }

    // ── تحديث الحقول ──
    if (data.branch !== undefined) costCenter.branch = data.branch.trim();
    if (data.budget !== undefined) costCenter.budget = parseFloat(data.budget) || 0;
    if (data.currentCost !== undefined) costCenter.currentCost = parseFloat(data.currentCost) || 0;
    if (data.status !== undefined) costCenter.status = data.status;
    if (data.notes !== undefined) costCenter.notes = data.notes.trim();
    if (data.isActive !== undefined) costCenter.isActive = data.isActive;

    await costCenter.save();

    return await CostCenter.findById(costCenter._id)
        .populate("parentCenter", "code name");
};

// =============================================
// HIDE (Soft Delete)
// =============================================
exports.hideCostCenter = async (id) => {
    const costCenter = await CostCenter.findById(id);
    if (!costCenter) {
        throw new Error("مركز التكلفة غير موجود");
    }

    // ── التحقق من عدم وجود مراكز فرعية مرتبطة ──
    if (costCenter.type === "main") {
        const subCenters = await CostCenter.countDocuments({
            parentCenter: id,
            isHidden: { $ne: true }
        });
        if (subCenters > 0) {
            throw new Error("لا يمكن إخفاء المركز الرئيسي لوجود مراكز فرعية مرتبطة به");
        }
    }

    costCenter.isHidden = true;
    costCenter.isActive = false;
    costCenter.status = "closed";
    await costCenter.save();

    return { message: "تم إخفاء مركز التكلفة بنجاح" };
};

// =============================================
// RESTORE
// =============================================
exports.restoreCostCenter = async (id) => {
    const costCenter = await CostCenter.findById(id);
    if (!costCenter) {
        throw new Error("مركز التكلفة غير موجود");
    }

    costCenter.isHidden = false;
    costCenter.isActive = true;
    costCenter.status = "active";
    await costCenter.save();

    return { message: "تم إظهار مركز التكلفة بنجاح" };
};

// =============================================
// SEARCH
// =============================================
exports.searchCostCenters = async (keyword) => {
    if (!keyword || keyword.trim().length === 0) {
        return [];
    }

    const regex = new RegExp(keyword, "i");

    return await CostCenter.find({
        isHidden: { $ne: true },
        $or: [
            { name: regex },
            { code: regex },
            { branch: regex }
        ]
    })
    .populate("parentCenter", "code name")
    .sort({ name: 1 })
    .limit(50);
};

// =============================================
// GET NEXT CODE
// =============================================
exports.getNextCode = async () => {
    const lastCenter = await CostCenter.findOne()
        .sort({ code: -1 })
        .select("code");

    if (!lastCenter || !lastCenter.code) {
        return "CC-00001";
    }

    const match = lastCenter.code.match(/(\d+)$/);
    if (!match) {
        return "CC-00001";
    }

    const nextNumber = parseInt(match[1], 10) + 1;
    return `CC-${String(nextNumber).padStart(5, '0')}`;
};

// =============================================
// GET STATS
// =============================================
exports.getStats = async () => {
    const total = await CostCenter.countDocuments({ isHidden: { $ne: true } });
    const active = await CostCenter.countDocuments({ isHidden: { $ne: true }, status: "active" });
    const mainCenters = await CostCenter.countDocuments({ isHidden: { $ne: true }, type: "main" });
    const subCenters = await CostCenter.countDocuments({ isHidden: { $ne: true }, type: "sub" });

    const centers = await CostCenter.find({ isHidden: { $ne: true } }).lean();
    const totalCosts = centers.reduce((sum, c) => sum + (c.currentCost || 0), 0);
    const totalBudget = centers.reduce((sum, c) => sum + (c.budget || 0), 0);

    return {
        total,
        active,
        mainCenters,
        subCenters,
        totalCosts,
        totalBudget
    };
};