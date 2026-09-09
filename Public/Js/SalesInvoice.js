// =============================================
// Sales Invoice Module - ArbahERP
// Complete Frontend with 05-SelectOption.js Integration
// =============================================

'use strict';

// =============================================
// Configuration
// =============================================
const CONFIG = {
    TAX_RATE: 15,
    DEFAULT_DUE_DAYS: 30,
    INVOICE_PREFIX: 'SAL-'
};

// =============================================
// State
// =============================================
let inventoryItems = [];
let invoiceItems = [];
let selectedItems = new Set();
let priceIncludesTax = false;
let currentPriceType = 'retail';

// =============================================
// Load Products from Database
// =============================================
async function loadInventoryFromDB() {
    try {
        const response = await fetch('/api/Products');
        const result = await response.json();
        if (!result.success) throw new Error(result.message);

        inventoryItems = result.data.map(product => ({
            id: product._id,
            code: product.code || '',
            name: product.name || '',
            units: product.units ? product.units.map(u => ({
                unit: u.name,
                retailPrice: u.retailPrice || 0,
                purchasePrice: u.purchasePrice || 0,
                wholesalePrice: u.wholesalePrice || 0,
                vipPrice: u.vipPrice || 0,
                conversionFactor: u.conversionFactor || 1,
                isDefault: u.isDefault || false
            })) : [{ unit: 'قطعة', retailPrice: 0, wholesalePrice: 0, vipPrice: 0, isDefault: true }],
            stock: product.stock || 0,
            minStock: product.minStock || 0,
            taxExempt: false,
            taxRate: CONFIG.TAX_RATE
        }));
        return inventoryItems;
    } catch (error) {
        console.error('❌ Error loading products:', error);
        ArbahToast.error('فشل في جلب الأصناف', 5000, { title: 'خطأ!' });
        return [];
    }
}

// =============================================
// Get Selected Entity Data from 05-SelectOption.js
// =============================================
function getSelectedEntityData(selectType) {
    const container = document.querySelector(`[data-select="${selectType}"]`);
    if (!container) return null;

    const hiddenInput = container.querySelector('.select-value');
    const searchInput = container.querySelector('.select-search');

    if (!hiddenInput || !hiddenInput.value) return null;

    // Get the SelectDropdown instance
    const instance = selectManager.instances ? 
        Array.from(selectManager.instances.values()).find(i => 
            i.container === container || i.container?.contains(hiddenInput)
        ) : null;

    const selectedItem = instance ? instance.getSelectedItem() : null;

    return {
        id: hiddenInput.value,                          // ✅ ObjectId (_id)
        name: selectedItem ? selectedItem.name : (searchInput ? searchInput.value.split(' - ').pop().trim() : ''),
        code: selectedItem ? selectedItem.code : '',
        accountCode: selectedItem ? selectedItem.AccountCode : (hiddenInput.getAttribute('AccountCode') || '')
    };
}

// =============================================
// Item Selector (Popup)
// =============================================
function initInvoicePopup() {
    const searchInput = document.getElementById('ItemSearchInput');
    if (searchInput) searchInput.value = '';
    selectedItems.clear();

    if (inventoryItems.length === 0) {
        loadInventoryFromDB().then(() => renderItemsTable(inventoryItems));
    } else {
        renderItemsTable(inventoryItems);
    }

    if (searchInput) searchInput.focus();
}

function searchItems() {
    const searchInput = document.getElementById('ItemSearchInput');
    if (!searchInput) return;
    const query = searchInput.value.toLowerCase().trim();
    const filtered = query ? inventoryItems.filter(item => 
        item.name.toLowerCase().includes(query) || 
        item.code.toLowerCase().includes(query)
    ) : inventoryItems;
    renderItemsTable(filtered);
}

