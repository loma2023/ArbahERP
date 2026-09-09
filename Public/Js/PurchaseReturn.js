// =============================================
// ERP System - ArbahERP
// Purchase Return Module
// =============================================

'use strict';

// =============================================
// Configuration
// =============================================
const CONFIG = {
    TAX_RATE: 0.15,
    DEFAULT_DUE_DAYS: 30,
    RETURN_PREFIX: '26-RT-'
};

// =============================================
// Inventory Data (Temporary - until Node.js API)
// =============================================
const INVENTORY_DATA = {
    items: [
        { _id: "itm_001", code: "ITM-001", name: "لابتوب Dell Latitude 5520", category: "أجهزة كمبيوتر", prices: { cost: 3800, wholesale: 4200, retail: 4500, vip: 4000 }, units: [{ unit: "جهاز", price: 3800, isDefault: true }, { unit: "كرتونة", price: 22000, isDefault: false }], stock: { quantity: 15, minLevel: 5, maxLevel: 50 }, tax: { exempt: false, rate: 15 }, status: "active" },
        { _id: "itm_002", code: "ITM-002", name: "ماوس لاسلكي Logitech", category: "ملحقات", prices: { cost: 85, wholesale: 100, retail: 120, vip: 110 }, units: [{ unit: "قطعة", price: 85, isDefault: true }, { unit: "دزينة", price: 1200, isDefault: false }, { unit: "كرتونة", price: 5000, isDefault: false }], stock: { quantity: 50, minLevel: 20, maxLevel: 100 }, tax: { exempt: false, rate: 15 }, status: "active" },
        { _id: "itm_003", code: "ITM-003", name: "كيبورد ميكانيكي Redragon", category: "ملحقات", prices: { cost: 220, wholesale: 250, retail: 280, vip: 260 }, units: [{ unit: "قطعة", price: 220, isDefault: true }, { unit: "كرتونة", price: 2500, isDefault: false }], stock: { quantity: 30, minLevel: 10, maxLevel: 80 }, tax: { exempt: false, rate: 15 }, status: "active" },
        { _id: "itm_004", code: "ITM-004", name: "شاشة Samsung 27 بوصة", category: "شاشات", prices: { cost: 1000, wholesale: 1100, retail: 1200, vip: 1150 }, units: [{ unit: "جهاز", price: 1000, isDefault: true }, { unit: "كرتونة", price: 5500, isDefault: false }], stock: { quantity: 8, minLevel: 3, maxLevel: 30 }, tax: { exempt: false, rate: 15 }, status: "active" },
        { _id: "itm_005", code: "ITM-005", name: "طابعة HP LaserJet", category: "طابعات", prices: { cost: 720, wholesale: 800, retail: 850, vip: 820 }, units: [{ unit: "جهاز", price: 720, isDefault: true }, { unit: "كرتونة", price: 4000, isDefault: false }], stock: { quantity: 12, minLevel: 5, maxLevel: 40 }, tax: { exempt: false, rate: 15 }, status: "active" },
        { _id: "itm_006", code: "ITM-006", name: "راوتر TP-Link AC1200", category: "شبكات", prices: { cost: 270, wholesale: 300, retail: 320, vip: 310 }, units: [{ unit: "جهاز", price: 270, isDefault: true }, { unit: "كرتونة", price: 2800, isDefault: false }], stock: { quantity: 20, minLevel: 8, maxLevel: 60 }, tax: { exempt: false, rate: 15 }, status: "active" },
        { _id: "itm_007", code: "ITM-007", name: "هارد ديسك خارجي 2TB", category: "تخزين", prices: { cost: 380, wholesale: 420, retail: 450, vip: 430 }, units: [{ unit: "جهاز", price: 380, isDefault: true }, { unit: "كرتونة", price: 4000, isDefault: false }], stock: { quantity: 25, minLevel: 10, maxLevel: 70 }, tax: { exempt: false, rate: 15 }, status: "active" },
        { _id: "itm_008", code: "ITM-008", name: "بطارية لابتوب Dell", category: "ملحقات", prices: { cost: 280, wholesale: 320, retail: 350, vip: 330 }, units: [{ unit: "قطعة", price: 280, isDefault: true }, { unit: "كرتونة", price: 3000, isDefault: false }], stock: { quantity: 10, minLevel: 5, maxLevel: 40 }, tax: { exempt: false, rate: 15 }, status: "active" },
        { _id: "itm_009", code: "ITM-009", name: "كابل HDMI 2 متر", category: "كابلات", prices: { cost: 30, wholesale: 38, retail: 45, vip: 40 }, units: [{ unit: "قطعة", price: 30, isDefault: true }, { unit: "دزينة", price: 450, isDefault: false }, { unit: "كرتونة", price: 1800, isDefault: false }], stock: { quantity: 100, minLevel: 30, maxLevel: 200 }, tax: { exempt: true, rate: 0 }, status: "active" },
        { _id: "itm_010", code: "ITM-010", name: "سماعات رأس JBL", category: "صوتيات", prices: { cost: 140, wholesale: 160, retail: 180, vip: 170 }, units: [{ unit: "قطعة", price: 140, isDefault: true }, { unit: "دزينة", price: 1800, isDefault: false }, { unit: "كرتونة", price: 7000, isDefault: false }], stock: { quantity: 40, minLevel: 15, maxLevel: 100 }, tax: { exempt: false, rate: 15 }, status: "active" },
        { _id: "itm_011", code: "ITM-011", name: "ويب كام Logitech C920", category: "ملحقات", prices: { cost: 300, wholesale: 350, retail: 380, vip: 360 }, units: [{ unit: "جهاز", price: 300, isDefault: true }, { unit: "كرتونة", price: 3500, isDefault: false }], stock: { quantity: 18, minLevel: 5, maxLevel: 50 }, tax: { exempt: false, rate: 15 }, status: "active" },
        { _id: "itm_012", code: "ITM-012", name: "USB Flash 64GB", category: "تخزين", prices: { cost: 40, wholesale: 48, retail: 55, vip: 50 }, units: [{ unit: "قطعة", price: 40, isDefault: true }, { unit: "دزينة", price: 550, isDefault: false }, { unit: "كرتونة", price: 2200, isDefault: false }], stock: { quantity: 60, minLevel: 20, maxLevel: 150 }, tax: { exempt: true, rate: 0 }, status: "active" },
        { _id: "itm_013", code: "ITM-013", name: "مكبر صوت بلوتوث", category: "صوتيات", prices: { cost: 170, wholesale: 200, retail: 220, vip: 210 }, units: [{ unit: "جهاز", price: 170, isDefault: true }, { unit: "كرتونة", price: 2000, isDefault: false }], stock: { quantity: 22, minLevel: 8, maxLevel: 60 }, tax: { exempt: false, rate: 15 }, status: "active" },
        { _id: "itm_014", code: "ITM-014", name: "ستاند لابتوب ألومنيوم", category: "ملحقات", prices: { cost: 70, wholesale: 85, retail: 95, vip: 90 }, units: [{ unit: "قطعة", price: 70, isDefault: true }, { unit: "دزينة", price: 950, isDefault: false }, { unit: "كرتونة", price: 3500, isDefault: false }], stock: { quantity: 35, minLevel: 10, maxLevel: 80 }, tax: { exempt: true, rate: 0 }, status: "active" },
        { _id: "itm_015", code: "ITM-015", name: "حقيبة لابتوب 15.6 بوصة", category: "ملحقات", prices: { cost: 120, wholesale: 135, retail: 150, vip: 140 }, units: [{ unit: "قطعة", price: 120, isDefault: true }, { unit: "دزينة", price: 1500, isDefault: false }, { unit: "كرتونة", price: 5500, isDefault: false }], stock: { quantity: 28, minLevel: 10, maxLevel: 70 }, tax: { exempt: false, rate: 15 }, status: "active" },
        { _id: "itm_016", code: "ITM-016", name: "ماوس باد كبير", category: "ملحقات", prices: { cost: 25, wholesale: 30, retail: 35, vip: 32 }, units: [{ unit: "قطعة", price: 25, isDefault: true }, { unit: "دزينة", price: 350, isDefault: false }, { unit: "كرتونة", price: 1400, isDefault: false }], stock: { quantity: 80, minLevel: 25, maxLevel: 150 }, tax: { exempt: true, rate: 0 }, status: "active" },
        { _id: "itm_017", code: "ITM-017", name: "كابل USB-C", category: "كابلات", prices: { cost: 28, wholesale: 35, retail: 40, vip: 37 }, units: [{ unit: "قطعة", price: 28, isDefault: true }, { unit: "دزينة", price: 400, isDefault: false }, { unit: "كرتونة", price: 1600, isDefault: false }], stock: { quantity: 90, minLevel: 30, maxLevel: 200 }, tax: { exempt: true, rate: 0 }, status: "active" },
        { _id: "itm_018", code: "ITM-018", name: "شاحن لابتوب 65W", category: "ملحقات", prices: { cost: 140, wholesale: 165, retail: 180, vip: 170 }, units: [{ unit: "جهاز", price: 140, isDefault: true }, { unit: "كرتونة", price: 1600, isDefault: false }], stock: { quantity: 15, minLevel: 5, maxLevel: 50 }, tax: { exempt: false, rate: 15 }, status: "active" },
        { _id: "itm_019", code: "ITM-019", name: "SSD 500GB Samsung", category: "تخزين", prices: { cost: 260, wholesale: 300, retail: 320, vip: 310 }, units: [{ unit: "جهاز", price: 260, isDefault: true }, { unit: "كرتونة", price: 2800, isDefault: false }], stock: { quantity: 20, minLevel: 8, maxLevel: 60 }, tax: { exempt: false, rate: 15 }, status: "active" },
        { _id: "itm_020", code: "ITM-020", name: "RAM 16GB DDR4", category: "ذاكرة", prices: { cost: 230, wholesale: 260, retail: 280, vip: 270 }, units: [{ unit: "قطعة", price: 230, isDefault: true }, { unit: "كرتونة", price: 2500, isDefault: false }], stock: { quantity: 25, minLevel: 10, maxLevel: 70 }, tax: { exempt: false, rate: 15 }, status: "active" }
    ]
};

