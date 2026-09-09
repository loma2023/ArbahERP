module.exports = [
  // ═══════════════════════════════════════════════════════
  // الأصول (1000) - ASSETS
  // ═══════════════════════════════════════════════════════
  {
    code: "1",
    name: "الأصول",
    type: "asset",
    category: "assets",
    level: 1,
    parentCode: null,
    isLeaf: false,
    allowTransactions: false,
    normalBalance: "debit"
  },

  // ── أصول غير متداولة (1100) ──
  {
    code: "11",
    name: "أصول غير متداولة",
    type: "asset",
    category: "fixed_assets",
    level: 2,
    parentCode: "1",
    isLeaf: false,
    allowTransactions: false,
    normalBalance: "debit"
  },
  {
    code: "1102",
    name: "ممتلكات وآلات ومعدات",
    type: "asset",
    category: "fixed_assets",
    level: 3,
    parentCode: "11",
    isLeaf: false,
    allowTransactions: false,
    normalBalance: "debit"
  },
  {
    code: "110200",
    name: "أراضي",
    type: "asset",
    category: "fixed_assets",
    level: 4,
    parentCode: "1102",
    isLeaf: true,
    allowTransactions: true,
    normalBalance: "debit"
  },
  {
    code: "110201",
    name: "مباني",
    type: "asset",
    category: "fixed_assets",
    level: 4,
    parentCode: "1102",
    isLeaf: true,
    allowTransactions: true,
    normalBalance: "debit"
  },
  {
    code: "110202",
    name: "سيارات",
    type: "asset",
    category: "fixed_assets",
    level: 4,
    parentCode: "1102",
    isLeaf: true,
    allowTransactions: true,
    normalBalance: "debit"
  },
  {
    code: "110203",
    name: "أثاث وتجهيزات",
    type: "asset",
    category: "fixed_assets",
    level: 4,
    parentCode: "1102",
    isLeaf: true,
    allowTransactions: true,
    normalBalance: "debit"
  },
  {
    code: "110204",
    name: "حاسب آلي وطابعات",
    type: "asset",
    category: "fixed_assets",
    level: 4,
    parentCode: "1102",
    isLeaf: true,
    allowTransactions: true,
    normalBalance: "debit"
  },
  {
    code: "110205",
    name: "تحسينات على المأجور",
    type: "asset",
    category: "fixed_assets",
    level: 4,
    parentCode: "1102",
    isLeaf: true,
    allowTransactions: true,
    normalBalance: "debit"
  },
  {
    code: "110206",
    name: "آلات ومعدات",
    type: "asset",
    category: "fixed_assets",
    level: 4,
    parentCode: "1102",
    isLeaf: true,
    allowTransactions: true,
    normalBalance: "debit"
  },
  {
    code: "110207",
    name: "مجمع اهلاك الاصول الثابتة",
    type: "asset",
    category: "fixed_assets",
    level: 4,
    parentCode: "1102",
    isLeaf: true,
    allowTransactions: true,
    normalBalance: "debit"
  },

  // ── أصول متداولة (1200) ──
  {
    code: "12",
    name: "أصول متداولة",
    type: "asset",
    category: "current_assets",
    level: 2,
    parentCode: "1",
    isLeaf: false,
    allowTransactions: false,
    normalBalance: "debit"
  },
  {
    code: "1201",
    name: "النقدية بالصندوق",
    type: "asset",
    category: "cash",
    level: 3,
    parentCode: "12",
    isLeaf: false,
    allowTransactions: false,
    normalBalance: "debit"
  },
  {
    code: "1202",
    name: "النقدية بالبنك",
    type: "asset",
    category: "cash",
    level: 3,
    parentCode: "12",
    isLeaf: false,
    allowTransactions: false,
    normalBalance: "debit"
  },
  // ── العملاء ──
  {
    code: "1203",
    name: "العملاء",
    type: "asset",
    category: "receivables",
    level: 3,
    parentCode: "12",
    isLeaf: false,
    allowTransactions: false,
    normalBalance: "debit"
  },
  // ── المناديب ──
  {
    code: "1204",
    name: "المناديب",
    type: "asset",
    category: "receivables",
    level: 3,
    parentCode: "12",
    isLeaf: false,
    allowTransactions: false,
    normalBalance: "debit"
  },
  {
    code: "1205",
    name: "المخزون",
    type: "asset",
    category: "current_assets",
    level: 3,
    parentCode: "12",
    isLeaf: false,
    allowTransactions: false,
    normalBalance: "debit"
  },
  {
    code: "120500",
    name: "مخزون بضاعة أول المدة",
    type: "asset",
    category: "current_assets",
    level: 4,
    parentCode: "1205",
    isLeaf: true,
    allowTransactions: true,
    normalBalance: "debit"
  },
  {
    code: "120501",
    name: "تكلفة المخزون",
    type: "asset",
    category: "current_assets",
    level: 4,
    parentCode: "1205",
    isLeaf: true,
    allowTransactions: true,
    normalBalance: "debit"
  },
  {
    code: "120502",
    name: "مخزون آخر المدة",
    type: "asset",
    category: "current_assets",
    level: 4,
    parentCode: "1205",
    isLeaf: true,
    allowTransactions: true,
    normalBalance: "debit"
  },
  {
    code: "1210",
    name: "مصاريف مدفوعة مقدماً",
    type: "asset",
    category: "prepaid",
    level: 3,
    parentCode: "12",
    isLeaf: false,
    allowTransactions: false,
    normalBalance: "debit"
  },
  {
    code: "121000",
    name: "إيجارات مدفوعة مقدماً",
    type: "asset",
    category: "prepaid",
    level: 4,
    parentCode: "1210",
    isLeaf: true,
    allowTransactions: true,
    normalBalance: "debit"
  },
  {
    code: "121001",
    name: "تامينات مدفوعة مقدماً",
    type: "asset",
    category: "prepaid",
    level: 4,
    parentCode: "1210",
    isLeaf: true,
    allowTransactions: true,
    normalBalance: "debit"
  },
  {
    code: "1211",
    name: "مدينون متنوعون وأرصدة مدينة أخرى",
    type: "asset",
    category: "receivables",
    level: 3,
    parentCode: "12",
    isLeaf: false,
    allowTransactions: false,
    normalBalance: "debit"
  },
  {
    code: "121100",
    name: "ضريبة القيمة المضافة للمدخلات",
    type: "asset",
    category: "current_assets",
    level: 4,
    parentCode: "1211",
    isLeaf: true,
    allowTransactions: true,
    normalBalance: "debit"
  },
  {
    code: "121101",
    name: "سلف الموظفين",
    type: "asset",
    category: "current_assets",
    level: 4,
    parentCode: "1211",
    isLeaf: true,
    allowTransactions: true,
    normalBalance: "debit"
  },
  {
    code: "121102",
    name: "دفعات مقدمة للموردين",
    type: "asset",
    category: "prepaid",
    level: 4,
    parentCode: "1211",
    isLeaf: true,
    allowTransactions: true,
    normalBalance: "debit"
  },
  {
    code: "121103",
    name: "خطابات ضمان بنكية",
    type: "asset",
    category: "bank",
    level: 4,
    parentCode: "1211",
    isLeaf: true,
    allowTransactions: true,
    normalBalance: "debit"
  },

  // ═══════════════════════════════════════════════════════
  // الإلتزامات وحقوق الملكية (2000) - LIABILITIES & EQUITY
  // ═══════════════════════════════════════════════════════
  {
    code: "2",
    name: "الإلتزامات وحقوق الملكية",
    type: "liability",
    category: "liabilities",
    level: 1,
    parentCode: null,
    isLeaf: false,
    allowTransactions: false,
    normalBalance: "credit"
  },

  // ── حقوق الملكية (2100) ──
  {
    code: "21",
    name: "حقوق الملكية",
    type: "equity",
    category: "equity",
    level: 2,
    parentCode: "2",
    isLeaf: false,
    allowTransactions: false,
    normalBalance: "credit"
  },
  {
    code: "2101",
    name: "حقوق الملكية",
    type: "equity",
    category: "equity",
    level: 3,
    parentCode: "21",
    isLeaf: false,
    allowTransactions: false,
    normalBalance: "credit"
  },
  {
    code: "210100",
    name: "رأس المال",
    type: "equity",
    category: "equity",
    level: 4,
    parentCode: "2101",
    isLeaf: true,
    allowTransactions: true,
    normalBalance: "credit"
  },
  {
    code: "210101",
    name: "إحتياطي نظامي",
    type: "equity",
    category: "equity",
    level: 4,
    parentCode: "2101",
    isLeaf: true,
    allowTransactions: true,
    normalBalance: "credit"
  },
  {
    code: "210102",
    name: "أرباح سنوات سابقة",
    type: "equity",
    category: "equity",
    level: 4,
    parentCode: "2101",
    isLeaf: true,
    allowTransactions: true,
    normalBalance: "credit"
  },
  {
    code: "210103",
    name: "أرباح وخسائر العام",
    type: "equity",
    category: "equity",
    level: 4,
    parentCode: "2101",
    isLeaf: true,
    allowTransactions: true,
    normalBalance: "credit"
  },
  {
    code: "210104",
    name: "رأس مال ارصدة اول المدة",
    type: "equity",
    category: "equity",
    level: 4,
    parentCode: "2101",
    isLeaf: true,
    allowTransactions: true,
    normalBalance: "credit"
  },

  // ── إلتزامات غير متداولة (2200) ──
  {
    code: "22",
    name: "إلتزامات غير متداولة",
    type: "liability",
    category: "non_current_liabilities",
    level: 2,
    parentCode: "2",
    isLeaf: false,
    allowTransactions: false,
    normalBalance: "credit"
  },
  {
    code: "2201",
    name: "المخصصات",
    type: "liability",
    category: "non_current_liabilities",
    level: 3,
    parentCode: "22",
    isLeaf: false,
    allowTransactions: false,
    normalBalance: "credit"
  },
  {
    code: "220100",
    name: "مخصص اهلاك أصول ثابتة",
    type: "liability",
    category: "non_current_liabilities",
    level: 4,
    parentCode: "2201",
    isLeaf: true,
    allowTransactions: true,
    normalBalance: "credit"
  },
  {
    code: "220101",
    name: "مخصص ديون مشكوك في تحصيلها",
    type: "liability",
    category: "non_current_liabilities",
    level: 4,
    parentCode: "2201",
    isLeaf: true,
    allowTransactions: true,
    normalBalance: "credit"
  },
  {
    code: "220102",
    name: "مخصص بضاعة راكدة",
    type: "liability",
    category: "non_current_liabilities",
    level: 4,
    parentCode: "2201",
    isLeaf: true,
    allowTransactions: true,
    normalBalance: "credit"
  },
  {
    code: "220103",
    name: "مخصص مكافأة ترك الخدمة",
    type: "liability",
    category: "non_current_liabilities",
    level: 4,
    parentCode: "2201",
    isLeaf: true,
    allowTransactions: true,
    normalBalance: "credit"
  },
  {
    code: "2203",
    name: "قروض طويلة الأجل",
    type: "liability",
    category: "non_current_liabilities",
    level: 3,
    parentCode: "22",
    isLeaf: true,
    allowTransactions: true,
    normalBalance: "credit"
  },

  // ── إلتزامات متداولة (2300) ──
  {
    code: "23",
    name: "إلتزامات متداولة",
    type: "liability",
    category: "current_liabilities",
    level: 2,
    parentCode: "2",
    isLeaf: false,
    allowTransactions: false,
    normalBalance: "credit"
  },
  {
    code: "2301",
    name: "الموردين",
    type: "liability",
    category: "current_liabilities",
    level: 3,
    parentCode: "23",
    isLeaf: false,
    allowTransactions: false,
    normalBalance: "credit"
  },
  {
    code: "2302",
    name: "قروض قصيرة الأجل",
    type: "liability",
    category: "current_liabilities",
    level: 3,
    parentCode: "23",
    isLeaf: true,
    allowTransactions: true,
    normalBalance: "credit"
  },
  {
    code: "2303",
    name: "مصاريف مستحقة وأرصدة دائنة أخرى",
    type: "liability",
    category: "current_liabilities",
    level: 3,
    parentCode: "23",
    isLeaf: false,
    allowTransactions: false,
    normalBalance: "credit"
  },
  {
    code: "230300",
    name: "رواتب مستحقة",
    type: "liability",
    category: "current_liabilities",
    level: 4,
    parentCode: "2303",
    isLeaf: true,
    allowTransactions: true,
    normalBalance: "credit"
  },
  {
    code: "230301",
    name: "اجازات مستحقة",
    type: "liability",
    category: "current_liabilities",
    level: 4,
    parentCode: "2303",
    isLeaf: true,
    allowTransactions: true,
    normalBalance: "credit"
  },
  {
    code: "230302",
    name: "تذاكر مستحقة",
    type: "liability",
    category: "current_liabilities",
    level: 4,
    parentCode: "2303",
    isLeaf: true,
    allowTransactions: true,
    normalBalance: "credit"
  },
  {
    code: "230303",
    name: "ايجارات مستحقة",
    type: "liability",
    category: "current_liabilities",
    level: 4,
    parentCode: "2303",
    isLeaf: true,
    allowTransactions: true,
    normalBalance: "credit"
  },
  {
    code: "230304",
    name: "دفعات مقدمة من العملاء",
    type: "liability",
    category: "current_liabilities",
    level: 4,
    parentCode: "2303",
    isLeaf: true,
    allowTransactions: true,
    normalBalance: "credit"
  },
  {
    code: "230305",
    name: "ضريبة القيمة المضافة للمخرجات",
    type: "liability",
    category: "current_liabilities",
    level: 4,
    parentCode: "2303",
    isLeaf: true,
    allowTransactions: true,
    normalBalance: "credit"
  },
  {
    code: "230306",
    name: "مصلحة الزكاة والضريبة - ضريبة ق مضافة",
    type: "liability",
    category: "current_liabilities",
    level: 4,
    parentCode: "2303",
    isLeaf: true,
    allowTransactions: true,
    normalBalance: "credit"
  },
  {
    code: "230307",
    name: "مصلحة الزكاة والضريبة - الزكاة",
    type: "liability",
    category: "current_liabilities",
    level: 4,
    parentCode: "2303",
    isLeaf: true,
    allowTransactions: true,
    normalBalance: "credit"
  },
  {
    code: "2304",
    name: "المستحق إلى أطراف ذات علاقة",
    type: "liability",
    category: "current_liabilities",
    level: 3,
    parentCode: "23",
    isLeaf: false,
    allowTransactions: false,
    normalBalance: "credit"
  },
  {
    code: "230400",
    name: "المستحق إلى الشريك - شريك 1",
    type: "liability",
    category: "current_liabilities",
    level: 4,
    parentCode: "2304",
    isLeaf: true,
    allowTransactions: true,
    normalBalance: "credit"
  },
  {
    code: "230401",
    name: "المستحق إلى الشريك - شريك 2",
    type: "liability",
    category: "current_liabilities",
    level: 4,
    parentCode: "2304",
    isLeaf: true,
    allowTransactions: true,
    normalBalance: "credit"
  },

  // ═══════════════════════════════════════════════════════
  // الإيرادات (3000) - REVENUE
  // ═══════════════════════════════════════════════════════
  {
    code: "3",
    name: "إيرادات",
    type: "revenue",
    category: "revenue",
    level: 1,
    parentCode: null,
    isLeaf: false,
    allowTransactions: false,
    normalBalance: "credit"
  },

  // ── إيرادات النشاط (3100) ──
  {
    code: "31",
    name: "إيرادات النشاط",
    type: "revenue",
    category: "sales_revenue",
    level: 2,
    parentCode: "3",
    isLeaf: false,
    allowTransactions: false,
    normalBalance: "credit"
  },
  {
    code: "3101",
    name: "مبيعات الدمام",
    type: "revenue",
    category: "sales_revenue",
    level: 3,
    parentCode: "31",
    isLeaf: false,
    allowTransactions: false,
    normalBalance: "credit"
  },
  {
    code: "310100",
    name: "المبيعات",
    type: "revenue",
    category: "sales_revenue",
    level: 4,
    parentCode: "3101",
    isLeaf: true,
    allowTransactions: true,
    normalBalance: "credit"
  },
  {
    code: "32",
    name: "إيرادات عامة",
    type: "revenue",
    category: "sales_revenue",
    level: 2,
    parentCode: "3",
    isLeaf: false,
    allowTransactions: false,
    normalBalance: "credit"
  },
  // ═══════════════════════════════════════════════════════
  // المصروفات (4000) - EXPENSES
  // ═══════════════════════════════════════════════════════
  {
    code: "4",
    name: "مصروفات",
    type: "expense",
    category: "expenses",
    level: 1,
    parentCode: null,
    isLeaf: false,
    allowTransactions: false,
    normalBalance: "debit"
  },
  // ── تكلفة الإيرادات (4100) ──
  {
    code: "41",
    name: "تكلفة الإيرادات",
    type: "expense",
    category: "cost_of_sales",
    level: 2,
    parentCode: "4",
    isLeaf: false,
    allowTransactions: false,
    normalBalance: "debit"
  },
  {
    code: "4101",
    name: "تكلفة البضاعة المباعة",
    type: "expense",
    category: "cost_of_sales",
    level: 3,
    parentCode: "41",
    isLeaf: false,
    allowTransactions: false,
    normalBalance: "debit"
  },
  {
    code: "410100",
    name: "المشتريات",
    type: "expense",
    category: "cost_of_sales",
    level: 4,
    parentCode: "4101",
    isLeaf: true,
    allowTransactions: true,
    normalBalance: "debit"
  },
  {
    code: "410101",
    name: "التغير في المخزون",
    type: "expense",
    category: "cost_of_sales",
    level: 4,
    parentCode: "4101",
    isLeaf: true,
    allowTransactions: true,
    normalBalance: "debit"
  },
  {
    code: "42",
    name: "اهلاك الاصول الثابتة ",
    type: "expense",
    category: "cost_of_sales",
    level: 2,
    parentCode: "4",
    isLeaf: false,
    allowTransactions: false,
    normalBalance: "debit"
  },
  {
    code: "4201",
    name: "مصروفات الإهلاك",
    type: "expense",
    category: "depreciation_expense",
    level: 3,
    parentCode: "42",
    isLeaf: false,
    allowTransactions: false,
    normalBalance: "debit"
  },
  {
    code: "420100",
    name: "مصروف إهلاك الأصول الثابتة",
    type: "expense",
    category: "depreciation_expense",
    level: 4,
    parentCode: "4201",
    isLeaf: true,
    allowTransactions: true,
    normalBalance: "debit"
  },

  {
    code: "43",
    name: "المصاريف العامة",
    type: "expense",
    category: "cost_of_sales",
    level: 2,
    parentCode: "4",
    isLeaf: false,
    allowTransactions: false,
    normalBalance: "debit"
  },
];