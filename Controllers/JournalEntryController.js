const JournalEntryService = require("../Services/JournalEntryService");

// =============================================
// CREATE - Add New Journal Entry
// =============================================
exports.create = async (req, res) => {
    try {
        const entry = await JournalEntryService.createEntry(req.body);
        res.status(201).json({
            success: true,
            message: "تم إنشاء القيد اليومي بنجاح",
            data: entry
        });
    } catch (error) {
        console.error("❌ Create Journal Entry Error:", error.message);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// LIST - Get All Journal Entries
// =============================================
exports.list = async (req, res) => {
    try {
        const filters = {
            fromDate: req.query.fromDate,
            toDate: req.query.toDate,
            status: req.query.status,
            type: req.query.type,
            branch: req.query.branch,
            costCenter: req.query.costCenter,
            search: req.query.search
        };
        const entries = await JournalEntryService.getAllEntries(filters);
        res.json({
            success: true,
            count: entries.length,
            data: entries
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// GET ONE - Get Single Journal Entry
// =============================================
exports.getOne = async (req, res) => {
    try {
        const entry = await JournalEntryService.getEntryById(req.params.id);
        res.json({
            success: true,
            data: entry
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// UPDATE - Update Journal Entry (Draft only)
// =============================================
exports.update = async (req, res) => {
    try {
        const entry = await JournalEntryService.updateEntry(req.params.id, req.body);
        res.json({
            success: true,
            message: "تم تحديث القيد اليومي بنجاح",
            data: entry
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// POST - Post Journal Entry (ترحيل)
// =============================================
exports.post = async (req, res) => {
    try {
        const result = await JournalEntryService.postEntry(req.params.id);
        res.json({
            success: true,
            message: result.message,
            data: result.entry
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// UNPOST - Unpost Journal Entry (إلغاء الترحيل)
// =============================================
exports.unpost = async (req, res) => {
    try {
        const result = await JournalEntryService.unpostEntry(req.params.id);
        res.json({
            success: true,
            message: result.message,
            data: result.entry
        });
    } catch (error) {
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// DELETE - Delete Journal Entry
// =============================================
exports.delete = async (req, res) => {
    try {
        const result = await JournalEntryService.deleteEntry(req.params.id);
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
// GET STATS - Journal Statistics
// =============================================
exports.getStats = async (req, res) => {
    try {
        const stats = await JournalEntryService.getStats();
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

// =============================================
// GET NEXT ENTRY NUMBER
// =============================================
exports.getNextEntryNo = async (req, res) => {
    try {
        const nextNo = await JournalEntryService.getNextEntryNo();
        res.json({
            success: true,
            data: { nextNo }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// GET BY ENTRY NUMBER
// =============================================
exports.getByEntryNo = async (req, res) => {
    try {
        const entry = await JournalEntryService.getEntryByNo(req.params.entryNo);
        res.json({
            success: true,
            data: entry
        });
    } catch (error) {
        res.status(404).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// SAVE AS DRAFT
// =============================================
exports.saveDraft = async (req, res) => {
    try {
        const entry = await JournalEntryService.saveDraft(req.body);
        res.status(201).json({
            success: true,
            message: "تم حفظ القيد كمسودة بنجاح",
            data: entry
        });
    } catch (error) {
        console.error("❌ Save Draft Error:", error.message);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};

// =============================================
// SAVE AND POST
// =============================================
exports.saveAndPost = async (req, res) => {
    try {
        const result = await JournalEntryService.saveAndPost(req.body);
        res.status(201).json({
            success: true,
            message: "تم حفظ وترحيل القيد اليومي بنجاح",
            data: result
        });
    } catch (error) {
        console.error("❌ Save And Post Error:", error.message);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
};