function renderItemsTable(items) {
    const tbody = document.getElementById('ItemsTableBody');
    if (!tbody) return;

    if (!items || items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;">لا يوجد أصناف</td></tr>';
        return;
    }

    tbody.innerHTML = items.map((item, i) => {
        const defaultUnit = item.units.find(u => u.isDefault) || item.units[0];
        const isLowStock = item.stock <= item.minStock;
        return `
            <tr onclick="toggleItemSelection('${item.id}', this)" data-id="${item.id}" ondblclick="addSingleItem('${item.id}')">
                <td><input type="checkbox" class="item-checkbox" onchange="event.stopPropagation(); toggleItemSelection('${item.id}', this.closest('tr'))"></td>
                <td>${i + 1}</td>
                <td>${escapeHtml(item.code)}</td>
                <td>
                    <div class="Name-Cell">
                        <i class="fa-solid fa-cube ${isLowStock ? 'Color-Bg-red' : 'Color-Bg-green'}"></i>
                        <div class="Name-Cell-info">
                            <span class="name">${escapeHtml(item.name)}</span>
                        </div>
                    </div>
                </td>
                <td>${escapeHtml(defaultUnit.unit)}</td>
                <td>${formatNumber(defaultUnit.purchasePrice)}</td>
                <td>${formatNumber(defaultUnit.retailPrice)}</td>
                <td>${formatNumber(item.stock)}</td>
            </tr>
        `;
    }).join('');
}

function toggleItemSelection(id, row) {
    const checkbox = row.querySelector('.item-checkbox');
    if (selectedItems.has(id)) {
        selectedItems.delete(id);
        row.classList.remove('selected');
        if (checkbox) checkbox.checked = false;
    } else {
        selectedItems.add(id);
        row.classList.add('selected');
        if (checkbox) checkbox.checked = true;
    }
    updateSelectedCount();
}

function toggleSelectAll() {
    const selectAllCheckbox = document.getElementById('SelectAllItems');
    const rows = document.querySelectorAll('#ItemsTableBody tr[data-id]');
    if (!selectAllCheckbox) return;

    rows.forEach(row => {
        const id = row.dataset.id;
        const checkbox = row.querySelector('.item-checkbox');
        if (selectAllCheckbox.checked) {
            selectedItems.add(id);
            row.classList.add('selected');
            if (checkbox) checkbox.checked = true;
        } else {
            selectedItems.delete(id);
            row.classList.remove('selected');
            if (checkbox) checkbox.checked = false;
        }
    });
    updateSelectedCount();
}

function updateSelectedCount() {
    const countSpan = document.getElementById('SelectedCount');
    const addBtn = document.getElementById('AddSelectedBtn');
    if (countSpan) countSpan.textContent = selectedItems.size;
    if (addBtn) addBtn.disabled = selectedItems.size === 0;
}

function addSelectedItem() {
    if (selectedItems.size === 0) return;
    selectedItems.forEach(id => {
        const item = inventoryItems.find(i => i.id === id);
        if (!item) return;
        const existing = invoiceItems.find(i => i.id === id);
        if (existing) {
            existing.quantity += 1;
        } else {
            invoiceItems.push(createInvoiceItem(item));
        }
    });
    selectedItems.clear();
    closePopUpWindow('AddNewPopup');
    renderInvoiceTable();
    calculateTotals();
}

function addSingleItem(id) {
    const item = inventoryItems.find(i => i.id === id);
    if (!item) return;
    const existing = invoiceItems.find(i => i.id === id);
    if (existing) {
        existing.quantity += 1;
    } else {
        invoiceItems.push(createInvoiceItem(item));
    }
    renderInvoiceTable();
    calculateTotals();
    closePopUpWindow('AddNewPopup');
}

