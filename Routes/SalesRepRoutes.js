const express = require("express");
const router = express.Router();
const SalesRepController = require("../Controllers/SalesRepController");

router.get("/", SalesRepController.list);
router.get("/stats", SalesRepController.getStats);
router.get("/next-code", SalesRepController.getNextCode);
router.get("/search/:keyword", SalesRepController.search);
router.get("/code/:code", SalesRepController.getByCode);
router.get("/:id", SalesRepController.getOne);
router.post("/create", SalesRepController.create);
router.put("/:id", SalesRepController.update);
router.put("/hide/:id", SalesRepController.hide);
router.put("/restore/:id", SalesRepController.restore);

module.exports = router;