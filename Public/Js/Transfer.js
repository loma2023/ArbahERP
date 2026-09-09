// =============================================
// Inventory Transfer Module - ArbahERP
// تحويل مخزني بين المخازن
// =============================================

'use strict';

// =============================================
// Inventory Data (Temporary - until Node.js API)
// =============================================
const INVENTORY_DATA = {
    items: [
        { _id: "itm_001", code: "ITM-001", name: "لابتوب Dell Latitude 5520", category: "أجهزة كمبيوتر", prices: { cost: 3800, wholesale: 4200, retail: 4500, vip: 4000 }, units: [{ unit: "جهاز", price: 3800, isDefault: true }, { unit: "كرتونة", price: 22000, isDefault: false }], stock: { main: 8, shaabi: 4, ahsa: 3, minLevel: 5, maxLevel: 50 }, tax: { exempt: false, rate: 15 }, status: "active", weight: 2.5 },
        { _id: "itm_002", code: "ITM-002", name: "ماوس لاسلكي Logitech", category: "ملحقات", prices: { cost: 85, wholesale: 100, retail: 120, vip: 110 }, units: [{ unit: "قطعة", price: 85, isDefault: true }, { unit: "دزينة", price: 1200, isDefault: false }, { unit: "كرتونة", price: 5000, isDefault: false }], stock: { main: 20, shaabi: 15, ahsa: 15, minLevel: 20, maxLevel: 100 }, tax: { exempt: false, rate: 15 }, status: "active", weight: 0.1 },
        { _id: "itm_003", code: "ITM-003", name: "كيبورد ميكانيكي Redragon", category: "ملحقات", prices: { cost: 220, wholesale: 250, retail: 280, vip: 260 }, units: [{ unit: "قطعة", price: 220, isDefault: true }, { unit: "كرتونة", price: 2500, isDefault: false }], stock: { main: 12, shaabi: 8, ahsa: 10, minLevel: 10, maxLevel: 80 }, tax: { exempt: false, rate: 15 }, status: "active", weight: 0.8 },
        { _id: "itm_004", code: "ITM-004", name: "شاشة Samsung 27 بوصة", category: "شاشات", prices: { cost: 1000, wholesale: 1100, retail: 1200, vip: 1150 }, units: [{ unit: "جهاز", price: 1000, isDefault: true }, { unit: "كرتونة", price: 5500, isDefault: false }], stock: { main: 3, shaabi: 2, ahsa: 3, minLevel: 3, maxLevel: 30 }, tax: { exempt: false, rate: 15 }, status: "active", weight: 5.2 },
        { _id: "itm_005", code: "ITM-005", name: "طابعة HP LaserJet", category: "طابعات", prices: { cost: 720, wholesale: 800, retail: 850, vip: 820 }, units: [{ unit: "جهاز", price: 720, isDefault: true }, { unit: "كرتونة", price: 4000, isDefault: false }], stock: { main: 5, shaabi: 3, ahsa: 4, minLevel: 5, maxLevel: 40 }, tax: { exempt: false, rate: 15 }, status: "active", weight: 8.5 },
        { _id: "itm_006", code: "ITM-006", name: "راوتر TP-Link AC1200", category: "شبكات", prices: { cost: 270, wholesale: 300, retail: 320, vip: 310 }, units: [{ unit: "جهاز", price: 270, isDefault: true }, { unit: "كرتونة", price: 2800, isDefault: false }], stock: { main: 8, shaabi: 6, ahsa: 6, minLevel: 8, maxLevel: 60 }, tax: { exempt: false, rate: 15 }, status: "active", weight: 0.4 },
        { _id: "itm_007", code: "ITM-007", name: "هارد ديسك خارجي 2TB", category: "تخزين", prices: { cost: 380, wholesale: 420, retail: 450, vip: 430 }, units: [{ unit: "جهاز", price: 380, isDefault: true }, { unit: "كرتونة", price: 4000, isDefault: false }], stock: { main: 10, shaabi: 7, ahsa: 8, minLevel: 10, maxLevel: 70 }, tax: { exempt: false, rate: 15 }, status: "active", weight: 0.3 },
        { _id: "itm_008", code: "ITM-008", name: "بطارية لابتوب Dell", category: "ملحقات", prices: { cost: 280, wholesale: 320, retail: 350, vip: 330 }, units: [{ unit: "قطعة", price: 280, isDefault: true }, { unit: "كرتونة", price: 3000, isDefault: false }], stock: { main: 4, shaabi: 3, ahsa: 3, minLevel: 5, maxLevel: 40 }, tax: { exempt: false, rate: 15 }, status: "active", weight: 0.5 },
        { _id: "itm_009", code: "ITM-009", name: "كابل HDMI 2 متر", category: "كابلات", prices: { cost: 30, wholesale: 38, retail: 45, vip: 40 }, units: [{ unit: "قطعة", price: 30, isDefault: true }, { unit: "دزينة", price: 450, isDefault: false }, { unit: "كرتونة", price: 1800, isDefault: false }], stock: { main: 40, shaabi: 30, ahsa: 30, minLevel: 30, maxLevel: 200 }, tax: { exempt: true, rate: 0 }, status: "active", weight: 0.05 },
        { _id: "itm_010", code: "ITM-010", name: "سماعات رأس JBL", category: "صوتيات", prices: { cost: 140, wholesale: 160, retail: 180, vip: 170 }, units: [{ unit: "قطعة", price: 140, isDefault: true }, { unit: "دزينة", price: 1800, isDefault: false }, { unit: "كرتونة", price: 7000, isDefault: false }], stock: { main: 15, shaabi: 12, ahsa: 13, minLevel: 15, maxLevel: 100 }, tax: { exempt: false, rate: 15 }, status: "active", weight: 0.3 },
        { _id: "itm_011", code: "ITM-011", name: "ويب كام Logitech C920", category: "ملحقات", prices: { cost: 300, wholesale: 350, retail: 380, vip: 360 }, units: [{ unit: "جهاز", price: 300, isDefault: true }, { unit: "كرتونة", price: 3500, isDefault: false }], stock: { main: 8, shaabi: 5, ahsa: 5, minLevel: 5, maxLevel: 50 }, tax: { exempt: false, rate: 15 }, status: "active", weight: 0.2 },
        { _id: "itm_012", code: "ITM-012", name: "USB Flash 64GB", category: "تخزين", prices: { cost: 40, wholesale: 48, retail: 55, vip: 50 }, units: [{ unit: "قطعة", price: 40, isDefault: true }, { unit: "دزينة", price: 550, isDefault: false }, { unit: "كرتونة", price: 2200, isDefault: false }], stock: { main: 25, shaabi: 20, ahsa: 15, minLevel: 20, maxLevel: 150 }, tax: { exempt: true, rate: 0 }, status: "active", weight: 0.02 },
        { _id: "itm_013", code: "ITM-013", name: "مكبر صوت بلوتوث", category: "صوتيات", prices: { cost: 170, wholesale: 200, retail: 220, vip: 210 }, units: [{ unit: "جهاز", price: 170, isDefault: true }, { unit: "كرتونة", price: 2000, isDefault: false }], stock: { main: 8, shaabi: 7, ahsa: 7, minLevel: 8, maxLevel: 60 }, tax: { exempt: false, rate: 15 }, status: "active", weight: 1.2 },
        { _id: "itm_014", code: "ITM-014", name: "ستاند لابتوب ألومنيوم", category: "ملحقات", prices: { cost: 70, wholesale: 85, retail: 95, vip: 90 }, units: [{ unit: "قطعة", price: 70, isDefault: true }, { unit: "دزينة", price: 950, isDefault: false }, { unit: "كرتونة", price: 3500, isDefault: false }], stock: { main: 15, shaabi: 10, ahsa: 10, minLevel: 10, maxLevel: 80 }, tax: { exempt: true, rate: 0 }, status: "active", weight: 0.6 },
        { _id: "itm_015", code: "ITM-015", name: "حقيبة لابتوب 15.6 بوصة", category: "ملحقات", prices: { cost: 120, wholesale: 135, retail: 150, vip: 140 }, units: [{ unit: "قطعة", price: 120, isDefault: true }, { unit: "دزينة", price: 1500, isDefault: false }, { unit: "كرتونة", price: 5500, isDefault: false }], stock: { main: 10, shaabi: 9, ahsa: 9, minLevel: 10, maxLevel: 70 }, tax: { exempt: false, rate: 15 }, status: "active", weight: 0.4 },
        { _id: "itm_016", code: "ITM-016", name: "ماوس باد كبير", category: "ملحقات", prices: { cost: 25, wholesale: 30, retail: 35, vip: 32 }, units: [{ unit: "قطعة", price: 25, isDefault: true }, { unit: "دزينة", price: 350, isDefault: false }, { unit: "كرتونة", price: 1400, isDefault: false }], stock: { main: 30, shaabi: 25, ahsa: 25, minLevel: 25, maxLevel: 150 }, tax: { exempt: true, rate: 0 }, status: "active", weight: 0.1 },
        { _id: "itm_017", code: "ITM-017", name: "كابل USB-C", category: "كابلات", prices: { cost: 28, wholesale: 35, retail: 40, vip: 37 }, units: [{ unit: "قطعة", price: 28, isDefault: true }, { unit: "دزينة", price: 400, isDefault: false }, { unit: "كرتونة", price: 1600, isDefault: false }], stock: { main: 35, shaabi: 28, ahsa: 27, minLevel: 30, maxLevel: 200 }, tax: { exempt: true, rate: 0 }, status: "active", weight: 0.03 },
        { _id: "itm_018", code: "ITM-018", name: "شاحن لابتوب 65W", category: "ملحقات", prices: { cost: 140, wholesale: 165, retail: 180, vip: 170 }, units: [{ unit: "جهاز", price: 140, isDefault: true }, { unit: "كرتونة", price: 1600, isDefault: false }], stock: { main: 6, shaabi: 4, ahsa: 5, minLevel: 5, maxLevel: 50 }, tax: { exempt: false, rate: 15 }, status: "active", weight: 0.4 },
        { _id: "itm_019", code: "ITM-019", name: "SSD 500GB Samsung", category: "تخزين", prices: { cost: 260, wholesale: 300, retail: 320, vip: 310 }, units: [{ unit: "جهاز", price: 260, isDefault: true }, { unit: "كرتونة", price: 2800, isDefault: false }], stock: { main: 8, shaabi: 6, ahsa: 6, minLevel: 8, maxLevel: 60 }, tax: { exempt: false, rate: 15 }, status: "active", weight: 0.05 },
        { _id: "itm_020", code: "ITM-020", name: "RAM 16GB DDR4", category: "ذاكرة", prices: { cost: 230, wholesale: 260, retail: 280, vip: 270 }, units: [{ unit: "قطعة", price: 230, isDefault: true }, { unit: "كرتونة", price: 2500, isDefault: false }], stock: { main: 10, shaabi: 8, ahsa: 7, minLevel: 10, maxLevel: 70 }, tax: { exempt: false, rate: 15 }, status: "active", weight: 0.02 }
    ]
};

