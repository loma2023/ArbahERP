const mongoose = require('mongoose');

const JournalLine = mongoose.models.JournalLine;
const JournalEntry = mongoose.models.JournalEntry;
const Account = mongoose.models.Account;
const Customer = mongoose.models.Customer;
const Supplier = mongoose.models.Supplier;

// ==================== Account Type Constants ====================
const ACCOUNT_TYPES = {
  ASSET: 'asset',           // أصول — normal balance: DEBIT (مدين)
  LIABILITY: 'liability',   // التزامات — normal balance: CREDIT (دائن)
  EQUITY: 'equity',         // حقوق ملكية — normal balance: CREDIT (دائن)
  REVENUE: 'revenue',       // إيرادات — normal balance: CREDIT (دائن)
  EXPENSE: 'expense'        // مصروفات — normal balance: DEBIT (مدين)
};

// ==================== Helper: Get Normal Balance Direction ====================
const getNormalBalance = (accountType) => {
  const debitNormal = [ACCOUNT_TYPES.ASSET, ACCOUNT_TYPES.EXPENSE];
  return debitNormal.includes(accountType) ? 'debit' : 'credit';
};

// ==================== Helper: Is Credit-Normal Account? ====================
const isCreditNormal = (accountType) => {
  return [ACCOUNT_TYPES.LIABILITY, ACCOUNT_TYPES.EQUITY, ACCOUNT_TYPES.REVENUE].includes(accountType);
};

// ==================== Helper: Calculate Net Effect ====================
// Returns: positive = increase in normal balance, negative = decrease
const getNetEffect = (debit, credit, accountType) => {
  if (isCreditNormal(accountType)) {
    // For credit-normal: credit increases, debit decreases
    return (credit || 0) - (debit || 0);
  }
  // For debit-normal: debit increases, credit decreases
  return (debit || 0) - (credit || 0);
};

// ==================== Helper: Document Labels ====================
const getDocumentTypeLabel = (type) => {
  const labels = {
    'manual': 'يدوي',
    'auto': 'تلقائي',
    'opening_balance': 'افتتاحي'
  };
  return labels[type] || type;
};

const getSourceLabel = (source) => {
  const labels = {
    'invoice_sale': 'فاتورة مبيعات',
    'invoice_purchase': 'فاتورة مشتريات',
    'payment_receipt': 'سند قبض',
    'payment_voucher': 'سند صرف',
    'journal_entry': 'قيد يومية',
    'stock_in': 'إذن إضافة',
    'stock_out': 'إذن صرف',
    'return_sale': 'مرتجع مبيعات',
    'return_purchase': 'مرتجع مشتريات'
  };
  return labels[source] || source || '-';
};

// ==================== Helper: Find Account ====================
const findAccount = async (identifier) => {
  if (!identifier) return null;
  let account = await Account.findById(identifier).lean();
  if (account) return account;
  account = await Account.findOne({ code: identifier }).lean();
  return account;
};

// ==================== CORE: Calculate Running Balance ====================
// For ALL account types: positive balance = normal balance direction
// Asset/Expense: positive = debit, negative = credit
// Liability/Equity/Revenue: positive = credit, negative = debit
const calculateRunningBalance = (lines, openingBalance, accountType) => {
  let balance = openingBalance;

  return lines.map(line => {
    const netEffect = getNetEffect(line.debit, line.credit, accountType);
    balance += netEffect;
    return {
      ...line,
      runningBalance: balance
    };
  });
};

// ==================== CORE: Calculate Opening Balance ====================
const calculateOpeningBalance = async (accountId, fromDate, accountType) => {
  const account = await Account.findById(accountId).lean();
  if (!account) return 0;

  let openingBalance = account.openingBalance || 0;

  if (openingBalance === 0) {
    const openingLines = await JournalLine.find({
      account: accountId
    }).populate({
      path: 'journalEntry',
      select: 'type'
    }).lean();

    const openingNet = openingLines
      .filter(line => line.journalEntry?.type === 'opening_balance')
      .reduce((sum, line) =>
        sum + getNetEffect(line.debit, line.credit, accountType), 0);

    openingBalance = openingNet;
  }

  if (fromDate) {
    const startDate = new Date(fromDate);
    startDate.setHours(0, 0, 0, 0);

    const beforeLines = await JournalLine.find({
      account: accountId,
      date: { $lt: startDate }
    }).populate({
      path: 'journalEntry',
      select: 'type'
    }).lean();

    const beforeNet = beforeLines
      .filter(line => line.journalEntry?.type !== 'opening_balance')
      .reduce((sum, line) =>
        sum + getNetEffect(line.debit, line.credit, accountType), 0);

    openingBalance += beforeNet;
  }

  return openingBalance;
};

