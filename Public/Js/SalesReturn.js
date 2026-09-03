// =============================================
// Sales Return Module - ArbahERP
// مرتجع مبيعات - باستخدام SelectOption.js نفسه
// =============================================

'use strict';

// =============================================
// Mock Data: فواتير المبيعات الأصلية
// =============================================
const ORIGINAL_INVOICES = [
    {
        id: 'inv_001',
        number: 'SAL-0001',
        date: '2026-06-15',
        CustomerId: 'cust_001',
        CustomerName: 'أحمد محمد',
        salesRep: 'محمد علي',
        warehouseId: 'main',
        warehouseName: 'المستودع الرئيسي',
        paymentMethod: 'credit',
        grandTotal: 12696,
        items: [
            { id: 'itm_001', code: 'ITM-001', name: 'لابتوب Dell Latitude 5520', unit: 'جهاز', saleQty: 2, returnedQty: 0, availableQty: 2, price: 4500, discountPercent: 0, discountAmount: 0, taxPercent: 15, taxExempt: false },
            { id: 'itm_002', code: 'ITM-002', name: 'ماوس لاسلكي Logitech', unit: 'قطعة', saleQty: 5, returnedQty: 0, availableQty: 5, price: 120, discountPercent: 0, discountAmount: 0, taxPercent: 15, taxExempt: false },
            { id: 'itm_004', code: 'ITM-004', name: 'شاشة Samsung 27 بوصة', unit: 'جهاز', saleQty: 1, returnedQty: 0, availableQty: 1, price: 1200, discountPercent: 5, discountAmount: 0, taxPercent: 15, taxExempt: false }
        ]
    },
    {
        id: 'inv_002',
        number: 'SAL-0002',
        date: '2026-06-16',
        CustomerId: 'cust_002',
        CustomerName: 'خالد عبدالله',
        salesRep: 'سعيد أحمد',
        warehouseId: 'shaabi',
        warehouseName: 'مخزن الشعبي',
        paymentMethod: 'cash',
        grandTotal: 1653.50,
        items: [
            { id: 'itm_003', code: 'ITM-003', name: 'كيبورد ميكانيكي Redragon', unit: 'قطعة', saleQty: 3, returnedQty: 1, availableQty: 2, price: 280, discountPercent: 0, discountAmount: 0, taxPercent: 15, taxExempt: false },
            { id: 'itm_009', code: 'ITM-009', name: 'كابل HDMI 2 متر', unit: 'قطعة', saleQty: 10, returnedQty: 0, availableQty: 10, price: 45, discountPercent: 0, discountAmount: 0, taxPercent: 0, taxExempt: true },
            { id: 'itm_010', code: 'ITM-010', name: 'سماعات رأس JBL', unit: 'قطعة', saleQty: 2, returnedQty: 0, availableQty: 2, price: 180, discountPercent: 0, discountAmount: 0, taxPercent: 15, taxExempt: false }
        ]
    },
    {
        id: 'inv_003',
        number: 'SAL-0003',
        date: '2026-06-17',
        CustomerId: 'cust_003',
        CustomerName: 'سعيد علي',
        salesRep: 'محمد علي',
        warehouseId: 'ahsa',
        warehouseName: 'مخزن الأحساء',
        paymentMethod: 'partial',
        grandTotal: 2012.50,
        items: [
            { id: 'itm_005', code: 'ITM-005', name: 'طابعة HP LaserJet', unit: 'جهاز', saleQty: 1, returnedQty: 0, availableQty: 1, price: 850, discountPercent: 0, discountAmount: 0, taxPercent: 15, taxExempt: false },
            { id: 'itm_007', code: 'ITM-007', name: 'هارد ديسك خارجي 2TB', unit: 'جهاز', saleQty: 2, returnedQty: 0, availableQty: 2, price: 450, discountPercent: 0, discountAmount: 0, taxPercent: 15, taxExempt: false }
        ]
    },
    {
        id: 'inv_004',
        number: 'SAL-0004',
        date: '2026-05-17',
        CustomerId: 'cust_004',
        CustomerName: 'اسلام عبدالرحمن',
        salesRep: 'عبودة ',
        warehouseId: 'ahsa',
        warehouseName: 'مخزن الأحساء',
        paymentMethod: 'partial',
        grandTotal: 2012.50,
        items: [
            { id: 'itm_005', code: 'ITM-005', name: 'طابعة HP LaserJet', unit: 'جهاز', saleQty: 1, returnedQty: 0, availableQty: 1, price: 850, discountPercent: 0, discountAmount: 0, taxPercent: 15, taxExempt: false },
            { id: 'itm_007', code: 'ITM-007', name: 'هارد ديسك خارجي 2TB', unit: 'جهاز', saleQty: 2, returnedQty: 0, availableQty: 2, price: 450, discountPercent: 0, discountAmount: 0, taxPercent: 15, taxExempt: false }
        ]
    }
];

