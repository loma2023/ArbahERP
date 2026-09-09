// ═══════════════════════════════════════════════════════════
//    Ledger.js - دفتر الأستاذ (محسّن بنفس أسلوب Customers.js)
// ═══════════════════════════════════════════════════════════

let currentLedgerData = null;
let currentAccountId = null;

const DOC_TYPE_LABELS = {
    'manual': 'يدوي',
    'auto': 'تلقائي',
    'opening_balance': 'افتتاحي'
};

const SOURCE_LABELS = {
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

// ═══════════════════════════════════════════════════════════
//    تحميل دفتر الأستاذ
// ═══════════════════════════════════════════════════════════
async function loadLedger() {
    const accountId = document.getElementById('accountId')?.value;

    if (!accountId) {
        ArbahToast.warning('اختر حساباً أولاً', 4000, { title: 'تنبيه!' });
        return;
    }

    currentAccountId = accountId;
    const dateFrom = document.querySelector('[data-filter="date-from"]')?.value || '';
    const dateTo = document.querySelector('[data-filter="date-to"]')?.value || '';

    const tbody = document.getElementById('LedgerTable');
    if (!tbody) {
        console.error('LedgerTable tbody not found!');
        return;
    }

    // ── حالة التحميل ──
    tbody.innerHTML = `<tr>
                            <td colspan="10" style="text-align:center;padding:40px;">
                                <i class="fa-solid fa-spinner fa-spin"></i>
                                <p style="margin-top:10px;color:#6b7280;">جاري تحميل ...</p>
                            </td>
                        </tr>`;

    try {
        const url = `/api/AccountLedger/${accountId}?fromDate=${dateFrom}&toDate=${dateTo}`;
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error('HTTP error! status: ' + response.status);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || 'Server returned error');
        }

        currentLedgerData = result.data;
        renderLedger(result.data);

    } catch (error) {
        console.error('Error loading ledger:', error);
        tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:40px;color:#dc2626;">
            <i class="fa-solid fa-circle-exclamation" style="font-size:2rem;margin-bottom:10px;display:block;"></i>
            <p>حدث خطأ في تحميل البيانات: ${escapeHtml(error.message)}</p>
        </td></tr>`;
        ArbahToast.error('حدث خطأ في تحميل دفتر الأستاذ', 4000, { title: 'خطأ!' });
    }
}

// ═══════════════════════════════════════════════════════════
//    عرض دفتر الأستاذ
// ═══════════════════════════════════════════════════════════
function renderLedger(data) {
    const { account, openingBalance, entries, totals } = data;

    updateHeader(account.name, account.code, account.type);

    // تحديث الرصيد الحالي
    const balanceEl = document.getElementById('CurrentBalance');
    if (balanceEl) {
        const balanceClass = totals.closingBalance >= 0 ? 'positive' : 'negative';
        balanceEl.textContent = formatNumber(totals.closingBalance) + ' ر.س';
        balanceEl.className = `value ${balanceClass}`;
    }

    renderTableRows(entries, openingBalance);

    // تحديث الإحصائيات
    const metricsEl = document.getElementById('showingDataMetrics');
    if (metricsEl) {
        metricsEl.textContent = entries.length > 0
            ? `${entries.length} حركة | الرصيد: ${formatNumber(totals.closingBalance)}`
            : 'لا توجد حركات في الفترة المحددة';
    }
}

// ═══════════════════════════════════════════════════════════
//    رسم صفوف الجدول
// ═══════════════════════════════════════════════════════════
function renderTableRows(entries, openingBalance) {
    const tbody = document.getElementById('LedgerTable');
    if (!tbody) return;
    let html = '';

    // ═══════════════════════════════════════════════════════
    //    فصل الرصيد الافتتاحي عن باقي الحركات
    // ═══════════════════════════════════════════════════════
    const openingEntries = entries.filter(e => e.documentType === 'opening_balance');
    const regularEntries = entries.filter(e => e.documentType !== 'opening_balance');

    // ترتيب الحركات العادية حسب التاريخ
    regularEntries.sort((a, b) => new Date(a.date) - new Date(b.date));

    // ═══════════════════════════════════════════════════════
    //    عرض الرصيد الافتتاحي
    // ═══════════════════════════════════════════════════════
    // لو فيه حركات افتتاحية فعلية من الـ API → نعرضها
    // لو مفيش → نعرض الرصيد الافتتاحي كصف افتراضي

    if (openingEntries.length > 0) {
        // ── عرض الحركات الافتتاحية الفعلية من الـ API ──
        // نستخدم openingBalance كرصيد افتتاحي (مش runningBalance اللي جاي من الـ API)
        openingEntries.forEach((entry, index) => {
            const docType = DOC_TYPE_LABELS[entry.documentType] || entry.documentType;
            const debit = entry.debit > 0 ? formatNumber(entry.debit) : '-';
            const credit = entry.credit > 0 ? formatNumber(entry.credit) : '-';
            const entryDate = new Date(entry.date).toLocaleDateString('ar-SA-u-nu-latn', { year: 'numeric', month: '2-digit', day: '2-digit' });
            const sourceLabel = SOURCE_LABELS[entry.documentSource] || entry.documentSourceLabel || '-';
            const docNumber = entry.documentNumber || '-';

            html += `
                <tr class="OpenBalance" data-id="${escapeHtml(entry._id)}" data-entry-id="${escapeHtml(entry.journalEntry?._id || '')}">
                    <td class="row-number">-</td>
                    <td>${entryDate}</td>
                    <td>${escapeHtml(entry.description || entry.journalDescription || 'رصيد افتتاحي')}</td>
                    <td>${escapeHtml(sourceLabel)}</td>
                    <td>${escapeHtml(docNumber)}</td>
                    <td style="${entry.debit > 0 ? 'color:#16a34a;' : ''}">${debit}</td>
                    <td style="${entry.credit > 0 ? 'color:#dc2626;' : ''}">${credit}</td>
                    <td style="font-weight:700;">${formatNumber(openingBalance)}</td>
                    <td>
                        <a href="/JournalEntries/${escapeHtml(entry.journalEntry?._id || '#')}" class="status-badge Color-Bg-orange" style="text-decoration:none;">
                            ${escapeHtml(entry.entryNumber || '---')}
                        </a>
                    </td>
                    <td><span class="status-badge Color-Bg-orange">${docType}</span></td>
                </tr>
            `;
        });
    } else if (parseFloat(openingBalance) !== 0) {
        // ── صف الرصيد الافتتاحي الافتراضي (لو مفيش حركات افتتاحية) ──
        const dateFrom = document.querySelector('[data-filter="date-from"]')?.value || '---';
        html += `
            <tr class="OpenBalance">
                <td class="row-number">-</td>
                <td>${escapeHtml(dateFrom)}</td>
                <td>رصيد افتتاحي</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td>-</td>
                <td style="font-weight:700;">${formatNumber(openingBalance)}</td>
                <td>-</td>
                <td><span class="status-badge Color-Bg-orange">افتتاحي</span></td>
            </tr>
        `;
    }

    if (regularEntries.length === 0 && openingEntries.length === 0 && parseFloat(openingBalance) === 0) {
        html += `
            <tr>
                <td colspan="10" style="text-align:center;padding:60px 20px;color:#9ca3af;">
                    <i class="fa-solid fa-inbox" style="font-size:3rem;margin-bottom:16px;display:block;"></i>
                    <h4>لا توجد حركات في الفترة المحددة</h4>
                </td>
            </tr>
        `;
    } else {
        // ═══════════════════════════════════════════════════════
        //    ⚠️ نستخدم runningBalance اللي جاي من الـ API مباشرة
        //    مش بنحسبه من جديد في الـ Frontend
        // ═══════════════════════════════════════════════════════
        regularEntries.forEach((entry, index) => {
            const docType = DOC_TYPE_LABELS[entry.documentType] || entry.documentType;
            const debit = entry.debit > 0 ? formatNumber(entry.debit) : '-';
            const credit = entry.credit > 0 ? formatNumber(entry.credit) : '-';
            const entryDate = new Date(entry.date).toLocaleDateString('ar-SA-u-nu-latn', { year: 'numeric', month: '2-digit', day: '2-digit' });
            const sourceLabel = SOURCE_LABELS[entry.documentSource] || entry.documentSourceLabel || '-';
            const docNumber = entry.documentNumber || '-';

            let badgeClass = 'Color-Bg-blue';
            if (entry.documentType === 'auto') badgeClass = 'Color-Bg-green';
            if (entry.documentType === 'opening_balance') badgeClass = 'Color-Bg-orange';

            html += `
                <tr data-id="${escapeHtml(entry._id)}" data-entry-id="${escapeHtml(entry.journalEntry?._id || '')}">
                    <td class="row-number">${index + 1}</td>
                    <td>${entryDate}</td>
                    <td>${escapeHtml(entry.description || entry.journalDescription || '---')}</td>
                    <td>${escapeHtml(sourceLabel)}</td>
                    <td>${escapeHtml(docNumber)}</td>
                    <td style="${entry.debit > 0 ? 'color:#16a34a;' : ''}">${debit}</td>
                    <td style="${entry.credit > 0 ? 'color:#dc2626;' : ''}">${credit}</td>
                    <td style="font-weight:700;">${formatNumber(entry.runningBalance)}</td>
                    <td>
                        <a href="/JournalEntries/${escapeHtml(entry.journalEntry?._id || '#')}" class="status-badge ${badgeClass}" style="text-decoration:none;">
                            ${escapeHtml(entry.entryNumber || '---')}
                        </a>
                    </td>
                    <td><span class="status-badge ${badgeClass}">${docType}</span></td>
                </tr>
            `;
        });

        // ── صف الإجمالي ──
        const totals = currentLedgerData.totals;
        html += `
            <tr class="Grand-total-row">
                <td colspan="5">الإجمالي</td>
                <td>${formatNumber(totals.totalDebit)}</td>
                <td>${formatNumber(totals.totalCredit)}</td>
                <td>${formatNumber(totals.closingBalance)}</td>
                <td colspan="2"></td>
            </tr>
        `;
    }

    tbody.innerHTML = html;
    bindActionMenus();
}

// ═══════════════════════════════════════════════════════════
//    تحديث عنوان الحساب
// ═══════════════════════════════════════════════════════════
function updateHeader(name, code, type) {
    const titleEl = document.getElementById('AccountTitle');
    const subtitleEl = document.getElementById('AccountSubtitle');
    if (titleEl) titleEl.textContent = name || 'اختر حساباً';
    if (subtitleEl) subtitleEl.textContent = code ? `${code} | ${type || 'عام'}` : '---';
}


// ═══════════════════════════════════════════════════════════
//    طباعة كشف الحساب الكامل (Popup)
// ═══════════════════════════════════════════════════════════
function openPrintPopup() {
    if (!currentLedgerData) {
        ArbahToast.warning('اختر حساباً وعرض الكشف أولاً', 4000, { title: 'تنبيه!' });
        return;
    }

    const { account, openingBalance, entries, totals } = currentLedgerData;
    const dateFrom = document.querySelector('[data-filter="date-from"]')?.value || '';
    const dateTo = document.querySelector('[data-filter="date-to"]')?.value || '';

    // ── تعبئة الـ Popup ──
    const titleEl = document.getElementById('PopupTitle');
    const subtitleEl = document.getElementById('PopupSubtitle');
    if (titleEl) titleEl.innerHTML = '<i class="fa-solid fa-book-open"></i> كشف حساب';
    if (subtitleEl) subtitleEl.textContent = account.name || '---';

    const accNameEl = document.getElementById('LedgerPrintAccountName');
    const accInfoEl = document.getElementById('LedgerPrintAccountInfo');
    if (accNameEl) accNameEl.textContent = account.name || '---';
    if (accInfoEl) accInfoEl.textContent = account.code ? `كود الحساب: ${account.code} | النوع: ${account.type || 'عام'}` : '---';

    // إظهار ملخص الكروت
    const summarySection = document.querySelector('.ledger-report-summary');
    if (summarySection) summarySection.style.display = 'flex';

    const openBalEl = document.getElementById('LedgerPrintOpeningBal');
    const totalDebitEl = document.getElementById('LedgerPrintTotalDebit');
    const totalCreditEl = document.getElementById('LedgerPrintTotalCredit');
    const closingCardEl = document.getElementById('LedgerPrintClosingBalCard');
    if (openBalEl) openBalEl.textContent = formatNumber(openingBalance);
    if (totalDebitEl) totalDebitEl.textContent = formatNumber(totals.totalDebit);
    if (totalCreditEl) totalCreditEl.textContent = formatNumber(totals.totalCredit);
    if (closingCardEl) closingCardEl.textContent = formatNumber(totals.closingBalance);

    // ── بناء صفوف الجدول ──
    const tbody = document.getElementById('LedgerPrintTableBody');
    if (tbody) { tbody.innerHTML = document.getElementById('LedgerTable').innerHTML; }

    const footerEl = document.getElementById('LedgerPrintFooter');
    if (footerEl) footerEl.innerHTML = `<i class="fa-solid fa-shield-halved"></i> ArbahERP - تم إنشاؤه في ${new Date().toLocaleString('ar-EG')}`;

    openPopUpWindow('DetailsPopup');
}

// ═══════════════════════════════════════════════════════════
//    مسح الفلتر
// ═══════════════════════════════════════════════════════════
function clearFilter() {
    const accountField = document.querySelector('[data-select="account"]');
    if (accountField && window.selectManager) {
        const instance = Object.values(window.selectManager.instances || {}).find(
            i => i.container === accountField
        );
        if (instance) instance.clear();
    }

    const valueInput = document.getElementById('accountId');
    if (valueInput) {
        valueInput.value = '';
        valueInput.removeAttribute('accountcode');
    }

    updateHeader('اختر حساباً', null, null);

    const balanceEl = document.getElementById('CurrentBalance');
    if (balanceEl) {
        balanceEl.textContent = '0.00 ر.س';
        balanceEl.className = 'value';
    }

    const tbody = document.getElementById('LedgerTable');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="10" style="text-align:center;padding:60px 20px;color:#9ca3af;">
                    <i class="fa-solid fa-book-open" style="font-size:3rem;margin-bottom:16px;display:block;"></i>
                    <h4>اختر حساباً لعرض كشفه</h4>
                </td>
            </tr>
        `;
    }

    const metricsEl = document.getElementById('showingDataMetrics');
    if (metricsEl) metricsEl.textContent = '---';

    currentLedgerData = null;
    currentAccountId = null;
}

