const ProductService = require("../Services/ProductService");

// =============================================
// CREATE - Add New Product + Auto Code
// =============================================
exports.create = async (req, res) => {
    try {
        // التحقق من وجود وحدات
        if (!req.body.units || req.body.units.length === 0) {
            return res.status(400).json({
                success: false,
                message: "يجب إضافة وحدة واحدة على الأقل"
            });
        }

        const product = await ProductService.createProduct(req.body);

        res.status(201).json({
            success: true,
            message: "تم إضافة المنتج بنجاح",
            data: product
        });

    } catch (error) {
        console.error("❌ Create Product Error:", error.message);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// LIST - Get All Products
// =============================================
exports.list = async (req, res) => {
    try {
        const filters = {
            search: req.query.search,
            category: req.query.category,
            isHidden: req.query.isHidden
        };

        const products = await ProductService.getAllProducts(filters);

        res.json({
            success: true,
            count: products.length,
            data: products
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// GET ONE - Get Single Product
// =============================================
exports.getOne = async (req, res) => {
    try {
        const product = await ProductService.getProductById(req.params.id);

        res.json({
            success: true,
            data: product
        });

    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// GET BY CODE - Get Product by Code
// =============================================
exports.getByCode = async (req, res) => {
    try {
        const product = await ProductService.getProductByCode(req.params.code);

        res.json({
            success: true,
            data: product
        });

    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// UPDATE - Update Product
// =============================================
exports.update = async (req, res) => {
    try {
        const product = await ProductService.updateProduct(req.params.id, req.body);

        res.json({
            success: true,
            message: "تم تحديث بيانات المنتج بنجاح",
            data: product
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// HIDE - Soft Delete Product
// =============================================
exports.hide = async (req, res) => {
    try {
        const result = await ProductService.hideProduct(req.params.id);

        res.json({
            success: true,
            message: result.message
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// RESTORE - Show Hidden Product
// =============================================
exports.restore = async (req, res) => {
    try {
        const result = await ProductService.restoreProduct(req.params.id);

        res.json({
            success: true,
            message: result.message
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// DELETE - Hard Delete Product
// =============================================
exports.delete = async (req, res) => {
    try {
        const result = await ProductService.deleteProduct(req.params.id);

        res.json({
            success: true,
            message: result.message
        });

    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// SEARCH - Search Products (Name, Code, Barcode)
// =============================================
exports.search = async (req, res) => {
    try {
        const { keyword } = req.params;
        const products = await ProductService.searchProducts(keyword);

        res.json({
            success: true,
            count: products.length,
            data: products
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// GET NEXT CODE - Auto-generate next code
// =============================================
exports.getNextCode = async (req, res) => {
    try {
        const nextCode = await ProductService.getNextCode();

        res.json({
            success: true,
            data: { nextCode }
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// GET STATS - Product Statistics
// =============================================
exports.getStats = async (req, res) => {
    try {
        const stats = await ProductService.getStats();

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};