// =============================================
// Configuration
// =============================================
const CONFIG = {
    TAX_RATE: 0.15,
    INVOICE_PREFIX: 'RET-SAL-',
    JOURNAL_PREFIX: 'JV-RET-SAL-'
};

// =============================================
// State
// =============================================
let originalInvoice = null;
let originalItems = [];
let returnItems = [];
let selectedReturnItems = new Set();
let priceIncludesTax = false;
let selectedInvoice = null;

// =============================================
// DOM Elements for Invoice Dropdown
// =============================================
let invoiceSearchInput = null;
let invoiceSelect = null;
let invoiceDropdown = null;
let invoiceDropdownContent = null;
let invoiceIcon = null;

// =============================================
// Initialization
// =============================================
document.addEventListener('DOMContentLoaded', function () {
    if (!document.getElementById('SalesReturnTable')) return;

    // Cache DOM elements
    invoiceSearchInput = document.getElementById('OriginalInvoiceSearch');
    invoiceSelect = document.getElementById('OriginalInvoiceSelect');
    invoiceDropdown = document.getElementById('OriginalInvoiceDropdown');
    invoiceDropdownContent = document.getElementById('OriginalInvoiceDropdownContent');
    invoiceIcon = document.getElementById('OriginalInvoiceIcon');

    // Set today's date
    const today = new Date().toISOString().split('T')[0];
    const returnDateEl = document.getElementById('ReturnDate');
    if (returnDateEl) returnDateEl.value = today;

    // Refund method listener
    const refundMethod = document.getElementById('RefundMethod');
    if (refundMethod) {
        refundMethod.addEventListener('change', handleRefundMethodChange);
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', function (e) {
        const field = document.getElementById('OriginalInvoiceField');
        if (field && !field.contains(e.target)) {
            hideOriginalInvoiceDropdown();
        }
    });

    // Initial render
    renderReturnTable();
    calculateReturnTotals();
    handleRefundMethodChange();

    setupEventListeners();
});

// =============================================
// Original Invoice Dropdown (Same as SelectOption.js)
// =============================================
function showOriginalInvoiceDropdown() {
    if (!invoiceDropdown) return;
    invoiceDropdown.classList.add('active');
    renderInvoiceList(ORIGINAL_INVOICES);
}

function hideOriginalInvoiceDropdown() {
    if (!invoiceDropdown) return;
    invoiceDropdown.classList.remove('active');
}

function filterOriginalInvoices(searchTerm) {
    if (!invoiceDropdownContent || !invoiceDropdown) return;
    invoiceDropdown.classList.add('active');

    const term = searchTerm.trim().toLowerCase();

    if (term === '') {
        renderInvoiceList(ORIGINAL_INVOICES);
        return;
    }

    const filtered = ORIGINAL_INVOICES.filter(inv =>
        inv.number.toLowerCase().includes(term) ||
        inv.CustomerName.toLowerCase().includes(term) ||
        inv.date.includes(term)
    );

    renderInvoiceList(filtered);
}

function renderInvoiceList(invoiceList) {
    if (!invoiceDropdownContent) return;

    if (invoiceList.length === 0) {
        invoiceDropdownContent.innerHTML = `
            <div class="SelectOption-Item no-results">
                <span>لا يوجد نتائج</span>
            </div>
        `;
        return;
    }

    invoiceDropdownContent.innerHTML = invoiceList.map(inv => `
        <div class="SelectOption-Item" onclick="selectOriginalInvoice('${inv.number}')" data-number="${inv.number}">
            <div class="Name-Cell">
                <i class="fa-solid fa-file-invoice Color-Bg-blue"></i>
                <div class="Name-Cell-info">
                    <span class="name">${inv.number}</span>
                    <span class="code">${inv.CustomerName} | ${inv.date}</span>
                </div>
            </div>
            <div class="SelectOption-Item-Balance">${inv.grandTotal.toFixed(2)} ر.س</div>
        </div>
    `).join('');
}

function selectOriginalInvoice(invoiceNumber) {
    const invoice = ORIGINAL_INVOICES.find(i => i.number === invoiceNumber);
    if (!invoice) return;

    selectedInvoice = invoice;

    // Update input values
    if (invoiceSearchInput) invoiceSearchInput.value = invoice.number;
    if (invoiceSelect) invoiceSelect.value = invoice.number;

    // Update icon
    if (invoiceIcon) invoiceIcon.className = 'fa-solid fa-file-invoice Color-Bg-green';

    // Hide dropdown
    hideOriginalInvoiceDropdown();

    // Load invoice data
    loadOriginalInvoiceData(invoice);
}

function clearInvoiceSelection() {
    selectedInvoice = null;
    if (invoiceSearchInput) invoiceSearchInput.value = '';
    if (invoiceSelect) invoiceSelect.value = '';
    if (invoiceIcon) invoiceIcon.className = 'fa-solid fa-file-invoice';
    hideOriginalInvoiceDropdown();
    resetOriginalInvoice();
}