// ═══════════════════════════════════════════════════════════
//    تحديث دفتر الأستاذ (Refresh)
// ═══════════════════════════════════════════════════════════
async function refreshLedger() {
    if (!currentAccountId) {
        ArbahToast.warning('اختر حساباً أولاً', 4000, { title: 'تنبيه!' });
        return;
    }

    ArbahToast.info('جاري تحديث دفتر الأستاذ...', 2000, { title: 'تحديث' });
    await loadLedger();
    ArbahToast.success('تم تحديث دفتر الأستاذ بنجاح', 3000, { title: 'تم!' });
}

// ═══════════════════════════════════════════════════════════
//    إعداد مستمعي الأحداث
// ═══════════════════════════════════════════════════════════
function setupEventListeners() {
    // زر البحث
    const searchBtn = document.querySelector('.Tool-Btn i.fa-search')?.closest('.Tool-Btn');
    if (searchBtn) {
        searchBtn.addEventListener('click', (e) => { e.preventDefault(); loadLedger(); });
    }

    // زر المسح
    const clearBtn = document.querySelector('.Tool-Btn i.fa-rotate-left')?.closest('.Tool-Btn');
    if (clearBtn) {
        clearBtn.addEventListener('click', (e) => { e.preventDefault(); clearFilter(); });
    }

    // زر الطباعة
    const printBtn = document.querySelector('.Tool-Btn i.fa-print')?.closest('.Tool-Btn');
    if (printBtn) {
        printBtn.addEventListener('click', (e) => { e.preventDefault(); openPrintPopup(); });
    }

    // زر التحديث
    const refreshBtn = document.querySelector('.Tool-Btn i.fa-rotate')?.closest('.Tool-Btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', (e) => { e.preventDefault(); refreshLedger(); });
    }

    // مستمع select:change
    const accountField = document.querySelector('[data-select="account"]');
    if (accountField) {
        accountField.addEventListener('select:change', (e) => {
            const item = e.detail.item;
            if (item) {
                updateHeader(item.name, item.code, item.type || 'عام');
                loadLedger();
            }
        });
    }
}

// ═══════════════════════════════════════════════════════════
//    دوال مساعدة
// ═══════════════════════════════════════════════════════════
function formatNumber(num) {
    if (num === null || num === undefined || num === '') return '0.00';
    const parsed = parseFloat(num);
    if (isNaN(parsed)) return '0.00';
    return parsed.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

function bindActionMenus() {
    document.querySelectorAll('.Action-Row-Btn').forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            const dropdown = this.nextElementSibling;
            if (!dropdown) return;

            const isOpen = dropdown.classList.contains('active');

            document.querySelectorAll('.Profile-Dropdown.active').forEach(menu => {
                menu.classList.remove('active');
            });

            if (!isOpen) {
                dropdown.classList.add('active');
            }
        });
    });
}

// ═══════════════════════════════════════════════════════════
//    التهيئة عند تحميل الصفحة
// ═══════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', function () {
    setupEventListeners();

    // تحميل تلقائي لو الحساب محدد مسبقاً
    const accountId = document.getElementById('accountId')?.value;
    if (accountId) {
        loadLedger();
    }
});