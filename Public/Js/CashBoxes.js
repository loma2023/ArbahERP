// ═══════════════════════════════════════════════════════════
// CashBoxes.js - Frontend Controller for CashBoxes Module
// ArbahERP - Integrated Accounting System
// ═══════════════════════════════════════════════════════════

let currentEditingId = null;
let allCashBoxesData = [];
let allBranchesData = [];

// ═══════════════════════════════════════════════════════════
//    حفظ خزينة جديدة أو تعديل موجودة
// ═══════════════════════════════════════════════════════════
async function saveCashBox() {
    const CashBoxId = document.getElementById("CashBoxId")?.value;

    const CashBox = {
        name: document.getElementById("CashBoxName")?.value?.trim() || "",
        branch: document.getElementById("BranchId")?.value || null,
        responsible: document.getElementById("CashBoxResponsible")?.value?.trim() || "",
        openingBalance: parseFloat(document.getElementById("OpenBalance")?.value) || 0,
        balanceType: document.getElementById("CashBoxBalanceType")?.value || "debit",
        status: document.getElementById("CashBoxStatus")?.value || "active",
        notes: document.getElementById("CashBoxNotes")?.value?.trim() || ""
    };

    // إرسال الكود في الإضافة فقط
    if (!CashBoxId) {
        const codeInput = document.getElementById("CashBoxCode");
        if (codeInput) {
            CashBox.code = codeInput.value?.trim();
        }
    }

    // ── التحقق من البيانات ──
    if (!CashBox.name) {
        ArbahToast.warning("يرجى إدخال اسم الخزينة", 4000, { title: "خلي بالك !!" });
        return;
    }

    let url = "/api/CashBoxes/create";
    let method = "POST";

    if (CashBoxId) {
        url = `/api/CashBoxes/${CashBoxId}`;
        method = "PUT";
    }

    try {
        const response = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(CashBox)
        });

        const result = await response.json();

        if (result.success) {
            ArbahToast.success(
                CashBoxId
                    ? "تم تعديل الخزينة بنجاح"
                    : "تم إضافة الخزينة وإنشاء حسابها في شجرة الحسابات بنجاح",
                4000,
                { title: "تم!" }
            );
            closePopUpWindow("AddNewPopup");
            resetForm();
            getCashBoxes();
        } else {
            ArbahToast.error(result.message || "حدث خطأ", 4000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error saving cash box:", error);
        ArbahToast.error("حدث خطأ في الاتصال بالخادم", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    جلب الفروع من السيرفر وملء الـ dropdown
// ═══════════════════════════════════════════════════════════
async function loadBranches() {
    try {
        const response = await fetch("/api/Branches");
        const result = await response.json();

        if (result.success) {
            allBranchesData = result.data || [];
            const branchSelect = document.getElementById("BranchId");
            if (branchSelect) {
                branchSelect.innerHTML = '<option value="">اختر الفرع</option>';
                allBranchesData.forEach(branch => {
                    const option = document.createElement("option");
                    option.value = branch._id;
                    option.textContent = branch.name;
                    branchSelect.appendChild(option);
                });
            }
        }
    } catch (error) {
        console.error("Error loading branches:", error);
    }
}

// ═══════════════════════════════════════════════════════════
//    جلب اسم الفرع من الـ ID
// ═══════════════════════════════════════════════════════════
function getBranchName(branchIdOrObject) {
    if (branchIdOrObject && typeof branchIdOrObject === "object") {
        return branchIdOrObject.name || "-";
    }
    if (!branchIdOrObject) return "-";
    const found = allBranchesData.find(b => b._id === branchIdOrObject || b._id == branchIdOrObject);
    return found ? found.name : "-";
}

// ═══════════════════════════════════════════════════════════
//    جلب الخزنات وعرضها
// ═══════════════════════════════════════════════════════════
async function getCashBoxes() {
    const tbody = document.querySelector("#CashBoxesTable");
    if (!tbody) {
        console.error("CashBoxesTable tbody not found!");
        return;
    }

    tbody.innerHTML = `<tr><td colspan="9" class="NotFound">جاري التحميل...</td></tr>`;

    try {
        const response = await fetch("/api/CashBoxes");
        if (!response.ok) {
            throw new Error("HTTP error! status: " + response.status);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || "Server returned error");
        }

        const CashBoxes = result.data || [];
        allCashBoxesData = CashBoxes;
        tbody.innerHTML = "";

        if (CashBoxes.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="NotFound">لا يوجد خزنات</td></tr>`;
            updateMetrics([]);
            return;
        }

        CashBoxes.forEach((Box, i) => {
            const currentBalance = calculateCurrentBalance(Box);
            const BoxId = Box._id;
            const linkedAccountCode = Box.linkedAccountCode || (Box.linkedAccount ? Box.linkedAccount.code : "--");
            const branchName = getBranchName(Box.branch);

            let iconColorClass = "Color-Bg-green";
            if (Box.status === "frozen") {
                iconColorClass = "Color-Bg-orange";
            } else if (Box.status === "closed") {
                iconColorClass = "Color-Bg-red";
            }

            const tr = document.createElement("tr");
            tr.dataset.id = BoxId;
            tr.innerHTML = `
                <td class="row-number">${i + 1}</td>
                <td>
                    <div class="Name-Cell">
                        <i class="fa-solid fa-box ${iconColorClass}"></i>
                        <div class="Name-Cell-info">
                            <span class="name">${escapeHtml(Box.name)}</span>
                            <span class="code">${escapeHtml(Box.code || "BOX-" + String(i + 1).padStart(3, "0"))}</span>
                        </div>
                    </div>
                </td>
                <td>${escapeHtml(branchName)}</td>
                <td>${escapeHtml(linkedAccountCode)}</td>
                <td>
                    <span class="status-badge ${iconColorClass}">
                        ${formatNumber(currentBalance)}
                    </span>
                </td>
                <td>${escapeHtml(Box.responsible || "-")}</td>
                <td>${getStatusText(Box.status)}</td>
                <td>
                    <div class="action-menu-container">
                        <button class="Action-Row-Btn"><i class="fa-solid fa-ellipsis"></i></button>
                        <div class="Profile-Dropdown">
                            <a class="Profile-Link" onclick="event.stopPropagation(); editCashBox('${BoxId}')">
                                <i class="fa-regular fa-pen-to-square"></i> تعديل
                            </a>
                            <a class="Profile-Link" onclick="event.stopPropagation(); viewCashBoxDetails('${BoxId}')">
                                <i class="fa-solid fa-eye"></i> عرض التفاصيل
                            </a>
                            <a class="Profile-Link" onclick="event.stopPropagation(); hideCashBox('${BoxId}')">
                                <i class="fa-solid fa-eye-slash"></i> إخفاء
                            </a>
                        </div>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        if (window.cashBoxesFilter) {
            window.cashBoxesFilter.reinit();
        } else if (typeof ArbahTable !== "undefined") {
            window.cashBoxesFilter = new ArbahTable("MainPerfectTable", { rowsPerPage: 15,dateColumnIndex: 2});
        }

        bindActionMenus();
        updateMetrics(CashBoxes);

    } catch (error) {
        console.error("Error fetching CashBoxes:", error);
        tbody.innerHTML = `<tr><td colspan="9" class="NotFound">حدث خطأ في تحميل البيانات: ${escapeHtml(error.message)}</td></tr>`;
    }
}

// ═══════════════════════════════════════════════════════════
//    تحديث الإحصائيات
// ═══════════════════════════════════════════════════════════
function updateMetrics(CashBoxes) {
    const totalBoxes = CashBoxes.length;
    const activeBoxes = CashBoxes.filter(b => b.status === "active").length;
    const totalBalance = CashBoxes.reduce((sum, b) => sum + (b.currentBalance || 0), 0);
    const negativeBalance = CashBoxes.filter(b => (b.currentBalance || 0) < 0).length;

    const totalEl = document.getElementById("TotalCashBoxes");
    const activeEl = document.getElementById("ActiveCashBoxes");
    const balanceEl = document.getElementById("TotalBalance");
    const negativeEl = document.getElementById("NegativeBalance");

    if (totalEl) totalEl.textContent = totalBoxes;
    if (activeEl) activeEl.textContent = activeBoxes;
    if (balanceEl) balanceEl.textContent = formatNumber(totalBalance) + " ر.س";
    if (negativeEl) negativeEl.textContent = negativeBalance;
}

// ═══════════════════════════════════════════════════════════
//    تعديل خزينة
// ═══════════════════════════════════════════════════════════
function editCashBox(id) {
    const Box = allCashBoxesData.find(b => b._id === id || b._id == id);
    if (!Box) {
        ArbahToast.error("الخزينة غير موجودة", 3000, { title: "خطأ !" });
        return;
    }

    currentEditingId = id;

    const setValue = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value || "";
    };

    setValue("CashBoxId", id);
    setValue("CashBoxCode", Box.code || "");
    setValue("CashBoxName", Box.name);
    setValue("BranchId", Box.branch?._id || Box.branch || "");
    setValue("CashBoxResponsible", Box.responsible);
    setValue("OpenBalance", Box.openingBalance);
    setValue("CashBoxBalanceType", Box.balanceType || "debit");
    setValue("CashBoxStatus", Box.status || "active");
    setValue("CashBoxNotes", Box.notes);

    const popupTitle = document.getElementById("PopupTitle");
    const popupSubtitle = document.getElementById("PopupSubtitle");
    if (popupTitle) popupTitle.textContent = "تعديل بيانات الخزينة";
    if (popupSubtitle) popupSubtitle.textContent = "تعديل بيانات: " + Box.name;

    openPopUpWindow("AddNewPopup");
}

// ═══════════════════════════════════════════════════════════
//    عرض تفاصيل الخزينة
// ═══════════════════════════════════════════════════════════
function viewCashBoxDetails(id) {
    const Box = allCashBoxesData.find(b => b._id === id || b._id == id);
    if (!Box) return;

    const currentBalance = calculateCurrentBalance(Box);
    const linkedAccount = Box.linkedAccount;
    const branchName = getBranchName(Box.branch);

    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value || "-";
    };

    setText("DetailsCode", Box.code);
    setText("DetailBoxName", Box.name);
    setText("DetailBoxCode", Box.code);
    setText("DetailBranch", branchName);
    setText("DetailResponsible", Box.responsible || "-");
    setText("DetailOpenBalance", formatNumber(Box.openingBalance || 0));
    setText("DetailCurrentBalance", formatNumber(currentBalance));
    setText("DetailStatus", getStatusText(Box.status));

    if (linkedAccount) {
        setText("DetailLinkedAccount", linkedAccount.code + " - " + linkedAccount.name);
    } else {
        setText("DetailLinkedAccount", "غير مرتبط");
    }

    const notesSection = document.getElementById("NotesSection");
    if (notesSection) notesSection.style.display = Box.notes ? "block" : "none";
    setText("DetailNotes", Box.notes);

    const createdAt = Box.createdAt ? new Date(Box.createdAt).toLocaleString("ar-SA-u-nu-latn") : "--";
    const createdByEl = document.getElementById("DetailCreatedBy");
    if (createdByEl) createdByEl.innerHTML = "تم إنشاؤها: " + createdAt;

    openPopUpWindow("DetailsPopup");
}

// ═══════════════════════════════════════════════════════════
//    إخفاء خزينة (Soft Delete)
// ═══════════════════════════════════════════════════════════
async function hideCashBox(id) {
    const ok = await ArbahToast.confirm(
        "هل تريد إخفاء الخزينة؟ (لن تظهر في القائمة لكن بياناتها محفوظة ويمكن إظهارها مرة أخرى)",
        { title: "إخفاء", confirmText: "إخفاء", cancelText: "إلغاء" }
    );
    if (!ok) return;

    try {
        const response = await fetch("/api/CashBoxes/hide/" + id, {
            method: "PUT",
            headers: { "Content-Type": "application/json" }
        });
        const result = await response.json();

        if (result.success) {
            ArbahToast.success(result.message || "تم إخفاء الخزينة بنجاح", 3000, { title: "تم!" });
            getCashBoxes();
        } else {
            ArbahToast.error(result.message || "حدث خطأ", 3000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error hiding CashBox:", error);
        ArbahToast.error("حدث خطأ في الاتصال", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    إظهار خزينة مخفية
// ═══════════════════════════════════════════════════════════
async function restoreCashBox(id) {
    const ok = await ArbahToast.confirm("هل تريد إظهار الخزينة؟");
    if (!ok) return;

    try {
        const response = await fetch("/api/CashBoxes/restore/" + id, {
            method: "PUT",
            headers: { "Content-Type": "application/json" }
        });
        const result = await response.json();

        if (result.success) {
            ArbahToast.success("تم إظهار الخزينة بنجاح", 3000, { title: "تم!" });
            getCashBoxes();
        } else {
            ArbahToast.error(result.message || "حدث خطأ", 3000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error restoring CashBox:", error);
        ArbahToast.error("حدث خطأ في الاتصال", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    بحث الخزنات
// ═══════════════════════════════════════════════════════════
async function searchCashBoxes(keyword) {
    if (!keyword || keyword.trim().length === 0) {
        getCashBoxes();
        return;
    }

    try {
        const response = await fetch("/api/CashBoxes/search/" + encodeURIComponent(keyword.trim()));
        const result = await response.json();

        if (result.success) {
            allCashBoxesData = result.data || [];
            renderCashBoxes(allCashBoxesData);
            updateMetrics(allCashBoxesData);
        } else {
            ArbahToast.error(result.message || "حدث خطأ في البحث", 3000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error searching cash boxes:", error);
        ArbahToast.error("حدث خطأ في الاتصال", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    تصفية الخزنات حسب الحالة
// ═══════════════════════════════════════════════════════════
function filterCashBoxes(status) {
    if (!status || status === "all") {
        renderCashBoxes(allCashBoxesData);
        updateMetrics(allCashBoxesData);
        return;
    }

    const filtered = allCashBoxesData.filter(b => b.status === status);
    renderCashBoxes(filtered);
    updateMetrics(filtered);
}

// ═══════════════════════════════════════════════════════════
//    عرض الخزنات (render helper)
// ═══════════════════════════════════════════════════════════
function renderCashBoxes(CashBoxes) {
    const tbody = document.querySelector("#CashBoxesTable");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (CashBoxes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="NotFound">لا يوجد خزنات</td></tr>`;
        return;
    }

    CashBoxes.forEach((Box, i) => {
        const currentBalance = calculateCurrentBalance(Box);
        const BoxId = Box._id;
        const linkedAccountCode = Box.linkedAccountCode || (Box.linkedAccount ? Box.linkedAccount.code : "--");
        const branchName = getBranchName(Box.branch);

        let iconColorClass = "Color-Bg-green";
        if (Box.status === "frozen") {
            iconColorClass = "Color-Bg-orange";
        } else if (Box.status === "closed") {
            iconColorClass = "Color-Bg-red";
        }

        const tr = document.createElement("tr");
        tr.dataset.id = BoxId;
        tr.innerHTML = `
            <td class="row-number">${i + 1}</td>
            <td>
                <div class="Name-Cell">
                    <i class="fa-solid fa-box ${iconColorClass}"></i>
                    <div class="Name-Cell-info">
                        <span class="name">${escapeHtml(Box.name)}</span>
                        <span class="code">${escapeHtml(Box.code || "BOX-" + String(i + 1).padStart(3, "0"))}</span>
                    </div>
                </div>
            </td>
            <td>${escapeHtml(Box.code || "-")}</td>
            <td>${escapeHtml(branchName)}</td>
            <td>${escapeHtml(linkedAccountCode)}</td>
            <td>
                <span class="status-badge ${iconColorClass}">
                    ${formatNumber(currentBalance)}
                </span>
            </td>
            <td>${escapeHtml(Box.responsible || "-")}</td>
            <td>${getStatusText(Box.status)}</td>
            <td>
                <div class="action-menu-container">
                    <button class="Action-Row-Btn"><i class="fa-solid fa-ellipsis"></i></button>
                    <div class="Profile-Dropdown">
                        <a class="Profile-Link" onclick="event.stopPropagation(); editCashBox('${BoxId}')">
                            <i class="fa-regular fa-pen-to-square"></i> تعديل
                        </a>
                        <a class="Profile-Link" onclick="event.stopPropagation(); viewCashBoxDetails('${BoxId}')">
                            <i class="fa-solid fa-eye"></i> عرض التفاصيل
                        </a>
                        <a class="Profile-Link" onclick="event.stopPropagation(); hideCashBox('${BoxId}')">
                            <i class="fa-solid fa-eye-slash"></i> إخفاء
                        </a>
                    </div>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    if (window.cashBoxesFilter) {
        window.cashBoxesFilter.reinit();
    }

    bindActionMenus();
}

// ═══════════════════════════════════════════════════════════
//    جلب الكود التالي تلقائياً
// ═══════════════════════════════════════════════════════════
async function fetchNextCashBoxCode() {
    try {
        const response = await fetch("/api/CashBoxes/next-code");
        const result = await response.json();

        if (result.success && result.data && result.data.nextCode) {
            const codeInput = document.getElementById("CashBoxCode");
            if (codeInput && !codeInput.value) {
                codeInput.value = result.data.nextCode;
            }
        }
    } catch (error) {
        console.error("Error fetching next code:", error);
        generateCashBoxCodeLocal();
    }
}

// ═══════════════════════════════════════════════════════════
//    دوال مساعدة
// ═══════════════════════════════════════════════════════════
function resetForm() {
    const form = document.getElementById("CashBoxForm");
    if (form) form.reset();

    const boxId = document.getElementById("CashBoxId");
    if (boxId) boxId.value = "";

    currentEditingId = null;

    const popupTitle = document.getElementById("PopupTitle");
    const popupSubtitle = document.getElementById("PopupSubtitle");
    if (popupTitle) popupTitle.textContent = "إضافة خزينة جديدة";
    if (popupSubtitle) popupSubtitle.textContent = "أدخل بيانات الخزينة والحساب المحاسبي";

    fetchNextCashBoxCode();

    const popup = document.querySelector("#AddNewPopup .PopUp-Window");
    if (popup) {
        popup.style.transform = "translate(-50%, -50%)";
        popup.style.top = "50%";
        popup.style.left = "50%";
    }
}

function generateCashBoxCodeLocal() {
    const count = allCashBoxesData.length + 1;
    const code = "BOX-" + String(count).padStart(3, "0");
    const codeInput = document.getElementById("CashBoxCode");
    if (codeInput) codeInput.value = code;
}

function calculateCurrentBalance(Box) {
    // أولوية 1: الرصيد المخزن في الخزينة (يتم تحديثه تلقائياً)
    if (Box.currentBalance !== undefined && Box.currentBalance !== null) {
        return parseFloat(Box.currentBalance) || 0;
    }

    // أولوية 2: الرصيد من الحساب المرتبط
    if (Box.linkedAccount && Box.linkedAccount.currentBalance !== undefined) {
        return parseFloat(Box.linkedAccount.currentBalance) || 0;
    }

    // fallback: الرصيد الافتتاحي
    const opening = parseFloat(Box.openingBalance) || 0;
    const balanceType = Box.balanceType || "debit";
    return balanceType === "debit" ? opening : -opening;
}

// ═══════════════════════════════════════════════════════════
//    تحديث رصيد خزينة واحدة من السيرفر
// ═══════════════════════════════════════════════════════════
async function refreshCashBoxBalance(cashBoxId) {
    try {
        const response = await fetch(`/api/CashBoxes/${cashBoxId}`);
        const result = await response.json();

        if (result.success && result.data) {
            const box = result.data;
            const newBalance = box.currentBalance !== undefined
                ? parseFloat(box.currentBalance)
                : (box.linkedAccount?.currentBalance || 0);

            // تحديث البيانات المحلية
            const idx = allCashBoxesData.findIndex(b => b._id === cashBoxId || b._id == cashBoxId);
            if (idx !== -1) {
                allCashBoxesData[idx].currentBalance = newBalance;
                if (allCashBoxesData[idx].linkedAccount) {
                    allCashBoxesData[idx].linkedAccount.currentBalance = newBalance;
                }
            }

            return newBalance;
        }
    } catch (error) {
        console.error("Error refreshing balance:", error);
    }
    return null;
}

// ═══════════════════════════════════════════════════════════
//    تحديث أرصدة كل الخزنات
// ═══════════════════════════════════════════════════════════
async function refreshAllCashBoxBalances() {
    ArbahToast.info("جاري تحديث الأرصدة...", 2000, { title: "تحديث" });

    try {
        const response = await fetch("/api/CashBoxes");
        const result = await response.json();

        if (result.success && result.data) {
            allCashBoxesData = result.data;
            getCashBoxes(); // إعادة رسم الجدول
            ArbahToast.success("تم تحديث الأرصدة بنجاح", 3000, { title: "تم!" });
        }
    } catch (error) {
        console.error("Error refreshing all balances:", error);
        ArbahToast.error("حدث خطأ في تحديث الأرصدة", 3000, { title: "خطأ !" });
    }
}

function getStatusText(status) {
    switch (status) {
        case "active": return "نشط";
        case "frozen": return "مجمد";
        case "closed": return "مغلق";
        default: return "غير معروف";
    }
}

function getStatusClass(status) {
    switch (status) {
        case "active": return "Color-Bg-green";
        case "frozen": return "Color-Bg-orange";
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
//    تحميل الخزنات عند بدء التشغيل
// ═══════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", function () {
    loadBranches();
    getCashBoxes();
});