// ═══════════════════════════════════════════════════════════
//    متغيرات عامة
// ═══════════════════════════════════════════════════════════
let allMovementsData = [];
let currentMovementId = null;
let currentPage = 1;
let totalPages = 1;

// ═══════════════════════════════════════════════════════════
//    جلب الحركات وعرضها
// ═══════════════════════════════════════════════════════════
async function loadMovements() {
    const tbody = document.querySelector("#MovementsTable");
    if (!tbody) {
        console.error("MovementsTable tbody not found!");
        return;
    }

    tbody.innerHTML = `<tr><td colspan="11" class="NotFound">جاري التحميل...</td></tr>`;

    // بناء الفلاتر
    const filters = {};
    const typeFilter = document.getElementById("FilterMovementType")?.value;
    const statusFilter = document.getElementById("FilterStatus")?.value;
    const startDate = document.getElementById("FilterStartDate")?.value;
    const endDate = document.getElementById("FilterEndDate")?.value;
    const warehouseFilter = document.getElementById("FilterWarehouse")?.value;
    const searchKeyword = document.getElementById("MovementSearch")?.value?.trim();

    if (typeFilter) filters.type = typeFilter;
    if (statusFilter) filters.status = statusFilter;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    if (warehouseFilter) filters.fromWarehouse = warehouseFilter;
    if (searchKeyword) filters.reference = searchKeyword;

    // بناء query string
    const queryParams = new URLSearchParams();
    Object.keys(filters).forEach(key => {
        if (filters[key]) queryParams.append(key, filters[key]);
    });

    try {
        const response = await fetch("/api/StockMovements?" + queryParams.toString());
        if (!response.ok) {
            throw new Error("HTTP error! status: " + response.status);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || "Server returned error");
        }

        const Movements = result.data || [];
        allMovementsData = Movements;
        tbody.innerHTML = "";

        if (Movements.length === 0) {
            tbody.innerHTML = `<tr><td colspan="11" class="NotFound">لا توجد حركات مخزنية</td></tr>`;
            updateMetrics([]);
            return;
        }

        Movements.forEach((Movement, i) => {
            const MovementId = Movement._id;
            const typeLabel = getMovementTypeLabel(Movement.type);
            const typeIcon = getMovementTypeIcon(Movement.type);
            const typeClass = getMovementTypeClass(Movement.type);
            const statusLabel = getStatusLabel(Movement.status);
            const statusClass = getStatusClass(Movement.status);

            const fromWarehouse = Movement.fromWarehouse ? Movement.fromWarehouse.name : "--";
            const toWarehouse = Movement.toWarehouse ? Movement.toWarehouse.name : "--";
            const itemsCount = Movement.items ? Movement.items.length : 0;

            const tr = document.createElement("tr");
            tr.dataset.id = MovementId;
            tr.innerHTML = `
                <td><input type="checkbox" class="RowCheckbox" data-id="${MovementId}"></td>
                <td>
                    <span class="code-badge">${escapeHtml(Movement.code)}</span>
                </td>
                <td>
                    <span class="type-badge ${typeClass}">
                        <i class="${typeIcon}"></i> ${typeLabel}
                    </span>
                </td>
                <td>${formatDate(Movement.date)}</td>
                <td>${escapeHtml(fromWarehouse)}</td>
                <td>${escapeHtml(toWarehouse)}</td>
                <td>${itemsCount}</td>
                <td>${formatNumber(Movement.totalQuantity)}</td>
                <td dir="ltr">${formatNumber(Movement.totalCost)}</td>
                <td>
                    <span class="status-badge ${statusClass}">
                        ${statusLabel}
                    </span>
                </td>
                <td>
                    <div class="action-menu-container">
                        <button class="Action-Row-Btn"><i class="fa-solid fa-ellipsis"></i></button>
                        <div class="Profile-Dropdown">
                            <a class="Profile-Link" onclick="event.stopPropagation(); viewMovementDetails('${MovementId}')">
                                <i class="fa-solid fa-eye"></i> عرض التفاصيل
                            </a>
                            ${Movement.status === "draft" ? `
                            <a class="Profile-Link" onclick="event.stopPropagation(); confirmMovement('${MovementId}')">
                                <i class="fa-solid fa-check"></i> تأكيد الحركة
                            </a>
                            ` : ""}
                            ${Movement.status !== "cancelled" ? `
                            <a class="Profile-Link text-danger" onclick="event.stopPropagation(); cancelMovement('${MovementId}')">
                                <i class="fa-solid fa-ban"></i> إلغاء الحركة
                            </a>
                            ` : ""}
                        </div>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // إعادة تهيئة الجدول
        if (window.movementsFilter) {
            window.movementsFilter.reinit();
        } else if (typeof ArbahTable !== "undefined") {
            window.movementsFilter = new ArbahTable("MainPerfectTable", { rowsPerPage: 15,dateColumnIndex: 2});
        }

        bindActionMenus();
        updateMetrics(Movements);

    } catch (error) {
        console.error("Error fetching movements:", error);
        tbody.innerHTML = `<tr><td colspan="11" class="NotFound">حدث خطأ في تحميل البيانات: ${escapeHtml(error.message)}</td></tr>`;
    }
}

// ═══════════════════════════════════════════════════════════
//    جلب المخازن للفلاتر
// ═══════════════════════════════════════════════════════════
async function getWarehousesForFilter() {
    try {
        const response = await fetch("/api/Warehouses");
        if (!response.ok) return;
        const result = await response.json();
        if (result.success) {
            const select = document.getElementById("FilterWarehouse");
            if (!select) return;
            select.innerHTML = '<option value="">كل المخازن</option>';
            result.data.forEach(wh => {
                const option = document.createElement("option");
                option.value = wh._id;
                option.textContent = wh.name;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Error fetching warehouses:", error);
    }
}

// ═══════════════════════════════════════════════════════════
//    تحديث الإحصائيات
// ═══════════════════════════════════════════════════════════
function updateMetrics(Movements) {
    const total = Movements.length;
    const draft = Movements.filter(m => m.status === "draft").length;
    const confirmed = Movements.filter(m => m.status === "confirmed").length;
    const totalValue = Movements.reduce((sum, m) => sum + (m.totalCost || 0), 0);

    const totalEl = document.getElementById("TotalMovements");
    const draftEl = document.getElementById("DraftCount");
    const confirmedEl = document.getElementById("ConfirmedCount");
    const valueEl = document.getElementById("TotalMovementsValue");

    if (totalEl) totalEl.textContent = total;
    if (draftEl) draftEl.textContent = draft;
    if (confirmedEl) confirmedEl.textContent = confirmed;
    if (valueEl) valueEl.textContent = formatNumber(totalValue) + " ر.س";
}

// ═══════════════════════════════════════════════════════════
//    عرض تفاصيل الحركة
// ═══════════════════════════════════════════════════════════
async function viewMovementDetails(id) {
    const Movement = allMovementsData.find(m => m._id === id || m._id == id);
    if (!Movement) {
        // جلب من السيرفر
        try {
            const response = await fetch(`/api/StockMovements/${id}`);
            const result = await response.json();
            if (result.success) {
                showMovementDetails(result.data);
            }
        } catch (error) {
            console.error("Error fetching movement details:", error);
        }
        return;
    }
    showMovementDetails(Movement);
}

function showMovementDetails(Movement) {
    currentMovementId = Movement._id;

    const typeLabel = getMovementTypeLabel(Movement.type);
    const statusLabel = getStatusLabel(Movement.status);
    const statusClass = getStatusClass(Movement.status);

    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value || "--";
    };

    setText("DetailsMovementTitle", "تفاصيل الحركة المخزنية");
    setText("DetailsMovementCode", Movement.code);
    setText("DetailsCode", Movement.code);
    setText("DetailsType", typeLabel);
    setText("DetailsDate", formatDate(Movement.date));
    setText("DetailsFrom", Movement.fromWarehouse ? Movement.fromWarehouse.name : "--");
    setText("DetailsTo", Movement.toWarehouse ? Movement.toWarehouse.name : "--");
    setText("DetailsTotalCost", formatNumber(Movement.totalCost) + " ر.س");
    setText("DetailsReference", Movement.reference || "--");
    setText("DetailsEntity", Movement.entityName || "--");

    // Badges
    const statusBadge = document.getElementById("DetailsMovementStatusBadge");
    const typeBadge = document.getElementById("DetailsMovementTypeBadge");
    if (statusBadge) {
        statusBadge.textContent = statusLabel;
        statusBadge.className = "Badge " + statusClass;
    }
    if (typeBadge) {
        typeBadge.textContent = typeLabel;
    }

    // الأصناف
    const itemsBody = document.getElementById("DetailsItemsBody");
    if (itemsBody) {
        itemsBody.innerHTML = "";
        if (Movement.items && Movement.items.length > 0) {
            Movement.items.forEach((item, i) => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${i + 1}</td>
                    <td>
                        <div class="Name-Cell">
                            <i class="fa-solid fa-box Color-Bg-blue"></i>
                            <div class="Name-Cell-info">
                                <span class="name">${escapeHtml(item.productName)}</span>
                                <span class="code">${escapeHtml(item.productCode)}</span>
                            </div>
                        </div>
                    </td>
                    <td>${escapeHtml(item.unit)}</td>
                    <td>${formatNumber(item.quantity)}</td>
                    <td>${formatNumber(item.movementUnitCost || item.unitCost)}</td>
                    <td>${formatNumber(item.movementTotalCost || item.totalCost)}</td>
                `;
                itemsBody.appendChild(tr);
            });
        } else {
            itemsBody.innerHTML = `<tr><td colspan="6" class="NotFound">لا توجد أصناف</td></tr>`;
        }
    }

    // القيد المحاسبي
    const journalSection = document.getElementById("JournalEntrySection");
    const journalInfo = document.getElementById("JournalEntryInfo");
    const journalLink = document.getElementById("JournalEntryLink");

    if (Movement.journalEntry) {
        if (journalSection) journalSection.style.display = "block";
        if (journalInfo) journalInfo.textContent = `قيد رقم: ${Movement.journalEntry.code || Movement.journalEntry._id}`;
        if (journalLink) journalLink.href = `/journal-entries/${Movement.journalEntry._id}`;
    } else {
        if (journalSection) journalSection.style.display = "none";
    }

    // أزرار الإجراءات
    const confirmBtn = document.getElementById("ConfirmMovementBtn");
    const cancelBtn = document.getElementById("CancelMovementBtn");

    if (confirmBtn) confirmBtn.style.display = Movement.status === "draft" ? "inline-flex" : "none";
    if (cancelBtn) cancelBtn.style.display = Movement.status !== "cancelled" ? "inline-flex" : "none";

    openPopUpWindow("MovementDetailsPopup");
}