// ==================== CORE: Enrich Lines with Entry Data ====================
const enrichLines = (lines) => {
  return lines.map(line => ({
    ...line,
    documentType: line.journalEntry?.type || 'manual',
    documentSource: line.journalEntry?.source || '',
    documentSourceLabel: getSourceLabel(line.journalEntry?.source || ''),
    documentNumber: line.journalEntry?.sourceId || '',
    entryNumber: line.journalEntry?.entryNo || '',
    journalDescription: line.journalEntry?.description || '',
    reference: line.journalEntry?.reference || ''
  }));
};

// ==================== CORE: Calculate Totals ====================
const calculateTotals = (lines, openingBalance, accountType) => {
  const totalDebit = lines.reduce((sum, line) => sum + (line.debit || 0), 0);
  const totalCredit = lines.reduce((sum, line) => sum + (line.credit || 0), 0);

  const netMovement = getNetEffect(totalDebit, totalCredit, accountType);
  const closingBalance = openingBalance + netMovement;

  return {
    totalDebit,
    totalCredit,
    closingBalance,
    count: lines.length
  };
};

// ==================== SERVICE: Get Account Ledger ====================
const getAccountLedger = async (accountId, fromDate, toDate, branch) => {
  const account = await findAccount(accountId);
  if (!account) {
    throw new Error('الحساب غير موجود');
  }

  let query = { account: account._id };
  if (fromDate && toDate) {
    const endDate = new Date(toDate);
    endDate.setHours(23, 59, 59, 999);
    query.date = { $gte: new Date(fromDate), $lte: endDate };
  }
  if (branch) query.branch = branch;

  const lines = await JournalLine.find(query)
    .populate({
      path: 'journalEntry',
      select: 'entryNo description source sourceId reference status type'
    })
    .sort({ date: 1, createdAt: 1 })
    .lean();

  const openingBalance = await calculateOpeningBalance(account._id, fromDate, account.type);

  const nonOpeningLines = lines.filter(line => 
    line.journalEntry?.type !== 'opening_balance'
  );

  const enrichedLines = enrichLines(nonOpeningLines);
  const linesWithBalance = calculateRunningBalance(enrichedLines, openingBalance, account.type);
  const totals = calculateTotals(nonOpeningLines, openingBalance, account.type);

  return {
    account: {
      id: account._id,
      code: account.code,
      name: account.name,
      type: account.type,
      normalBalance: getNormalBalance(account.type),
      openingBalance: account.openingBalance || 0
    },
    openingBalance,
    entries: linesWithBalance,
    totals,
    period: {
      from: fromDate || 'بداية النظام',
      to: toDate || new Date().toISOString().split('T')[0]
    }
  };
};

// ==================== SERVICE: Get Customer Ledger ====================
const getCustomerLedger = async (customerId, fromDate, toDate, branch) => {
  const customer = await Customer.findById(customerId).lean();
  if (!customer) {
    throw new Error('العميل غير موجود');
  }

  const account = await findAccount(customer.accountId || customer.accountCode);
  if (!account) {
    throw new Error('حساب العميل غير موجود');
  }

  let query = { account: account._id };
  if (fromDate && toDate) {
    const endDate = new Date(toDate);
    endDate.setHours(23, 59, 59, 999);
    query.date = { $gte: new Date(fromDate), $lte: endDate };
  }
  if (branch) query.branch = branch;

  const lines = await JournalLine.find(query)
    .populate({
      path: 'journalEntry',
      select: 'entryNo description source sourceId reference status type'
    })
    .sort({ date: 1, createdAt: 1 })
    .lean();

  const openingBalance = await calculateOpeningBalance(account._id, fromDate, account.type);

  const nonOpeningLines = lines.filter(line => 
    line.journalEntry?.type !== 'opening_balance'
  );

  const enrichedLines = enrichLines(nonOpeningLines);
  const linesWithBalance = calculateRunningBalance(enrichedLines, openingBalance, account.type);
  const totals = calculateTotals(nonOpeningLines, openingBalance, account.type);

  return {
    customer: {
      id: customer._id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      address: customer.address,
      taxNumber: customer.taxNumber
    },
    account: {
      id: account._id,
      code: account.code,
      name: account.name,
      type: account.type,
      normalBalance: getNormalBalance(account.type),
      openingBalance: account.openingBalance || 0
    },
    openingBalance,
    entries: linesWithBalance,
    totals,
    period: {
      from: fromDate || 'بداية النظام',
      to: toDate || new Date().toISOString().split('T')[0]
    }
  };
};