// =============================================
// State
// =============================================
let inventoryItems = [];
let returnItems = [];
let selectedItems = new Set();
let priceIncludesTax = false;

// =============================================
// Load Inventory
// =============================================
function loadInventoryItems() {
    try {
        inventoryItems = INVENTORY_DATA.items.map(item => ({
            id: item._id,
            code: item.code,
            name: item.name,
            category: item.category,
            costPrice: item.prices.cost,
            wholesalePrice: item.prices.wholesale,
            retailPrice: item.prices.retail,
            vipPrice: item.prices.vip,
            units: item.units.map(u => ({
                unit: u.unit,
                price: u.price,
                isDefault: u.isDefault
            })),
            stock: item.stock.quantity,
            minStock: item.stock.minLevel,
            maxStock: item.stock.maxLevel,
            taxExempt: item.tax.exempt,
            taxRate: item.tax.rate,
            status: item.status
        }));

        console.log('✅ Inventory loaded for return:', inventoryItems.length, 'items');
        return inventoryItems;
    } catch (error) {
        console.error('❌ Failed to load inventory:', error);
        return [];
    }
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
    calculateTotals();
}

// =============================================
// Initialization
// =============================================
document.addEventListener('DOMContentLoaded', function () {
    if (!document.getElementById('InvoiceTable')) return;

    loadInventoryItems();

    const today = new Date().toISOString().split('T')[0];
    const returnDateEl = document.getElementById('ReturnDate');
    if (returnDateEl) returnDateEl.value = today;

    const refundMethod = document.getElementById('RefundMethod');
    if (refundMethod) {
        refundMethod.addEventListener('change', handleRefundMethodChange);
    }

    renderItemsTable(inventoryItems);
    renderReturnTable();
    calculateTotals();
    handleRefundMethodChange();

    setupEventListeners();
});