function createInvoiceItem(item) {
    const defaultUnit = item.units.find(u => u.isDefault) || item.units[0];
    const priceType = currentPriceType;
    let price = defaultUnit.retailPrice;

    switch (priceType) {
        case 'wholesale': price = defaultUnit.wholesalePrice || defaultUnit.retailPrice; break;
        case 'vip': price = defaultUnit.vipPrice || defaultUnit.retailPrice; break;
        default: price = defaultUnit.retailPrice;
    }

    return {
        id: item.id,
        code: item.code,
        name: item.name,
        units: item.units,
        selectedUnitIndex: 0,
        unit: defaultUnit.unit,
        price: price,
        retailPrice: defaultUnit.retailPrice,
        wholesalePrice: defaultUnit.wholesalePrice || defaultUnit.retailPrice,
        vipPrice: defaultUnit.vipPrice || defaultUnit.retailPrice,
        costPrice: defaultUnit.purchasePrice || 0,
        quantity: 1,
        discountPercent: 0,
        discountAmount: 0,
        taxPercent: item.taxExempt ? 0 : CONFIG.TAX_RATE,
        taxAmount: 0,
        total: 0,
        taxExempt: item.taxExempt,
        priceType: priceType
    };
}

// =============================================
// Invoice Table
// =============================================
function renderInvoiceTable() {
    const tbody = document.getElementById('InvoiceTableBody');
    if (!tbody) return;

    if (invoiceItems.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td onclick="openPopUpWindow('AddNewPopup'); setTimeout(initInvoicePopup, 100);" colspan="13" class="NotFound">
                    لا توجد أصناف في الفاتورة. اضغط "إضافة صنف" او F1 للبدء
                </td>
            </tr>
        `;
        updateItemsCount();
        return;
    }

    tbody.innerHTML = '';
    invoiceItems.forEach((item, index) => {
        const subtotal = item.price * item.quantity;
        const discountAmount = (subtotal * item.discountPercent / 100) + item.discountAmount;
        const afterDiscount = subtotal - discountAmount;
        const taxAmount = item.taxExempt ? 0 : (afterDiscount * item.taxPercent / 100);
        const total = afterDiscount + taxAmount;

        item.taxAmount = taxAmount;
        item.total = total;

        const unitOptions = item.units.map((u, idx) => {
            const selected = idx === item.selectedUnitIndex ? 'selected' : '';
            return `<option value="${idx}" ${selected}>${escapeHtml(u.unit)}</option>`;
        }).join('');

        const priceTypeOptions = [
            { value: 'retail', label: 'تجزئة', price: item.retailPrice },
            { value: 'wholesale', label: 'جملة', price: item.wholesalePrice },
            { value: 'vip', label: 'VIP', price: item.vipPrice }
        ].map(opt => {
            const selected = item.priceType === opt.value ? 'selected' : '';
            return `<option value="${opt.value}" ${selected}>${escapeHtml(opt.label)} (${formatNumber(opt.price)})</option>`;
        }).join('');

        const tr = document.createElement('tr');
        tr.innerHTML = `
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
                    <select onchange="changeItemPriceType('${item.id}', this.value)">${priceTypeOptions}</select>
                </div>
            </td>
            <td>
                <div class="input SelectInput">
                    <select onchange="changeUnit('${item.id}', this.value)">${unitOptions}</select>
                </div>
            </td>
            <td>
                <input type="number" value="${item.quantity}" min="1" max="9999" 
                    onchange="updateItemQuantity('${item.id}', this.value)" class="invoice-input">
            </td>
            <td>
                <input type="number" value="${item.price.toFixed(2)}" min="0" step="0.01"
                    onchange="updateItemPrice('${item.id}', this.value)" class="invoice-input">
            </td>
            <td><span class="status-badge Color-Bg-green">${subtotal.toFixed(2)}</span></td>
            <td>
                <input type="number" value="${item.discountPercent}" min="0" max="100" step="0.01"
                    onchange="updateItemDiscountPercent('${item.id}', this.value)" class="invoice-input">
            </td>
            <td>
                <input type="number" value="${item.discountAmount.toFixed(2)}" min="0" step="0.01"
                    onchange="updateItemDiscountAmount('${item.id}', this.value)" class="invoice-input">
            </td>
            <td>
                <input type="number" value="${item.taxPercent}" min="0" max="100" step="0.01"
                    onchange="updateItemTaxPercent('${item.id}', this.value)" class="invoice-input" ${item.taxExempt ? 'disabled' : ''}>
            </td>
            <td><span class="status-badge Color-Bg-orange">${taxAmount.toFixed(2)}</span></td>
            <td><span class="status-badge Color-Bg-blue">${total.toFixed(2)}</span></td>
            <td>
                <button class="Action-Row-Btn" onclick="removeItem('${item.id}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        `;

        tr.querySelectorAll('.invoice-input').forEach(input => {
            input.addEventListener('focus', function() { this.select(); });
        });
        tbody.appendChild(tr);
    });

    updateItemsCount();
}

