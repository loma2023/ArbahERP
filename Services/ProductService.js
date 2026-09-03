const Product = require("../Models/ProductSchema");

// =============================================
// Helpers
// =============================================
const validateUnits = (units) => {
    if (!units || units.length === 0) {
        throw new Error("يجب إضافة وحدة واحدة على الأقل");
    }

    const hasDefault = units.some(u => u.isDefault);
    if (!hasDefault) {
        units[0].isDefault = true;
    }

    const defaultUnit = units.find(u => u.isDefault);
    return { units, baseUnit: defaultUnit.name };
};

// =============================================
// CREATE
// =============================================
exports.createProduct = async (data) => {
    const { units, baseUnit } = validateUnits(data.units);

    const productData = {
        ...data,
        units,
        baseUnit
    };

    return await Product.create(productData);
};

// =============================================
// LIST
// =============================================
exports.getAllProducts = async (filters = {}) => {
    const query = {};

    if (filters.isHidden !== undefined) {
        query.isHidden = filters.isHidden === 'true';
    } else {
        query.isHidden = { $ne: true };
    }

    if (filters.category) {
        query.category = filters.category;
    }

    if (filters.search) {
        query.$or = [
            { name: { $regex: filters.search, $options: 'i' } },
            { code: { $regex: filters.search, $options: 'i' } }
        ];
    }

    return await Product.find(query)
        .populate('category', 'name')
        .sort({ createdAt: -1 });
};

// =============================================
// GET ONE
// =============================================
exports.getProductById = async (id) => {
    const product = await Product.findById(id)
        .populate('category', 'name');

    if (!product) {
        throw new Error("المنتج غير موجود");
    }

    return product;
};

// =============================================
// GET BY CODE
// =============================================
exports.getProductByCode = async (code) => {
    const product = await Product.findOne({ code })
        .populate('category', 'name');

    if (!product) {
        throw new Error("المنتج غير موجود");
    }

    return product;
};

// =============================================
// UPDATE
// =============================================
exports.updateProduct = async (id, data) => {
    if (data.units && data.units.length > 0) {
        const { units, baseUnit } = validateUnits(data.units);
        data.units = units;
        data.baseUnit = baseUnit;
    }

    const product = await Product.findByIdAndUpdate(
        id,
        data,
        { new: true, runValidators: true }
    ).populate('category', 'name');

    if (!product) {
        throw new Error("المنتج غير موجود");
    }

    return product;
};

// =============================================
// HIDE (Soft Delete)
// =============================================
exports.hideProduct = async (id) => {
    const product = await Product.findById(id);

    if (!product) {
        throw new Error("المنتج غير موجود");
    }

    product.isHidden = true;
    await product.save();

    return { message: "تم إخفاء المنتج" };
};

// =============================================
// RESTORE
// =============================================
exports.restoreProduct = async (id) => {
    const product = await Product.findById(id);

    if (!product) {
        throw new Error("المنتج غير موجود");
    }

    product.isHidden = false;
    await product.save();

    return { message: "تم إظهار المنتج" };
};

// =============================================
// DELETE (Hard Delete)
// =============================================
exports.deleteProduct = async (id) => {
    const product = await Product.findByIdAndDelete(id);

    if (!product) {
        throw new Error("المنتج غير موجود");
    }

    return { message: "تم حذف المنتج نهائياً" };
};

// =============================================
// SEARCH
// =============================================
exports.searchProducts = async (keyword) => {
    if (!keyword || keyword.trim().length === 0) {
        return [];
    }

    return await Product.find({
        $or: [
            { name: { $regex: keyword, $options: 'i' } },
            { code: { $regex: keyword, $options: 'i' } },
            { 'units.barcode': { $regex: keyword, $options: 'i' } }
        ],
        isHidden: { $ne: true }
    })
    .limit(10)
    .populate('category', 'name');
};

// =============================================
// GET NEXT CODE
// =============================================
exports.getNextCode = async () => {
    const lastProduct = await Product.findOne()
        .sort({ code: -1 })
        .select('code');

    if (!lastProduct || !lastProduct.code) {
        return "PRD-00001";
    }

    const match = lastProduct.code.match(/(\d+)$/);
    if (!match) {
        return "PRD-00001";
    }

    const nextNumber = parseInt(match[1], 10) + 1;
    return `PRD-${String(nextNumber).padStart(5, '0')}`;
};

// =============================================
// GET STATS
// =============================================
exports.getStats = async () => {
    const total = await Product.countDocuments();
    const active = await Product.countDocuments({ isHidden: { $ne: true } });
    const hidden = await Product.countDocuments({ isHidden: true });

    const lowStock = await Product.countDocuments({
        isHidden: { $ne: true },
        $expr: { $lte: ["$quantity", "$minQuantity"] }
    });

    return {
        total,
        active,
        hidden,
        lowStock
    };
};