// =============================================
// Load Original Invoice Data
// =============================================
function loadOriginalInvoiceData(invoice) {
    originalInvoice = invoice;

    // Fill header info
    document.getElementById('CustomerName').value = invoice.CustomerName;
    document.getElementById('CustomerId').value = invoice.CustomerId;
    document.getElementById('SalesRepName').value = invoice.salesRep;
    document.getElementById('WarehouseName').value = invoice.warehouseName;

    // Enable add button
    document.getElementById('AddItemBtn').disabled = false;
    document.getElementById('OriginalInvoiceInfo').innerHTML =
        '<i class="fa-solid fa-check-circle" style="color: var(--accent-green);"></i> ' +
        'فاتورة: ' + invoice.number + ' | تاريخ: ' + invoice.date + ' | العميل: ' + invoice.CustomerName;

    // Prepare original items for return
    originalItems = invoice.items.map(item => ({
        ...item,
        returnQty: 0
    }));

    // Clear previous return items
    returnItems = [];
    selectedReturnItems.clear();

    renderReturnTable();
    calculateReturnTotals();
}

function resetOriginalInvoice() {
    originalInvoice = null;
    originalItems = [];
    returnItems = [];
    selectedReturnItems.clear();

    document.getElementById('CustomerName').value = '';
    document.getElementById('CustomerId').value = '';
    document.getElementById('SalesRepName').value = '';
    document.getElementById('WarehouseName').value = '';
    document.getElementById('AddItemBtn').disabled = true;
    document.getElementById('OriginalInvoiceInfo').innerHTML = '<i class="fa-solid fa-circle-info"></i> اختر فاتورة المبيعات أولاً';

    renderReturnTable();
    calculateReturnTotals();
}

// =============================================
// Refund Method Handler
// =============================================
function handleRefundMethodChange() {
    const refundMethod = document.getElementById('RefundMethod');
    const paidInput = document.getElementById('PaidAmount');
    const cashBoxField = document.getElementById('CashBoxField');
    const bankField = document.getElementById('BankField');
    const grandTotalEl = document.getElementById('GrandTotal');

    if (!refundMethod) return;

    const method = refundMethod.value;
    const grandTotal = parseFloat(grandTotalEl?.value) || 0;

    if (cashBoxField) {
        cashBoxField.style.display = (method === 'cash' || method === 'voucher') ? 'block' : 'none';
    }
    if (bankField) {
        bankField.style.display = (method === 'bank_transfer') ? 'block' : 'none';
    }

    if (paidInput) {
        switch (method) {
            case 'cash':
            case 'bank_transfer':
                paidInput.value = grandTotal.toFixed(2);
                paidInput.readOnly = true;
                paidInput.style.background = 'var(--bg-hover)';
                break;
            case 'credit_balance':
                paidInput.value = '0.00';
                paidInput.readOnly = true;
                paidInput.style.background = 'var(--bg-hover)';
                break;
            case 'voucher':
                paidInput.readOnly = false;
                paidInput.style.background = '';
                if (parseFloat(paidInput.value) === 0 || parseFloat(paidInput.value) === grandTotal) {
                    paidInput.value = grandTotal.toFixed(2);
                }
                break;
        }
    }

    calculateReturnTotals();
}

// =============================================
// Event Listeners
// =============================================
function setupEventListeners() {
    // Keyboard navigation for invoice dropdown
    if (invoiceSearchInput) {
        invoiceSearchInput.addEventListener('keydown', function (e) {
            const items = invoiceDropdownContent?.querySelectorAll('.SelectOption-Item[data-number]');
            if (!items || items.length === 0) return;

            let activeIndex = -1;
            items.forEach((item, index) => {
                if (item.classList.contains('active')) activeIndex = index;
            });

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    activeIndex = (activeIndex + 1) % items.length;
                    updateActiveInvoiceItem(items, activeIndex);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    activeIndex = activeIndex <= 0 ? items.length - 1 : activeIndex - 1;
                    updateActiveInvoiceItem(items, activeIndex);
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (activeIndex >= 0 && items[activeIndex]) {
                        const number = items[activeIndex].dataset.number;
                        selectOriginalInvoice(number);
                    }
                    break;
                case 'Escape':
                    hideOriginalInvoiceDropdown();
                    break;
            }
        });
    }

    window.addEventListener('beforeunload', function (e) {
        if (returnItems.length > 0) {
            e.preventDefault();
            e.returnValue = 'لديك أصناف في المرتجع لم يتم حفظها. هل تريد مغادرة الصفحة؟';
            return e.returnValue;
        }
    });
}

function updateActiveInvoiceItem(items, index) {
    items.forEach(item => item.classList.remove('active'));
    if (items[index]) {
        items[index].classList.add('active');
        items[index].scrollIntoView({ block: 'nearest' });
    }
}