// =============================================
// Refund Method
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
        cashBoxField.style.display = (method === 'cash' || method === 'partial') ? 'block' : 'none';
    }
    if (bankField) {
        bankField.style.display = (method === 'transfer') ? 'block' : 'none';
    }

    if (paidInput) {
        switch (method) {
            case 'cash':
            case 'transfer':
                paidInput.value = grandTotal.toFixed(2);
                paidInput.readOnly = true;
                paidInput.style.background = 'var(--bg-hover)';
                break;
            case 'credit':
                paidInput.value = '0.00';
                paidInput.readOnly = true;
                paidInput.style.background = 'var(--bg-hover)';
                break;
            case 'partial':
                paidInput.readOnly = false;
                paidInput.style.background = '';
                if (parseFloat(paidInput.value) === 0 || parseFloat(paidInput.value) === grandTotal) {
                    paidInput.value = '0.00';
                }
                paidInput.focus();
                break;
        }
    }

    calculateTotals();
}

// =============================================
// Event Listeners
// =============================================
function setupEventListeners() {
    const quickSearch = document.getElementById('QuickSearchItem');
    if (quickSearch) {
        quickSearch.addEventListener('keyup', function (e) {
            if (e.key === 'Enter') {
                openPopUpWindow('AddNewPopup');
                initInvoicePopup();
                const itemSearch = document.getElementById('ItemSearchInput');
                if (itemSearch) {
                    itemSearch.value = this.value;
                    searchItems();
                }
            }
        });
    }

    const paidInput = document.getElementById('PaidAmount');
    if (paidInput) {
        paidInput.addEventListener('input', calculateTotals);
    }

    window.addEventListener('beforeunload', function (e) {
        if (returnItems.length > 0) {
            e.preventDefault();
            e.returnValue = 'لديك أصناف في المرتجع لم يتم حفظها. هل تريد مغادرة الصفحة؟';
            return e.returnValue;
        }
    });
}

