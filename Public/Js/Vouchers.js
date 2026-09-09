// ═══════════════════════════════════════════════════════════
//    Vouchers.js - ملف موحد لسندات القبض والصرف
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
//    متغيرات عامة
// ═══════════════════════════════════════════════════════════
let currentEditingId = null;
let allVouchersData = [];
let allCustomersData = [];
let allSuppliersData = [];
let allAccountsData = []; // الصناديق والبنوك
let currentVoucherType = "receipt"; // "receipt" أو "payment"

// ═══════════════════════════════════════════════════════════
//    mapping لأسماء طرق الدفع
// ═══════════════════════════════════════════════════════════
const paymentMethodNames = {
    "cash": "نقداً",
    "transfer": "تحويل بنكي",
    "check": "شيك"
};

const paymentMethodColors = {
    "cash": "Color-Bg-green",
    "transfer": "Color-Bg-blue",
    "check": "Color-Bg-orange"
};

const statusNames = {
    "posted": "مرحل",
    "draft": "مسودة",
    "cancelled": "ملغي"
};

const statusColors = {
    "posted": "Color-Bg-green",
    "draft": "Color-Bg-orange",
    "cancelled": "Color-Bg-red"
};

// ═══════════════════════════════════════════════════════════
//    تحديد نوع السند (قبض/صرف) من الـ URL
// ═══════════════════════════════════════════════════════════
function detectVoucherType() {
    const path = window.location.pathname.toLowerCase();
    if (path.includes("payment") || path.includes("صرف")) {
        currentVoucherType = "payment";
    } else {
        currentVoucherType = "receipt";
    }
    return currentVoucherType;
}

// ═══════════════════════════════════════════════════════════
//    جلب بيانات الجهة من SelectOption
// ═══════════════════════════════════════════════════════════
function getSelectedEntityData() {
    const entityType = currentVoucherType === "receipt" ? "customer" : "supplier";
    const field = document.querySelector(`[data-select="${entityType}"]`);
    if (!field) return null;

    const hiddenInput = field.querySelector('.select-value');
    const searchInput = field.querySelector('.select-search');

    if (!hiddenInput || !hiddenInput.value) return null;

    return {
        id: hiddenInput.value,
        name: searchInput ? searchInput.value.split(' - ').pop() : '',
        code: hiddenInput.getAttribute('AccountCode') || ''
    };
}

// ═══════════════════════════════════════════════════════════
//    جلب بيانات حساب الدفع من SelectOption
// ═══════════════════════════════════════════════════════════
function getSelectedPaymentAccount() {
    const method = document.getElementById("VoucherPaymentMethod")?.value;
    const accountType = method === "cash" ? "cashboxes" : "Banks";

    const field = document.querySelector(`[data-select="${accountType}"]`);
    if (!field) return null;

    const hiddenInput = field.querySelector('.select-value');
    const searchInput = field.querySelector('.select-search');

    if (!hiddenInput || !hiddenInput.value) return null;

    const accountCode = hiddenInput.getAttribute('AccountCode') || '';
    const accountName = searchInput ? searchInput.value.split(' - ').pop() : '';

    return {
        id: hiddenInput.value,
        code: accountCode,
        name: accountName
    };
}

// ═══════════════════════════════════════════════════════════
//    تغيير طريقة الدفع - إظهار/إخفاء الصندوق/البنك
// ═══════════════════════════════════════════════════════════
function handlePaymentMethodChange() {
    const method = document.getElementById("VoucherPaymentMethod")?.value;

    const cashBoxSelect = document.querySelector('[data-select="cashboxes"]');
    const bankSelect = document.querySelector('[data-select="Banks"]');

    const cashBoxField = cashBoxSelect ? cashBoxSelect.closest('.Field') : null;
    const bankField = bankSelect ? bankSelect.closest('.Field') : null;

    if (!cashBoxField || !bankField) {
        console.warn("CashBox or Bank field not found");
        return;
    }

    if (method === "cash") {
        cashBoxField.style.display = "";
        bankField.style.display = "none";
        if (window.selectManager) {
            const bankInstance = Object.values(window.selectManager.instances || {}).find(
                i => i.container === bankSelect
            );
            if (bankInstance) bankInstance.clear();
        }
    } else if (method === "transfer" || method === "check") {
        cashBoxField.style.display = "none";
        bankField.style.display = "";
        if (window.selectManager) {
            const cashInstance = Object.values(window.selectManager.instances || {}).find(
                i => i.container === cashBoxSelect
            );
            if (cashInstance) cashInstance.clear();
        }
    }
}