// =============================================
// Popup: Open Return Item Selector
// =============================================
function openReturnItemPopup() {
    if (!originalInvoice) {
        ArbahToast.warning('يرجى اختيار فاتورة المبيعات الأصلية أولاً!', 4000, { title: 'تنبيه!' });
        if (invoiceSearchInput) invoiceSearchInput.focus();
        return;
    }

    openPopUpWindow('AddReturnPopup');
    setTimeout(function () {
        initReturnPopup();
    }, 50);
}

function initReturnPopup() {
    const searchInput = document.getElementById('ReturnItemSearchInput');
    if (searchInput) searchInput.value = '';

    selectedReturnItems.clear();
    document.querySelectorAll('#ReturnItemsTableBody tr.selected').forEach(row => row.classList.remove('selected'));
    document.querySelectorAll('#ReturnItemsTableBody .item-checkbox').forEach(cb => cb.checked = false);

    const availableItems = originalItems.filter(item => item.availableQty > 0);
    renderReturnItemsTable(availableItems);
    if (searchInput) searchInput.focus();
}

function renderReturnItemsTable(items) {
    const tbody = document.getElementById('ReturnItemsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!items || items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:30px;color:var(--text-sub)">لا توجد أصناف متاحة للإرجاع</td></tr>';
        updateReturnSelectAllState();
        return;
    }

    items.forEach((item, index) => {
        const row = document.createElement('tr');
        row.setAttribute('data-id', item.id);
        const isChecked = selectedReturnItems.has(item.id) ? 'checked' : '';

        row.innerHTML = `
            <td style="text-align:center"><input type="checkbox" class="item-checkbox" data-id="${item.id}" ${isChecked}></td>
            <td>${index + 1}</td>
            <td><strong>${escapeHtml(item.code)}</strong></td>
            <td>${escapeHtml(item.name)}</td>
            <td>${escapeHtml(item.unit)}</td>
            <td style="font-weight:600">${item.saleQty}</td>
            <td style="color:var(--accent-red)">${item.returnedQty}</td>
            <td style="font-weight:700;color:var(--accent-green)">${item.availableQty}</td>
            <td style="font-weight:600;color:var(--accent-blue)">${item.price.toFixed(2)}</td>
        `;

        if (selectedReturnItems.has(item.id)) row.classList.add('selected');

        const checkbox = row.querySelector('.item-checkbox');
        checkbox.addEventListener('change', function (e) {
            toggleReturnItemSelection(item.id, e.target.checked);
            if (e.target.checked) row.classList.add('selected');
            else row.classList.remove('selected');
        });

        row.addEventListener('click', function (e) {
            if (e.target.type === 'checkbox') return;
            checkbox.checked = !checkbox.checked;
            checkbox.dispatchEvent(new Event('change'));
        });

        row.addEventListener('dblclick', function (e) {
            if (e.target.type === 'checkbox') return;
            addSingleReturnItem(item.id);
        });

        tbody.appendChild(row);
    });

    updateReturnSelectAllState();
}

function toggleReturnItemSelection(id, checked) {
    if (checked) selectedReturnItems.add(id);
    else selectedReturnItems.delete(id);
    updateReturnAddButtonState();
    updateReturnSelectAllState();
}

function toggleReturnSelectAll() {
    const selectAllCheckbox = document.getElementById('SelectAllReturnItems');
    if (!selectAllCheckbox) return;

    const isChecked = selectAllCheckbox.checked;
    const visibleItems = document.querySelectorAll('#ReturnItemsTableBody tr');

    visibleItems.forEach(row => {
        const checkbox = row.querySelector('.item-checkbox');
        if (checkbox) {
            checkbox.checked = isChecked;
            const id = checkbox.getAttribute('data-id');
            if (isChecked) {
                selectedReturnItems.add(id);
                row.classList.add('selected');
            } else {
                selectedReturnItems.delete(id);
                row.classList.remove('selected');
            }
        }
    });

    updateReturnAddButtonState();
}

function updateReturnSelectAllState() {
    const checkboxes = document.querySelectorAll('#ReturnItemsTableBody .item-checkbox');
    const checkedBoxes = document.querySelectorAll('#ReturnItemsTableBody .item-checkbox:checked');
    const selectAllCheckbox = document.getElementById('SelectAllReturnItems');

    if (!selectAllCheckbox) return;

    if (checkboxes.length === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    } else if (checkedBoxes.length === checkboxes.length) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
    } else if (checkedBoxes.length === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true;
    }
}

function updateReturnAddButtonState() {
    const btn = document.getElementById('AddReturnSelectedBtn');
    const countSpan = document.getElementById('ReturnSelectedCount');
    if (btn) btn.disabled = selectedReturnItems.size === 0;
    if (countSpan) countSpan.textContent = selectedReturnItems.size;
}

