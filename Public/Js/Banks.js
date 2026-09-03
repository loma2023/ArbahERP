// ═══════════════════════════════════════════════════════════
// Banks.js - Frontend Controller for Banks Module
// ArbahERP - Integrated Accounting System
// ═══════════════════════════════════════════════════════════

let currentEditingId = null;
let allBanksData = [];

// ═══════════════════════════════════════════════════════════
//    حفظ بنك جديد أو تعديل موجود
// ═══════════════════════════════════════════════════════════
async function saveBank() {
    const BankId = document.getElementById("BankId")?.value;

    const Bank = {
        name: document.getElementById("BankName")?.value?.trim() || "",
        accountNo: document.getElementById("BankAccountNo")?.value?.trim() || "",
        localAccountNo: document.getElementById("BankLocalAccount")?.value?.trim() || "",
        iban: document.getElementById("BankIban")?.value?.trim() || "",
        swiftCode: document.getElementById("BankSwift")?.value?.trim() || "",
        branch: document.getElementById("BankBranch")?.value?.trim() || "",
        city: document.getElementById("BankCity")?.value?.trim() || "",
        openingBalance: parseFloat(document.getElementById("BankOpenBalance")?.value) || 0,
        balanceType: document.getElementById("BankBalanceType")?.value || "debit",
        status: document.getElementById("BankStatus")?.value || "active",
        notes: document.getElementById("BankNotes")?.value?.trim() || "",
        contactPerson: document.getElementById("BankContactPerson")?.value?.trim() || "",
        contactPhone: document.getElementById("BankContactPhone")?.value?.trim() || "",
        contactEmail: document.getElementById("BankContactEmail")?.value?.trim() || ""
    };

    // إرسال الكود في الإضافة فقط
    if (!BankId) {
        const codeInput = document.getElementById("BankCode");
        if (codeInput) {
            Bank.code = codeInput.value?.trim();
        }
    }

    // ── التحقق من البيانات ──
    if (!Bank.name) {
        ArbahToast.warning("يرجى إدخال اسم البنك", 4000, { title: "خلي بالك !!" });
        return;
    }
    if (!Bank.accountNo) {
        ArbahToast.warning("يرجى إدخال رقم الحساب البنكي", 4000, { title: "خلي بالك !!" });
        return;
    }

    let url = "/api/Banks/create";
    let method = "POST";

    if (BankId) {
        url = `/api/Banks/${BankId}`;
        method = "PUT";
    }

    try {
        const response = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(Bank)
        });

        const result = await response.json();

        if (result.success) {
            ArbahToast.success(
                BankId
                    ? "تم تعديل البنك بنجاح"
                    : "تم إضافة البنك وإنشاء حسابه في شجرة الحسابات بنجاح",
                4000,
                { title: "تم!" }
            );
            closePopUpWindow("AddNewPopup");
            resetForm();
            getBanks();
        } else {
            ArbahToast.error(result.message || "حدث خطأ", 4000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error saving bank:", error);
        ArbahToast.error("حدث خطأ في الاتصال بالخادم", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    جلب البنوك وعرضها
// ═══════════════════════════════════════════════════════════
async function getBanks() {
    const tbody = document.querySelector("#BanksTable");
    if (!tbody) {
        console.error("BanksTable tbody not found!");
        return;
    }

    tbody.innerHTML = `<tr>
                            <td colspan="8" style="text-align:center;padding:40px;">
                                <i class="fa-solid fa-spinner fa-spin"></i>
                                <p style="margin-top:10px;color:#6b7280;">جاري تحميل  ...</p>
                            </td>
                        </tr>`;

    try {
        const response = await fetch("/api/Banks");
        if (!response.ok) {
            throw new Error("HTTP error! status: " + response.status);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || "Server returned error");
        }

        const Banks = result.data || [];
        allBanksData = Banks;
        tbody.innerHTML = "";

        if (Banks.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="NotFound">لا يوجد بنوك</td></tr>`;
            updateMetrics([]);
            return;
        }

        Banks.forEach((Bank, i) => {
            const currentBalance = calculateCurrentBalance(Bank);
            const BankId = Bank._id;
            const linkedAccountCode = Bank.linkedAccountCode || (Bank.linkedAccount ? Bank.linkedAccount.code : "--");

            let iconColorClass = "Color-Bg-green";
            if (Bank.status === "frozen") {
                iconColorClass = "Color-Bg-orange";
            } else if (Bank.status === "closed") {
                iconColorClass = "Color-Bg-red";
            }

            const tr = document.createElement("tr");
            tr.dataset.id = BankId;
            tr.innerHTML = `
                <td class="row-number">${i + 1}</td>
                <td>
                    <div class="Name-Cell">
                        <i class="fa-solid fa-building-columns ${iconColorClass}"></i>
                        <div class="Name-Cell-info">
                            <span class="name">${escapeHtml(Bank.name)}</span>
                            <span class="code">${escapeHtml(Bank.code || "BNK-" + String(i + 1).padStart(3, "0"))}</span>
                        </div>
                    </div>
                </td>
                <td>${escapeHtml(Bank.branch || "-")}</td>
                <td>${escapeHtml(linkedAccountCode)}</td>
                <td>${formatNumber(Bank.openingBalance)}</td>
                <td>
                    <span class="status-badge ${iconColorClass}">
                        ${formatNumber(currentBalance)}
                    </span>
                </td>
                <td>${getBankStatusText(Bank.status)}</td>
                <td>
                    <div class="action-menu-container">
                        <button class="Action-Row-Btn"><i class="fa-solid fa-ellipsis"></i></button>
                        <div class="Profile-Dropdown">
                            <a class="Profile-Link" onclick="event.stopPropagation(); editBank('${BankId}')">
                                <i class="fa-regular fa-pen-to-square"></i> تعديل
                            </a>
                            <a class="Profile-Link" onclick="event.stopPropagation(); viewBankDetails('${BankId}')">
                                <i class="fa-solid fa-eye"></i> عرض التفاصيل
                            </a>
                            <div class="Separator"></div>
                            <a class="Profile-Link" onclick="event.stopPropagation(); hideBank('${BankId}')">
                                <i class="fa-solid fa-eye-slash"></i> إخفاء
                            </a>
                        </div>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // إعادة تهيئة الجدول بعد تحميل البيانات
        if (window.banksFilter) {
            window.banksFilter.reinit();
        } else if (typeof ArbahTable !== "undefined") {
            window.banksFilter = new ArbahTable("MainPerfectTable", { rowsPerPage: 15, dateColumnIndex: 2 });
        }

        bindActionMenus();
        updateMetrics(Banks);

    } catch (error) {
        console.error("Error fetching Banks:", error);
        tbody.innerHTML = `<tr><td colspan="9" class="NotFound">حدث خطأ في تحميل البيانات: ${escapeHtml(error.message)}</td></tr>`;
    }
}

// ═══════════════════════════════════════════════════════════
//    تحديث الإحصائيات
// ═══════════════════════════════════════════════════════════
function updateMetrics(Banks) {
    const totalBanks = Banks.length;
    const activeBanks = Banks.filter(b => b.status === "active").length;
    const frozenBanks = Banks.filter(b => b.status === "frozen").length;
    const closedBanks = Banks.filter(b => b.status === "closed").length;
    const totalBalance = Banks.reduce((sum, b) => sum + (b.currentBalance || 0), 0);

    const totalEl = document.getElementById("TotalBanks");
    const activeEl = document.getElementById("ActiveAccounts");
    const balanceEl = document.getElementById("TotalBankBalance");
    const frozenEl = document.getElementById("FrozenAccounts");

    if (totalEl) totalEl.textContent = totalBanks;
    if (activeEl) activeEl.textContent = activeBanks;
    if (balanceEl) balanceEl.textContent = formatNumber(totalBalance) + " ر.س";
    if (frozenEl) frozenEl.textContent = frozenBanks;
}

// ═══════════════════════════════════════════════════════════
//    تعديل بنك
// ═══════════════════════════════════════════════════════════
function editBank(id) {
    const Bank = allBanksData.find(b => b._id === id || b._id == id);
    if (!Bank) {
        ArbahToast.error("البنك غير موجود", 3000, { title: "خطأ !" });
        return;
    }

    currentEditingId = id;

    const setValue = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value || "";
    };

    setValue("BankId", id);
    setValue("BankCode", Bank.code || "");
    setValue("BankName", Bank.name);
    setValue("BankAccountNo", Bank.accountNo);
    setValue("BankLocalAccount", Bank.localAccountNo);
    setValue("BankIban", Bank.iban);
    setValue("BankSwift", Bank.swiftCode);
    setValue("BankBranch", Bank.branch);
    setValue("BankCity", Bank.city);
    setValue("BankOpenBalance", Bank.openingBalance);
    setValue("BankBalanceType", Bank.balanceType || "debit");
    setValue("BankStatus", Bank.status || "active");
    setValue("BankContactPerson", Bank.contactPerson);
    setValue("BankContactPhone", Bank.contactPhone);
    setValue("BankContactEmail", Bank.contactEmail);
    setValue("BankNotes", Bank.notes);

    const popupTitle = document.getElementById("PopupTitle");
    const popupSubtitle = document.getElementById("PopupSubtitle");
    if (popupTitle) popupTitle.textContent = "تعديل بيانات البنك";
    if (popupSubtitle) popupSubtitle.textContent = "تعديل بيانات: " + Bank.name;

    openPopUpWindow("AddNewPopup");
}

// ═══════════════════════════════════════════════════════════
//    عرض تفاصيل البنك
// ═══════════════════════════════════════════════════════════
function viewBankDetails(id) {
    const Bank = allBanksData.find(b => b._id === id || b._id == id);
    if (!Bank) return;

    const currentBalance = calculateCurrentBalance(Bank);
    const linkedAccount = Bank.linkedAccount;

    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value || "-";
    };

    setText("DetailsCode", Bank.code);
    setText("DetailBankName", Bank.name);
    setText("DetailBankCode", Bank.code);
    setText("DetailAccountNo", Bank.accountNo);
    setText("DetailLocalAccount", Bank.localAccountNo || "-");
    setText("DetailIban", Bank.iban || "-");
    setText("DetailSwift", Bank.swiftCode || "-");
    setText("DetailBranch", Bank.branch || "الفرع الرئيسي");
    setText("DetailCity", Bank.city || "-");
    setText("DetailOpenBalance", formatNumber(Bank.openingBalance || 0));
    setText("DetailCurrentBalance", formatNumber(currentBalance));
    setText("DetailStatus", getBankStatusText(Bank.status));

    // إضافة كود الحساب المرتبط إذا موجود
    if (linkedAccount) {
        setText("DetailLinkedAccount", linkedAccount.code + " - " + linkedAccount.name);
    } else {
        setText("DetailLinkedAccount", "غير مرتبط");
    }

    // Contact info
    const hasContact = Bank.contactPerson || Bank.contactPhone || Bank.contactEmail;
    const contactSection = document.getElementById("ContactInfoSection");
    if (contactSection) contactSection.style.display = hasContact ? "grid" : "none";
    setText("DetailContactPerson", Bank.contactPerson);
    setText("DetailContactPhone", Bank.contactPhone);
    setText("DetailContactEmail", Bank.contactEmail);

    // Notes
    const notesSection = document.getElementById("NotesSection");
    if (notesSection) notesSection.style.display = Bank.notes ? "block" : "none";
    setText("DetailNotes", Bank.notes);

    // Created info
    const createdAt = Bank.createdAt ? new Date(Bank.createdAt).toLocaleString("ar-SA-u-nu-latn") : "--";
    const createdByEl = document.getElementById("DetailCreatedBy");
    if (createdByEl) createdByEl.innerHTML = "تم إنشاؤها: " + createdAt;

    openPopUpWindow("DetailsPopup");
}

// ═══════════════════════════════════════════════════════════
//    إخفاء بنك (Soft Delete) - لا يوجد حذف نهائي للبنوك
// ═══════════════════════════════════════════════════════════
async function hideBank(id) {
    const ok = await ArbahToast.confirm(
        "هل تريد إخفاء البنك؟ (لن يظهر في القائمة لكن بياناته محفوظة ويمكن إظهاره مرة أخرى)",
        { title: "إخفاء", confirmText: "إخفاء", cancelText: "إلغاء" }
    );
    if (!ok) return;

    try {
        const response = await fetch("/api/Banks/hide/" + id, {
            method: "PUT",
            headers: { "Content-Type": "application/json" }
        });
        const result = await response.json();

        if (result.success) {
            ArbahToast.success(result.message || "تم إخفاء البنك بنجاح", 3000, { title: "تم!" });
            getBanks();
        } else {
            ArbahToast.error(result.message || "حدث خطأ", 3000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error hiding Bank:", error);
        ArbahToast.error("حدث خطأ في الاتصال", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    إظهار بنك مخفي
// ═══════════════════════════════════════════════════════════
async function restoreBank(id) {
    const ok = await ArbahToast.confirm("هل تريد إظهار البنك؟");
    if (!ok) return;

    try {
        const response = await fetch("/api/Banks/restore/" + id, {
            method: "PUT",
            headers: { "Content-Type": "application/json" }
        });
        const result = await response.json();

        if (result.success) {
            ArbahToast.success("تم إظهار البنك بنجاح", 3000, { title: "تم!" });
            getBanks();
        } else {
            ArbahToast.error(result.message || "حدث خطأ", 3000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error restoring Bank:", error);
        ArbahToast.error("حدث خطأ في الاتصال", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    بحث البنوك
// ═══════════════════════════════════════════════════════════
async function searchBanks(keyword) {
    if (!keyword || keyword.trim().length === 0) {
        getBanks();
        return;
    }

    try {
        const response = await fetch("/api/Banks/search/" + encodeURIComponent(keyword.trim()));
        const result = await response.json();

        if (result.success) {
            allBanksData = result.data || [];
            renderBanks(allBanksData);
            updateMetrics(allBanksData);
        } else {
            ArbahToast.error(result.message || "حدث خطأ في البحث", 3000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error searching banks:", error);
        ArbahToast.error("حدث خطأ في الاتصال", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    تصفية البنوك حسب الحالة
// ═══════════════════════════════════════════════════════════
function filterBanks(status) {
    if (!status || status === "all") {
        renderBanks(allBanksData);
        updateMetrics(allBanksData);
        return;
    }

    const filtered = allBanksData.filter(b => b.status === status);
    renderBanks(filtered);
    updateMetrics(filtered);
}

// ═══════════════════════════════════════════════════════════
//    عرض البنوك (render helper)
// ═══════════════════════════════════════════════════════════
function renderBanks(Banks) {
    const tbody = document.querySelector("#BanksTable");
    if (!tbody) return;

    tbody.innerHTML = "";

    if (Banks.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="NotFound">لا يوجد بنوك</td></tr>`;
        return;
    }

    Banks.forEach((Bank, i) => {
        const currentBalance = calculateCurrentBalance(Bank);
        const BankId = Bank._id;
        const linkedAccountCode = Bank.linkedAccountCode || (Bank.linkedAccount ? Bank.linkedAccount.code : "--");

        let iconColorClass = "Color-Bg-green";
        if (Bank.status === "frozen") {
            iconColorClass = "Color-Bg-orange";
        } else if (Bank.status === "closed") {
            iconColorClass = "Color-Bg-red";
        }

        const tr = document.createElement("tr");
        tr.dataset.id = BankId;
        tr.innerHTML = `
            <td class="row-number">${i + 1}</td>
            <td>
                <div class="Name-Cell">
                    <i class="fa-solid fa-building-columns ${iconColorClass}"></i>
                    <div class="Name-Cell-info">
                        <span class="name">${escapeHtml(Bank.name)}</span>
                        <span class="code">${escapeHtml(Bank.code || "BNK-" + String(i + 1).padStart(3, "0"))}</span>
                    </div>
                </div>
            </td>
            <td>${escapeHtml(Bank.accountNo || "-")}</td>
            <td>${escapeHtml(Bank.branch || "-")}</td>
            <td>${escapeHtml(linkedAccountCode)}</td>
            <td>${formatNumber(Bank.openingBalance)}</td>
            <td>
                <span class="status-badge ${iconColorClass}">
                    ${formatNumber(currentBalance)}
                </span>
            </td>
            <td>${getBankStatusText(Bank.status)}</td>
            <td>
                <div class="action-menu-container">
                    <button class="Action-Row-Btn"><i class="fa-solid fa-ellipsis"></i></button>
                    <div class="Profile-Dropdown">
                        <a class="Profile-Link" onclick="event.stopPropagation(); editBank('${BankId}')">
                            <i class="fa-regular fa-pen-to-square"></i> تعديل
                        </a>
                        <a class="Profile-Link" onclick="event.stopPropagation(); viewBankDetails('${BankId}')">
                            <i class="fa-solid fa-eye"></i> عرض التفاصيل
                        </a>
                        <div class="Separator"></div>
                        <a class="Profile-Link" onclick="event.stopPropagation(); hideBank('${BankId}')">
                            <i class="fa-solid fa-eye-slash"></i> إخفاء
                        </a>
                    </div>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    if (window.banksFilter) {
        window.banksFilter.reinit();
    }

    bindActionMenus();
}

// ═══════════════════════════════════════════════════════════
//    جلب الكود التالي تلقائياً
// ═══════════════════════════════════════════════════════════
async function fetchNextBankCode() {
    try {
        const response = await fetch("/api/Banks/next-code");
        const result = await response.json();

        if (result.success && result.data && result.data.nextCode) {
            const codeInput = document.getElementById("BankCode");
            if (codeInput && !codeInput.value) {
                codeInput.value = result.data.nextCode;
            }
        }
    } catch (error) {
        console.error("Error fetching next code:", error);
        generateBankCodeLocal();
    }
}

// ═══════════════════════════════════════════════════════════
//    دوال مساعدة
// ═══════════════════════════════════════════════════════════
function resetForm() {
    const form = document.getElementById("BankForm");
    if (form) form.reset();

    const bankId = document.getElementById("BankId");
    if (bankId) bankId.value = "";

    currentEditingId = null;

    const popupTitle = document.getElementById("PopupTitle");
    const popupSubtitle = document.getElementById("PopupSubtitle");
    if (popupTitle) popupTitle.textContent = "إضافة بنك جديد";
    if (popupSubtitle) popupSubtitle.textContent = "أدخل بيانات البنك بدقة";

    fetchNextBankCode();

    const popup = document.querySelector("#AddNewPopup .PopUp-Window");
    if (popup) {
        popup.style.transform = "translate(-50%, -50%)";
        popup.style.top = "50%";
        popup.style.left = "50%";
    }
}

function generateBankCodeLocal() {
    const count = allBanksData.length + 1;
    const code = "BNK-" + String(count).padStart(3, "0");
    const codeInput = document.getElementById("BankCode");
    if (codeInput) codeInput.value = code;
}

function calculateCurrentBalance(Bank) {
    // أولوية 1: الرصيد المخزن في البنك (يتم تحديثه تلقائياً)
    if (Bank.currentBalance !== undefined && Bank.currentBalance !== null) {
        return parseFloat(Bank.currentBalance) || 0;
    }

    // أولوية 2: الرصيد من الحساب المرتبط
    if (Bank.linkedAccount && Bank.linkedAccount.currentBalance !== undefined) {
        return parseFloat(Bank.linkedAccount.currentBalance) || 0;
    }

    // fallback: الرصيد الافتتاحي
    const opening = parseFloat(Bank.openingBalance) || 0;
    const balanceType = Bank.balanceType || "debit";
    return balanceType === "debit" ? opening : -opening;
}

// ═══════════════════════════════════════════════════════════
//    تحديث رصيد بنك واحد من السيرفر
// ═══════════════════════════════════════════════════════════
async function refreshBankBalance(bankId) {
    try {
        const response = await fetch(`/api/Banks/${bankId}`);
        const result = await response.json();

        if (result.success && result.data) {
            const bank = result.data;
            const newBalance = bank.currentBalance !== undefined
                ? parseFloat(bank.currentBalance)
                : (bank.linkedAccount?.currentBalance || 0);

            // تحديث البيانات المحلية
            const idx = allBanksData.findIndex(b => b._id === bankId || b._id == bankId);
            if (idx !== -1) {
                allBanksData[idx].currentBalance = newBalance;
                if (allBanksData[idx].linkedAccount) {
                    allBanksData[idx].linkedAccount.currentBalance = newBalance;
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
//    تحديث أرصدة كل البنوك
// ═══════════════════════════════════════════════════════════
async function refreshAllBankBalances() {
    ArbahToast.info("جاري تحديث الأرصدة...", 2000, { title: "تحديث" });

    try {
        const response = await fetch("/api/Banks");
        const result = await response.json();

        if (result.success && result.data) {
            allBanksData = result.data;
            getBanks(); // إعادة رسم الجدول
            ArbahToast.success("تم تحديث الأرصدة بنجاح", 3000, { title: "تم!" });
        }
    } catch (error) {
        console.error("Error refreshing all balances:", error);
        ArbahToast.error("حدث خطأ في تحديث الأرصدة", 3000, { title: "خطأ !" });
    }
}

function getBankStatusText(status) {
    switch (status) {
        case "active": return "نشط";
        case "frozen": return "مجمد";
        case "closed": return "مغلق";
        default: return "غير معروف";
    }
}

function getBankStatusClass(status) {
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
//    تحميل البنوك عند بدء التشغيل
// ═══════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", function () {
    getBanks();
});