// ═══════════════════════════════════════════════════════════
// CostCenters.js - Frontend Controller for CostCenters Module
// ArbahERP - Integrated Accounting System
// ═══════════════════════════════════════════════════════════

let currentEditingId = null;
let allCostCentersData = [];

// ═══════════════════════════════════════════════════════════
//    حفظ مركز تكلفة جديد أو تعديل موجود
// ═══════════════════════════════════════════════════════════
async function saveCostCenter() {
    const CostCenterId = document.getElementById("CostCenterId")?.value;

    const CostCenter = {
        name: document.getElementById("CostCenterName")?.value?.trim() || "",
        type: document.getElementById("CenterType")?.value || "main",
        branch: document.getElementById("CenterBranch")?.value?.trim() || "",
        budget: parseFloat(document.getElementById("CenterBudget")?.value) || 0,
        status: document.getElementById("CenterStatus")?.value || "active",
        notes: document.getElementById("CenterNotes")?.value?.trim() || ""
    };

    // إرسال الكود في الإضافة فقط
    if (!CostCenterId) {
        const codeInput = document.getElementById("CostCenterCode");
        if (codeInput) {
            CostCenter.code = codeInput.value?.trim();
        }
    }

    // ── المركز الأب (لو فرعي) ──
    if (CostCenter.type === "sub") {
        const parentSelect = document.getElementById("ParentCenter");
        if (parentSelect && parentSelect.value) {
            CostCenter.parentCenter = parentSelect.value;
            CostCenter.parentCenterCode = parentSelect.options[parentSelect.selectedIndex].text.split(" - ")[0];
        }
    }

    // ── التحقق من البيانات ──
    if (!CostCenter.name) {
        ArbahToast.warning("يرجى إدخال اسم مركز التكلفة", 4000, { title: "خلي بالك !!" });
        return;
    }
    if (CostCenter.type === "sub" && !CostCenter.parentCenter) {
        ArbahToast.warning("المركز الفرعي يجب أن يكون مرتبط بمركز رئيسي", 4000, { title: "خلي بالك !!" });
        return;
    }

    let url = "/api/CostCenters/create";
    let method = "POST";

    if (CostCenterId) {
        url = `/api/CostCenters/${CostCenterId}`;
        method = "PUT";
    }

    try {
        const response = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(CostCenter)
        });

        const result = await response.json();

        if (result.success) {
            ArbahToast.success(
                CostCenterId
                    ? "تم تعديل مركز التكلفة بنجاح"
                    : "تم إضافة مركز التكلفة بنجاح",
                4000,
                { title: "تم!" }
            );
            closePopUpWindow("AddNewPopup");
            resetForm();
            getCostCenters();
        } else {
            ArbahToast.error(result.message || "حدث خطأ", 4000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error saving cost center:", error);
        ArbahToast.error("حدث خطأ في الاتصال بالخادم", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    جلب مراكز التكلفة وعرضها
// ═══════════════════════════════════════════════════════════
async function getCostCenters() {
    const tbody = document.querySelector("#CostCentersTable");
    if (!tbody) {
        console.error("CostCentersTable tbody not found!");
        return;
    }

    tbody.innerHTML = `<tr><td colspan="9" class="NotFound">جاري التحميل...</td></tr>`;

    try {
        const response = await fetch("/api/CostCenters");
        if (!response.ok) {
            throw new Error("HTTP error! status: " + response.status);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || "Server returned error");
        }

        const CostCenters = result.data || [];
        allCostCentersData = CostCenters;
        tbody.innerHTML = "";

        if (CostCenters.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="NotFound">لا يوجد مراكز تكلفة</td></tr>`;
            updateMetrics([]);
            return;
        }

        CostCenters.forEach((Center, i) => {
            const CenterId = Center._id;
            const parentName = Center.parentCenter ? Center.parentCenter.name : "-";
            const budgetUsage = Center.budget > 0 ? ((Center.currentCost || 0) / Center.budget * 100).toFixed(1) : 0;

            let iconColorClass = "Color-Bg-green";
            if (Center.status === "inactive") {
                iconColorClass = "Color-Bg-orange";
            } else if (Center.status === "closed") {
                iconColorClass = "Color-Bg-red";
            }

            let typeBadgeClass = Center.type === "main" ? "Color-Bg-green" : "Color-Bg-blue";
            let typeText = Center.type === "main" ? "رئيسي" : "فرعي";

            const tr = document.createElement("tr");
            tr.dataset.id = CenterId;
            tr.innerHTML = `
                <td class="row-number">${i + 1}</td>
                <td>
                    <div class="Name-Cell">
                        <i class="fa-solid fa-layer-group ${iconColorClass}"></i>
                        <div class="Name-Cell-info">
                            <span class="name">${escapeHtml(Center.name)}</span>
                            <span class="code">${escapeHtml(Center.code || "CC-" + String(i + 1).padStart(3, "0"))}</span>
                        </div>
                    </div>
                </td>
                <td>${escapeHtml(Center.code || "-")}</td>
                <td><span class="status-badge ${typeBadgeClass}">${typeText}</span></td>
                <td>${escapeHtml(parentName)}</td>
                <td>${escapeHtml(Center.branch || "-")}</td>
                <td>
                    <span class="status-badge ${budgetUsage > 90 ? 'Color-Bg-red' : budgetUsage > 70 ? 'Color-Bg-orange' : 'Color-Bg-green'}">
                        ${formatNumber(Center.currentCost || 0)} <small>(${budgetUsage}%)</small>
                    </span>
                </td>
                <td>${formatNumber(Center.budget || 0)} ر.س</td>
                <td><span class="status-badge ${iconColorClass}">${getStatusText(Center.status)}</span></td>
            `;
            tbody.appendChild(tr);
        });

        // إعادة تهيئة الجدول بعد تحميل البيانات
        if (window.costCentersFilter) {
            window.costCentersFilter.reinit();
        } else if (typeof ArbahTable !== "undefined") {
            window.costCentersFilter = new ArbahTable("MainPerfectTable", { rowsPerPage: 15,dateColumnIndex: 2});
        }

        updateMetrics(CostCenters);

    } catch (error) {
        console.error("Error fetching CostCenters:", error);
        tbody.innerHTML = `<tr><td colspan="9" class="NotFound">حدث خطأ في تحميل البيانات: ${escapeHtml(error.message)}</td></tr>`;
    }
}

// ═══════════════════════════════════════════════════════════
//    تحديث الإحصائيات
// ═══════════════════════════════════════════════════════════
function updateMetrics(CostCenters) {
    const totalCenters = CostCenters.length;
    const activeCenters = CostCenters.filter(c => c.status === "active").length;
    const mainCenters = CostCenters.filter(c => c.type === "main").length;
    const totalCosts = CostCenters.reduce((sum, c) => sum + (c.currentCost || 0), 0);
    const totalBudget = CostCenters.reduce((sum, c) => sum + (c.budget || 0), 0);

    const totalEl = document.getElementById("TotalCostCenters");
    const activeEl = document.getElementById("ActiveCenters");
    const costsEl = document.getElementById("TotalCosts");
    const mainEl = document.getElementById("MainCenters");

    if (totalEl) totalEl.textContent = totalCenters;
    if (activeEl) activeEl.textContent = activeCenters;
    if (costsEl) costsEl.textContent = formatNumber(totalCosts) + " ر.س";
    if (mainEl) mainEl.textContent = mainCenters;
}

// ═══════════════════════════════════════════════════════════
//    جلب المراكز الرئيسية (للـ dropdown)
// ═══════════════════════════════════════════════════════════
async function loadMainCenters() {
    try {
        const response = await fetch("/api/CostCenters/main-centers");
        const result = await response.json();

        if (result.success) {
            const select = document.getElementById("ParentCenter");
            if (!select) return;

            // احتفظ بالـ option الأولى
            select.innerHTML = '<option value="">اختر المركز الأب...</option>';

            result.data.forEach(center => {
                const option = document.createElement("option");
                option.value = center._id;
                option.textContent = `${center.code} - ${center.name}`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error("Error loading main centers:", error);
    }
}

// ═══════════════════════════════════════════════════════════
//    تعديل مركز تكلفة
// ═══════════════════════════════════════════════════════════
function editCostCenter(id) {
    const Center = allCostCentersData.find(c => c._id === id || c._id == id);
    if (!Center) {
        ArbahToast.error("مركز التكلفة غير موجود", 3000, { title: "خطأ !" });
        return;
    }

    currentEditingId = id;

    const setValue = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value || "";
    };

    setValue("CostCenterId", id);
    setValue("CostCenterCode", Center.code || "");
    setValue("CostCenterName", Center.name);
    setValue("CenterType", Center.type);
    setValue("CenterBranch", Center.branch);
    setValue("CenterBudget", Center.budget);
    setValue("CenterStatus", Center.status || "active");
    setValue("CenterNotes", Center.notes);

    // handleCenterTypeChange();
    // if (Center.type === "sub" && Center.parentCenter) {
    //     setValue("ParentCenter", Center.parentCenter._id || Center.parentCenter);
    // }

    const popupTitle = document.getElementById("PopupTitle");
    const popupSubtitle = document.getElementById("PopupSubtitle");
    if (popupTitle) popupTitle.textContent = "تعديل بيانات مركز التكلفة";
    if (popupSubtitle) popupSubtitle.textContent = "تعديل بيانات: " + Center.name;

    openPopUpWindow("AddNewPopup");
}

// ═══════════════════════════════════════════════════════════
//    عرض تفاصيل مركز التكلفة
// ═══════════════════════════════════════════════════════════
function viewCostCenterDetails(id) {
    const Center = allCostCentersData.find(c => c._id === id || c._id == id);
    if (!Center) return;

    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value || "-";
    };

    setText("DetailsCode", Center.code);
    setText("DetailCenterName", Center.name);
    setText("DetailCenterCode", Center.code);
    setText("DetailType", Center.type === "main" ? "رئيسي" : "فرعي");
    setText("DetailParent", Center.parentCenter ? Center.parentCenter.name : "-");
    setText("DetailBranch", Center.branch);
    setText("DetailBudget", formatNumber(Center.budget || 0) + " ر.س");
    setText("DetailCurrentCost", formatNumber(Center.currentCost || 0) + " ر.س");
    setText("DetailStatus", getStatusText(Center.status));

    // Budget usage bar
    const usagePercent = Center.budget > 0 ? ((Center.currentCost || 0) / Center.budget * 100).toFixed(1) : 0;
    const usageEl = document.getElementById("DetailBudgetUsage");
    if (usageEl) {
        usageEl.style.width = Math.min(usagePercent, 100) + "%";
        usageEl.textContent = usagePercent + "%";
        usageEl.className = "progress-bar " + (usagePercent > 90 ? "bg-red" : usagePercent > 70 ? "bg-orange" : "bg-green");
    }

    // Notes
    const notesSection = document.getElementById("NotesSection");
    if (notesSection) notesSection.style.display = Center.notes ? "block" : "none";
    setText("DetailNotes", Center.notes);

    // Created info
    const createdAt = Center.createdAt ? new Date(Center.createdAt).toLocaleString("ar-SA-u-nu-latn") : "--";
    const createdByEl = document.getElementById("DetailCreatedBy");
    if (createdByEl) createdByEl.innerHTML = "تم إنشاؤها: " + createdAt;

    openPopUpWindow("DetailsPopup");
}

// ═══════════════════════════════════════════════════════════
//    إخفاء مركز تكلفة (Soft Delete)
// ═══════════════════════════════════════════════════════════
async function hideCostCenter(id) {
    const ok = await ArbahToast.confirm(
        "هل تريد إخفاء مركز التكلفة؟ (لن يظهر في القائمة لكن بياناته محفوظة)",
        { title: "إخفاء", confirmText: "إخفاء", cancelText: "إلغاء" }
    );
    if (!ok) return;

    try {
        const response = await fetch("/api/CostCenters/hide/" + id, {
            method: "PUT",
            headers: { "Content-Type": "application/json" }
        });
        const result = await response.json();

        if (result.success) {
            ArbahToast.success(result.message || "تم إخفاء مركز التكلفة بنجاح", 3000, { title: "تم!" });
            getCostCenters();
        } else {
            ArbahToast.error(result.message || "حدث خطأ", 3000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error hiding CostCenter:", error);
        ArbahToast.error("حدث خطأ في الاتصال", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    إظهار مركز تكلفة مخفي
// ═══════════════════════════════════════════════════════════
async function restoreCostCenter(id) {
    const ok = await ArbahToast.confirm("هل تريد إظهار مركز التكلفة؟");
    if (!ok) return;

    try {
        const response = await fetch("/api/CostCenters/restore/" + id, {
            method: "PUT",
            headers: { "Content-Type": "application/json" }
        });
        const result = await response.json();

        if (result.success) {
            ArbahToast.success("تم إظهار مركز التكلفة بنجاح", 3000, { title: "تم!" });
            getCostCenters();
        } else {
            ArbahToast.error(result.message || "حدث خطأ", 3000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error restoring CostCenter:", error);
        ArbahToast.error("حدث خطأ في الاتصال", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    بحث مراكز التكلفة
// ═══════════════════════════════════════════════════════════
async function searchCostCenters(keyword) {
    if (!keyword || keyword.trim().length === 0) {
        getCostCenters();
        return;
    }

    try {
        const response = await fetch("/api/CostCenters/search/" + encodeURIComponent(keyword.trim()));
        const result = await response.json();

        if (result.success) {
            allCostCentersData = result.data || [];
            renderCostCenters(allCostCentersData);
            updateMetrics(allCostCentersData);
        } else {
            ArbahToast.error(result.message || "حدث خطأ في البحث", 3000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error searching cost centers:", error);
        ArbahToast.error("حدث خطأ في الاتصال", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    تصفية مراكز التكلفة
// ═══════════════════════════════════════════════════════════
function filterCostCenters(type) {
    if (!type || type === "all") {
        renderCostCenters(allCostCentersData);
        updateMetrics(allCostCentersData);
        return;
    }

    const filtered = allCostCentersData.filter(c => c.type === type);
    renderCostCenters(filtered);
    updateMetrics(filtered);
}

// ═══════════════════════════════════════════════════════════
//    عرض مراكز التكلفة (render helper)
// ═══════════════════════════════════════════════════════════
function renderCostCenters(CostCenters) {
    const tbody = document.querySelector("#CostCentersTable");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (CostCenters.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="NotFound">لا يوجد مراكز تكلفة</td></tr>`;
        return;
    }

    CostCenters.forEach((Center, i) => {
        const CenterId = Center._id;
        const parentName = Center.parentCenter ? Center.parentCenter.name : "-";
        const budgetUsage = Center.budget > 0 ? ((Center.currentCost || 0) / Center.budget * 100).toFixed(1) : 0;

        let iconColorClass = "Color-Bg-green";
        if (Center.status === "inactive") {
            iconColorClass = "Color-Bg-orange";
        } else if (Center.status === "closed") {
            iconColorClass = "Color-Bg-red";
        }

        let typeBadgeClass = Center.type === "main" ? "Color-Bg-green" : "Color-Bg-blue";
        let typeText = Center.type === "main" ? "رئيسي" : "فرعي";

        const tr = document.createElement("tr");
        tr.dataset.id = CenterId;
        tr.innerHTML = `
            <td class="row-number">${i + 1}</td>
            <td>
                <div class="Name-Cell">
                    <i class="fa-solid fa-layer-group ${iconColorClass}"></i>
                    <div class="Name-Cell-info">
                        <span class="name">${escapeHtml(Center.name)}</span>
                        <span class="code">${escapeHtml(Center.code || "CC-" + String(i + 1).padStart(3, "0"))}</span>
                    </div>
                </div>
            </td>
            <td>${escapeHtml(Center.code || "-")}</td>
            <td><span class="status-badge ${typeBadgeClass}">${typeText}</span></td>
            <td>${escapeHtml(parentName)}</td>
            <td>${escapeHtml(Center.branch || "-")}</td>
            <td>
                <span class="status-badge ${budgetUsage > 90 ? 'Color-Bg-red' : budgetUsage > 70 ? 'Color-Bg-orange' : 'Color-Bg-green'}">
                    ${formatNumber(Center.currentCost || 0)} <small>(${budgetUsage}%)</small>
                </span>
            </td>
            <td>${formatNumber(Center.budget || 0)} ر.س</td>
            <td><span class="status-badge ${iconColorClass}">${getStatusText(Center.status)}</span></td>
        `;
        tbody.appendChild(tr);
    });

    if (window.costCentersFilter) {
        window.costCentersFilter.reinit();
    }
}

// ═══════════════════════════════════════════════════════════
//    جلب الكود التالي تلقائياً
// ═══════════════════════════════════════════════════════════
async function fetchNextCostCenterCode() {
    try {
        const response = await fetch("/api/CostCenters/next-code");
        const result = await response.json();

        if (result.success && result.data && result.data.nextCode) {
            const codeInput = document.getElementById("CostCenterCode");
            if (codeInput && !codeInput.value) {
                codeInput.value = result.data.nextCode;
            }
        }
    } catch (error) {
        console.error("Error fetching next code:", error);
        generateCostCenterCodeLocal();
    }
}

// ═══════════════════════════════════════════════════════════
//    دوال مساعدة
// ═══════════════════════════════════════════════════════════
function resetForm() {
    const form = document.getElementById("CostCenterForm");
    if (form) form.reset();

    const centerId = document.getElementById("CostCenterId");
    if (centerId) centerId.value = "";

    currentEditingId = null;

    const popupTitle = document.getElementById("PopupTitle");
    const popupSubtitle = document.getElementById("PopupSubtitle");
    if (popupTitle) popupTitle.textContent = "إضافة مركز تكلفة جديد";
    if (popupSubtitle) popupSubtitle.textContent = "أدخل بيانات مركز التكلفة والميزانية";

    fetchNextCostCenterCode();
    handleCenterTypeChange();

    const popup = document.querySelector("#AddNewPopup .PopUp-Window");
    if (popup) {
        popup.style.transform = "translate(-50%, -50%)";
        popup.style.top = "50%";
        popup.style.left = "50%";
    }
}

function generateCostCenterCodeLocal() {
    const count = allCostCentersData.length + 1;
    const code = "CC-" + String(count).padStart(3, "0");
    const codeInput = document.getElementById("CostCenterCode");
    if (codeInput) codeInput.value = code;
}

function handleCenterTypeChange() {
    const type = document.getElementById("CenterType")?.value;
    const parentField = document.getElementById("ParentCenterField");
    if (parentField) {
        parentField.style.display = type === "sub" ? "block" : "none";
    }
    if (type === "sub") {
        loadMainCenters();
    }
}

function getStatusText(status) {
    switch (status) {
        case "active": return "نشط";
        case "inactive": return "غير نشط";
        case "closed": return "مغلق";
        default: return "غير معروف";
    }
}

function getStatusClass(status) {
    switch (status) {
        case "active": return "Color-Bg-green";
        case "inactive": return "Color-Bg-orange";
        case "closed": return "Color-Bg-red";
        default: return "Color-Bg-gray";
    }
}

function formatNumber(num) {
    if (num === null || num === undefined || num === "") return "0.00";
    const parsed = parseFloat(num);
    if (isNaN(parsed)) return "0.00";
    return parsed.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = String(text);
    return div.innerHTML;
}

// ═══════════════════════════════════════════════════════════
//    تحميل مراكز التكلفة عند بدء التشغيل
// ═══════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", function () {
    getCostCenters();
});