// ═══════════════════════════════════════════════════════════
//    متغيرات عامة
// ═══════════════════════════════════════════════════════════
let currentEditingId = null;
let allMovementsData = [];

// ═══════════════════════════════════════════════════════════
//    حفظ حركة مخزون (تسوية)
// ═══════════════════════════════════════════════════════════
async function saveMovement() {
    const MovementId = document.getElementById("MovementId")?.value;

    const Movement = {
        date: document.getElementById("MovementDate")?.value,
        item: document.getElementById("ItemSelect")?.value,
        quantity: parseFloat(document.getElementById("MovementQuantity")?.value) || 0,
        warehouse: document.getElementById("WarehouseSelect")?.value,
        notes: document.getElementById("MovementNotes")?.value?.trim() || ""
    };

    // ── التحقق من البيانات ──
    if (!Movement.item) {
        ArbahToast.warning("يرجى اختيار الصنف", 4000, { title: "خلي بالك !!" });
        return;
    }
    if (!Movement.warehouse) {
        ArbahToast.warning("يرجى اختيار المستودع", 4000, { title: "خلي بالك !!" });
        return;
    }
    if (Movement.quantity === 0) {
        ArbahToast.warning("يرجى إدخال الكمية (موجب للزيادة، سالب للنقصان)", 4000, { title: "خلي بالك !!" });
        return;
    }

    let url = "/api/StockMovements/adjustment";
    let method = "POST";

    if (MovementId) {
        url = `/api/StockMovements/${MovementId}`;
        method = "PUT";
    }

    try {
        const response = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(Movement)
        });

        const result = await response.json();

        if (result.success) {
            ArbahToast.success(
                MovementId ? "تم تعديل التسوية بنجاح" : "تم حفظ التسوية بنجاح",
                4000,
                { title: "تم!" }
            );
            closePopUpWindow("AddNewPopup");
            resetForm();
            getMovements();
        } else {
            ArbahToast.error(result.message || "حدث خطأ", 4000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error saving movement:", error);
        ArbahToast.error("حدث خطأ في الاتصال بالخادم", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    جلب حركات المخزون وعرضها
// ═══════════════════════════════════════════════════════════
async function getMovements() {
    const tbody = document.querySelector("#StockMovementTable");
    if (!tbody) {
        console.error("Movements table tbody not found!");
        return;
    }

    tbody.innerHTML = `<tr><td colspan="10" class="NotFound">جاري التحميل...</td></tr>`;

    try {
        const response = await fetch("/api/StockMovements");
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
            tbody.innerHTML = `<tr><td colspan="10" class="NotFound">لا توجد حركات مخزنية</td></tr>`;
            updateMetrics([]);
            return;
        }

        Movements.forEach((Movement, i) => {
            const MovementId = Movement._id;
            const typeInfo = getMovementTypeInfo(Movement.type);
            const item = Movement.items && Movement.items.length > 0 ? Movement.items[0] : null;
            const itemName = item ? item.productName : "--";
            const itemCode = item ? item.productCode : "";
            const quantity = Movement.totalQuantity || 0;
            const quantitySign = Movement.type === "receipt" || Movement.type === "return_in" ? "+" : "-";
            const warehouseName = Movement.toWarehouse ? Movement.toWarehouse.name :
                (Movement.fromWarehouse ? Movement.fromWarehouse.name : "--");
            const sourceDoc = Movement.reference || "--";

            const tr = document.createElement("tr");
            tr.dataset.id = MovementId;
            tr.innerHTML = `
                <td class="row-number">${i + 1}</td>
                <td>${escapeHtml(Movement.code)}</td>
                <td>
                    <span class="status-badge ${typeInfo.bgClass}">
                        <i class="${typeInfo.icon}"></i>
                        ${typeInfo.label}
                    </span>
                </td>
                <td>
                    <div class="Name-Cell">
                        <i class="fa-solid fa-cube ${typeInfo.bgClass}"></i>
                        <div class="Name-Cell-info">
                            <span class="name">${escapeHtml(itemName)}</span>
                            <span class="code">${escapeHtml(itemCode)}</span>
                        </div>
                    </div>
                </td>
                <td>${quantitySign}${formatNumber(quantity)}</td>
                <td>${formatNumber(Movement.balanceAfter || 0)}</td>
                <td>
                    <span class="status-badge Color-Bg-green">${escapeHtml(warehouseName)}</span>
                </td>
                <td>
                    ${sourceDoc !== "--" ? `
                        <a href="Receipt.html?ref=${encodeURIComponent(sourceDoc)}" class="status-badge Color-Bg-blue">${escapeHtml(sourceDoc)}</a>
                    ` : `<span class="text-muted">--</span>`}
                </td>
                <td>${formatDate(Movement.date)}</td>
                <td>
                    <div class="action-menu-container">
                        <button class="Action-Row-Btn"><i class="fa-solid fa-ellipsis"></i></button>
                        <div class="Profile-Dropdown">
                            <a class="Profile-Link" onclick="event.stopPropagation(); editMovement('${MovementId}')">
                                <i class="fa-regular fa-pen-to-square"></i> تعديل
                            </a>
                            <a class="Profile-Link" onclick="event.stopPropagation(); viewMovementDetails('${MovementId}')">
                                <i class="fa-solid fa-eye"></i> عرض التفاصيل
                            </a>
                            <div class="Separator"></div>
                            <a class="Profile-Link text-danger" onclick="event.stopPropagation(); deleteMovement('${MovementId}')">
                                <i class="fa-solid fa-trash-can"></i> حذف
                            </a>
                        </div>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // إعادة تهيئة الجدول بعد تحميل البيانات
        if (window.movementsFilter) {
            window.movementsFilter.reinit();
        } else if (typeof ArbahTable !== "undefined") {
            window.movementsFilter = new ArbahTable("MainPerfectTable", { rowsPerPage: 15,dateColumnIndex: 2});
        }

        bindActionMenus();
        updateMetrics(Movements);

    } catch (error) {
        console.error("Error fetching movements:", error);
        tbody.innerHTML = `<tr><td colspan="10" class="NotFound">حدث خطأ في تحميل البيانات: ${escapeHtml(error.message)}</td></tr>`;
    }
}

// ═══════════════════════════════════════════════════════════
//    تحديث الإحصائيات
// ═══════════════════════════════════════════════════════════
function updateMetrics(Movements) {
    // الأصناف النشطة (عدد الأصناف الفريدة)
    const uniqueItems = new Set();
    Movements.forEach(m => {
        if (m.items) {
            m.items.forEach(item => uniqueItems.add(item.product));
        }
    });

    // حركات اليوم
    const today = new Date().toISOString().split("T")[0];
    const todayMovements = Movements.filter(m => {
        const mDate = new Date(m.date).toISOString().split("T")[0];
        return mDate === today;
    }).length;

    const activeEl = document.getElementById("ActiveItems");
    const lowStockEl = document.getElementById("LowStockItems");
    const warehousesEl = document.getElementById("TotalWarehouses");
    const todayEl = document.getElementById("TodayMovements");

    if (activeEl) activeEl.textContent = uniqueItems.size;
    if (lowStockEl) lowStockEl.textContent = "0"; // يتم حسابه من الباك إند
    if (warehousesEl) warehousesEl.textContent = "4"; // يتم تحديثه من الباك إند
    if (todayEl) todayEl.textContent = todayMovements;
}

// ═══════════════════════════════════════════════════════════
//    تعديل حركة
// ═══════════════════════════════════════════════════════════
function editMovement(id) {
    const Movement = allMovementsData.find(m => m._id === id || m._id == id);
    if (!Movement) {
        ArbahToast.error("الحركة غير موجودة", 3000, { title: "خطأ !" });
        return;
    }

    currentEditingId = id;

    const item = Movement.items && Movement.items.length > 0 ? Movement.items[0] : null;

    const setValue = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value || "";
    };

    setValue("MovementId", id);
    setValue("DocNumber", Movement.code);
    setValue("MovementDate", Movement.date ? new Date(Movement.date).toISOString().split("T")[0] : "");
    setValue("ItemSelect", item ? item.product : "");
    setValue("MovementQuantity", Movement.totalQuantity || 0);
    setValue("WarehouseSelect", Movement.toWarehouse ? Movement.toWarehouse._id : (Movement.fromWarehouse ? Movement.fromWarehouse._id : ""));
    setValue("MovementNotes", Movement.notes);

    const popupTitle = document.getElementById("PopupTitle");
    const popupSubtitle = document.getElementById("PopupSubtitle");
    if (popupTitle) popupTitle.textContent = "تعديل تسوية مخزون";
    if (popupSubtitle) popupSubtitle.textContent = "تعديل بيانات: " + Movement.code;

    openPopUpWindow("AddNewPopup");
}

// ═══════════════════════════════════════════════════════════
//    عرض تفاصيل الحركة
// ═══════════════════════════════════════════════════════════
function viewMovementDetails(id) {
    const Movement = allMovementsData.find(m => m._id === id || m._id == id);
    if (!Movement) return;

    const typeInfo = getMovementTypeInfo(Movement.type);
    const item = Movement.items && Movement.items.length > 0 ? Movement.items[0] : null;
    const itemName = item ? item.productName : "--";
    const warehouseName = Movement.toWarehouse ? Movement.toWarehouse.name :
        (Movement.fromWarehouse ? Movement.fromWarehouse.name : "--");

    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value || "--";
    };

    setText("DetailsCode", Movement.code);
    setText("DetailsName", itemName);
    setText("DetailsSupCode", item ? item.productCode : "--");
    setText("DetailsTax", typeInfo.label);
    setText("DetailsReg", formatDate(Movement.date));
    setText("DetailsPhone", formatNumber(Movement.totalQuantity || 0));
    setText("DetailsAddress", warehouseName);
    setText("DetailsOpenBalance", formatNumber(Movement.balanceAfter || 0));
    setText("DetailsCreditLimit", formatNumber(Movement.totalCost || 0));
    setText("DetailsCurrentBalance", Movement.reference || "--");

    openPopUpWindow("DetailsPopup");
}

// ═══════════════════════════════════════════════════════════
//    حذف حركة
// ═══════════════════════════════════════════════════════════
async function deleteMovement(id) {
    const ok = await ArbahToast.confirm("هل تريد حذف الحركة؟ لا يمكن التراجع عن هذا الإجراء.",
        { title: "حذف", confirmText: "حذف", cancelText: "إلغاء" }
    ); if (!ok) return;

    try {
        const response = await fetch("/api/StockMovements/" + id, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" }
        });
        const result = await response.json();

        if (result.success) {
            ArbahToast.success("تم حذف الحركة بنجاح", 3000, { title: "تم!" });
            getMovements();
        } else {
            ArbahToast.error(result.message || "حدث خطأ", 3000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error deleting movement:", error);
        ArbahToast.error("حدث خطأ في الاتصال", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    دوال مساعدة
// ═══════════════════════════════════════════════════════════
function resetForm() {
    const form = document.getElementById("MovementForm");
    if (form) form.reset();

    const movementId = document.getElementById("MovementId");
    if (movementId) movementId.value = "";

    currentEditingId = null;

    const popupTitle = document.getElementById("PopupTitle");
    const popupSubtitle = document.getElementById("PopupSubtitle");
    if (popupTitle) popupTitle.textContent = "تسوية مخزون";
    if (popupSubtitle) popupSubtitle.textContent = "تعديل الرصيد بعد الجرد";

    // تعيين تاريخ اليوم
    const dateInput = document.getElementById("MovementDate");
    if (dateInput) dateInput.value = new Date().toISOString().split("T")[0];

    const popup = document.querySelector("#AddNewPopup .PopUp-Window");
    if (popup) {
        popup.style.transform = "translate(-50%, -50%)";
        popup.style.top = "50%";
        popup.style.left = "50%";
    }
}

function getMovementTypeInfo(type) {
    const types = {
        receipt: { label: "وارد", icon: "fa-solid fa-arrow-down", bgClass: "Color-Bg-green" },
        issue: { label: "صادر", icon: "fa-solid fa-arrow-up", bgClass: "Color-Bg-red" },
        transfer_out: { label: "تحويل", icon: "fa-solid fa-arrow-right-arrow-left", bgClass: "Color-Bg-blue" },
        transfer_in: { label: "تحويل", icon: "fa-solid fa-arrow-right-arrow-left", bgClass: "Color-Bg-blue" },
        return_in: { label: "مرتجع وارد", icon: "fa-solid fa-rotate-left", bgClass: "Color-Bg-purple" },
        return_out: { label: "مرتجع صادر", icon: "fa-solid fa-rotate-right", bgClass: "Color-Bg-orange" },
        adjustment: { label: "تسوية", icon: "fa-solid fa-sliders", bgClass: "Color-Bg-cyan" },
        opening_balance: { label: "رصيد افتتاحي", icon: "fa-solid fa-scale-balanced", bgClass: "Color-Bg-gray" }
    };
    return types[type] || { label: type, icon: "fa-solid fa-box", bgClass: "Color-Bg-gray" };
}

function formatNumber(num) {
    if (num === null || num === undefined || num === "") return "0";
    const parsed = parseFloat(num);
    if (isNaN(parsed)) return "0";
    return parsed.toLocaleString("en-US");
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
    getMovements();

    // تعيين تاريخ اليوم
    const dateInput = document.getElementById("MovementDate");
    if (dateInput) dateInput.value = new Date().toISOString().split("T")[0];
});