// ═══════════════════════════════════════════════════════════
//    جلب رقم السند التالي من الـ API
// ═══════════════════════════════════════════════════════════
async function fetchNextVoucherNumber() {
    const numberInput = document.getElementById("VoucherNumber");
    if (!numberInput) return;

    try {
        const response = await fetch(`/api/Vouchers/next-number?type=${currentVoucherType}`);
        const result = await response.json();

        if (result.success && result.data && result.data.nextNumber) {
            numberInput.value = result.data.nextNumber;
        } else {
            const prefix = currentVoucherType === "receipt" ? "RV-" : "PV-";
            numberInput.value = prefix + "0001";
        }
    } catch (error) {
        console.error("Error fetching next voucher number:", error);
        const prefix = currentVoucherType === "receipt" ? "RV-" : "PV-";
        numberInput.value = prefix + "0001";
    }
}

// ═══════════════════════════════════════════════════════════
//    حفظ السند (قبض أو صرف)
// ═══════════════════════════════════════════════════════════
async function saveVoucher() {
    const voucherId = document.getElementById("VoucherId")?.value;

    const entityData = getSelectedEntityData();
    const entityId = entityData ? entityData.id : "";
    const entityName = entityData ? entityData.name : "";
    const entityCode = entityData ? entityData.code : "";

    const paymentAccount = getSelectedPaymentAccount();
    const paymentAccountId = paymentAccount ? paymentAccount.id : "";
    const paymentAccountCode = paymentAccount ? paymentAccount.code : "";
    const paymentAccountName = paymentAccount ? paymentAccount.name : "";

    const voucher = {
        voucherType: currentVoucherType,
        date: document.getElementById("VoucherDate")?.value || null,
        entityType: currentVoucherType === "receipt" ? "customer" : "supplier",
        entityId: entityId,
        entityName: entityName,
        entityCode: entityCode,
        amount: Number(document.getElementById("VoucherAmount")?.value) || 0,
        amountInWords: document.getElementById("VoucherAmountLetter")?.value?.trim() || "",
        paymentMethod: document.getElementById("VoucherPaymentMethod")?.value || "cash",
        paymentAccountId: paymentAccountId,
        paymentAccountName: paymentAccountName,
        paymentAccountCode: paymentAccountCode,
        referenceNumber: document.getElementById("VoucherReference")?.value?.trim() || "",
        notes: document.getElementById("VoucherNotes")?.value?.trim() || ""
    };

    // ── التحقق من البيانات ──
    if (!voucher.entityId) {
        ArbahToast.warning("يرجى اختيار " + (currentVoucherType === "receipt" ? "العميل" : "المورد"), 4000, { title: "خلي بالك !!" });
        return;
    }
    if (voucher.amount <= 0) {
        ArbahToast.warning("المبلغ يجب أن يكون أكبر من صفر", 4000, { title: "خلي بالك !!" });
        return;
    }
    if (!voucher.paymentAccountId) {
        ArbahToast.warning("يرجى اختيار حساب الدفع", 4000, { title: "خلي بالك !!" });
        return;
    }

    try {
        const response = await fetch("/api/Vouchers/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(voucher)
        });

        const result = await response.json();

        if (result.success) {
            ArbahToast.success(
                `تم إنشاء ${currentVoucherType === "receipt" ? "سند القبض" : "سند الصرف"} بنجاح`,
                4000,
                { title: "تم!" }
            );
            closePopUpWindow("AddNewPopup");
            resetVoucherForm();
            getVouchers();
        } else {
            ArbahToast.error(result.message || "حدث خطأ", 4000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error saving voucher:", error);
        ArbahToast.error("حدث خطأ في الاتصال بالخادم", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    جلب السندات وعرضها
// ═══════════════════════════════════════════════════════════
async function getVouchers() {
    const tbody = document.querySelector("#VouchersTable");
    if (!tbody) {
        console.error("VouchersTable tbody not found!");
        return;
    }

    tbody.innerHTML = `<tr><td colspan="9" class="NotFound">جاري التحميل...</td></tr>`;

    try {
        const [vouchersRes, statsRes] = await Promise.all([
            fetch(`/api/Vouchers?type=${currentVoucherType}`),
            fetch(`/api/Vouchers/stats?type=${currentVoucherType}`)
        ]);

        if (!vouchersRes.ok) throw new Error("HTTP error! status: " + vouchersRes.status);

        const vouchersResult = await vouchersRes.json();
        const statsResult = await statsRes.json();

        if (!vouchersResult.success) {
            throw new Error(vouchersResult.message || "Server returned error");
        }

        const vouchers = vouchersResult.data || [];
        allVouchersData = vouchers;
        tbody.innerHTML = "";

        // تحديث الإحصائيات
        if (statsResult.success) {
            updateMetrics(statsResult.data);
        }

        if (vouchers.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="NotFound">لا يوجد سندات</td></tr>`;
            return;
        }

        vouchers.forEach((voucher, i) => {
            const voucherId = voucher._id;
            const entityIcon = voucher.voucherType === "receipt"
                ? "fa-user Color-Bg-green"
                : "fa-truck-ramp-box Color-Bg-red";

            const methodBadge = `<span class="status-badge ${paymentMethodColors[voucher.paymentMethod] || 'Color-Bg-gray'}">${paymentMethodNames[voucher.paymentMethod] || voucher.paymentMethod}</span>`;
            const statusBadge = `<span class="status-badge ${statusColors[voucher.status] || 'Color-Bg-gray'}">${statusNames[voucher.status] || voucher.status}</span>`;

            const tr = document.createElement("tr");
            tr.dataset.id = voucherId;
            tr.innerHTML = `
                <td class="row-number">${i + 1}</td>
                <td>${escapeHtml(voucher.voucherNumber)}</td>
                <td>
                    <div class="Name-Cell">
                        <i class="fa-solid ${entityIcon}"></i>
                        <div class="Name-Cell-info">
                            <span class="name">${escapeHtml(voucher.entityName)}</span>
                            <span class="code">${escapeHtml(voucher.entityCode || '')}</span>
                        </div>
                    </div>
                </td>
                <td><span class="status-badge Color-Bg-red">${formatCurrency(voucher.amount)}</span></td>
                <td>${methodBadge}</td>
                <td><span class="status-badge Color-Bg-green">${escapeHtml(voucher.paymentAccountName || '-')}</span></td>
                <td>${formatDate(voucher.date)}</td>
                <td>${statusBadge}</td>
                <td>
                    <div class="action-menu-container">
                        <button class="Action-Row-Btn"><i class="fa-solid fa-ellipsis"></i></button>
                        <div class="Profile-Dropdown">
                            <a class="Profile-Link" onclick="event.stopPropagation(); viewVoucherDetails('${voucherId}')">
                                <i class="fa-solid fa-eye"></i> عرض التفاصيل
                            </a>
                            <a class="Profile-Link" onclick="event.stopPropagation(); viewJournalEntry('${voucher.journalEntryId}')">
                                <i class="fa-solid fa-book"></i> عرض القيد
                            </a>
                            <div class="Separator"></div>
                            <a class="Profile-Link" onclick="event.stopPropagation(); deleteVoucher('${voucherId}')">
                                <i class="fa-solid fa-trash-can"></i> حذف
                            </a>
                        </div>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // إعادة تهيئة الجدول
        if (window.vouchersFilter) {
            window.vouchersFilter.reinit();
        } else if (typeof ArbahTable !== "undefined") {
            window.vouchersFilter = new ArbahTable("MainPerfectTable", { rowsPerPage: 15, dateColumnIndex: 2 });
        }

        bindActionMenus();
        updateShowingMetrics(vouchers.length);

    } catch (error) {
        console.error("Error fetching vouchers:", error);
        tbody.innerHTML = `<tr><td colspan="9" class="NotFound">حدث خطأ في تحميل البيانات: ${escapeHtml(error.message)}</td></tr>`;
    }
}

// ═══════════════════════════════════════════════════════════
//    تحديث الإحصائيات
// ═══════════════════════════════════════════════════════════
function updateMetrics(stats) {
    const totalEl = document.getElementById("TotalVouchers");
    const amountEl = document.getElementById("TotalAmount");
    const postedEl = document.getElementById("PostedVouchers");
    const pendingEl = document.getElementById("PendingVouchers");

    if (totalEl) totalEl.textContent = stats.total || 0;
    if (amountEl) amountEl.textContent = formatCurrency(stats.totalAmount || 0);
    if (postedEl) postedEl.textContent = stats.posted || 0;
    if (pendingEl) pendingEl.textContent = stats.draft || 0;
}

function updateShowingMetrics(count) {
    const el = document.getElementById("showingDataMetrics");
    if (el) el.textContent = `عرض ${count} من ${count}`;
}

// ═══════════════════════════════════════════════════════════
//    عرض تفاصيل السند
// ═══════════════════════════════════════════════════════════
async function viewVoucherDetails(id) {
    try {
        const response = await fetch(`/api/Vouchers/${id}`);
        const result = await response.json();

        if (!result.success) {
            ArbahToast.error(result.message || "حدث خطأ", 3000);
            return;
        }

        const voucher = result.data;

        const setText = (id, value) => {
            const els = document.querySelectorAll(`[id="${id}"]`);
            els.forEach(el => { if (el) el.textContent = value || "-"; });
        };

        // ── البيانات الأساسية ──
        setText("DetailsVoucherNumber", voucher.voucherNumber);
        setText("DetailsVoucherNumber2", voucher.voucherNumber);
        setText("DetailsDate", formatDate(voucher.date));
        setText("DetailsCreatedBy", voucher.createdBy?.name || voucher.createdBy || "-");

        // ── المبلغ ──
        setText("DetailsAmount", formatCurrency(voucher.amount));
        setText("DetailsAmountWords", voucher.amountInWords || "-");

        // ── الجهة ──
        setText("DetailsEntityName", voucher.entityName);
        setText("DetailsEntityCode", voucher.entityCode);
        setText("DetailsEntityCode2", voucher.entityCode);

        // ── الدفع ──
        setText("DetailsPaymentMethod", paymentMethodNames[voucher.paymentMethod] || voucher.paymentMethod);
        setText("DetailsPaymentAccount", voucher.paymentAccountName || "-");
        setText("DetailsReference", voucher.referenceNumber || "-");

        // ── الحالة والقيد ──
        setText("DetailsStatus", statusNames[voucher.status] || voucher.status);
        setText("DetailsJournalEntry", voucher.journalEntryNo || "-");

        // ── الملاحظات ──
        setText("DetailsNotes", voucher.notes || "لا توجد ملاحظات");

        // ── Footer info ──
        const footerEl = document.getElementById("DetailsFooterInfo");
        if (footerEl) {
            const createdAt = voucher.createdAt ? formatDate(voucher.createdAt) : "-";
            const creator = voucher.createdBy?.name || voucher.createdBy || "-";
            footerEl.textContent = `تم إنشاؤها بواسطة: ${creator} | ${createdAt}`;
        }

        openPopUpWindow("DetailsPopup");
    } catch (error) {
        console.error("Error viewing voucher:", error);
        ArbahToast.error("حدث خطأ في الاتصال", 3000);
    }
}

// ═══════════════════════════════════════════════════════════
//    عرض القيد المحاسبي المرتبط
// ═══════════════════════════════════════════════════════════
function viewJournalEntry(journalEntryId) {
    if (!journalEntryId) {
        ArbahToast.warning("لا يوجد قيد مرتبط بهذا السند", 3000);
        return;
    }
    window.open(`/journal-entries?id=${journalEntryId}`, '_blank');
}

// ═══════════════════════════════════════════════════════════
//    حذف السند
// ═══════════════════════════════════════════════════════════
async function deleteVoucher(id) {
    const ok = await ArbahToast.confirm(
        "هل تريد حذف هذا السند؟ سيتم حذف القيد المحاسبي المرتبط به أيضاً",
        { title: "حذف", confirmText: "حذف", cancelText: "إلغاء" }
    );
    if (!ok) return;

    try {
        const response = await fetch(`/api/Vouchers/${id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" }
        });
        const result = await response.json();

        if (result.success) {
            ArbahToast.success("تم حذف السند بنجاح", 3000, { title: "تم!" });
            getVouchers();
        } else {
            ArbahToast.error(result.message || "حدث خطأ", 3000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error deleting voucher:", error);
        ArbahToast.error("حدث خطأ في الاتصال", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    تصدير Excel
// ═══════════════════════════════════════════════════════════
function exportVouchersExcel() {
    if (allVouchersData.length === 0) {
        ArbahToast.warning("لا يوجد بيانات للتصدير", 3000, { title: "تنبيه" });
        return;
    }

    const typeLabel = currentVoucherType === "receipt" ? "القبض" : "الصرف";
    let csv = `\uFEFFرقم السند,الجهة,المبلغ,طريقة الدفع,الحساب,التاريخ,الحالة,ملاحظات\n`;

    allVouchersData.forEach(v => {
        const status = statusNames[v.status] || v.status;
        const method = paymentMethodNames[v.paymentMethod] || v.paymentMethod;
        csv += `"${v.voucherNumber}","${v.entityName}",${v.amount},"${method}","${v.paymentAccountName || ''}","${formatDate(v.date)}","${status}","${v.notes || ''}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `سندات_${typeLabel}_` + new Date().toISOString().slice(0, 10) + ".csv";
    link.click();
}

// ═══════════════════════════════════════════════════════════
//    دوال مساعدة
// ═══════════════════════════════════════════════════════════
function resetVoucherForm() {
    const form = document.getElementById("VoucherForm");
    if (form) form.reset();

    const voucherId = document.getElementById("VoucherId");
    if (voucherId) voucherId.value = "";

    currentEditingId = null;

    // إعادة تعيين SelectOption للجهة
    const entityType = currentVoucherType === "receipt" ? "customer" : "supplier";
    const entityField = document.querySelector(`[data-select="${entityType}"]`);
    if (entityField && window.selectManager) {
        const instance = Object.values(window.selectManager.instances || {}).find(
            i => i.container === entityField
        );
        if (instance) instance.clear();
    }

    // إعادة تعيين SelectOption للصندوق/البنك
    const paymentMethod = document.getElementById("VoucherPaymentMethod")?.value || "cash";
    const accountType = paymentMethod === "cash" ? "cashboxes" : "Banks";
    const accountField = document.querySelector(`[data-select="${accountType}"]`);
    if (accountField && window.selectManager) {
        const instance = Object.values(window.selectManager.instances || {}).find(
            i => i.container === accountField
        );
        if (instance) instance.clear();
    }

    // إعادة تعيين عنوان النافذة
    const popupTitle = document.getElementById("PopupTitle");
    const popupSubtitle = document.getElementById("PopupSubtitle");
    if (popupTitle) {
        popupTitle.textContent = currentVoucherType === "receipt"
            ? "سند قبض جديد"
            : "سند صرف جديد";
    }
    if (popupSubtitle) {
        popupSubtitle.textContent = currentVoucherType === "receipt"
            ? "أدخل بيانات سند القبض بدقة"
            : "أدخل بيانات سند الصرف بدقة";
    }

    // ← جلب الرقم التالي من الـ API
    fetchNextVoucherNumber();
}

function formatCurrency(value) {
    if (value === undefined || value === null) return "0 ر.س";
    return Number(value).toLocaleString("ar-SA-u-nu-latn") + " ر.س";
}

function formatDate(dateStr) {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("ar-SA-u-nu-latn", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = String(text);
    return div.innerHTML;
}

function bindActionMenus() {
    document.querySelectorAll(".Action-Row-Btn").forEach(btn => {
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);

        newBtn.addEventListener("click", function (e) {
            e.stopPropagation();
            const dropdown = this.nextElementSibling;
            if (!dropdown) return;

            const isOpen = dropdown.classList.contains("active");

            document.querySelectorAll(".Profile-Dropdown.active").forEach(menu => {
                menu.classList.remove("active");
            });

            if (!isOpen) {
                dropdown.classList.add("active");
            }
        });
    });
}

// ═══════════════════════════════════════════════════════════
//    تحميل البيانات عند بدء التشغيل
// ═══════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", function () {
    detectVoucherType();
    getVouchers();
});