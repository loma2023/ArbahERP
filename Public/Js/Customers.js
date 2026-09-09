// ═══════════════════════════════════════════════════════════
//    متغيرات عامة
// ═══════════════════════════════════════════════════════════
let currentEditingId = null;
let allCustomersData = [];

// ═══════════════════════════════════════════════════════════
//    حفظ عميل جديد أو تعديل موجود
// ═══════════════════════════════════════════════════════════
async function saveCustomer() {
    const CustomerId = document.getElementById("CustomerId")?.value;

    const Customer = {
        name: document.getElementById("CustomerName")?.value?.trim() || "",
        phone: document.getElementById("CustomerPhone")?.value?.trim() || "",
        taxNumber: document.getElementById("CustomerTax")?.value?.trim() || "",
        commercialReg: document.getElementById("CustomerReg")?.value?.trim() || "",
        city: document.getElementById("CustomerCity")?.value?.trim() || "",
        address: document.getElementById("CustomerAddress")?.value?.trim() || "",
        openingBalance: parseFloat(document.getElementById("OpenBalance")?.value) || 0,
        balanceType: document.getElementById("CustomerStatus")?.value || "debit",
        creditLimit: parseFloat(document.getElementById("CustomerCreditLimit")?.value) || 0,
        notes: document.getElementById("CustomerNotes")?.value?.trim() || ""
    };

    // إرسال الكود في الإضافة فقط
    if (!CustomerId) {
        const codeInput = document.getElementById("CustomerCode");
        if (codeInput) {
            Customer.code = codeInput.value?.trim();
        }
    }

    // ── التحقق من البيانات ──
    if (!Customer.name) {
        ArbahToast.warning("يرجى إدخال اسم العميل", 4000, { title: "خلي بالك !!" });
        return;
    }

    let url = "/api/Customers/create";
    let method = "POST";

    if (CustomerId) {
        url = `/api/Customers/${CustomerId}`;
        method = "PUT";
    }

    try {
        const response = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(Customer)
        });

        const result = await response.json();

        if (result.success) {
            ArbahToast.success(
                CustomerId
                    ? "تم تعديل العميل بنجاح"
                    : "تم إضافة العميل وإنشاء حسابه في شجرة الحسابات بنجاح",
                4000,
                { title: "تم!" }
            );
            closePopUpWindow("AddNewPopup");
            resetForm();
            getCustomers();
        } else {
            ArbahToast.error(result.message || "حدث خطأ", 4000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error saving customer:", error);
        ArbahToast.error("حدث خطأ في الاتصال بالخادم", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    جلب العملاء وعرضهم
// ═══════════════════════════════════════════════════════════
async function getCustomers() {
    const tbody = document.querySelector("#CustomersTable");
    if (!tbody) {
        console.error("CustomersTable tbody not found!");
        return;
    }

    tbody.innerHTML = `<tr>
                            <td colspan="9" style="text-align:center;padding:40px;">
                                <i class="fa-solid fa-spinner fa-spin"></i>
                                <p style="margin-top:10px;color:#6b7280;">جاري تحميل ...</p>
                            </td>
                        </tr>`;

    try {
        const response = await fetch("/api/Customers");
        if (!response.ok) {
            throw new Error("HTTP error! status: " + response.status);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || "Server returned error");
        }

        const Customers = result.data || [];
        allCustomersData = Customers;
        tbody.innerHTML = "";

        if (Customers.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="NotFound">لا يوجد عملاء</td></tr>`;
            updateMetrics([]);
            return;
        }

        Customers.forEach((Customer, i) => {
            const currentBalance = calculateCurrentBalance(Customer);
            const CustomerId = Customer._id;
            const creditLimit = parseFloat(Customer.creditLimit) || 0;

            let iconColorClass = "Color-Bg-green";
            if (creditLimit > 0 && currentBalance > creditLimit) {
                iconColorClass = "Color-Bg-orange";
            } else if (currentBalance < 0) {
                iconColorClass = "Color-Bg-red";
            }

            const tr = document.createElement("tr");
            tr.dataset.id = CustomerId;
            tr.innerHTML = `
                <td class="row-number">${i + 1}</td>
                <td>
                    <div class="Name-Cell">
                        <i class="fa-solid fa-user ${iconColorClass}"></i>
                        <div class="Name-Cell-info">
                            <span class="name">${escapeHtml(Customer.name)}</span>
                            <span class="code">${escapeHtml(Customer.code || "CUST-" + String(i + 1).padStart(3, "0"))}</span>
                        </div>
                    </div>
                </td>
                <td>${escapeHtml(Customer.taxNumber || "-")}</td>
                <td>${escapeHtml(Customer.commercialReg || "-")}</td>
                <td>${escapeHtml(Customer.city || "-")}${Customer.address ? ", " + escapeHtml(Customer.address) : ""}</td>
                <td dir="ltr" style="text-align:right;">${escapeHtml(Customer.phone || "-")}</td>
                <td>${formatNumber(Customer.creditLimit)}</td>
                <td>
                    <span class="status-badge ${iconColorClass}">
                        ${formatNumber(currentBalance)}
                    </span>
                </td>
                <td>
                    <div class="action-menu-container">
                        <button class="Action-Row-Btn"><i class="fa-solid fa-ellipsis"></i></button>
                        <div class="Profile-Dropdown">
                            <a class="Profile-Link" onclick="event.stopPropagation(); editCustomer('${CustomerId}')">
                                <i class="fa-regular fa-pen-to-square"></i> تعديل
                            </a>
                            <a class="Profile-Link" onclick="event.stopPropagation(); viewCustomerDetails('${CustomerId}')">
                                <i class="fa-solid fa-eye"></i> عرض التفاصيل
                            </a>
                            <div class="Separator"></div>
                            <a class="Profile-Link" onclick="event.stopPropagation(); hideCustomer('${CustomerId}')">
                                <i class="fa-solid fa-eye-slash"></i> إخفاء
                            </a>
                        </div>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // إعادة تهيئة الجدول بعد تحميل البيانات
        if (window.productsFilter) {
            window.productsFilter.reinit();
        } else if (typeof ArbahTable !== "undefined") {
            window.productsFilter = new ArbahTable("MainPerfectTable", { rowsPerPage: 15, dateColumnIndex: 2 });
        }

        bindActionMenus();
        updateMetrics(Customers);

    } catch (error) {
        console.error("Error fetching Customers:", error);
        tbody.innerHTML = `<tr><td colspan="9" class="NotFound">حدث خطأ في تحميل البيانات: ${escapeHtml(error.message)}</td></tr>`;
    }
}

// ═══════════════════════════════════════════════════════════
//    تحديث الإحصائيات
// ═══════════════════════════════════════════════════════════
function updateMetrics(Customers) {
    const totalCustomers = Customers.length;
    const activeCustomers = Customers.filter(c => c.isActive !== false).length;
    const totalReceivables = Customers.reduce((sum, c) => {
        const balance = calculateCurrentBalance(c);
        return balance > 0 ? sum + balance : sum;
    }, 0);
    const overLimit = Customers.filter(c => {
        const balance = calculateCurrentBalance(c);
        const limit = parseFloat(c.creditLimit) || 0;
        return balance > limit && limit > 0;
    }).length;

    const totalEl = document.getElementById("TotalCustomers");
    const activeEl = document.getElementById("ActiveCustomers");
    const receivablesEl = document.getElementById("TotalReceivables");
    const overLimitEl = document.getElementById("OverLimitCustomers");

    if (totalEl) totalEl.textContent = totalCustomers;
    if (activeEl) activeEl.textContent = activeCustomers;
    if (receivablesEl) receivablesEl.textContent = formatNumber(totalReceivables) + " ر.س";
    if (overLimitEl) overLimitEl.textContent = overLimit;
}

// ═══════════════════════════════════════════════════════════
//    تعديل عميل
// ═══════════════════════════════════════════════════════════
function editCustomer(id) {
    const Customer = allCustomersData.find(c => c._id === id || c._id == id);
    if (!Customer) {
        ArbahToast.error("العميل غير موجود", 3000, { title: "خطأ !" });
        return;
    }

    currentEditingId = id;

    const setValue = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value || "";
    };

    setValue("CustomerId", id);
    setValue("CustomerCode", Customer.code || "");
    setValue("CustomerName", Customer.name);
    setValue("CustomerPhone", Customer.phone);
    setValue("CustomerTax", Customer.taxNumber);
    setValue("CustomerReg", Customer.commercialReg);
    setValue("CustomerCity", Customer.city);
    setValue("CustomerAddress", Customer.address);
    setValue("OpenBalance", Customer.openingBalance);
    setValue("CustomerStatus", Customer.balanceType || "debit");
    setValue("CustomerCreditLimit", Customer.creditLimit);
    setValue("CustomerNotes", Customer.notes);

    const popupTitle = document.getElementById("PopupTitle");
    const popupSubtitle = document.getElementById("PopupSubtitle");
    if (popupTitle) popupTitle.textContent = "تعديل بيانات العميل";
    if (popupSubtitle) popupSubtitle.textContent = "تعديل بيانات: " + Customer.name;

    openPopUpWindow("AddNewPopup");
}

// ═══════════════════════════════════════════════════════════
//    عرض تفاصيل العميل
// ═══════════════════════════════════════════════════════════
function viewCustomerDetails(id) {
    const Customer = allCustomersData.find(c => c._id === id || c._id == id);
    if (!Customer) return;

    const currentBalance = calculateCurrentBalance(Customer);
    const linkedAccount = Customer.linkedAccount;

    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value || "-";
    };

    setText("DetailsCode", Customer.code);
    setText("DetailsName", Customer.name);
    setText("DetailsSupCode", Customer.code);
    setText("DetailsTax", Customer.taxNumber);
    setText("DetailsReg", Customer.commercialReg);
    setText("DetailsPhone", Customer.phone);
    setText("DetailsAddress", (Customer.city || "") + (Customer.address ? " | " + Customer.address : ""));
    setText("DetailsOpenBalance", formatNumber(Customer.openingBalance || 0));
    setText("DetailsCreditLimit", formatNumber(Customer.creditLimit || 0));
    setText("DetailsCurrentBalance", formatNumber(currentBalance));
    setText("DetailsAccountBalance", formatNumber(Customer.currentBalance || currentBalance));

    // إضافة كود الحساب المرتبط إذا موجود
    if (linkedAccount) {
        setText("DetailsLinkedAccount", linkedAccount.code + " - " + linkedAccount.name);
    } else {
        setText("DetailsLinkedAccount", "غير مرتبط");
    }

    openPopUpWindow("DetailsPopup");
}

// ═══════════════════════════════════════════════════════════
//    إخفاء عميل (Soft Delete)
// ═══════════════════════════════════════════════════════════
async function hideCustomer(id) {
    const ok = await ArbahToast.confirm("هل تريد إخفاء العميل؟ (لن يظهر في القائمة لكن بياناته محفوظة)",
        { title: "اخفاء", confirmText: "اخفاء", cancelText: "إلغاء" }
    ); if (!ok) return;

    try {
        const response = await fetch("/api/Customers/hide/" + id, {
            method: "PUT",
            headers: { "Content-Type": "application/json" }
        });
        const result = await response.json();

        if (result.success) {
            ArbahToast.success("تم إخفاء العميل بنجاح", 3000, { title: "تم!" });
            getCustomers();
        } else {
            ArbahToast.error(result.message || "حدث خطأ", 3000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error hiding Customer:", error);
        ArbahToast.error("حدث خطأ في الاتصال", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    إظهار عميل مخفي
// ═══════════════════════════════════════════════════════════
async function restoreCustomer(id) {
    const ok = await ArbahToast.confirm("هل تريد إظهار العميل؟");
    if (!ok) return;

    try {
        const response = await fetch("/api/Customers/restore/" + id, {
            method: "PUT",
            headers: { "Content-Type": "application/json" }
        });
        const result = await response.json();

        if (result.success) {
            ArbahToast.success("تم إظهار العميل بنجاح", 3000, { title: "تم!" });
            getCustomers();
        } else {
            ArbahToast.error(result.message || "حدث خطأ", 3000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error restoring Customer:", error);
        ArbahToast.error("حدث خطأ في الاتصال", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    جلب الكود التالي تلقائياً
// ═══════════════════════════════════════════════════════════
async function fetchNextCode() {
    try {
        const response = await fetch("/api/Customers/next-code");
        const result = await response.json();

        if (result.success && result.data && result.data.nextCode) {
            const codeInput = document.getElementById("CustomerCode");
            if (codeInput && !codeInput.value) {
                codeInput.value = result.data.nextCode;
            }
        }
    } catch (error) {
        console.error("Error fetching next code:", error);
        // Fallback: generate locally
        generateCustomerCodeLocal();
    }
}

// ═══════════════════════════════════════════════════════════
//    دوال مساعدة
// ═══════════════════════════════════════════════════════════
function resetForm() {
    const form = document.getElementById("CustomerForm");
    if (form) form.reset();

    const customerId = document.getElementById("CustomerId");
    if (customerId) customerId.value = "";

    currentEditingId = null;

    const popupTitle = document.getElementById("PopupTitle");
    const popupSubtitle = document.getElementById("PopupSubtitle");
    if (popupTitle) popupTitle.textContent = "إضافة عميل جديد";
    if (popupSubtitle) popupSubtitle.textContent = "أدخل بيانات العميل بدقة";

    // جلب الكود التالي
    fetchNextCode();

    const popup = document.querySelector("#AddNewPopup .PopUp-Window");
    if (popup) {
        popup.style.transform = "translate(-50%, -50%)";
        popup.style.top = "50%";
        popup.style.left = "50%";
    }
}

function generateCustomerCodeLocal() {
    const count = allCustomersData.length + 1;
    const code = "CUST-" + String(count).padStart(3, "0");
    const codeInput = document.getElementById("CustomerCode");
    if (codeInput) codeInput.value = code;
}

function calculateCurrentBalance(Customer) {
    // أولوية 1: الرصيد المخزن في العميل (يتم تحديثه تلقائياً)
    if (Customer.currentBalance !== undefined && Customer.currentBalance !== null) {
        return parseFloat(Customer.currentBalance) || 0;
    }

    // أولوية 2: الرصيد من الحساب المرتبط
    if (Customer.linkedAccount && Customer.linkedAccount.currentBalance !== undefined) {
        return parseFloat(Customer.linkedAccount.currentBalance) || 0;
    }

    // fallback: الرصيد الافتتاحي
    const opening = parseFloat(Customer.openingBalance) || 0;
    const balanceType = Customer.balanceType || "debit";
    return balanceType === "debit" ? opening : -opening;
}

// ═══════════════════════════════════════════════════════════
//    تحديث رصيد عميل واحد من السيرفر
// ═══════════════════════════════════════════════════════════
async function refreshCustomerBalance(customerId) {
    try {
        const response = await fetch(`/api/Customers/${customerId}`);
        const result = await response.json();

        if (result.success && result.data) {
            const customer = result.data;
            const newBalance = customer.currentBalance !== undefined
                ? parseFloat(customer.currentBalance)
                : (customer.linkedAccount?.currentBalance || 0);

            // تحديث البيانات المحلية
            const idx = allCustomersData.findIndex(c => c._id === customerId || c._id == customerId);
            if (idx !== -1) {
                allCustomersData[idx].currentBalance = newBalance;
                if (allCustomersData[idx].linkedAccount) {
                    allCustomersData[idx].linkedAccount.currentBalance = newBalance;
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
//    تحديث أرصدة كل العملاء
// ═══════════════════════════════════════════════════════════
async function refreshAllBalances() {
    ArbahToast.info("جاري تحديث الأرصدة...", 2000, { title: "تحديث" });

    try {
        const response = await fetch("/api/Customers");
        const result = await response.json();

        if (result.success && result.data) {
            allCustomersData = result.data;
            getCustomers(); // إعادة رسم الجدول
            ArbahToast.success("تم تحديث الأرصدة بنجاح", 3000, { title: "تم!" });
        }
    } catch (error) {
        console.error("Error refreshing all balances:", error);
        ArbahToast.error("حدث خطأ في تحديث الأرصدة", 3000, { title: "خطأ !" });
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
//    تحميل العملاء عند بدء التشغيل
// ═══════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", function () {
    getCustomers();
});