function searchReturnItems() {
    const searchInput = document.getElementById('ReturnItemSearchInput');
    if (!searchInput) return;

    const query = searchInput.value.toLowerCase().trim();
    const availableItems = originalItems.filter(item => item.availableQty > 0);

    if (!query) {
        renderReturnItemsTable(availableItems);
        return;
    }

    const filtered = availableItems.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.code.toLowerCase().includes(query) ||
        item.id.toString().toLowerCase().includes(query)
    );

    renderReturnItemsTable(filtered);
}

// =============================================
// Add Items to Return
// =============================================
function createReturnItem(originalItem) {
    return {
        id: originalItem.id,
        code: originalItem.code,
        name: originalItem.name,
        unit: originalItem.unit,
        saleQty: originalItem.saleQty,
        returnedQty: originalItem.returnedQty,
        availableQty: originalItem.availableQty,
        returnQty: 1,
        price: originalItem.price,
        discountPercent: originalItem.discountPercent,
        discountAmount: originalItem.discountAmount,
        taxPercent: originalItem.taxPercent,
        taxExempt: originalItem.taxExempt,
        taxAmount: 0,
        total: 0
    };
}

function addSingleReturnItem(id) {
    const originalItem = originalItems.find(i => i.id === id);
    if (!originalItem || originalItem.availableQty <= 0) return;

    const existing = returnItems.find(i => i.id === id);
    if (existing) {
        if (existing.returnQty < originalItem.availableQty) {
            existing.returnQty += 1;
        } else {
            ArbahToast.warning('لا يمكن إرجاع أكثر من الكمية المتاحة!', 4000, { title: 'تنبيه!' });
            return;
        }
    } else {
        returnItems.push(createReturnItem(originalItem));
    }

    selectedReturnItems.delete(id);
    renderReturnTable();
    calculateReturnTotals();
    closePopUpWindow('AddReturnPopup');
}

function addSelectedReturnItems() {
    if (selectedReturnItems.size === 0) return;

    selectedReturnItems.forEach(id => {
        const originalItem = originalItems.find(i => i.id === id);
        if (!originalItem || originalItem.availableQty <= 0) return;

        const existing = returnItems.find(i => i.id === id);
        if (existing) {
            if (existing.returnQty < originalItem.availableQty) {
                existing.returnQty += 1;
            }
        } else {
            returnItems.push(createReturnItem(originalItem));
        }
    });

    selectedReturnItems.clear();
    document.querySelectorAll('#ReturnItemsTableBody tr.selected').forEach(row => row.classList.remove('selected'));
    document.querySelectorAll('#ReturnItemsTableBody .item-checkbox').forEach(cb => cb.checked = false);

    renderReturnTable();
    calculateReturnTotals();
    closePopUpWindow('AddReturnPopup');
}

// =============================================
// Return Table
// =============================================
function renderReturnTable() {
    const tbody = document.getElementById('ReturnTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (returnItems.length === 0) {
        let msg = 'اختر فاتورة المبيعات الأصلية لعرض الأصناف المتاحة للإرجاع';
        if (originalInvoice) {
            msg = 'اضغط "إضافة صنف للإرجاع" لاختيار الأصناف المراد إرجاعها';
        }
        tbody.innerHTML = '<tr><td colspan="12" class="NotFound"><i class="fa-solid fa-arrow-right-to-bracket" style="margin-left: 8px;"></i> ' + msg + '</td></tr>';

        const countEl = document.getElementById('ItemsCount');
        const totalOriginalEl = document.getElementById('TotalOriginalQty');
        if (countEl) countEl.textContent = 'عدد الأصناف المرتجعة: 0';
        if (totalOriginalEl) totalOriginalEl.textContent = 'إجمالي كمية البيع: 0';
        return;
    }

    let totalOriginalQty = 0;

    returnItems.forEach((item, index) => {
        const subtotal = item.price * item.returnQty;
        const discountAmount = (subtotal * item.discountPercent / 100) + item.discountAmount;
        const afterDiscount = subtotal - discountAmount;
        const taxAmount = item.taxExempt ? 0 : (afterDiscount * item.taxPercent / 100);
        const total = afterDiscount + taxAmount;

        item.taxAmount = taxAmount;
        item.total = total;
        totalOriginalQty += item.returnQty;

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>
                <div class="Name-Cell">
                    <i class="fa-solid fa-rotate-left Color-Bg-orange"></i>
                    <div class="Name-Cell-info">
                        <span class="name">${escapeHtml(item.name)}</span>
                        <span class="code">${escapeHtml(item.code)}</span>
                    </div>
                </div>
            </td>
            <td>${escapeHtml(item.unit)}</td>
            <td>${item.saleQty}</td>
            <td>
                <input type="number" value="${item.returnQty}" min="1" max="${item.availableQty}"
                    onchange="updateReturnQty('${item.id}',this.value)"
                    class="invoice-input"
                    title="الكمية المراد إرجاعها (الحد الأقصى: ${item.availableQty})">
            </td>
            <td>
                <input type="number" value="${item.price.toFixed(2)}" min="0" step="1.00"
                    onchange="updateReturnPrice('${item.id}',this.value)"
                    class="invoice-input">
            </td>
            <td><span class="status-badge Color-Bg-green">${subtotal.toFixed(2)}</span></td>
            <td>
                <input type="number" value="${item.discountPercent}" min="0" max="100" step="1.00"
                    onchange="updateReturnDiscountPercent('${item.id}',this.value)" title="نسبة الخصم"
                     class="invoice-input">
            </td>
            <td>
                <input type="number" value="${item.taxPercent}" min="0" max="100" step="1.00"
                    onchange="updateReturnTaxPercent('${item.id}',this.value)" title="نسبة الضريبة"
                     class="invoice-input" ${item.taxExempt ? 'disabled' : ''}>
            </td>
            <td ><span class="status-badge Color-Bg-orange">${taxAmount.toFixed(2)}</span></td>
            <td ><span class="status-badge Color-Bg-blue">${total.toFixed(2)}</span></td>
            <td>
                <button class="Action-Row-Btn" onclick="removeReturnItem('${item.id}')" title="حذف من المرتجع">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;

        const inputs = row.querySelectorAll('.invoice-input');
        inputs.forEach(input => {
            input.addEventListener('focus', function () { this.select(); });
        });

        tbody.appendChild(row);
    });

    const countEl = document.getElementById('ItemsCount');
    const totalOriginalEl = document.getElementById('TotalOriginalQty');
    if (countEl) countEl.textContent = 'عدد الأصناف المرتجعة: ' + returnItems.length;
    if (totalOriginalEl) totalOriginalEl.textContent = 'إجمالي كمية المرتجع: ' + totalOriginalQty;
}