// =============================================
// Item Selector (Popup)
// =============================================
function initInvoicePopup() {
    const searchInput = document.getElementById('ItemSearchInput');
    if (searchInput) searchInput.value = '';
    selectedItems.clear();
    document.querySelectorAll('#ItemsTableBody tr.selected').forEach(row => row.classList.remove('selected'));
    document.querySelectorAll('#ItemsTableBody .item-checkbox').forEach(cb => cb.checked = false);
    renderItemsTable(inventoryItems);
    if (searchInput) searchInput.focus();
}

function renderItemsTable(items) {
    const tbody = document.getElementById('ItemsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:var(--text-sub)">لا توجد أصناف مطابقة</td></tr>';
        updateSelectAllState();
        return;
    }

    items.forEach((item, index) => {
        const row = document.createElement('tr');
        row.setAttribute('data-id', item.id);
        const isChecked = selectedItems.has(item.id) ? 'checked' : '';

        row.innerHTML = `
            <td style="text-align:center"><input type="checkbox" class="item-checkbox" data-id="${item.id}" ${isChecked}></td>
            <td>${index + 1}</td>
            <td><strong>${escapeHtml(item.code)}</strong></td>
            <td>${escapeHtml(item.name)}</td>
            <td>${escapeHtml(item.units[0].unit)}</td>
            <td style="font-weight:600;color:var(--accent-green)">${item.units[0].price.toFixed(2)}</td>
            <td>${item.stock}</td>
        `;

        if (selectedItems.has(item.id)) row.classList.add('selected');

        const checkbox = row.querySelector('.item-checkbox');
        checkbox.addEventListener('change', function (e) {
            toggleItemSelection(item.id, e.target.checked);
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
            addSingleItem(item.id);
        });

        tbody.appendChild(row);
    });

    updateSelectAllState();
}

function toggleItemSelection(id, checked) {
    if (checked) selectedItems.add(id);
    else selectedItems.delete(id);
    updateAddButtonState();
    updateSelectAllState();
}

function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('SelectAllItems');
    if (!selectAllCheckbox) return;

    const isChecked = selectAllCheckbox.checked;
    const visibleItems = document.querySelectorAll('#ItemsTableBody tr');

    visibleItems.forEach(row => {
        const checkbox = row.querySelector('.item-checkbox');
        if (checkbox) {
            checkbox.checked = isChecked;
            const id = checkbox.getAttribute('data-id');
            if (isChecked) {
                selectedItems.add(id);
                row.classList.add('selected');
            } else {
                selectedItems.delete(id);
                row.classList.remove('selected');
            }
        }
    });

    updateAddButtonState();
}

function updateSelectAllState() {
    const checkboxes = document.querySelectorAll('.item-checkbox');
    const checkedBoxes = document.querySelectorAll('.item-checkbox:checked');
    const selectAllCheckbox = document.getElementById('SelectAllItems');

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

function updateAddButtonState() {
    const btn = document.getElementById('AddSelectedBtn');
    const countSpan = document.getElementById('SelectedCount');
    if (btn) btn.disabled = selectedItems.size === 0;
    if (countSpan) countSpan.textContent = selectedItems.size;
}

function searchItems() {
    const searchInput = document.getElementById('ItemSearchInput');
    if (!searchInput) return;

    const query = searchInput.value.toLowerCase().trim();

    if (!query) {
        renderItemsTable(inventoryItems);
        return;
    }

    const filtered = inventoryItems.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.code.toLowerCase().includes(query) ||
        item.id.toString().toLowerCase().includes(query)
    );

    renderItemsTable(filtered);
}