// ═══════════════════════════════════════════════════════════
//    تأكيد الحركة
// ═══════════════════════════════════════════════════════════
async function confirmMovement(id) {
    const ok = await ArbahToast.confirm("هل تريد تأكيد الحركة؟ سيتم تحديث الأرصدة وإنشاء القيد المحاسبي.",
        { title: "تأكيد", confirmText: "تأكيد", cancelText: "إلغاء" }
    ); if (!ok) return;

    try {
        const response = await fetch(`/api/StockMovements/confirm/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" }
        });
        const result = await response.json();

        if (result.success) {
            ArbahToast.success("تم تأكيد الحركة وتحديث الأرصدة بنجاح", 3000, { title: "تم!" });
            loadMovements();
            if (document.getElementById("MovementDetailsPopup")?.classList.contains("active")) {
                closePopUpWindow("MovementDetailsPopup");
            }
        } else {
            ArbahToast.error(result.message || "حدث خطأ", 3000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error confirming movement:", error);
        ArbahToast.error("حدث خطأ في الاتصال", 3000, { title: "خطأ !" });
    }
}

function confirmCurrentMovement() {
    if (currentMovementId) confirmMovement(currentMovementId);
}

// ═══════════════════════════════════════════════════════════
//    إلغاء الحركة
// ═══════════════════════════════════════════════════════════
async function cancelMovement(id) {
    const ok = await ArbahToast.confirm("هل تريد إلغاء الحركة؟ سيتم عكس الأرصدة والقيد المحاسبي.",
        { title: "إلغاء", confirmText: "إلغاء", cancelText: "تراجع" }
    ); if (!ok) return;

    try {
        const response = await fetch(`/api/StockMovements/cancel/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" }
        });
        const result = await response.json();

        if (result.success) {
            ArbahToast.success("تم إلغاء الحركة بنجاح", 3000, { title: "تم!" });
            loadMovements();
            if (document.getElementById("MovementDetailsPopup")?.classList.contains("active")) {
                closePopUpWindow("MovementDetailsPopup");
            }
        } else {
            ArbahToast.error(result.message || "حدث خطأ", 3000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error cancelling movement:", error);
        ArbahToast.error("حدث خطأ في الاتصال", 3000, { title: "خطأ !" });
    }
}

function cancelCurrentMovement() {
    if (currentMovementId) cancelMovement(currentMovementId);
}

// ═══════════════════════════════════════════════════════════
//    تصدير Excel
// ═══════════════════════════════════════════════════════════
function exportMovementsExcel() {
    // يتم تنفيذه لاحقاً
    ArbahToast.info("جاري تجهيز ملف Excel...", 3000, { title: "تنبيه" });
}

// ═══════════════════════════════════════════════════════════
//    فتح صفحة حركة جديدة
// ═══════════════════════════════════════════════════════════
function openNewMovementPage() {
    window.location.href = "/warehouses";
}

// ═══════════════════════════════════════════════════════════
//    تحديد الكل
// ═══════════════════════════════════════════════════════════
function toggleSelectAll() {
    const selectAll = document.getElementById("SelectAll");
    const checkboxes = document.querySelectorAll(".RowCheckbox");
    checkboxes.forEach(cb => cb.checked = selectAll.checked);
}

// ═══════════════════════════════════════════════════════════
//    التنقل بين الصفحات
// ═══════════════════════════════════════════════════════════
function prevPage() {
    if (currentPage > 1) {
        currentPage--;
        loadMovements();
    }
}

function nextPage() {
    if (currentPage < totalPages) {
        currentPage++;
        loadMovements();
    }
}

// ═══════════════════════════════════════════════════════════
//    دوال مساعدة
// ═══════════════════════════════════════════════════════════
function getMovementTypeLabel(type) {
    const labels = {
        receipt: "إضافة / استلام",
        issue: "صرف",
        transfer_out: "تحويل صادر",
        transfer_in: "تحويل وارد",
        return_in: "مرتجع وارد",
        return_out: "مرتجع صادر",
        adjustment: "تسوية جرد",
        opening_balance: "رصيد افتتاحي",
        production_in: "إنتاج وارد",
        production_out: "إنتاج صادر",
        damage: "هالك"
    };
    return labels[type] || type;
}

function getMovementTypeIcon(type) {
    const icons = {
        receipt: "fa-solid fa-arrow-down",
        issue: "fa-solid fa-arrow-up",
        transfer_out: "fa-solid fa-arrow-right-arrow-left",
        transfer_in: "fa-solid fa-arrow-right-arrow-left",
        adjustment: "fa-solid fa-sliders",
        return_in: "fa-solid fa-rotate-left",
        return_out: "fa-solid fa-rotate-right"
    };
    return icons[type] || "fa-solid fa-box";
}

function getMovementTypeClass(type) {
    const classes = {
        receipt: "badge-receipt",
        issue: "badge-issue",
        transfer_out: "badge-transfer",
        transfer_in: "badge-transfer",
        adjustment: "badge-adjustment",
        return_in: "badge-return",
        return_out: "badge-return"
    };
    return classes[type] || "badge-default";
}

function getStatusLabel(status) {
    const labels = {
        draft: "مسودة",
        confirmed: "مؤكدة",
        posted: "مرحلة",
        cancelled: "ملغاة"
    };
    return labels[status] || status;
}

function getStatusClass(status) {
    const classes = {
        draft: "Color-Bg-orange",
        confirmed: "Color-Bg-green",
        posted: "Color-Bg-blue",
        cancelled: "Color-Bg-red"
    };
    return classes[status] || "Color-Bg-gray";
}

function formatNumber(num) {
    if (num === null || num === undefined || num === "") return "0.00";
    const parsed = parseFloat(num);
    if (isNaN(parsed)) return "0.00";
    return parsed.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(dateStr) {
    if (!dateStr) return "--";
    const date = new Date(dateStr);
    return date.toLocaleDateString("ar-SA-u-nu-latn");
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
    loadMovements();
    getWarehousesForFilter();

    // تعيين تواريخ الفلتر الافتراضية
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const startDateInput = document.getElementById("FilterStartDate");
    const endDateInput = document.getElementById("FilterEndDate");
    if (startDateInput) startDateInput.value = firstDay.toISOString().split("T")[0];
    if (endDateInput) endDateInput.value = today.toISOString().split("T")[0];
});