// =============================================
// Update Return Item Properties
// =============================================
function updateReturnQty(id, value) {
    const item = returnItems.find(i => i.id === id);
    if (!item) return;

    const newQty = Math.max(1, Math.min(parseInt(value) || 1, item.availableQty));
    if (parseInt(value) > item.availableQty) {
        ArbahToast.warning('لا يمكن إرجاع أكثر من الكمية المتاحة (' + item.availableQty + ')', 4000, { title: 'تنبيه!' });
    }
    item.returnQty = newQty;
    renderReturnTable();
    calculateReturnTotals();
}

function updateReturnPrice(id, value) {
    const item = returnItems.find(i => i.id === id);
    if (item) {
        item.price = Math.max(0, parseFloat(value) || 0);
        renderReturnTable();
        calculateReturnTotals();
    }
}

function updateReturnDiscountPercent(id, value) {
    const item = returnItems.find(i => i.id === id);
    if (item) {
        item.discountPercent = Math.max(0, Math.min(100, parseFloat(value) || 0));
        renderReturnTable();
        calculateReturnTotals();
    }
}

function updateReturnTaxPercent(id, value) {
    const item = returnItems.find(i => i.id === id);
    if (item) {
        item.taxPercent = Math.max(0, parseFloat(value) || 0);
        renderReturnTable();
        calculateReturnTotals();
    }
}

function removeReturnItem(id) {
    if (!confirm('هل أنت متأكد من حذف هذا الصنف من المرتجع؟')) return;
    returnItems = returnItems.filter(i => i.id !== id);
    renderReturnTable();
    calculateReturnTotals();
}

function clearAllReturnItems() {
    if (returnItems.length === 0) return;
    if (!confirm('هل أنت متأكد من إفراغ قائمة المرتجع؟')) return;
    returnItems = [];
    renderReturnTable();
    calculateReturnTotals();
}

// =============================================
// Tax Calculations
// =============================================
function calculatePriceExcludingTax(priceIncludingTax, taxPercent) {
    return priceIncludingTax / (1 + taxPercent / 100);
}

function handlePriceIncludesTaxChange() {
    const select = document.getElementById('PriceIncludesTax');
    priceIncludesTax = select ? select.value === 'true' : false;

    returnItems.forEach(item => {
        if (priceIncludesTax && !item.taxExempt) {
            if (!item._originalPriceIncludesTax) {
                item._originalPriceIncludesTax = item.price;
            }
            item.price = calculatePriceExcludingTax(item._originalPriceIncludesTax, item.taxPercent);
            item.priceIncludesTax = true;
        } else {
            if (item._originalPriceIncludesTax) {
                item.price = item._originalPriceIncludesTax;
                delete item._originalPriceIncludesTax;
            }
            item.priceIncludesTax = false;
        }
    });

    renderReturnTable();
    calculateReturnTotals();
}