function updateItemsCount() {
    const countEl = document.getElementById('ItemsCount');
    if (countEl) countEl.textContent = 'عدد الأصناف: ' + invoiceItems.length;
}

// =============================================
// Item Operations
// =============================================
function changeItemPriceType(id, priceType) {
    const item = invoiceItems.find(i => i.id === id);
    if (!item) return;
    const unit = item.units[item.selectedUnitIndex || 0];
    let newPrice = unit.retailPrice;
    switch (priceType) {
        case 'wholesale': newPrice = unit.wholesalePrice || unit.retailPrice; break;
        case 'vip': newPrice = unit.vipPrice || unit.retailPrice; break;
        default: newPrice = unit.retailPrice;
    }
    item.priceType = priceType;
    item.price = newPrice;
    renderInvoiceTable();
    calculateTotals();
}

function changeUnit(id, unitIndex) {
    const item = invoiceItems.find(i => i.id === id);
    if (!item) return;
    const idx = parseInt(unitIndex);
    if (idx >= 0 && idx < item.units.length) {
        item.selectedUnitIndex = idx;
        item.unit = item.units[idx].unit;
        const unit = item.units[idx];
        let newPrice = unit.retailPrice;
        switch (item.priceType) {
            case 'wholesale': newPrice = unit.wholesalePrice || unit.retailPrice; break;
            case 'vip': newPrice = unit.vipPrice || unit.retailPrice; break;
            default: newPrice = unit.retailPrice;
        }
        item.price = newPrice;
        item.retailPrice = unit.retailPrice;
        item.wholesalePrice = unit.wholesalePrice || unit.retailPrice;
        item.vipPrice = unit.vipPrice || unit.retailPrice;
        item.costPrice = unit.purchasePrice || 0;
        renderInvoiceTable();
        calculateTotals();
    }
}

function updateItemQuantity(id, value) {
    const item = invoiceItems.find(i => i.id === id);
    if (item) {
        item.quantity = Math.max(1, parseInt(value) || 1);
        renderInvoiceTable();
        calculateTotals();
    }
}

function updateItemPrice(id, value) {
    const item = invoiceItems.find(i => i.id === id);
    if (item) {
        item.price = Math.max(0, parseFloat(value) || 0);
        renderInvoiceTable();
        calculateTotals();
    }
}

function updateItemDiscountPercent(id, value) {
    const item = invoiceItems.find(i => i.id === id);
    if (item) {
        item.discountPercent = Math.max(0, Math.min(100, parseFloat(value) || 0));
        renderInvoiceTable();
        calculateTotals();
    }
}

function updateItemDiscountAmount(id, value) {
    const item = invoiceItems.find(i => i.id === id);
    if (item) {
        const maxDiscount = item.price * item.quantity;
        item.discountAmount = Math.min(Math.max(0, parseFloat(value) || 0), maxDiscount);
        renderInvoiceTable();
        calculateTotals();
    }
}

function updateItemTaxPercent(id, value) {
    const item = invoiceItems.find(i => i.id === id);
    if (item) {
        item.taxPercent = Math.max(0, parseFloat(value) || 0);
        renderInvoiceTable();
        calculateTotals();
    }
}

function removeItem(id) {
    if (!confirm('هل أنت متأكد من حذف هذا الصنف؟')) return;
    invoiceItems = invoiceItems.filter(i => i.id !== id);
    renderInvoiceTable();
    calculateTotals();
}

