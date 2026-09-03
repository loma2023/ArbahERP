const express = require("express");
const router = express.Router();
const ProductController = require("../Controllers/ProductController");

// ═══════════════════════════════════════════════════════════
// GET /api/Products - Get all products
// ═══════════════════════════════════════════════════════════
router.get("/", ProductController.list);

// ═══════════════════════════════════════════════════════════
// GET /api/Products/stats - Get product statistics
// ═══════════════════════════════════════════════════════════
router.get("/stats", ProductController.getStats);

// ═══════════════════════════════════════════════════════════
// GET /api/Products/next-code - Get next available code
// ═══════════════════════════════════════════════════════════
router.get("/next-code", ProductController.getNextCode);

// ═══════════════════════════════════════════════════════════
// GET /api/Products/search/:keyword - Search products
// ═══════════════════════════════════════════════════════════
router.get("/search/:keyword", ProductController.search);

// ═══════════════════════════════════════════════════════════
// GET /api/Products/code/:code - Get product by code
// ═══════════════════════════════════════════════════════════
router.get("/code/:code", ProductController.getByCode);

// ═══════════════════════════════════════════════════════════
// GET /api/Products/:id - Get single product
// ═══════════════════════════════════════════════════════════
router.get("/:id", ProductController.getOne);

// ═══════════════════════════════════════════════════════════
// POST /api/Products/create - Create new product
// ═══════════════════════════════════════════════════════════
router.post("/create", ProductController.create);

// ═══════════════════════════════════════════════════════════
// PUT /api/Products/:id - Update product
// ═══════════════════════════════════════════════════════════
router.put("/:id", ProductController.update);

// ═══════════════════════════════════════════════════════════
// PUT /api/Products/hide/:id - Soft delete (hide) product
// ═══════════════════════════════════════════════════════════
router.put("/hide/:id", ProductController.hide);

// ═══════════════════════════════════════════════════════════
// PUT /api/Products/restore/:id - Restore hidden product
// ═══════════════════════════════════════════════════════════
router.put("/restore/:id", ProductController.restore);

// ═══════════════════════════════════════════════════════════
// DELETE /api/Products/:id - Hard delete product
// ═══════════════════════════════════════════════════════════
router.delete("/:id", ProductController.delete);

module.exports = router;