// =============================================
// Calculations
// =============================================
function calculateReturnTotals() {
    let subTotal = 0;
    let totalDiscount = 0;
    let totalAfterDiscount = 0;
    let totalTax = 0;
    let grandTotal = 0;

    returnItems.forEach(item => {
        const itemSubtotal = item.price * item.returnQty;
        const itemDiscount = (itemSubtotal * item.discountPercent / 100) + item.discountAmount;
        const itemAfterDiscount = itemSubtotal - itemDiscount;
        const itemTax = item.taxExempt ? 0 : (itemAfterDiscount * item.taxPercent / 100);
        const itemTotal = itemAfterDiscount + itemTax;

        subTotal += itemSubtotal;
        totalDiscount += itemDiscount;
        totalAfterDiscount += itemAfterDiscount;
        totalTax += itemTax;
        grandTotal += itemTotal;

        item.taxAmount = itemTax;
        item.total = itemTotal;
    });

    const generalDiscountPercentEl = document.getElementById('DiscountPercent');
    let generalDiscount = 0;
    if (generalDiscountPercentEl) {
        generalDiscount = totalAfterDiscount * (parseFloat(generalDiscountPercentEl.value) || 0) / 100;
    }

    const finalTotal = grandTotal - generalDiscount;

    const refundMethod = document.getElementById('RefundMethod')?.value || 'cash';
    const paidAmountEl = document.getElementById('PaidAmount');
    let paidAmount = 0;

    if (paidAmountEl) {
        if (refundMethod === 'cash' || refundMethod === 'bank_transfer') {
            paidAmount = finalTotal;
            paidAmountEl.value = paidAmount.toFixed(2);
        } else if (refundMethod === 'credit_balance') {
            paidAmount = 0;
            paidAmountEl.value = '0.00';
        } else {
            paidAmount = Math.min(parseFloat(paidAmountEl.value) || 0, finalTotal);
            if (paidAmount > finalTotal) {
                paidAmount = finalTotal;
                paidAmountEl.value = paidAmount.toFixed(2);
            }
        }
    }

    const remainingAmount = finalTotal - paidAmount;

    const els = {
        subTotal: document.getElementById('SubTotal'),
        totalDiscount: document.getElementById('TotalDiscount'),
        discountAmount: document.getElementById('DiscountAmount'),
        totalAfterDiscount: document.getElementById('TotalAfterDiscount'),
        taxAmount: document.getElementById('TaxAmount'),
        grandTotal: document.getElementById('GrandTotal'),
        paidAmount: document.getElementById('PaidAmount'),
        remainingAmount: document.getElementById('RemainingAmount')
    };

    if (els.subTotal) els.subTotal.value = subTotal.toFixed(2);
    if (els.totalDiscount) els.totalDiscount.value = totalDiscount.toFixed(2);
    if (els.discountAmount) els.discountAmount.value = generalDiscount.toFixed(2);
    if (els.totalAfterDiscount) els.totalAfterDiscount.value = (totalAfterDiscount - generalDiscount).toFixed(2);
    if (els.taxAmount) els.taxAmount.value = totalTax.toFixed(2);
    if (els.grandTotal) els.grandTotal.value = finalTotal.toFixed(2);
    if (els.paidAmount) els.paidAmount.value = paidAmount.toFixed(2);
    if (els.remainingAmount) els.remainingAmount.value = remainingAmount.toFixed(2);
}

// =============================================
// Save Return Invoice
// =============================================
function saveReturnInvoice() {
    if (!originalInvoice) {
        ArbahToast.warning('يرجى اختيار فاتورة المبيعات الأصلية أولاً!', 4000, { title: 'تنبيه!' });
        if (invoiceSearchInput) invoiceSearchInput.focus();
        return;
    }

    if (returnItems.length === 0) {
        ArbahToast.error('لا يمكن حفظ مرتجع فارغ!', 4000, { title: 'خطأ!' });
        return;
    }

    for (let item of returnItems) {
        if (item.returnQty > item.availableQty) {
            ArbahToast.error('الصنف ' + item.name + ' يتجاوز الكمية المتاحة للإرجاع!', 4000, { title: 'خطأ!' });
            return;
        }
    }

    const returnData = collectReturnData();
    console.log('✅ Sales Return saved:', returnData);

    returnItems.forEach(returnItem => {
        const originalItem = originalItems.find(i => i.id === returnItem.id);
        if (originalItem) {
            originalItem.returnedQty += returnItem.returnQty;
            originalItem.availableQty -= returnItem.returnQty;
        }
    });

    ArbahToast.success('تم حفظ مرتجع المبيعات بنجاح! رقم المرتجع: ' + CONFIG.INVOICE_PREFIX + '0001', 6000, { title: 'تم بنجاح!' });

    resetReturnInvoice();
}