// =============================================
// Add Items to Return
// =============================================
function createReturnItem(item) {
    const newItem = {
        id: item.id,
        code: item.code,
        name: item.name,
        units: item.units,
        selectedUnitIndex: 0,
        unit: item.units[0].unit,
        price: item.units[0].price,
        quantity: 1,
        discountPercent: 0,
        discountAmount: 0,
        taxPercent: item.taxExempt ? 0 : item.taxRate || 15,
        taxAmount: 0,
        total: 0,
        taxExempt: item.taxExempt,
        priceIncludesTax: false
    };

    if (priceIncludesTax && !newItem.taxExempt) {
        newItem._originalPriceIncludesTax = newItem.price;
        newItem.price = calculatePriceExcludingTax(newItem.price, newItem.taxPercent);
        newItem.priceIncludesTax = true;
    }

    return newItem;
}

function addSingleItem(id) {
    const item = inventoryItems.find(i => i.id === id);
    if (!item) return;

    const existing = returnItems.find(i => i.id === id);
    if (existing) {
        existing.quantity += 1;
    } else {
        returnItems.push(createReturnItem(item));
    }

    selectedItems.delete(id);
    renderReturnTable();
    calculateTotals();
    closePopUpWindow('AddNewPopup');
}

function addSelectedItem() {
    if (selectedItems.size === 0) return;

    selectedItems.forEach(id => {
        const item = inventoryItems.find(i => i.id === id);
        if (!item) return;

        const existing = returnItems.find(i => i.id === id);
        if (existing) {
            existing.quantity += 1;
        } else {
            returnItems.push(createReturnItem(item));
        }
    });

    selectedItems.clear();
    document.querySelectorAll('#ItemsTableBody tr.selected').forEach(row => row.classList.remove('selected'));
    document.querySelectorAll('#ItemsTableBody .item-checkbox').forEach(cb => cb.checked = false);

    renderReturnTable();
    calculateTotals();
    closePopUpWindow('AddNewPopup');
}