// ==================== SERVICE: Get Supplier Ledger ====================
const getSupplierLedger = async (supplierId, fromDate, toDate, branch) => {
  const supplier = await Supplier.findById(supplierId).lean();
  if (!supplier) {
    throw new Error('المورد غير موجود');
  }

  const account = await findAccount(supplier.accountId || supplier.accountCode);
  if (!account) {
    throw new Error('حساب المورد غير موجود');
  }

  let query = { account: account._id };
  if (fromDate && toDate) {
    const endDate = new Date(toDate);
    endDate.setHours(23, 59, 59, 999);
    query.date = { $gte: new Date(fromDate), $lte: endDate };
  }
  if (branch) query.branch = branch;

  const lines = await JournalLine.find(query)
    .populate({
      path: 'journalEntry',
      select: 'entryNo description source sourceId reference status type'
    })
    .sort({ date: 1, createdAt: 1 })
    .lean();

  const openingBalance = await calculateOpeningBalance(account._id, fromDate, account.type);

  const nonOpeningLines = lines.filter(line => 
    line.journalEntry?.type !== 'opening_balance'
  );

  const enrichedLines = enrichLines(nonOpeningLines);
  const linesWithBalance = calculateRunningBalance(enrichedLines, openingBalance, account.type);
  const totals = calculateTotals(nonOpeningLines, openingBalance, account.type);

  return {
    supplier: {
      id: supplier._id,
      name: supplier.name,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      taxNumber: supplier.taxNumber
    },
    account: {
      id: account._id,
      code: account.code,
      name: account.name,
      type: account.type,
      normalBalance: getNormalBalance(account.type),
      openingBalance: account.openingBalance || 0
    },
    openingBalance,
    entries: linesWithBalance,
    totals,
    period: {
      from: fromDate || 'بداية النظام',
      to: toDate || new Date().toISOString().split('T')[0]
    }
  };
};

// ==================== SERVICE: Get All Customer Ledgers ====================
const getAllCustomerLedgers = async () => {
  const customers = await Customer.find({}).lean();

  const ledgers = await Promise.all(
    customers.map(async (customer) => {
      const account = await findAccount(customer.accountId || customer.accountCode);
      if (!account) return null;

      const lines = await JournalLine.find({ account: account._id }).lean();
      const netMovement = lines.reduce((sum, line) =>
        sum + getNetEffect(line.debit, line.credit, account.type), 0);
      const balance = (account.openingBalance || 0) + netMovement;

      return {
        customerId: customer._id,
        customerName: customer.name,
        accountCode: account.code,
        phone: customer.phone,
        totalDebit: lines.reduce((sum, line) => sum + (line.debit || 0), 0),
        totalCredit: lines.reduce((sum, line) => sum + (line.credit || 0), 0),
        balance,
        lastTransaction: lines.length > 0 ? lines[lines.length - 1].date : null
      };
    })
  );

  return ledgers.filter(l => l !== null);
};

// ==================== SERVICE: Get All Supplier Ledgers ====================
const getAllSupplierLedgers = async () => {
  const suppliers = await Supplier.find({}).lean();

  const ledgers = await Promise.all(
    suppliers.map(async (supplier) => {
      const account = await findAccount(supplier.accountId || supplier.accountCode);
      if (!account) return null;

      const lines = await JournalLine.find({ account: account._id }).lean();
      const netMovement = lines.reduce((sum, line) =>
        sum + getNetEffect(line.debit, line.credit, account.type), 0);
      const balance = (account.openingBalance || 0) + netMovement;

      return {
        supplierId: supplier._id,
        supplierName: supplier.name,
        accountCode: account.code,
        phone: supplier.phone,
        totalDebit: lines.reduce((sum, line) => sum + (line.debit || 0), 0),
        totalCredit: lines.reduce((sum, line) => sum + (line.credit || 0), 0),
        balance,
        lastTransaction: lines.length > 0 ? lines[lines.length - 1].date : null
      };
    })
  );

  return ledgers.filter(l => l !== null);
};

// ==================== Exports ====================
module.exports = {
  // Services
  getAccountLedger,
  getCustomerLedger,
  getSupplierLedger,
  getAllCustomerLedgers,
  getAllSupplierLedgers,

  // Helpers
  getNormalBalance,
  isCreditNormal,
  getNetEffect,
  calculateRunningBalance,
  calculateOpeningBalance,
  calculateTotals,
  findAccount,

  // Constants
  ACCOUNT_TYPES
};