function collectReturnData() {
    return {
        returnNumber: document.querySelector('input[value^="' + CONFIG.INVOICE_PREFIX + '"]')?.value || '',
        originalInvoiceId: originalInvoice?.id || '',
        originalInvoiceNumber: originalInvoice?.number || '',
        date: document.getElementById('ReturnDate')?.value,
        CustomerId: document.getElementById('CustomerId')?.value || '',
        CustomerName: document.getElementById('CustomerName')?.value || '',
        salesRep: document.getElementById('SalesRepName')?.value || '',
        warehouseId: originalInvoice?.warehouseId || '',
        warehouseName: originalInvoice?.warehouseName || '',
        returnReason: document.getElementById('ReturnReason')?.value || '',
        refundMethod: document.getElementById('RefundMethod')?.value || 'cash',
        cashBoxId: document.getElementById('CashBoxSelect')?.value || '',
        bankId: document.getElementById('BankSelect')?.value || '',
        items: returnItems.map(item => ({
            id: item.id,
            code: item.code,
            name: item.name,
            unit: item.unit,
            saleQty: item.saleQty,
            returnQty: item.returnQty,
            price: item.price,
            discountPercent: item.discountPercent,
            discountAmount: item.discountAmount,
            taxPercent: item.taxPercent,
            taxAmount: item.taxAmount,
            total: item.total,
            taxExempt: item.taxExempt
        })),
        subTotal: parseFloat(document.getElementById('SubTotal')?.value) || 0,
        totalDiscount: parseFloat(document.getElementById('TotalDiscount')?.value) || 0,
        generalDiscount: parseFloat(document.getElementById('DiscountAmount')?.value) || 0,
        totalAfterDiscount: parseFloat(document.getElementById('TotalAfterDiscount')?.value) || 0,
        taxAmount: parseFloat(document.getElementById('TaxAmount')?.value) || 0,
        grandTotal: parseFloat(document.getElementById('GrandTotal')?.value) || 0,
        paidAmount: parseFloat(document.getElementById('PaidAmount')?.value) || 0,
        remainingAmount: parseFloat(document.getElementById('RemainingAmount')?.value) || 0
    };
}

// =============================================
// Reset & Print
// =============================================
function resetReturnInvoice() {
    returnItems = [];
    selectedReturnItems.clear();

    clearInvoiceSelection();

    document.getElementById('AddItemBtn').disabled = true;
    document.getElementById('OriginalInvoiceInfo').innerHTML = '<i class="fa-solid fa-circle-info"></i> اختر فاتورة المبيعات أولاً';

    const discountPercent = document.getElementById('DiscountPercent');
    if (discountPercent) discountPercent.value = '0';

    ['CashBoxSelect', 'BankSelect'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    originalInvoice = null;
    originalItems = [];

    renderReturnTable();
    calculateReturnTotals();
    handleRefundMethodChange();
}

function printReturnInvoice() {
    if (returnItems.length === 0) {
        ArbahToast.error('لا يمكن طباعة مرتجع فارغ!', 4000, { title: 'خطأ!' });
        return;
    }
    window.print();
}

// =============================================
// Utility Functions
// =============================================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatCurrency(amount) {
    return parseFloat(amount).toFixed(2);
}

// =============================================
// Aliases
// =============================================
function searchSalesReturnItems() { return searchReturnItems(); }
function toggleSalesReturnSelectAll() { return toggleReturnSelectAll(); }
function addSingleSalesReturnItem(id) { return addSingleReturnItem(id); }
function addSelectedSalesReturnItems() { return addSelectedReturnItems(); }
function saveSalesReturnInvoice() { return saveReturnInvoice(); }
function resetSalesReturnInvoice() { return resetReturnInvoice(); }
function printSalesReturnInvoice() { return printReturnInvoice(); }
function clearAllSalesReturnItems() { return clearAllReturnItems(); }
function updateSalesReturnQty(id, value) { return updateReturnQty(id, value); }
function updateSalesReturnPrice(id, value) { return updateReturnPrice(id, value); }
function updateSalesReturnDiscountPercent(id, value) { return updateReturnDiscountPercent(id, value); }
function updateSalesReturnTaxPercent(id, value) { return updateReturnTaxPercent(id, value); }
function removeSalesReturnItem(id) { return removeReturnItem(id); }
function calculateSalesReturnTotals() { return calculateReturnTotals(); }
function handleSalesReturnRefundMethodChange() { return handleRefundMethodChange(); }
function loadSalesReturnOriginalInvoice() { return; }

// =============================================
window.SalesReturn = {
    loadOriginalInvoiceData,
    openReturnItemPopup,
    initReturnPopup,
    renderReturnItemsTable,
    addSingleReturnItem,
    addSelectedReturnItems,
    removeReturnItem,
    clearAllReturnItems,
    saveReturnInvoice,
    resetReturnInvoice,
    printReturnInvoice,
    calculateReturnTotals,
    searchReturnItems,
    toggleReturnSelectAll,
    handlePriceIncludesTaxChange,
    handleRefundMethodChange,
    updateReturnQty,
    updateReturnPrice,
    updateReturnDiscountPercent,
    updateReturnTaxPercent,
    showOriginalInvoiceDropdown,
    hideOriginalInvoiceDropdown,
    filterOriginalInvoices,
    selectOriginalInvoice,
    clearInvoiceSelection,
    returnItems,
    originalItems,
    originalInvoice
};