const WAREHOUSE_NAMES = {
    'main': 'المستودع الرئيسي',
    'shaabi': 'مخزن الشعبي',
    'ahsa': 'مخزن الأحساء'
};

// =============================================
// Configuration
// =============================================
const CONFIG = {
    TRANSFER_PREFIX: '26-TR-',
    JOURNAL_PREFIX: 'JV-TR-'
};

// =============================================
// State
// =============================================
let inventoryItems = [];
let transferItems = [];
let selectedItems = new Set();
let currentSourceWarehouse = '';

// =============================================
// Load Inventory (Transform to UI format)
// =============================================
function loadInventoryItems() {
    try {
        inventoryItems = INVENTORY_DATA.items.map(item => ({
            id: item._id,
            code: item.code,
            name: item.name,
            category: item.category,
            costPrice: item.prices.cost,
            units: item.units.map(u => ({
                unit: u.unit,
                price: u.price,
                isDefault: u.isDefault
            })),
            stock: item.stock,
            weight: item.weight || 0,
            status: item.status
        }));

        console.log('✅ Inventory loaded for transfer:', inventoryItems.length, 'items');
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

function getWarehouseStock(item, warehouse) {
    if (!warehouse || !item.stock) return 0;
    return item.stock[warehouse] || 0;
}

// =============================================
// Initialization
// =============================================
document.addEventListener('DOMContentLoaded', function () {
    if (!document.getElementById('TransferTable')) return;

    loadInventoryItems();

    const today = new Date().toISOString().split('T')[0];
    const expectedDate = new Date();
    expectedDate.setDate(expectedDate.getDate() + 2);

    const transferDateEl = document.getElementById('TransferDate');
    const expectedDateEl = document.getElementById('ExpectedReceiveDate');
    if (transferDateEl) transferDateEl.value = today;
    if (expectedDateEl) expectedDateEl.value = expectedDate.toISOString().split('T')[0];

    renderTransferTable();
    calculateTransferTotals();
    handleWarehouseChange();

    setupEventListeners();
});

// =============================================
// Warehouse Handler
// =============================================
function handleWarehouseChange() {
    const sourceSelect = document.getElementById('SourceWarehouse');
    const destSelect = document.getElementById('DestinationWarehouse');
    const warehouseInfo = document.getElementById('WarehouseInfo');

    if (!sourceSelect || !destSelect) return;

    currentSourceWarehouse = sourceSelect.value;
    const destValue = destSelect.value;

    // Disable same warehouse selection in destination
    const destOptions = destSelect.querySelectorAll('option');
    destOptions.forEach(opt => {
        if (opt.value === currentSourceWarehouse && opt.value !== '') {
            opt.disabled = true;
        } else {
            opt.disabled = false;
        }
    });

    // Update info text
    if (warehouseInfo) {
        if (currentSourceWarehouse) {
            const sourceName = WAREHOUSE_NAMES[currentSourceWarehouse] || currentSourceWarehouse;
            if (destValue && destValue !== currentSourceWarehouse) {
                const destName = WAREHOUSE_NAMES[destValue] || destValue;
                warehouseInfo.innerHTML = '<i class="fa-solid fa-check-circle" style="color: var(--accent-green);"></i> ' +
                    'من: <strong>' + sourceName + '</strong> ← إلى: <strong>' + destName + '</strong>';
            } else {
                warehouseInfo.innerHTML = '<i class="fa-solid fa-circle-info"></i> ' +
                    'المخزن المصدر: <strong>' + sourceName + '</strong> - اختر المخزن الوجهة';
            }
        } else {
            warehouseInfo.innerHTML = '<i class="fa-solid fa-circle-info"></i> اختر المخزن المصدر أولاً';
        }
    }

    // Validate existing items against new warehouse stock
    if (currentSourceWarehouse) {
        transferItems.forEach(item => {
            const available = getWarehouseStock(item.originalItem, currentSourceWarehouse);
            if (item.transferQty > available) {
                item.transferQty = available;
            }
        });
        renderTransferTable();
        calculateTransferTotals();
    }
}

// =============================================
// Event Listeners
// =============================================
function setupEventListeners() {
    const quickSearch = document.getElementById('QuickSearchItem');
    if (quickSearch) {
        quickSearch.addEventListener('keyup', function (e) {
            if (e.key === 'Enter') {
                if (!currentSourceWarehouse) {
                    ArbahToast.warning('يرجى اختيار المخزن المصدر أولاً!', 4000, { title: 'تنبيه!' });
                    document.getElementById('SourceWarehouse')?.focus();
                    return;
                }
                openPopUpWindow('AddNewPopup');
                initTransferPopup();
                const itemSearch = document.getElementById('ItemSearchInput');
                if (itemSearch) {
                    itemSearch.value = this.value;
                    searchTransferItems();
                }
            }
        });
    }

    window.addEventListener('beforeunload', function (e) {
        if (transferItems.length > 0) {
            e.preventDefault();
            e.returnValue = 'لديك أصناف في التحويل لم يتم حفظها. هل تريد مغادرة الصفحة؟';
            return e.returnValue;
        }
    });
}

// =============================================
// Item Selector (Popup)
// =============================================
function initTransferPopup() {
    const searchInput = document.getElementById('ItemSearchInput');
    if (searchInput) searchInput.value = '';

    selectedItems.clear();
    document.querySelectorAll('#ItemsTableBody tr.selected').forEach(row => row.classList.remove('selected'));
    document.querySelectorAll('#ItemsTableBody .item-checkbox').forEach(cb => cb.checked = false);

    if (!currentSourceWarehouse) {
        const tbody = document.getElementById('ItemsTableBody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--accent-red)"><i class="fa-solid fa-triangle-exclamation"></i> يرجى اختيار المخزن المصدر أولاً</td></tr>';
        }
        updateTransferSelectAllState();
        return;
    }

    renderTransferItemsTable(inventoryItems);
    if (searchInput) searchInput.focus();
}

function renderTransferItemsTable(items) {
    const tbody = document.getElementById('ItemsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!items || items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-sub)">لا توجد أصناف في المخزون</td></tr>';
        updateTransferSelectAllState();
        return;
    }

    // Filter items with stock in source warehouse
    const availableItems = items.filter(item => {
        const stock = getWarehouseStock(item, currentSourceWarehouse);
        return stock > 0;
    });

    if (availableItems.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--accent-red)"><i class="fa-solid fa-box-open"></i> لا توجد أصناف متاحة في ' + (WAREHOUSE_NAMES[currentSourceWarehouse] || currentSourceWarehouse) + '</td></tr>';
        updateTransferSelectAllState();
        return;
    }

    availableItems.forEach((item, index) => {
        const stock = getWarehouseStock(item, currentSourceWarehouse);
        const row = document.createElement('tr');
        row.setAttribute('data-id', item.id);
        const isChecked = selectedItems.has(item.id) ? 'checked' : '';

        row.innerHTML = `
            <td style="text-align:center"><input type="checkbox" class="item-checkbox" data-id="${item.id}" ${isChecked}></td>
            <td>${index + 1}</td>
            <td><strong>${escapeHtml(item.code)}</strong></td>
            <td>${escapeHtml(item.name)}</td>
            <td>${escapeHtml(item.units[0].unit)}</td>
            <td style="font-weight:600;color:var(--accent-green)">${item.costPrice.toFixed(2)}</td>
            <td style="font-weight:700;color:var(--accent-blue)">${stock} <span style="font-size:11px;color:var(--text-sub)">${escapeHtml(item.units[0].unit)}</span></td>
            <td><span class="badge" style="background:var(--accent-green-light);color:var(--accent-green);padding:2px 8px;border-radius:4px;font-size:12px">${escapeHtml(item.category)}</span></td>
        `;

        if (selectedItems.has(item.id)) row.classList.add('selected');

        const checkbox = row.querySelector('.item-checkbox');
        checkbox.addEventListener('change', function (e) {
            toggleTransferItemSelection(item.id, e.target.checked);
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
            addSingleTransferItem(item.id);
        });

        tbody.appendChild(row);
    });

    updateTransferSelectAllState();
}

function toggleTransferItemSelection(id, checked) {
    if (checked) selectedItems.add(id);
    else selectedItems.delete(id);
    updateTransferAddButtonState();
    updateTransferSelectAllState();
}

function toggleTransferSelectAll() {
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

    updateTransferAddButtonState();
}

function updateTransferSelectAllState() {
    const checkboxes = document.querySelectorAll('#ItemsTableBody .item-checkbox');
    const checkedBoxes = document.querySelectorAll('#ItemsTableBody .item-checkbox:checked');
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

function updateTransferAddButtonState() {
    const btn = document.getElementById('AddSelectedBtn');
    const countSpan = document.getElementById('SelectedCount');
    if (btn) btn.disabled = selectedItems.size === 0;
    if (countSpan) countSpan.textContent = selectedItems.size;
}

function searchTransferItems() {
    const searchInput = document.getElementById('ItemSearchInput');
    if (!searchInput) return;

    const query = searchInput.value.toLowerCase().trim();

    if (!query) {
        renderTransferItemsTable(inventoryItems);
        return;
    }

    const filtered = inventoryItems.filter(item =>
        item.name.toLowerCase().includes(query) ||
        item.code.toLowerCase().includes(query) ||
        item.id.toString().toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
    );

    renderTransferItemsTable(filtered);
}

// =============================================
// Add Items to Transfer
// =============================================
function createTransferItem(item) {
    const availableStock = getWarehouseStock(item, currentSourceWarehouse);
    const selectedUnit = item.units[0];
    // Calculate available qty in selected unit
    // If base unit is "قطعة" and selected unit is "كرتونة" (12 pieces),
    // then available cartons = floor(total_pieces / 12)
    const baseUnitPrice = item.units[0].price;
    const unitRatio = selectedUnit.price / baseUnitPrice;
    const availableInUnit = Math.floor(availableStock / unitRatio);

    return {
        id: item.id,
        code: item.code,
        name: item.name,
        originalItem: item,
        units: item.units,
        selectedUnitIndex: 0,
        unit: selectedUnit.unit,
        costPrice: item.costPrice,
        availableQty: availableInUnit > 0 ? availableInUnit : availableStock, // fallback to base stock if ratio gives 0
        baseAvailableQty: availableStock, // original stock in base unit
        transferQty: 1,
        totalCost: item.costPrice,
        notes: '',
        weight: item.weight || 0
    };
}

function addSingleTransferItem(id) {
    if (!currentSourceWarehouse) {
        ArbahToast.warning('يرجى اختيار المخزن المصدر أولاً!', 4000, { title: 'تنبيه!' });
        return;
    }

    const item = inventoryItems.find(i => i.id === id);
    if (!item) return;

    const availableStock = getWarehouseStock(item, currentSourceWarehouse);
    if (availableStock <= 0) {
        ArbahToast.error('هذا الصنف غير متوفر في المخزن المصدر!', 4000, { title: 'خطأ!' });
        return;
    }

    const existing = transferItems.find(i => i.id === id);
    if (existing) {
        if (existing.transferQty < existing.availableQty) {
            existing.transferQty += 1;
        } else {
            ArbahToast.warning('لا يمكن تحويل أكثر من الكمية المتاحة!', 4000, { title: 'تنبيه!' });
            return;
        }
    } else {
        transferItems.push(createTransferItem(item));
    }

    selectedItems.delete(id);
    renderTransferTable();
    calculateTransferTotals();
    closePopUpWindow('AddNewPopup');
}

function addSelectedTransferItems() {
    if (selectedItems.size === 0) return;

    if (!currentSourceWarehouse) {
        ArbahToast.warning('يرجى اختيار المخزن المصدر أولاً!', 4000, { title: 'تنبيه!' });
        return;
    }

    selectedItems.forEach(id => {
        const item = inventoryItems.find(i => i.id === id);
        if (!item) return;

        const availableStock = getWarehouseStock(item, currentSourceWarehouse);
        if (availableStock <= 0) return;

        const existing = transferItems.find(i => i.id === id);
        if (existing) {
            if (existing.transferQty < existing.availableQty) {
                existing.transferQty += 1;
            }
        } else {
            transferItems.push(createTransferItem(item));
        }
    });

    selectedItems.clear();
    document.querySelectorAll('#ItemsTableBody tr.selected').forEach(row => row.classList.remove('selected'));
    document.querySelectorAll('#ItemsTableBody .item-checkbox').forEach(cb => cb.checked = false);

    renderTransferTable();
    calculateTransferTotals();
    closePopUpWindow('AddNewPopup');
}

// =============================================
// Transfer Table
// =============================================
function renderTransferTable() {
    const tbody = document.getElementById('TransferTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (transferItems.length === 0) {
        const emptyRow = document.createElement('tr');
        const emptyCell = document.createElement('td');
        emptyCell.setAttribute('colspan', '9');
        emptyCell.className = 'NotFound';
        emptyCell.innerHTML = 'لا توجد أصناف في التحويل. اضغط "إضافة صنف" او F1 للبدء';
        emptyCell.style.cursor = 'pointer';
        emptyCell.addEventListener('click', function () {
            if (!currentSourceWarehouse) {
                ArbahToast.warning('يرجى اختيار المخزن المصدر أولاً!', 4000, { title: 'تنبيه!' });
                document.getElementById('SourceWarehouse')?.focus();
                return;
            }
            openPopUpWindow('AddNewPopup');
            setTimeout(initTransferPopup, 100);
        });
        emptyRow.appendChild(emptyCell);
        tbody.appendChild(emptyRow);

        const countEl = document.getElementById('ItemsCount');
        const totalQtyEl = document.getElementById('TotalTransferQty');
        if (countEl) countEl.textContent = 'عدد الأصناف: 0';
        if (totalQtyEl) totalQtyEl.textContent = 'إجمالي الكمية المحولة: 0';
        return;
    }

    let totalQty = 0;

    transferItems.forEach((item, index) => {
        const totalCost = item.costPrice * item.transferQty;
        item.totalCost = totalCost;
        totalQty += item.transferQty;

        const unitOptions = item.units.map((u, idx) => {
            const selected = idx === item.selectedUnitIndex ? 'selected' : '';
            return `<option value="${idx}" ${selected}>${escapeHtml(u.unit)}</option>`;
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
                <select class="unit-select" onchange="changeTransferUnit('${item.id}',this.value)">
                    ${unitOptions}
                </select>
            </div>
            </td>
            <td>${item.availableQty} <span>${escapeHtml(item.unit)}</span></td>
            <td>
                <input type="number" value="${item.transferQty}" min="1" max="${item.availableQty}"
                    onchange="updateTransferQty('${item.id}',this.value)"
                    class="invoice-input"
                    title="الحد الأقصى: ${item.availableQty}">
            </td>
            <td ><span class="status-badge Color-Bg-green">${item.costPrice.toFixed(2)}</span></td>
            <td ><span class="status-badge Color-Bg-blue">${totalCost.toFixed(2)}</span></td>
            <td>
                <input type="text" value="${escapeHtml(item.notes)}" placeholder="ملاحظات..."
                    onchange="updateTransferNotes('${item.id}',this.value)"
                    class="invoice-input">
            </td>
            <td>
                <button class="Action-Row-Btn" onclick="removeTransferItem('${item.id}')" title="حذف من التحويل">
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
    const totalQtyEl = document.getElementById('TotalTransferQty');
    if (countEl) countEl.textContent = 'عدد الأصناف: ' + transferItems.length;
    if (totalQtyEl) totalQtyEl.textContent = 'إجمالي الكمية المحولة: ' + totalQty;
}

// =============================================
// Update Transfer Item Properties
// =============================================
function changeTransferUnit(id, unitIndex) {
    const item = transferItems.find(i => i.id === id);
    if (!item) return;

    const idx = parseInt(unitIndex);
    if (idx >= 0 && idx < item.units.length) {
        item.selectedUnitIndex = idx;
        item.unit = item.units[idx].unit;

        // Update cost price based on unit ratio
        const basePrice = item.originalItem.costPrice;
        const baseUnitPrice = item.originalItem.units[0].price;
        const selectedUnitPrice = item.units[idx].price;
        item.costPrice = (selectedUnitPrice / baseUnitPrice) * basePrice;

        // Recalculate available quantity based on unit conversion
        // available in selected unit = baseAvailableQty / (selectedUnitPrice / baseUnitPrice)
        const unitRatio = selectedUnitPrice / baseUnitPrice;
        const availableInUnit = Math.floor(item.baseAvailableQty / unitRatio);
        item.availableQty = availableInUnit > 0 ? availableInUnit : item.baseAvailableQty;

        // Validate transfer qty doesn't exceed new available qty
        if (item.transferQty > item.availableQty) {
            item.transferQty = item.availableQty;
        }

        renderTransferTable();
        calculateTransferTotals();
    }
}

function updateTransferQty(id, value) {
    const item = transferItems.find(i => i.id === id);
    if (!item) return;

    const requestedQty = parseInt(value) || 1;
    const newQty = Math.max(1, Math.min(requestedQty, item.availableQty));

    if (requestedQty > item.availableQty) {
        ArbahToast.warning('الكمية المطلوبة (' + requestedQty + ') تتجاوز المتاح (' + item.availableQty + ' ' + item.unit + '). تم تعديلها تلقائياً.', 5000, { title: 'تنبيه!' });
    }

    item.transferQty = newQty;
    renderTransferTable();
    calculateTransferTotals();
}

function updateTransferNotes(id, value) {
    const item = transferItems.find(i => i.id === id);
    if (item) {
        item.notes = value;
    }
}

function removeTransferItem(id) {
    const item = transferItems.find(i => i.id === id);
    const itemName = item ? item.name : 'هذا الصنف';

    ArbahToast.warning('هل تريد حذف ' + itemName + ' من التحويل؟', 8000, {
        title: 'تأكيد الحذف',
        action: {
            text: 'نعم، احذف',
            callback: function () {
                transferItems = transferItems.filter(i => i.id !== id);
                renderTransferTable();
                calculateTransferTotals();
                ArbahToast.success('تم حذف ' + itemName + ' بنجاح', 3000, { title: 'تم!' });
            }
        }
    });
}

function clearAllTransferItems() {
    if (transferItems.length === 0) return;

    ArbahToast.warning('هل تريد إفراغ جميع الأصناف من التحويل؟ (' + transferItems.length + ' صنف)', 8000, {
        title: 'تأكيد الإفراغ',
        action: {
            text: 'نعم، إفراغ',
            callback: function () {
                transferItems = [];
                renderTransferTable();
                calculateTransferTotals();
                ArbahToast.success('تم إفراغ قائمة التحويل بنجاح', 3000, { title: 'تم!' });
            }
        }
    });
}

// =============================================
// Calculations
// =============================================
function calculateTransferTotals() {
    let totalItems = 0;
    let totalQuantity = 0;
    let totalCost = 0;
    let totalWeight = 0;

    transferItems.forEach(item => {
        totalItems += 1;
        totalQuantity += item.transferQty;
        totalCost += item.totalCost;
        totalWeight += (item.weight || 0) * item.transferQty;
    });

    const shippingCost = parseFloat(document.getElementById('ShippingCost')?.value) || 0;
    const grandTotal = totalCost + shippingCost;

    const els = {
        totalItems: document.getElementById('TotalItemsCount'),
        totalQuantity: document.getElementById('TotalQuantity'),
        totalCost: document.getElementById('TotalCost'),
        totalWeight: document.getElementById('TotalWeight'),
        shippingCost: document.getElementById('ShippingCost'),
        grandTotal: document.getElementById('GrandTotal')
    };

    if (els.totalItems) els.totalItems.value = totalItems;
    if (els.totalQuantity) els.totalQuantity.value = totalQuantity;
    if (els.totalCost) els.totalCost.value = totalCost.toFixed(2);
    if (els.totalWeight) els.totalWeight.value = totalWeight.toFixed(1);
    if (els.grandTotal) els.grandTotal.value = grandTotal.toFixed(2);
}

// =============================================
// Save Transfer
// =============================================
function saveTransfer() {
    if (transferItems.length === 0) {
        ArbahToast.error('لا يمكن حفظ تحويل فارغ!', 4000, { title: 'خطأ!' });
        return;
    }

    const sourceWarehouse = document.getElementById('SourceWarehouse');
    const destWarehouse = document.getElementById('DestinationWarehouse');

    if (!sourceWarehouse || !sourceWarehouse.value) {
        ArbahToast.warning('يرجى اختيار المخزن المصدر!', 4000, { title: 'تنبيه!' });
        sourceWarehouse?.focus();
        return;
    }

    if (!destWarehouse || !destWarehouse.value) {
        ArbahToast.warning('يرجى اختيار المخزن الوجهة!', 4000, { title: 'تنبيه!' });
        destWarehouse?.focus();
        return;
    }

    if (sourceWarehouse.value === destWarehouse.value) {
        ArbahToast.error('المخزن المصدر والوجهة يجب أن يكونا مختلفين!', 4000, { title: 'خطأ!' });
        return;
    }

    for (let item of transferItems) {
        if (item.transferQty > item.availableQty) {
            ArbahToast.error('الصنف ' + item.name + ' يتجاوز الكمية المتاحة للتحويل!', 4000, { title: 'خطأ!' });
            return;
        }
    }

    const transferData = collectTransferData();
    console.log('✅ Transfer saved:', transferData);

    // Update stock in inventory (simulation)
    transferItems.forEach(transferItem => {
        const originalItem = INVENTORY_DATA.items.find(i => i._id === transferItem.id);
        if (originalItem) {
            originalItem.stock[sourceWarehouse.value] -= transferItem.transferQty;
            originalItem.stock[destWarehouse.value] = (originalItem.stock[destWarehouse.value] || 0) + transferItem.transferQty;
        }
    });

    ArbahToast.success('تم حفظ التحويل المخزني بنجاح!\nرقم التحويل: ' + CONFIG.TRANSFER_PREFIX + '0001\nمن: ' + WAREHOUSE_NAMES[sourceWarehouse.value] + '\nإلى: ' + WAREHOUSE_NAMES[destWarehouse.value], 6000, { title: 'تم بنجاح!' });

    resetTransfer();
}

function collectTransferData() {
    const sourceWarehouse = document.getElementById('SourceWarehouse');
    const destWarehouse = document.getElementById('DestinationWarehouse');

    return {
        transferNumber: document.querySelector('input[value^="' + CONFIG.TRANSFER_PREFIX + '"]')?.value || '',
        referenceNumber: document.getElementById('ReferenceNumber')?.value || '',
        date: document.getElementById('TransferDate')?.value,
        expectedReceiveDate: document.getElementById('ExpectedReceiveDate')?.value,
        sourceWarehouseId: sourceWarehouse?.value || '',
        sourceWarehouseName: WAREHOUSE_NAMES[sourceWarehouse?.value] || '',
        destinationWarehouseId: destWarehouse?.value || '',
        destinationWarehouseName: WAREHOUSE_NAMES[destWarehouse?.value] || '',
        sourceCostCenterId: document.getElementById('SourceCostCenter')?.value || '',
        destinationCostCenterId: document.getElementById('DestinationCostCenter')?.value || '',
        transferType: document.getElementById('TransferType')?.value || 'normal',
        responsibleId: document.getElementById('TransferResponsible')?.value || '',
        status: 'pending',
        notes: document.getElementById('TransferNotes')?.value || '',
        items: transferItems.map(item => ({
            id: item.id,
            code: item.code,
            name: item.name,
            unit: item.unit,
            costPrice: item.costPrice,
            availableQty: item.availableQty,
            transferQty: item.transferQty,
            totalCost: item.totalCost,
            notes: item.notes,
            weight: item.weight
        })),
        totalItems: parseInt(document.getElementById('TotalItemsCount')?.value) || 0,
        totalQuantity: parseInt(document.getElementById('TotalQuantity')?.value) || 0,
        totalCost: parseFloat(document.getElementById('TotalCost')?.value) || 0,
        totalWeight: parseFloat(document.getElementById('TotalWeight')?.value) || 0,
        shippingCost: parseFloat(document.getElementById('ShippingCost')?.value) || 0,
        grandTotal: parseFloat(document.getElementById('GrandTotal')?.value) || 0
    };
}

// =============================================
// Reset & Print
// =============================================
function resetTransfer() {
    transferItems = [];
    selectedItems.clear();
    currentSourceWarehouse = '';

    const sourceWarehouse = document.getElementById('SourceWarehouse');
    if (sourceWarehouse) sourceWarehouse.value = '';
    const destWarehouse = document.getElementById('DestinationWarehouse');
    if (destWarehouse) destWarehouse.value = '';
    const refNum = document.getElementById('ReferenceNumber');
    if (refNum) refNum.value = '';
    const transferType = document.getElementById('TransferType');
    if (transferType) transferType.value = 'normal';
    const sourceCostCenter = document.getElementById('SourceCostCenter');
    if (sourceCostCenter) sourceCostCenter.value = '';
    const destinationCostCenter = document.getElementById('DestinationCostCenter');
    if (destinationCostCenter) destinationCostCenter.value = '';
    const transferResponsible = document.getElementById('TransferResponsible');
    if (transferResponsible) transferResponsible.value = '';
    const shippingCost = document.getElementById('ShippingCost');
    if (shippingCost) shippingCost.value = '0';
    const totalWeight = document.getElementById('TotalWeight');
    if (totalWeight) totalWeight.value = '0';

    handleWarehouseChange();
    renderTransferTable();
    calculateTransferTotals();
}

function printTransfer() {
    if (transferItems.length === 0) {
        ArbahToast.error('لا يمكن طباعة تحويل فارغ!', 4000, { title: 'خطأ!' });
        return;
    }
    window.print();
}

function printTransferFromPage() {
    printTransfer();
}

// =============================================
// Aliases for backward compatibility
// =============================================
function searchItems() { return searchTransferItems(); }
function toggleSelectAll() { return toggleTransferSelectAll(); }
function addSingleItem(id) { return addSingleTransferItem(id); }
function addSelectedItem() { return addSelectedTransferItems(); }
function saveInvoice() { return saveTransfer(); }
function resetInvoice() { return resetTransfer(); }
function printInvoiceFromPage() { return printTransferFromPage(); }
function clearAllItems() { return clearAllTransferItems(); }
function updateItemQuantity(id, value) { return updateTransferQty(id, value); }
function removeItem(id) { return removeTransferItem(id); }
function changeUnit(id, unitIndex) { return changeTransferUnit(id, unitIndex); }
function calculateTotals() { return calculateTransferTotals(); }
function handlePaymentMethodChange() { return handleWarehouseChange(); }
function initInvoicePopup() { return initTransferPopup(); }
function renderItemsTable(items) { return renderTransferItemsTable(items); }
function toggleItemSelection(id, checked) { return toggleTransferItemSelection(id, checked); }
function updateAddButtonState() { return updateTransferAddButtonState(); }
function updateSelectAllState() { return updateTransferSelectAllState(); }

// =============================================
window.Transfer = {
    initTransferPopup,
    renderTransferItemsTable,
    addSingleTransferItem,
    addSelectedTransferItems,
    removeTransferItem,
    clearAllTransferItems,
    saveTransfer,
    resetTransfer,
    printTransferFromPage,
    calculateTransferTotals,
    searchTransferItems,
    toggleTransferSelectAll,
    handleWarehouseChange,
    updateTransferQty,
    changeTransferUnit,
    updateTransferNotes,
    transferItems,
    inventoryItems
};
