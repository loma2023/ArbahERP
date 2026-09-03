const express = require("express");
const router = express.Router();
const JournalEntryController = require("../Controllers/JournalEntryController");

router.get("/", JournalEntryController.list);
router.get("/stats", JournalEntryController.getStats);
router.get("/next-entry-no", JournalEntryController.getNextEntryNo);
router.get("/entry-no/:entryNo", JournalEntryController.getByEntryNo);
router.get("/:id", JournalEntryController.getOne);
router.post("/create", JournalEntryController.create);
router.post("/draft", JournalEntryController.saveDraft);
router.post("/post", JournalEntryController.saveAndPost);
router.put("/:id", JournalEntryController.update);
router.put("/:id/post", JournalEntryController.post);
router.put("/:id/unpost", JournalEntryController.unpost);
router.delete("/:id", JournalEntryController.delete);

module.exports = router;