function clearAllItems() {
    if (invoiceItems.length === 0) return;
    if (!confirm('هل أنت متأكد من إفراغ الفاتورة؟')) return;
    invoiceItems = [];
    renderInvoiceTable();
    calculateTotals();
}

// =============================================
// Calculations
// =============================================
function calculateTotals() {
    let subTotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;
    let grandTotal = 0;
    let totalCost = 0;

    invoiceItems.forEach(item => {
        const itemSubtotal = item.price * item.quantity;
        const itemDiscount = (itemSubtotal * item.discountPercent / 100) + item.discountAmount;
        const afterDiscount = itemSubtotal - itemDiscount;
        const itemTax = item.taxExempt ? 0 : (afterDiscount * item.taxPercent / 100);
        const itemTotal = afterDiscount + itemTax;

        subTotal += itemSubtotal;
        totalDiscount += itemDiscount;
        totalTax += itemTax;
        grandTotal += itemTotal;
        totalCost += (item.costPrice * item.quantity);
    });

    const generalDiscountPercent = parseFloat(document.getElementById('DiscountPercent')?.value) || 0;
    const generalDiscount = grandTotal * generalDiscountPercent / 100;
    const finalTotal = grandTotal - generalDiscount;

    const paymentMethod = document.getElementById('PaymentMethod')?.value || 'cash';
    const paidAmountEl = document.getElementById('PaidAmount');
    let paidAmount = 0;

    if (paidAmountEl) {
        if (paymentMethod === 'cash' || paymentMethod === 'transfer') {
            paidAmount = finalTotal;
            paidAmountEl.value = paidAmount.toFixed(2);
            paidAmountEl.readOnly = true;
        } else if (paymentMethod === 'credit') {
            paidAmount = 0;
            paidAmountEl.value = '0.00';
            paidAmountEl.readOnly = true;
        } else {
            paidAmount = Math.min(parseFloat(paidAmountEl.value) || 0, finalTotal);
            paidAmountEl.readOnly = false;
        }
    }

    const remaining = finalTotal - paidAmount;

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
    if (els.totalAfterDiscount) els.totalAfterDiscount.value = (finalTotal - totalTax).toFixed(2);
    if (els.taxAmount) els.taxAmount.value = totalTax.toFixed(2);
    if (els.grandTotal) els.grandTotal.value = finalTotal.toFixed(2);
    if (els.paidAmount) els.paidAmount.value = paidAmount.toFixed(2);
    if (els.remainingAmount) els.remainingAmount.value = remaining.toFixed(2);
}

