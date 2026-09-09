// Services/VoucherService.js
const Voucher = require("../Models/VoucherSchema");
const JournalEntry = require("../Models/JournalEntrySchema");
const JournalLine = require("../Models/JournalLineSchema");
const Account = require("../Models/AccountSchema");
const AccountService = require("./AccountService");
const Customer = require("../Models/CustomerSchema");
const Supplier = require("../Models/SupplierSchema");

// ═══════════════════════════════════════════════════════
//    Helper: توليد رقم القيد التالي
// ═══════════════════════════════════════════════════════
async function getNextJournalEntryNo() {
  const lastEntry = await JournalEntry.findOne({
    entryNo: { $regex: /^JV-/ }
  }).sort({ createdAt: -1 }).limit(1);

  if (!lastEntry) return "JV-0001";

  const match = lastEntry.entryNo.match(/JV-(\d+)/);
  if (match) {
    const nextNum = parseInt(match[1]) + 1;
    return "JV-" + String(nextNum).padStart(4, "0");
  }
  return "JV-0001";
}

// ═══════════════════════════════════════════════════════
//    Helper: جلب حساب بالكود
// ═══════════════════════════════════════════════════════
async function getAccountByCode(code) {
  try {
    const account = await Account.findOne({ code: code.trim() }).lean();
    return account ? account._id : null;
  } catch (error) {
    console.error("Error finding account:", error.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════
//    Helper: إنشاء قيد يومي للسند
// ═══════════════════════════════════════════════════════
async function createVoucherJournalEntry(data) {
  const {
    description,
    date,
    branch,
    lines,
    source = "voucher",
    sourceId = null
  } = data;

  const entryNo = await getNextJournalEntryNo();

  const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error("القيد غير متوازن");
  }

  const entry = await JournalEntry.create({
    entryNo,
    date: date || new Date(),
    description,
    branch: branch || null,
    totalDebit,
    totalCredit,
    difference: 0,
    status: "posted",
    type: "auto",
    source,
    sourceId: sourceId ? String(sourceId) : null,
    isPosted: true,
    postedAt: new Date()
  });

  // Create journal lines (parallel)
  const linePromises = lines.map(async (line, i) => {
    let accountId = line.accountId || null;

    if (!accountId && line.accountCode) {
      accountId = await getAccountByCode(line.accountCode);
    }

    return JournalLine.create({
      journalEntry: entry._id,
      account: accountId,
      accountCode: line.accountCode || "",
      accountName: line.accountName || "",
      description: line.description || description,
      debit: line.debit || 0,
      credit: line.credit || 0,
      date: entry.date,
      branch: entry.branch || null,
      sortOrder: i + 1
    });
  });
  await Promise.all(linePromises);

  // Update account balances (parallel)
  const balancePromises = lines.map(async (line) => {
    if (AccountService && AccountService.updateBalance) {
      try {
        let accountId = line.accountId;

        if (!accountId && line.accountCode) {
          const account = await Account.findOne({ code: line.accountCode.trim() }).lean();
          if (account) {
            accountId = account._id;
          } else {
            console.warn(`Account not found for code: ${line.accountCode}`);
            return;
          }
        }

        if (accountId) {
          await AccountService.updateBalance(
            accountId,
            line.debit || 0,
            line.credit || 0
          );
        }
      } catch (e) {
        console.error("Balance update error:", e.message);
      }
    }
  });
  await Promise.all(balancePromises);

  return entry;
}

// ═══════════════════════════════════════════════════════
//    Helper: تحديث رصيد العميل/المورد بعد السند
// ═══════════════════════════════════════════════════════
async function updateEntityBalance(entityType, entityId) {
  try {
    if (!entityId) {
      console.warn("entityId is required for balance update");
      return;
    }

    const Model = entityType === "customer" ? Customer : Supplier;

    const entity = await Model.findById(entityId);
    if (!entity) {
      console.warn(`Entity not found for id: ${entityId}`);
      return;
    }

    if (!entity.linkedAccount) {
      console.warn(`Entity ${entity.name} has no linked account`);
      return;
    }

    const account = await Account.findById(entity.linkedAccount).lean();
    if (!account) {
      console.warn(`Account not found for entity: ${entity._id}`);
      return;
    }

    const newBalance = account.currentBalance || 0;
    const oldBalance = entity.currentBalance;

    if (oldBalance !== newBalance) {
      entity.currentBalance = newBalance;
      await entity.save();
      console.log(`✅ Updated ${entityType} ${entity.name}: ${oldBalance} → ${newBalance}`);
    } else {
      console.log(`ℹ️ ${entityType} ${entity.name} balance unchanged: ${newBalance}`);
    }
  } catch (error) {
    console.error("Error updating entity balance:", error.message);
  }
}

// ═══════════════════════════════════════════════════════
//    Voucher Service Class
// ═══════════════════════════════════════════════════════
class VoucherService {

  // ═══════════════════════════════════════════════════════
  //    GET NEXT VOUCHER NUMBER (static)
  // ═══════════════════════════════════════════════════════
  static async getNextVoucherNumber(type) {
    const prefix = type === "receipt" ? "RV-" : "PV-";
    const lastVoucher = await Voucher.findOne({
      voucherNumber: { $regex: "^" + prefix }
    }).sort({ createdAt: -1 }).limit(1);

    if (!lastVoucher) return prefix + "0001";

    const match = lastVoucher.voucherNumber.match(/\d+/);
    if (match) {
      const nextNum = parseInt(match[0]) + 1;
      return prefix + String(nextNum).padStart(4, "0");
    }
    return prefix + "0001";
  }

  // ═══════════════════════════════════════════════════════
  //    CREATE VOUCHER - إنشاء سند
  // ═══════════════════════════════════════════════════════
  static async createVoucher(data) {
    const {
      voucherType,
      date,
      entityType,
      entityId,
      entityName,
      entityCode,
      amount,
      amountInWords,
      paymentMethod,
      paymentAccountId,
      paymentAccountName,
      paymentAccountCode,
      referenceNumber,
      notes,
      branch
    } = data;

    // ── التحقق من البيانات ──
    if (!voucherType || !["receipt", "payment"].includes(voucherType)) {
      throw new Error("نوع السند يجب أن يكون قبض (receipt) أو صرف (payment)");
    }

    if (!entityId) {
      throw new Error("معرف الجهة مطلوب");
    }

    const amt = Number(amount) || 0;
    if (amt <= 0) {
      throw new Error("المبلغ يجب أن يكون أكبر من صفر");
    }

    if (!paymentAccountId) {
      throw new Error("حساب الدفع مطلوب");
    }

    // ── توليد رقم السند ──
    const voucherNumber = await VoucherService.getNextVoucherNumber(voucherType);

    // ── إنشاء السند ──
    const voucher = await Voucher.create({
      voucherNumber,
      voucherType,
      date: date ? new Date(date) : new Date(),
      entityType,
      entityId,
      entityName: entityName || "",
      entityCode: entityCode || "",
      amount: amt,
      amountInWords: amountInWords || "",
      paymentMethod: paymentMethod || "cash",
      paymentAccountId,
      paymentAccountName: paymentAccountName || "",
      paymentAccountCode: paymentAccountCode || "",
      referenceNumber: referenceNumber || "",
      notes: notes || "",
      branch: branch || null,
      status: "posted"
    });

    // ── توليد القيد المحاسبي ──
    let journalLines = [];
    let journalDescription = "";

    const entityAccountCode = entityCode;
    const entityAccountName = entityName;

    if (voucherType === "receipt") {
      journalDescription = `سند قبض ${voucherNumber} - ${entityName}`;
      journalLines = [
        {
          accountCode: paymentAccountCode,
          accountName: paymentAccountName,
          debit: amt,
          credit: 0,
          description: `قبض نقدية - ${entityName}`
        },
        {
          accountCode: entityAccountCode,
          accountName: entityAccountName,
          debit: 0,
          credit: amt,
          description: `سداد من ${entityName} - ${voucherNumber}`
        }
      ];
    } else {
      journalDescription = `سند صرف ${voucherNumber} - ${entityName}`;
      journalLines = [
        {
          accountCode: entityAccountCode,
          accountName: entityAccountName,
          debit: amt,
          credit: 0,
          description: `سداد إلى ${entityName} - ${voucherNumber}`
        },
        {
          accountCode: paymentAccountCode,
          accountName: paymentAccountName,
          debit: 0,
          credit: amt,
          description: `صرف نقدية - ${entityName}`
        }
      ];
    }

    const journalEntry = await createVoucherJournalEntry({
      description: journalDescription,
      date: voucher.date,
      branch: voucher.branch,
      source: "voucher",
      sourceId: voucher._id,
      lines: journalLines
    });

    // ── تحديث السند برقم القيد ──
    voucher.journalEntryId = journalEntry._id;
    voucher.journalEntryNo = journalEntry.entryNo;
    await voucher.save();

    // ── تحديث رصيد العميل/المورد ──
    await updateEntityBalance(entityType, entityId);

    return await Voucher.findById(voucher._id)
      .populate("entityId", "name code")
      .populate("paymentAccountId", "code name")
      .populate("journalEntryId", "entryNo")
      .lean();
  }

  // ═══════════════════════════════════════════════════════
  //    GET ALL VOUCHERS
  // ═══════════════════════════════════════════════════════
  static async getAllVouchers(filters = {}) {
    const query = {};

    if (filters.voucherType) query.voucherType = filters.voucherType;
    if (filters.status && filters.status !== "all") query.status = filters.status;
    if (filters.entityId) query.entityId = filters.entityId;
    if (filters.branch) query.branch = filters.branch;
    if (filters.fromDate || filters.toDate) {
      query.date = {};
      if (filters.fromDate) query.date.$gte = new Date(filters.fromDate);
      if (filters.toDate) query.date.$lte = new Date(filters.toDate);
    }
    if (filters.search) {
      query.$or = [
        { voucherNumber: { $regex: filters.search, $options: "i" } },
        { entityName: { $regex: filters.search, $options: "i" } },
        { notes: { $regex: filters.search, $options: "i" } }
      ];
    }

    return await Voucher.find(query)
      .populate("entityId", "name code")
      .populate("paymentAccountId", "code name")
      .populate("journalEntryId", "entryNo")
      .populate("branch", "name")
      .sort({ date: -1, createdAt: -1 })
      .lean();
  }

  // ═══════════════════════════════════════════════════════
  //    GET VOUCHER BY ID
  // ═══════════════════════════════════════════════════════
  static async getVoucherById(id) {
    const voucher = await Voucher.findById(id)
      .populate("entityId", "name code phone")
      .populate("paymentAccountId", "code name")
      .populate("journalEntryId", "entryNo date")
      .populate("branch", "name")
      .lean();

    if (!voucher) {
      throw new Error("السند غير موجود");
    }

    return voucher;
  }

  // ═══════════════════════════════════════════════════════
  //    GET STATS
  // ═══════════════════════════════════════════════════════
  static async getStats(type) {
    const query = type ? { voucherType: type } : {};

    const total = await Voucher.countDocuments(query);
    const posted = await Voucher.countDocuments({ ...query, status: "posted" });
    const draft = await Voucher.countDocuments({ ...query, status: "draft" });
    const cancelled = await Voucher.countDocuments({ ...query, status: "cancelled" });

    const agg = await Voucher.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: "$amount" }
        }
      }
    ]);

    const totalAmount = agg.length > 0 ? agg[0].totalAmount : 0;

    return {
      total,
      posted,
      draft,
      cancelled,
      totalAmount
    };
  }

  // ═══════════════════════════════════════════════════════
  //    DELETE VOUCHER
  // ═══════════════════════════════════════════════════════
  static async deleteVoucher(id) {
    const voucher = await Voucher.findById(id);
    if (!voucher) {
      throw new Error("السند غير موجود");
    }

    if (voucher.journalEntryId) {
      const JournalEntryService = require("./JournalEntryService");
      try {
        await JournalEntryService.deleteEntry(voucher.journalEntryId);
      } catch (e) {
        console.error("Error deleting journal entry:", e.message);
      }
    }

    await Voucher.findByIdAndDelete(id);
    return { message: "تم حذف السند بنجاح" };
  }
}

module.exports = VoucherService;