// ═══════════════════════════════════════════════════════════
//    متغيرات عامة
// ═══════════════════════════════════════════════════════════
let currentEditingId = null;
let allWarehousesData = [];
let allBranchesData = [];

// ═══════════════════════════════════════════════════════════
//    حفظ مخزن جديد أو تعديل موجود
// ═══════════════════════════════════════════════════════════
async function saveWarehouse() {
    const WarehouseId = document.getElementById("WarehouseId")?.value;

    const Warehouse = {
        name: document.getElementById("WarehouseName")?.value?.trim() || "",
        branch: document.getElementById("BranchId").value,  // ← ID الفرع (ObjectId)
        manager: document.getElementById("WarehouseManager")?.value?.trim() || "",
        phone: document.getElementById("WarehousePhone")?.value?.trim() || "",
        address: document.getElementById("WarehouseAddress")?.value?.trim() || "",
        notes: document.getElementById("WarehouseNotes")?.value?.trim() || ""
    };

    // إرسال الكود في الإضافة فقط
    if (!WarehouseId) {
        const codeInput = document.getElementById("WarehouseCode");
        if (codeInput) {
            Warehouse.code = codeInput.value?.trim();
        }
    }

    // ── التحقق من البيانات ──
    if (!Warehouse.name) {
        ArbahToast.warning("يرجى إدخال اسم المخزن", 4000, { title: "خلي بالك !!" });
        return;
    }

    let url = "/api/Warehouses/create";
    let method = "POST";

    if (WarehouseId) {
        url = `/api/Warehouses/${WarehouseId}`;
        method = "PUT";
    }

    try {
        const response = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(Warehouse)
        });

        const result = await response.json();

        if (result.success) {
            ArbahToast.success(
                WarehouseId ? "تم تعديل المخزن بنجاح" : "تم إضافة المخزن بنجاح",
                4000,
                { title: "تم!" }
            );
            closePopUpWindow("AddNewPopup");
            resetForm();
            getWarehouses();
        } else {
            ArbahToast.error(result.message || "حدث خطأ", 4000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error saving warehouse:", error);
        ArbahToast.error("حدث خطأ في الاتصال بالخادم", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    جلب المخازن وعرضهم
// ═══════════════════════════════════════════════════════════
async function getWarehouses() {
    const tbody = document.querySelector("#WarehousesTable");
    if (!tbody) {
        console.error("WarehousesTable tbody not found!");
        return;
    }

    tbody.innerHTML = `<tr><td colspan="8" class="NotFound">جاري التحميل...</td></tr>`;

    try {
        const response = await fetch("/api/Warehouses");
        if (!response.ok) {
            throw new Error("HTTP error! status: " + response.status);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || "Server returned error");
        }

        const Warehouses = result.data || [];
        allWarehousesData = Warehouses;
        tbody.innerHTML = "";

        if (Warehouses.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="NotFound">لا يوجد مخازن</td></tr>`;
            updateMetrics([]);
            return;
        }

        Warehouses.forEach((Warehouse, i) => {
            const WarehouseId = Warehouse._id;

            // ✅ جلب اسم الفرع من الـ populate
            const branchName = Warehouse.branch?.name || "-";

            let iconColorClass = "Color-Bg-blue";

            const tr = document.createElement("tr");
            tr.dataset.id = WarehouseId;
            tr.innerHTML = `
                <td class="row-number">${i + 1}</td>
                <td>
                    <div class="Name-Cell">
                        <i class="fa-solid fa-warehouse ${iconColorClass}"></i>
                        <div class="Name-Cell-info">
                            <span class="name">${escapeHtml(Warehouse.name)}</span>
                            <span class="code">${escapeHtml(Warehouse.code || "WH-" + String(i + 1).padStart(3, "0"))}</span>
                        </div>
                    </div>
                </td>
                <td>${escapeHtml(branchName)}</td>  <!-- ✅ اسم الفرع هنا -->
                <td>${escapeHtml(Warehouse.manager || "--")}</td>
                <td dir="ltr" style="text-align:right;">${escapeHtml(Warehouse.phone || "--")}</td>
                <td>${escapeHtml(Warehouse.address || "--")}</td>
                <td>
                    <div class="action-menu-container">
                        <button class="Action-Row-Btn"><i class="fa-solid fa-ellipsis"></i></button>
                        <div class="Profile-Dropdown">
                            <a class="Profile-Link" onclick="event.stopPropagation(); editWarehouse('${WarehouseId}')">
                                <i class="fa-regular fa-pen-to-square"></i> تعديل
                            </a>
                            <a class="Profile-Link" onclick="event.stopPropagation(); viewWarehouseDetails('${WarehouseId}')">
                                <i class="fa-solid fa-eye"></i> عرض التفاصيل
                            </a>
                            <a class="Profile-Link" onclick="event.stopPropagation(); hideWarehouse('${WarehouseId}')">
                                <i class="fa-solid fa-eye-slash"></i> إخفاء
                            </a>
                        </div>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // إعادة تهيئة الجدول بعد تحميل البيانات
        if (window.warehousesFilter) {
            window.warehousesFilter.reinit();
        } else if (typeof ArbahTable !== "undefined") {
            window.warehousesFilter = new ArbahTable("MainPerfectTable", { rowsPerPage: 15,dateColumnIndex: 2});
        }

        bindActionMenus();
        updateMetrics(Warehouses);

    } catch (error) {
        console.error("Error fetching warehouses:", error);
        tbody.innerHTML = `<tr><td colspan="8" class="NotFound">حدث خطأ في تحميل البيانات: ${escapeHtml(error.message)}</td></tr>`;
    }
}

// ═══════════════════════════════════════════════════════════
//    جلب الفروع
// ═══════════════════════════════════════════════════════════
async function getBranches() {
    try {
        const response = await fetch("/api/Branches");
        if (!response.ok) return;
        const result = await response.json();
        if (result.success) {
            allBranchesData = result.data || [];
            populateBranchSelect();
        }
    } catch (error) {
        console.error("Error fetching branches:", error);
    }
}

function populateBranchSelect() {
    const select = document.getElementById("BranchId");
    if (!select) return;
    select.innerHTML = '<option value="">-- اختر الفرع --</option>';
    allBranchesData.forEach(branch => {
        const option = document.createElement("option");
        option.value = branch._id;  // ← تخزين ID
        option.textContent = branch.name;  // ← عرض الاسم
        select.appendChild(option);
    });
}

// ═══════════════════════════════════════════════════════════
//    تحديث الإحصائيات
// ═══════════════════════════════════════════════════════════
function updateMetrics(Warehouses) {
    const totalWarehouses = Warehouses.length;
    const activeWarehouses = Warehouses.filter(w => w.isActive !== false).length;

    const totalEl = document.getElementById("TotalWarehouses");
    const activeEl = document.getElementById("ActiveWarehouses");

    if (totalEl) totalEl.textContent = totalWarehouses;
    if (activeEl) activeEl.textContent = activeWarehouses;
}

// ═══════════════════════════════════════════════════════════
//    تعديل مخزن
// ═══════════════════════════════════════════════════════════
function editWarehouse(id) {
    const Warehouse = allWarehousesData.find(w => w._id === id || w._id == id);
    if (!Warehouse) {
        ArbahToast.error("المخزن غير موجود", 3000, { title: "خطأ !" });
        return;
    }

    currentEditingId = id;

    const setValue = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value || "";
    };

    setValue("WarehouseId", id);
    setValue("WarehouseCode", Warehouse.code || "");
    setValue("WarehouseName", Warehouse.name);
    // ✅ لو branch object (من populate)، خزن الـ ID في الـ select
    setValue("BranchId", Warehouse.branch?._id || Warehouse.branch || "");
    setValue("WarehouseManager", Warehouse.manager);
    setValue("WarehousePhone", Warehouse.phone);
    setValue("WarehouseAddress", Warehouse.address);
    setValue("WarehouseNotes", Warehouse.notes);

    const popupTitle = document.getElementById("PopupTitle");
    const popupSubtitle = document.getElementById("PopupSubtitle");
    if (popupTitle) popupTitle.textContent = "تعديل بيانات المخزن";
    if (popupSubtitle) popupSubtitle.textContent = "تعديل بيانات: " + Warehouse.name;

    openPopUpWindow("AddNewPopup");
}

// ═══════════════════════════════════════════════════════════
//    عرض تفاصيل المخزن
// ═══════════════════════════════════════════════════════════
function viewWarehouseDetails(id) {
    const Warehouse = allWarehousesData.find(w => w._id === id || w._id == id);
    if (!Warehouse) return;

    // ✅ جلب اسم الفرع من الـ populate
    const branchName = Warehouse.branch?.name || "--";

    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value || "--";
    };

    setText("DetailsCode", Warehouse.code);
    setText("DetailsName", Warehouse.name);
    setText("DetailsWhCode", Warehouse.code);
    setText("DetailsBranch", branchName);  // ✅ اسم الفرع هنا
    setText("DetailsManager", Warehouse.manager);
    setText("DetailsPhone", Warehouse.phone);
    setText("DetailsAddress", Warehouse.address);
    setText("DetailsNotes", Warehouse.notes || "لا توجد ملاحظات");

    openPopUpWindow("DetailsPopup");
}

// ═══════════════════════════════════════════════════════════
//    إخفاء مخزن (Soft Delete)
// ═══════════════════════════════════════════════════════════
async function hideWarehouse(id) {
    const ok = await ArbahToast.confirm("هل تريد إخفاء المخزن؟ (لن يظهر في القائمة لكن بياناته محفوظة)",
        { title: "اخفاء", confirmText: "اخفاء", cancelText: "إلغاء" }
    ); if (!ok) return;

    try {
        const response = await fetch("/api/Warehouses/hide/" + id, {
            method: "PUT",
            headers: { "Content-Type": "application/json" }
        });
        const result = await response.json();

        if (result.success) {
            ArbahToast.success("تم إخفاء المخزن بنجاح", 3000, { title: "تم!" });
            getWarehouses();
        } else {
            ArbahToast.error(result.message || "حدث خطأ", 3000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error hiding warehouse:", error);
        ArbahToast.error("حدث خطأ في الاتصال", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    إظهار مخزن مخفي
// ═══════════════════════════════════════════════════════════
async function restoreWarehouse(id) {
    const ok = await ArbahToast.confirm("هل تريد إظهار المخزن؟");
    if (!ok) return;

    try {
        const response = await fetch("/api/Warehouses/restore/" + id, {
            method: "PUT",
            headers: { "Content-Type": "application/json" }
        });
        const result = await response.json();

        if (result.success) {
            ArbahToast.success("تم إظهار المخزن بنجاح", 3000, { title: "تم!" });
            getWarehouses();
        } else {
            ArbahToast.error(result.message || "حدث خطأ", 3000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error restoring warehouse:", error);
        ArbahToast.error("حدث خطأ في الاتصال", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    حذف مخزن نهائياً
// ═══════════════════════════════════════════════════════════
async function deleteWarehouse(id) {
    const ok = await ArbahToast.confirm("هل تريد حذف المخزن نهائياً؟ لا يمكن التراجع عن هذا الإجراء.",
        { title: "حذف نهائي", confirmText: "حذف", cancelText: "إلغاء" }
    ); if (!ok) return;

    try {
        const response = await fetch("/api/Warehouses/" + id, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" }
        });
        const result = await response.json();

        if (result.success) {
            ArbahToast.success("تم حذف المخزن نهائياً", 3000, { title: "تم!" });
            getWarehouses();
        } else {
            ArbahToast.error(result.message || "حدث خطأ", 3000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error deleting warehouse:", error);
        ArbahToast.error("حدث خطأ في الاتصال", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    جلب الكود التالي تلقائياً
// ═══════════════════════════════════════════════════════════
async function fetchNextCode() {
    try {
        const response = await fetch("/api/Warehouses/next-code");
        const result = await response.json();

        if (result.success && result.data && result.data.nextCode) {
            const codeInput = document.getElementById("WarehouseCode");
            if (codeInput && !codeInput.value) {
                codeInput.value = result.data.nextCode;
            }
        }
    } catch (error) {
        console.error("Error fetching next code:", error);
        generateWarehouseCodeLocal();
    }
}

// ═══════════════════════════════════════════════════════════
//    تصدير Excel
// ═══════════════════════════════════════════════════════════
function exportWarehousesExcel() {
    ArbahToast.info("جاري تجهيز ملف Excel...", 3000, { title: "تنبيه" });
}

// ═══════════════════════════════════════════════════════════
//    دوال مساعدة
// ═══════════════════════════════════════════════════════════
function resetForm() {
    const form = document.getElementById("WarehouseForm");
    if (form) form.reset();

    const warehouseId = document.getElementById("WarehouseId");
    if (warehouseId) warehouseId.value = "";

    currentEditingId = null;

    const popupTitle = document.getElementById("PopupTitle");
    const popupSubtitle = document.getElementById("PopupSubtitle");
    if (popupTitle) popupTitle.textContent = "إضافة مخزن جديد";
    if (popupSubtitle) popupSubtitle.textContent = "أدخل بيانات المخزن بدقة";

    fetchNextCode();

    const popup = document.querySelector("#AddNewPopup .PopUp-Window");
    if (popup) {
        popup.style.transform = "translate(-50%, -50%)";
        popup.style.top = "50%";
        popup.style.left = "50%";
    }
}

function generateWarehouseCodeLocal() {
    const count = allWarehousesData.length + 1;
    const code = "WH-" + String(count).padStart(3, "0");
    const codeInput = document.getElementById("WarehouseCode");
    if (codeInput) codeInput.value = code;
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
    getWarehouses();
    getBranches();
});