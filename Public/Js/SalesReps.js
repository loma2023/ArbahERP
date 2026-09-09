// ═══════════════════════════════════════════════════════════
// SalesReps.js - Frontend Controller for SalesReps Module
// ═══════════════════════════════════════════════════════════

let currentEditingId = null;
let allSalesRepsData = [];

// ═══════════════════════════════════════════════════════════
//    حفظ مندوب جديد أو تعديل موجود
// ═══════════════════════════════════════════════════════════
async function saveSalesRep() {
    const SalesRepId = document.getElementById("SalesRepId")?.value;

    const SalesRep = {
        name: document.getElementById("SalesRepName")?.value?.trim() || "",
        phone: document.getElementById("SalesRepPhone")?.value?.trim() || "",
        email: document.getElementById("SalesRepEmail")?.value?.trim() || "",
        idNumber: document.getElementById("SalesRepIdNumber")?.value?.trim() || "",
        nationality: document.getElementById("SalesRepNationality")?.value?.trim() || "",
        branch: document.getElementById("SalesRepBranch")?.value?.trim() || "",
        city: document.getElementById("SalesRepCity")?.value?.trim() || "",
        openingBalance: parseFloat(document.getElementById("OpenBalance")?.value) || 0,
        balanceType: document.getElementById("SalesRepBalanceType")?.value || "debit",
        creditLimit: parseFloat(document.getElementById("SalesRepCreditLimit")?.value) || 0,
        status: document.getElementById("SalesRepStatus")?.value || "active",
        notes: document.getElementById("SalesRepNotes")?.value?.trim() || ""
    };

    if (!SalesRepId) {
        const codeInput = document.getElementById("SalesRepCode");
        if (codeInput) SalesRep.code = codeInput.value?.trim();
    }

    if (!SalesRep.name) {
        ArbahToast.warning("يرجى إدخال اسم المندوب", 4000, { title: "خلي بالك !!" });
        return;
    }
    if (!SalesRep.phone) {
        ArbahToast.warning("يرجى إدخال رقم الهاتف", 4000, { title: "خلي بالك !!" });
        return;
    }

    let url = "/api/SalesReps/create";
    let method = "POST";

    if (SalesRepId) {
        url = `/api/SalesReps/${SalesRepId}`;
        method = "PUT";
    }

    try {
        const response = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(SalesRep)
        });

        const result = await response.json();

        if (result.success) {
            ArbahToast.success(
                SalesRepId
                    ? "تم تعديل المندوب بنجاح"
                    : "تم إضافة المندوب وإنشاء حسابه في شجرة الحسابات بنجاح",
                4000,
                { title: "تم!" }
            );
            closePopUpWindow("AddNewPopup");
            resetForm();
            getSalesReps();
        } else {
            ArbahToast.error(result.message || "حدث خطأ", 4000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error saving sales rep:", error);
        ArbahToast.error("حدث خطأ في الاتصال بالخادم", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    جلب المناديب وعرضهم
// ═══════════════════════════════════════════════════════════
async function getSalesReps() {
    const tbody = document.querySelector("#SalesRepsTable");
    if (!tbody) {
        console.error("SalesRepsTable tbody not found!");
        return;
    }

    tbody.innerHTML = `<tr><td colspan="9" class="NotFound">جاري التحميل...</td></tr>`;

    try {
        const response = await fetch("/api/SalesReps");
        if (!response.ok) throw new Error("HTTP error! status: " + response.status);

        const result = await response.json();
        if (!result.success) throw new Error(result.message || "Server returned error");

        const SalesReps = result.data || [];
        allSalesRepsData = SalesReps;
        tbody.innerHTML = "";

        if (SalesReps.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="NotFound">لا يوجد مناديب</td></tr>`;
            updateMetrics([]);
            return;
        }

        SalesReps.forEach((Rep, i) => {
            const currentBalance = calculateCurrentBalance(Rep);
            const RepId = Rep._id;
            const creditLimit = parseFloat(Rep.creditLimit) || 0;

            let iconColorClass = "Color-Bg-green";
            if (creditLimit > 0 && currentBalance > creditLimit) {
                iconColorClass = "Color-Bg-orange";
            } else if (currentBalance < 0) {
                iconColorClass = "Color-Bg-red";
            }

            const tr = document.createElement("tr");
            tr.dataset.id = RepId;
            tr.innerHTML = `
                <td class="row-number">${i + 1}</td>
                <td>
                    <div class="Name-Cell">
                        <i class="fa-solid fa-user-tie ${iconColorClass}"></i>
                        <div class="Name-Cell-info">
                            <span class="name">${escapeHtml(Rep.name)}</span>
                            <span class="code">${escapeHtml(Rep.code || "REP-" + String(i + 1).padStart(3, "0"))}</span>
                        </div>
                    </div>
                </td>
                <td>${escapeHtml(Rep.phone || "-")}</td>
                <td>${escapeHtml(Rep.city || "-")}</td>
                <td>${escapeHtml(Rep.branch || "-")}</td>
                <td>${formatNumber(Rep.creditLimit)}</td>
                <td>
                    <span class="status-badge ${iconColorClass}">
                        ${formatNumber(currentBalance)}
                    </span>
                </td>
                <td><span class="status-badge ${getStatusClass(Rep.status)}">${getStatusText(Rep.status)}</span></td>
                <td>
                    <div class="action-menu-container">
                        <button class="Action-Row-Btn"><i class="fa-solid fa-ellipsis"></i></button>
                        <div class="Profile-Dropdown">
                            <a class="Profile-Link" onclick="event.stopPropagation(); editSalesRep('${RepId}')">
                                <i class="fa-regular fa-pen-to-square"></i> تعديل
                            </a>
                            <a class="Profile-Link" onclick="event.stopPropagation(); viewSalesRepDetails('${RepId}')">
                                <i class="fa-solid fa-eye"></i> عرض التفاصيل
                            </a>
                            <a class="Profile-Link" onclick="event.stopPropagation(); hideSalesRep('${RepId}')">
                                <i class="fa-solid fa-eye-slash"></i> إخفاء
                            </a>
                        </div>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        if (window.salesRepsFilter) {
            window.salesRepsFilter.reinit();
        } else if (typeof ArbahTable !== "undefined") {
            window.salesRepsFilter = new ArbahTable("MainPerfectTable", { rowsPerPage: 15,dateColumnIndex: 2});
        }

        bindActionMenus();
        updateMetrics(SalesReps);

    } catch (error) {
        console.error("Error fetching SalesReps:", error);
        tbody.innerHTML = `<tr><td colspan="9" class="NotFound">حدث خطأ في تحميل البيانات: ${escapeHtml(error.message)}</td></tr>`;
    }
}

// ═══════════════════════════════════════════════════════════
//    تحديث الإحصائيات
// ═══════════════════════════════════════════════════════════
function updateMetrics(SalesReps) {
    const totalReps = SalesReps.length;
    const activeReps = SalesReps.filter(r => r.status === "active").length;
    const totalReceivables = SalesReps.reduce((sum, r) => {
        const balance = calculateCurrentBalance(r);
        return balance > 0 ? sum + balance : sum;
    }, 0);
    const overLimit = SalesReps.filter(r => {
        const balance = calculateCurrentBalance(r);
        const limit = parseFloat(r.creditLimit) || 0;
        return balance > limit && limit > 0;
    }).length;

    const totalEl = document.getElementById("TotalSalesReps");
    const activeEl = document.getElementById("ActiveSalesReps");
    const receivablesEl = document.getElementById("TotalReceivables");
    const overLimitEl = document.getElementById("OverLimitReps");

    if (totalEl) totalEl.textContent = totalReps;
    if (activeEl) activeEl.textContent = activeReps;
    if (receivablesEl) receivablesEl.textContent = formatNumber(totalReceivables) + " ر.س";
    if (overLimitEl) overLimitEl.textContent = overLimit;
}

// ═══════════════════════════════════════════════════════════
//    تعديل مندوب
// ═══════════════════════════════════════════════════════════
function editSalesRep(id) {
    const Rep = allSalesRepsData.find(r => r._id === id || r._id == id);
    if (!Rep) {
        ArbahToast.error("المندوب غير موجود", 3000, { title: "خطأ !" });
        return;
    }

    currentEditingId = id;

    const setValue = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value || "";
    };

    setValue("SalesRepId", id);
    setValue("SalesRepCode", Rep.code || "");
    setValue("SalesRepName", Rep.name);
    setValue("SalesRepPhone", Rep.phone);
    setValue("SalesRepEmail", Rep.email);
    setValue("SalesRepIdNumber", Rep.idNumber);
    setValue("SalesRepNationality", Rep.nationality);
    setValue("SalesRepBranch", Rep.branch);
    setValue("SalesRepCity", Rep.city);
    setValue("OpenBalance", Rep.openingBalance);
    setValue("SalesRepBalanceType", Rep.balanceType || "debit");
    setValue("SalesRepCreditLimit", Rep.creditLimit);
    setValue("SalesRepStatus", Rep.status || "active");
    setValue("SalesRepNotes", Rep.notes);

    const popupTitle = document.getElementById("PopupTitle");
    const popupSubtitle = document.getElementById("PopupSubtitle");
    if (popupTitle) popupTitle.textContent = "تعديل بيانات المندوب";
    if (popupSubtitle) popupSubtitle.textContent = "تعديل بيانات: " + Rep.name;

    openPopUpWindow("AddNewPopup");
}

// ═══════════════════════════════════════════════════════════
//    عرض تفاصيل المندوب
// ═══════════════════════════════════════════════════════════
function viewSalesRepDetails(id) {
    const Rep = allSalesRepsData.find(r => r._id === id || r._id == id);
    if (!Rep) return;

    const currentBalance = calculateCurrentBalance(Rep);
    const linkedAccount = Rep.linkedAccount;

    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value || "-";
    };

    setText("DetailsCode", Rep.code);
    setText("DetailsName", Rep.name);
    setText("DetailsSupCode", Rep.code);
    setText("DetailsPhone", Rep.phone);
    setText("DetailsEmail", Rep.email);
    setText("DetailsIdNumber", Rep.idNumber);
    setText("DetailsNationality", Rep.nationality);
    setText("DetailsCity", Rep.city);
    setText("DetailsBranch", Rep.branch);
    setText("DetailsOpenBalance", formatNumber(Rep.openingBalance || 0));
    setText("DetailsCreditLimit", formatNumber(Rep.creditLimit || 0));
    setText("DetailsCurrentBalance", formatNumber(currentBalance));

    if (linkedAccount) {
        setText("DetailsLinkedAccount", linkedAccount.code + " - " + linkedAccount.name);
    } else {
        setText("DetailsLinkedAccount", "غير مرتبط");
    }

    openPopUpWindow("DetailsPopup");
}

// ═══════════════════════════════════════════════════════════
//    إخفاء مندوب (Soft Delete)
// ═══════════════════════════════════════════════════════════
async function hideSalesRep(id) {
    const ok = await ArbahToast.confirm(
        "هل تريد إخفاء المندوب؟ (لن يظهر في القائمة لكن بياناته محفوظة)",
        { title: "إخفاء", confirmText: "إخفاء", cancelText: "إلغاء" }
    );
    if (!ok) return;

    try {
        const response = await fetch("/api/SalesReps/hide/" + id, {
            method: "PUT",
            headers: { "Content-Type": "application/json" }
        });
        const result = await response.json();

        if (result.success) {
            ArbahToast.success("تم إخفاء المندوب بنجاح", 3000, { title: "تم!" });
            getSalesReps();
        } else {
            ArbahToast.error(result.message || "حدث خطأ", 3000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error hiding SalesRep:", error);
        ArbahToast.error("حدث خطأ في الاتصال", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    إظهار مندوب مخفي
// ═══════════════════════════════════════════════════════════
async function restoreSalesRep(id) {
    const ok = await ArbahToast.confirm("هل تريد إظهار المندوب؟");
    if (!ok) return;

    try {
        const response = await fetch("/api/SalesReps/restore/" + id, {
            method: "PUT",
            headers: { "Content-Type": "application/json" }
        });
        const result = await response.json();

        if (result.success) {
            ArbahToast.success("تم إظهار المندوب بنجاح", 3000, { title: "تم!" });
            getSalesReps();
        } else {
            ArbahToast.error(result.message || "حدث خطأ", 3000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error restoring SalesRep:", error);
        ArbahToast.error("حدث خطأ في الاتصال", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    بحث المناديب
// ═══════════════════════════════════════════════════════════
async function searchSalesReps(keyword) {
    if (!keyword || keyword.trim().length === 0) {
        getSalesReps();
        return;
    }

    try {
        const response = await fetch("/api/SalesReps/search/" + encodeURIComponent(keyword.trim()));
        const result = await response.json();

        if (result.success) {
            allSalesRepsData = result.data || [];
            renderSalesReps(allSalesRepsData);
            updateMetrics(allSalesRepsData);
        } else {
            ArbahToast.error(result.message || "حدث خطأ في البحث", 3000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error searching sales reps:", error);
        ArbahToast.error("حدث خطأ في الاتصال", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    تصفية المناديب
// ═══════════════════════════════════════════════════════════
function filterSalesReps(status) {
    if (!status || status === "all") {
        renderSalesReps(allSalesRepsData);
        updateMetrics(allSalesRepsData);
        return;
    }

    const filtered = allSalesRepsData.filter(r => r.status === status);
    renderSalesReps(filtered);
    updateMetrics(filtered);
}

// ═══════════════════════════════════════════════════════════
//    عرض المناديب (render helper)
// ═══════════════════════════════════════════════════════════
function renderSalesReps(SalesReps) {
    const tbody = document.querySelector("#SalesRepsTable");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (SalesReps.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="NotFound">لا يوجد مناديب</td></tr>`;
        return;
    }

    SalesReps.forEach((Rep, i) => {
        const currentBalance = calculateCurrentBalance(Rep);
        const RepId = Rep._id;
        const creditLimit = parseFloat(Rep.creditLimit) || 0;

        let iconColorClass = "Color-Bg-green";
        if (creditLimit > 0 && currentBalance > creditLimit) {
            iconColorClass = "Color-Bg-orange";
        } else if (currentBalance < 0) {
            iconColorClass = "Color-Bg-red";
        }

        const tr = document.createElement("tr");
        tr.dataset.id = RepId;
        tr.innerHTML = `
            <td class="row-number">${i + 1}</td>
            <td>
                <div class="Name-Cell">
                    <i class="fa-solid fa-user-tie ${iconColorClass}"></i>
                    <div class="Name-Cell-info">
                        <span class="name">${escapeHtml(Rep.name)}</span>
                        <span class="code">${escapeHtml(Rep.code || "REP-" + String(i + 1).padStart(3, "0"))}</span>
                    </div>
                </div>
            </td>
            <td>${escapeHtml(Rep.phone || "-")}</td>
            <td>${escapeHtml(Rep.city || "-")}</td>
            <td>${escapeHtml(Rep.branch || "-")}</td>
            <td>${formatNumber(Rep.creditLimit)}</td>
            <td>
                <span class="status-badge ${iconColorClass}">
                    ${formatNumber(currentBalance)}
                </span>
            </td>
            <td><span class="status-badge ${getStatusClass(Rep.status)}">${getStatusText(Rep.status)}</span></td>
            <td>
                <div class="action-menu-container">
                    <button class="Action-Row-Btn"><i class="fa-solid fa-ellipsis"></i></button>
                    <div class="Profile-Dropdown">
                        <a class="Profile-Link" onclick="event.stopPropagation(); editSalesRep('${RepId}')">
                            <i class="fa-regular fa-pen-to-square"></i> تعديل
                        </a>
                        <a class="Profile-Link" onclick="event.stopPropagation(); viewSalesRepDetails('${RepId}')">
                            <i class="fa-solid fa-eye"></i> عرض التفاصيل
                        </a>
                        <a class="Profile-Link" onclick="event.stopPropagation(); hideSalesRep('${RepId}')">
                            <i class="fa-solid fa-eye-slash"></i> إخفاء
                        </a>
                    </div>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    if (window.salesRepsFilter) {
        window.salesRepsFilter.reinit();
    }

    bindActionMenus();
}

// ═══════════════════════════════════════════════════════════
//    جلب الكود التالي تلقائياً
// ═══════════════════════════════════════════════════════════
async function fetchNextSalesRepCode() {
    try {
        const response = await fetch("/api/SalesReps/next-code");
        const result = await response.json();

        if (result.success && result.data && result.data.nextCode) {
            const codeInput = document.getElementById("SalesRepCode");
            if (codeInput && !codeInput.value) {
                codeInput.value = result.data.nextCode;
            }
        }
    } catch (error) {
        console.error("Error fetching next code:", error);
        generateSalesRepCodeLocal();
    }
}

// ═══════════════════════════════════════════════════════════
//    دوال مساعدة
// ═══════════════════════════════════════════════════════════
function resetForm() {
    const form = document.getElementById("SalesRepForm");
    if (form) form.reset();

    const repId = document.getElementById("SalesRepId");
    if (repId) repId.value = "";

    currentEditingId = null;

    const popupTitle = document.getElementById("PopupTitle");
    const popupSubtitle = document.getElementById("PopupSubtitle");
    if (popupTitle) popupTitle.textContent = "إضافة مندوب جديد";
    if (popupSubtitle) popupSubtitle.textContent = "أدخل بيانات المندوب بدقة";

    fetchNextSalesRepCode();

    const popup = document.querySelector("#AddNewPopup .PopUp-Window");
    if (popup) {
        popup.style.transform = "translate(-50%, -50%)";
        popup.style.top = "50%";
        popup.style.left = "50%";
    }
}

function generateSalesRepCodeLocal() {
    const count = allSalesRepsData.length + 1;
    const code = "REP-" + String(count).padStart(3, "0");
    const codeInput = document.getElementById("SalesRepCode");
    if (codeInput) codeInput.value = code;
}

function calculateCurrentBalance(Rep) {
    if (Rep.linkedAccount && Rep.linkedAccount.currentBalance !== undefined) {
        return Rep.linkedAccount.currentBalance;
    }
    const opening = parseFloat(Rep.openingBalance) || 0;
    const balanceType = Rep.balanceType || "debit";
    return balanceType === "debit" ? opening : -opening;
}

function getStatusText(status) {
    switch (status) {
        case "active": return "نشط";
        case "inactive": return "غير نشط";
        case "suspended": return "موقوف";
        default: return "غير معروف";
    }
}

function getStatusClass(status) {
    switch (status) {
        case "active": return "Color-Bg-green";
        case "inactive": return "Color-Bg-orange";
        case "suspended": return "Color-Bg-red";
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
//    تحميل المناديب عند بدء التشغيل
// ═══════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", function () {
    getSalesReps();
});