// =============================================
// Payment Method Handler
// =============================================
function handlePaymentMethodChange() {
    const paymentMethod = document.getElementById('PaymentMethod');
    const paidInput = document.getElementById('PaidAmount');
    const cashBoxField = document.getElementById('CashBoxField');
    const bankField = document.getElementById('BankField');
    const grandTotalEl = document.getElementById('GrandTotal');

    if (!paymentMethod) return;

    const method = paymentMethod.value;
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
// SAVE INVOICE - API Integration with 05-SelectOption.js
// =============================================
async function saveInvoice() {
    if (invoiceItems.length === 0) {
        ArbahToast.error('لا يمكن حفظ فاتورة فارغة!', 4000, { title: 'خطأ!' });
        return;
    }

    // ✅ Get customer data from 05-SelectOption.js
    const customerData = getSelectedEntityData('customer');
    if (!customerData || !customerData.id) {
        ArbahToast.warning('يرجى اختيار العميل أولاً!', 4000, { title: 'تنبيه!' });
        return;
    }

    // ✅ Get other entities from 05-SelectOption.js
    const salesRepData = getSelectedEntityData('SalesReps');
    const branchData = getSelectedEntityData('branch');
    const warehouseData = getSelectedEntityData('Warehouses');
    const costCenterData = getSelectedEntityData('costcenter');
    const cashBoxData = getSelectedEntityData('cashboxes');
    const bankData = getSelectedEntityData('Banks');

    const paymentMethod = document.getElementById('PaymentMethod')?.value || 'cash';

    // Build payments array
    const payments = [];
    if (paymentMethod === 'cash' || paymentMethod === 'partial') {
        const paidAmount = parseFloat(document.getElementById('PaidAmount')?.value) || 0;
        if (paidAmount > 0 && cashBoxData && cashBoxData.id) {
            payments.push({
                paymentMethod: 'cash',
                amount: paidAmount,
                cashBoxId: cashBoxData.id,          // ✅ ObjectId
                cashBoxName: cashBoxData.name || ''
            });
        }
    } else if (paymentMethod === 'transfer') {
        const grandTotal = parseFloat(document.getElementById('GrandTotal')?.value) || 0;
        if (bankData && bankData.id) {
            payments.push({
                paymentMethod: 'transfer',
                amount: grandTotal,
                bankId: bankData.id,                // ✅ ObjectId
                bankName: bankData.name || ''
            });
        }
    }

    const invoiceData = {
        invoiceType: 'sales',
        referenceNumber: document.getElementById('ReferenceNumber')?.value || '',
        date: document.getElementById('SalesDate')?.value || new Date().toISOString().split('T')[0],
        dueDate: document.getElementById('DueDate')?.value || null,
        entityType: 'customer',
        entityId: customerData.id,                      // ✅ ObjectId
        entityName: customerData.name,
        entityCode: customerData.code || '',
        entityAccountId: customerData.id,                 // ✅ ObjectId (نفس entityId للعميل)
        salesRepId: salesRepData ? salesRepData.id : null,      // ✅ ObjectId
        salesRepName: salesRepData ? salesRepData.name : '',
        branchId: branchData ? branchData.id : null,            // ✅ ObjectId
        branchName: branchData ? branchData.name : '',
        warehouseId: warehouseData ? warehouseData.id : null,   // ✅ ObjectId
        warehouseName: warehouseData ? warehouseData.name : '',
        costCenterId: costCenterData ? costCenterData.id : null,// ✅ ObjectId
        costCenterName: costCenterData ? costCenterData.name : '',
        paymentMethod: paymentMethod,
        paidAmount: parseFloat(document.getElementById('PaidAmount')?.value) || 0,
        priceIncludesTax: document.getElementById('PriceIncludesTax')?.value === 'true',
        generalDiscountPercent: parseFloat(document.getElementById('DiscountPercent')?.value) || 0,
        items: invoiceItems.map(item => ({
            productId: item.id,
            productName: item.name,
            productCode: item.code,
            unit: item.unit,
            quantity: item.quantity,
            price: item.price,
            priceType: item.priceType,
            discountPercent: item.discountPercent,
            discountAmount: item.discountAmount,
            taxPercent: item.taxPercent,
            taxExempt: item.taxExempt,
            costPrice: item.costPrice
        })),
        payments: payments,
        notes: ''
    };

    console.log('📤 Sending invoice data:', invoiceData);

    // Show loading
    const saveBtn = document.querySelector('.btn-save');
    const originalText = saveBtn?.innerHTML;
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> جاري الحفظ...';
    }

    try {
        const response = await fetch('/api/Invoices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(invoiceData)
        });

        const result = await response.json();
        console.log('📥 Server response:', result);

        if (result.success) {
            ArbahToast.success(result.message, 6000, { title: 'تم!' });
            resetInvoice();
        } else {
            ArbahToast.error(result.message || 'حدث خطأ', 6000, { title: 'خطأ!' });
        }
    } catch (error) {
        console.error('❌ Error:', error);
        ArbahToast.error('فشل الاتصال بالخادم', 6000, { title: 'خطأ!' });
    } finally {
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
        }
    }
}