// =============================================
// Return Table
// =============================================
function renderReturnTable() {
    const tbody = document.getElementById('InvoiceTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (returnItems.length === 0) {
        const emptyRow = document.createElement('tr');
        const emptyCell = document.createElement('td');
        emptyCell.setAttribute('colspan', '12');
        emptyCell.className = 'NotFound';
        emptyCell.textContent = 'لا توجد أصناف في المرتجع. اضغط "إضافة صنف" او F1 للبدء';
        emptyCell.style.cursor = 'pointer';
        emptyCell.addEventListener('click', function() {
            openPopUpWindow('AddNewPopup');
            setTimeout(initInvoicePopup, 100);
        });
        emptyRow.appendChild(emptyCell);
        tbody.appendChild(emptyRow);

        const countEl = document.getElementById('ItemsCount');
        if (countEl) countEl.textContent = 'عدد الأصناف: 0';
        return;
    }

    returnItems.forEach((item, index) => {
        const subtotal = item.price * item.quantity;
        const discountAmount = (subtotal * item.discountPercent / 100) + item.discountAmount;
        const afterDiscount = subtotal - discountAmount;
        const taxAmount = afterDiscount * item.taxPercent / 100;
        const total = afterDiscount + taxAmount;

        item.taxAmount = taxAmount;
        item.total = total;

        const unitOptions = item.units.map((u, idx) => {
            const selected = idx === item.selectedUnitIndex ? 'selected' : '';
            return `<option value="${idx}" ${selected}>${escapeHtml(u.unit)} (${u.price.toFixed(2)})</option>`;
        }).join('');

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>
                <div class="Name-Cell">
                    <i class="fa-solid fa-cube Color-Bg-green"></i>
                    <div class="Name-Cell-info">
                        <span class="name">${escapeHtml(item.name)}</span>
                        <span class="code">${escapeHtml(item.code)}</span>
                    </div>
                </div>
            </td>
            <td>
            <div class="input SelectInput">
                <select class="unit-select" onchange="changeUnit('${item.id}',this.value)">
                    ${unitOptions}
                </select>
            </div>
            </td>
            <td>
                <input type="number" value="${item.quantity}" min="1" max="9999"
                    onchange="updateItemQuantity('${item.id}',this.value)"
                    class="invoice-input">
            </td>
            <td>
                <input type="number" value="${item.price.toFixed(2)}" min="0" step="1.00"
                    onchange="updateItemPrice('${item.id}',this.value)"
                    class="invoice-input">
            </td>
            <td ><span class="status-badge Color-Bg-green">${subtotal.toFixed(2)}</span></td>
            <td>
                <input type="number" value="${item.discountPercent}" min="0" max="100" step="1.00"
                    onchange="updateItemDiscountPercent('${item.id}',this.value)" title="نسبة الخصم"
                    class="invoice-input">
            </td>
            <td>
                <input type="number" value="${item.discountAmount.toFixed(2)}" min="0" step="1.00"
                    onchange="updateItemDiscountAmount('${item.id}',this.value)" title="قيمة الخصم"
                     class="invoice-input">
            </td>
            <td>
                <input type="number" value="${item.taxPercent}" min="0" max="100" step="1.00"
                    onchange="updateItemTaxPercent('${item.id}',this.value)" title="نسبة الضريبة"
                     class="invoice-input" ${item.taxExempt ? 'disabled' : ''}>
            </td>
            <td ><span class="status-badge Color-Bg-orange">${taxAmount.toFixed(2)}</span></td>
            <td ><span class="status-badge Color-Bg-blue">${total.toFixed(2)}</span></td>
            <td>
                <button class="Action-Row-Btn" onclick="removeItem('${item.id}')" title="حذف الصنف">
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
    if (countEl) countEl.textContent = 'عدد الأصناف: ' + returnItems.length;
}

// =============================================
// Update Item Properties
// =============================================
function changeUnit(id, unitIndex) {
    const item = returnItems.find(i => i.id === id);
    if (!item) return;

    const idx = parseInt(unitIndex);
    if (idx >= 0 && idx < item.units.length) {
        item.selectedUnitIndex = idx;
        item.unit = item.units[idx].unit;
        item.price = item.units[idx].price;

        if (priceIncludesTax && !item.taxExempt) {
            item._originalPriceIncludesTax = item.price;
            item.price = calculatePriceExcludingTax(item.price, item.taxPercent);
            item.priceIncludesTax = true;
        }

        renderReturnTable();
        calculateTotals();
    }
}

function updateItemQuantity(id, value) {
    const item = returnItems.find(i => i.id === id);
    if (item) {
        item.quantity = Math.max(1, parseInt(value) || 1);
        renderReturnTable();
        calculateTotals();
    }
}

function updateItemPrice(id, value) {
    const item = returnItems.find(i => i.id === id);
    if (item) {
        const newPrice = Math.max(0, parseFloat(value) || 0);
        if (item.priceIncludesTax) {
            item._originalPriceIncludesTax = newPrice;
            item.price = calculatePriceExcludingTax(newPrice, item.taxPercent);
        } else {
            item.price = newPrice;
        }
        renderReturnTable();
        calculateTotals();
    }
}

function updateItemDiscountPercent(id, value) {
    const item = returnItems.find(i => i.id === id);
    if (item) {
        item.discountPercent = Math.max(0, Math.min(100, parseFloat(value) || 0));
        renderReturnTable();
        calculateTotals();
    }
}

function updateItemDiscountAmount(id, value) {
    const item = returnItems.find(i => i.id === id);
    if (item) {
        const maxDiscount = item.price * item.quantity;
        item.discountAmount = Math.min(Math.max(0, parseFloat(value) || 0), maxDiscount);
        renderReturnTable();
        calculateTotals();
    }
}

function updateItemTaxPercent(id, value) {
    const item = returnItems.find(i => i.id === id);
    if (item) {
        item.taxPercent = Math.max(0, parseFloat(value) || 0);
        renderReturnTable();
        calculateTotals();
    }
}

function removeItem(id) {
    if (!confirm('هل أنت متأكد من حذف هذا الصنف من المرتجع؟')) return;
    returnItems = returnItems.filter(i => i.id !== id);
    renderReturnTable();
    calculateTotals();
}

function clearAllItems() {
    if (returnItems.length === 0) return;
    if (!confirm('هل أنت متأكد من إفراغ المرتجع؟')) return;
    returnItems = [];
    renderReturnTable();
    calculateTotals();
}

// =============================================
// Calculations
// =============================================
function calculateTotals() {
    let subTotal = 0;
    let totalDiscount = 0;
    let totalAfterDiscount = 0;
    let totalTax = 0;
    let grandTotal = 0;

    returnItems.forEach(item => {
        const itemSubtotal = item.price * item.quantity;
        const itemDiscount = (itemSubtotal * item.discountPercent / 100) + item.discountAmount;
        const itemAfterDiscount = itemSubtotal - itemDiscount;
        const itemTax = itemAfterDiscount * item.taxPercent / 100;
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
        if (refundMethod === 'cash' || refundMethod === 'transfer') {
            paidAmount = finalTotal;
            paidAmountEl.value = paidAmount.toFixed(2);
        } else if (refundMethod === 'credit') {
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
// Save Return
// =============================================
function saveReturn() {
    if (returnItems.length === 0) {
        ArbahToast.error('لا يمكن حفظ مرتجع فارغ!', 4000, { title: 'خطأ!' });
        return;
    }

    const entitySelect = document.getElementById('EntitySelect');
    if (!entitySelect || !entitySelect.value) {
        ArbahToast.warning('يرجى اختيار المورد أولاً!', 4000, { title: 'تنبيه!' });
        const entitySearch = document.getElementById('EntitySearchInput');
        if (entitySearch) entitySearch.focus();
        return;
    }

    const returnData = collectReturnData();
    console.log('✅ Purchase return saved:', returnData);
    ArbahToast.success('تم حفظ مرتجع المشتريات بنجاح!', 4000, { title: 'تم بنجاح!' });
    resetReturn();
}

function collectReturnData() {
    return {
        returnNumber: document.querySelector('input[value^="' + CONFIG.RETURN_PREFIX + '"')?.value || '',
        linkedInvoiceNumber: document.getElementById('LinkedInvoiceNumber')?.value || '',
        date: document.getElementById('ReturnDate')?.value,
        originalInvoiceDate: document.getElementById('OriginalInvoiceDate')?.value,
        supplierId: document.getElementById('EntitySelect')?.value,
        returnReason: document.getElementById('ReturnReason')?.value || '',
        refundMethod: document.getElementById('RefundMethod')?.value || 'cash',
        cashBoxId: document.getElementById('CashBoxSelect')?.value || '',
        bankId: document.getElementById('BankSelect')?.value || '',
        costCenterId: document.getElementById('CostCenter')?.value || '',
        warehouseId: document.getElementById('Warehouse')?.value || '',
        items: returnItems.map(item => ({
            id: item.id,
            code: item.code,
            name: item.name,
            unit: item.unit,
            price: item.price,
            quantity: item.quantity,
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
function resetReturn() {
    returnItems = [];
    selectedItems.clear();

    const entitySearch = document.getElementById('EntitySearchInput');
    if (entitySearch) entitySearch.value = '';
    const entitySelect = document.getElementById('EntitySelect');
    if (entitySelect) entitySelect.value = '';
    const linkedInvoice = document.getElementById('LinkedInvoiceNumber');
    if (linkedInvoice) linkedInvoice.value = '';
    const originalDate = document.getElementById('OriginalInvoiceDate');
    if (originalDate) originalDate.value = '';
    const returnReason = document.getElementById('ReturnReason');
    if (returnReason) returnReason.value = '';
    const discountPercent = document.getElementById('DiscountPercent');
    if (discountPercent) discountPercent.value = '0';

    ['CashBoxSelect', 'BankSelect', 'CostCenter', 'Warehouse'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    renderReturnTable();
    calculateTotals();
    handleRefundMethodChange();
}

function printReturn() {
    if (returnItems.length === 0) {
        ArbahToast.error('لا يمكن طباعة مرتجع فارغ!', 4000, { title: 'خطأ!' });
        return;
    }
    window.print();
}

function printReturnFromPage() {
    printReturn();
}

// =============================================
// Popup Functions
// =============================================
function openPopUpWindow(popupId) {
    const popup = document.getElementById(popupId || 'AddNewPopup');
    if (popup) popup.style.display = 'flex';
}

function closePopUpWindow(popupId) {
    const popup = document.getElementById(popupId || 'AddNewPopup');
    if (popup) popup.style.display = 'none';
}