// =============================================
// Reset Invoice
// =============================================
function resetInvoice() {
    invoiceItems = [];
    selectedItems.clear();

    // Clear all select inputs
    document.querySelectorAll('.select-search').forEach(el => el.value = '');
    document.querySelectorAll('.select-value').forEach(el => el.value = '');

    const inputs = ['ReferenceNumber', 'DiscountPercent'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });

    const paymentMethod = document.getElementById('PaymentMethod');
    if (paymentMethod) paymentMethod.value = 'cash';

    handlePaymentMethodChange();
    renderInvoiceTable();
    calculateTotals();
}

// =============================================
// Print Invoice
// =============================================
function printInvoice() {
    if (invoiceItems.length === 0) {
        ArbahToast.error('لا يمكن طباعة فاتورة فارغة!', 4000);
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

function formatNumber(num) {
    if (num === undefined || num === null) return '0.00';
    return parseFloat(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// =============================================
// Initialization
// =============================================
document.addEventListener('DOMContentLoaded', async function() {
    if (!document.getElementById('SalesInvoiceTable')) return;

    await loadInventoryFromDB();

    const today = new Date().toISOString().split('T')[0];
    const salesDate = document.getElementById('SalesDate');
    const dueDate = document.getElementById('DueDate');

    if (salesDate) salesDate.value = today;
    if (dueDate) {
        const d = new Date();
        d.setDate(d.getDate() + CONFIG.DEFAULT_DUE_DAYS);
        dueDate.value = d.toISOString().split('T')[0];
    }

    const paymentMethod = document.getElementById('PaymentMethod');
    if (paymentMethod) paymentMethod.addEventListener('change', handlePaymentMethodChange);

    const priceType = document.getElementById('PriceType');
    if (priceType) priceType.addEventListener('change', handlePriceTypeChange);

    const priceIncludesTax = document.getElementById('PriceIncludesTax');
    if (priceIncludesTax) priceIncludesTax.addEventListener('change', handlePriceIncludesTaxChange);

    const quickSearch = document.getElementById('QuickSearchItem');
    if (quickSearch) {
        quickSearch.addEventListener('keyup', function(e) {
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

    document.addEventListener('keydown', function(e) {
        if (e.key === 'F1') {
            e.preventDefault();
            openPopUpWindow('AddNewPopup');
            setTimeout(initInvoicePopup, 100);
        }
        if (e.key === 'F9') {
            e.preventDefault();
            saveInvoice();
        }
    });

    renderInvoiceTable();
    calculateTotals();
    handlePaymentMethodChange();
});

// =============================================
// Aliases for HTML onclick
// =============================================
function saveSalesInvoice() { return saveInvoice(); }
function printSalesInvoiceFromPage() { return printInvoice(); }
function clearAllSalesItems() { return clearAllItems(); }
function addSelectedSalesItem() { return addSelectedItem(); }
function toggleSalesSelectAll() { return toggleSelectAll(); }
function searchSalesItems() { return searchItems(); }
function calculateSalesTotals() { return calculateTotals(); }
function handleSalesPaymentMethodChange() { return handlePaymentMethodChange(); }
function handlePriceTypeChange() {
    const priceTypeSelect = document.getElementById('PriceType');
    if (!priceTypeSelect) return;
    currentPriceType = priceTypeSelect.value;
    invoiceItems.forEach(item => changeItemPriceType(item.id, currentPriceType));
    renderInvoiceTable();
    calculateTotals();
}
function handlePriceIncludesTaxChange() {
    const select = document.getElementById('PriceIncludesTax');
    priceIncludesTax = select ? select.value === 'true' : false;
    invoiceItems.forEach(item => {
        if (priceIncludesTax && !item.taxExempt) {
            if (!item._originalPriceIncludesTax) item._originalPriceIncludesTax = item.price;
            item.price = item._originalPriceIncludesTax / (1 + item.taxPercent / 100);
            item.priceIncludesTax = true;
        } else {
            if (item._originalPriceIncludesTax) {
                item.price = item._originalPriceIncludesTax;
                delete item._originalPriceIncludesTax;
            }
            item.priceIncludesTax = false;
        }
    });
    renderInvoiceTable();
    calculateTotals();
}