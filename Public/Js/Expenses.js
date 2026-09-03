// ═══════════════════════════════════════════════════════════
//    متغيرات عامة
// ═══════════════════════════════════════════════════════════
let currentEditingId = null;
let allExpensesData = [];

// ═══════════════════════════════════════════════════════════
//    حفظ مصروف جديد أو تعديل موجود
// ═══════════════════════════════════════════════════════════
async function saveExpense() {
    const ExpenseId = document.getElementById("ExpenseId")?.value;

    const type = document.getElementById("ExpenseType")?.value;

    // ✅ جلب قيمة عنصر الأب من hidden input بتاع SelectOption
    const parentHiddenInput = document.querySelector('#ParentField .select-value');
    const parentValue = parentHiddenInput ? parentHiddenInput.value : "";

    const Expense = {
        code: document.getElementById("ExpenseCode")?.value?.trim() || "",
        name: document.getElementById("ExpenseName")?.value?.trim() || "",
        type: type,
        description: document.getElementById("ExpenseDescription")?.value?.trim() || ""
    };

    // إضافة الأب فقط للمصروفات الفرعية
    if (type === "sub" && parentValue) {
        Expense.parent = parentValue;
    }

    // ── التحقق من البيانات ──
    if (!Expense.code) {
        ArbahToast.warning("يرجى إدخال كود المصروف", 4000, { title: "خلي بالك !!" });
        return;
    }
    if (!Expense.name) {
        ArbahToast.warning("يرجى إدخال اسم المصروف", 4000, { title: "خلي بالك !!" });
        return;
    }
    if (Expense.type === "sub" && !Expense.parent) {
        ArbahToast.warning("يرجى اختيار عنصر الأب للمصروف الفرعي", 4000, { title: "خلي بالك !!" });
        return;
    }

    let url = "/api/Expenses/create";
    let method = "POST";

    if (ExpenseId) {
        url = `/api/Expenses/${ExpenseId}`;
        method = "PUT";
        // ما نبعتش الكود في التعديل لو مش متغير
        delete Expense.code;
    }

    try {
        const response = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(Expense)
        });

        const result = await response.json();

        if (result.success) {
            ArbahToast.success(
                ExpenseId
                    ? "تم تعديل المصروف بنجاح"
                    : "تم إضافة المصروف وإنشاء حسابه في شجرة الحسابات بنجاح",
                4000,
                { title: "تم!" }
            );
            closePopUpWindow("AddNewPopup");
            resetExpenseForm();
            getExpenses();
        } else {
            ArbahToast.error(result.message || "حدث خطأ", 4000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error saving expense:", error);
        ArbahToast.error("حدث خطأ في الاتصال بالخادم", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    جلب المصروفات وعرضها
// ═══════════════════════════════════════════════════════════
async function getExpenses() {
    const tbody = document.querySelector("#ExpensesTable");
    if (!tbody) {
        console.error("ExpensesTable tbody not found!");
        return;
    }

    tbody.innerHTML = `<tr><td colspan="9" class="NotFound">جاري التحميل...</td></tr>`;

    try {
        const response = await fetch("/api/Expenses");
        if (!response.ok) {
            throw new Error("HTTP error! status: " + response.status);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || "Server returned error");
        }

        const Expenses = result.data || [];
        allExpensesData = Expenses;
        tbody.innerHTML = "";

        if (Expenses.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="NotFound">لا يوجد مصروفات</td></tr>`;
            updateMetrics([]);
            return;
        }

        Expenses.forEach((Expense, i) => {
            const ExpenseId = Expense._id;
            const isMain = Expense.type === "main";
            const typeBadge = isMain 
                ? `<span class="status-badge Color-Bg-blue">رئيسي</span>`
                : `<span class="status-badge Color-Bg-green">فرعي</span>`;

            const statusBadge = Expense.isActive 
                ? `<span class="status-badge Color-Bg-green">نشط</span>`
                : `<span class="status-badge Color-Bg-red">غير نشط</span>`;

            const parentName = Expense.parent 
                ? escapeHtml(Expense.parent.name) 
                : (isMain ? "-" : "غير محدد");

            const accountInfo = Expense.linkedAccount 
                ? `${escapeHtml(Expense.linkedAccount.code)} - ${escapeHtml(Expense.linkedAccount.name)}`
                : "غير مرتبط";

            const tr = document.createElement("tr");
            tr.dataset.id = ExpenseId;
            // إضافة مسافة بادئة للمصروفات الفرعية
            const indent = !isMain ? "pr-4" : "";
            tr.innerHTML = `
                <td class="row-number">${i + 1}</td>
                <td>${escapeHtml(Expense.code)}</td>
                <td class="${indent}">
                    <div class="Name-Cell">
                        <i class="fa-solid ${isMain ? 'fa-folder' : 'fa-file-invoice-dollar'} ${isMain ? 'Color-Bg-orange' : 'Color-Bg-blue'}"></i>
                        <div class="Name-Cell-info">
                            <span class="name">${escapeHtml(Expense.name)}</span>
                        </div>
                    </div>
                </td>
                <td>${typeBadge}</td>
                <td>${escapeHtml(parentName)}</td>
                <td>
                    <span class="code-badge">${escapeHtml(accountInfo)}</span>
                </td>
                <td>${escapeHtml(Expense.description || "-")}</td>
                <td>${statusBadge}</td>
                <td>
                    <div class="action-menu-container">
                        <button class="Action-Row-Btn"><i class="fa-solid fa-ellipsis"></i></button>
                        <div class="Profile-Dropdown">
                            <a class="Profile-Link" onclick="event.stopPropagation(); editExpense('${ExpenseId}')">
                                <i class="fa-regular fa-pen-to-square"></i> تعديل
                            </a>
                            <a class="Profile-Link" onclick="event.stopPropagation(); viewExpenseDetails('${ExpenseId}')">
                                <i class="fa-solid fa-eye"></i> عرض التفاصيل
                            </a>
                            <a class="Profile-Link" onclick="event.stopPropagation(); hideExpense('${ExpenseId}')">
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
            window.productsFilter = new ArbahTable("MainPerfectTable", { rowsPerPage: 15,dateColumnIndex: 2});
        }

        bindActionMenus();
        updateMetrics(Expenses);

    } catch (error) {
        console.error("Error fetching Expenses:", error);
        tbody.innerHTML = `<tr><td colspan="9" class="NotFound">حدث خطأ في تحميل البيانات: ${escapeHtml(error.message)}</td></tr>`;
    }
}

// ═══════════════════════════════════════════════════════════
//    تحديث الإحصائيات
// ═══════════════════════════════════════════════════════════
function updateMetrics(Expenses) {
    const total = Expenses.length;
    const main = Expenses.filter(e => e.type === "main").length;
    const sub = Expenses.filter(e => e.type === "sub").length;
    const active = Expenses.filter(e => e.isActive !== false).length;

    const totalEl = document.getElementById("TotalExpenses");
    const mainEl = document.getElementById("MainExpenses");
    const subEl = document.getElementById("SubExpenses");
    const activeEl = document.getElementById("ActiveExpenses");

    if (totalEl) totalEl.textContent = total;
    if (mainEl) mainEl.textContent = main;
    if (subEl) subEl.textContent = sub;
    if (activeEl) activeEl.textContent = active;
}

// ═══════════════════════════════════════════════════════════
//    تغيير نوع المصروف - يخفي/يظهر حقل الأب فقط
// ═══════════════════════════════════════════════════════════
function onExpenseTypeChange() {
    const type = document.getElementById("ExpenseType")?.value;
    const parentField = document.getElementById("ParentField");

    if (parentField) {
        parentField.style.display = type === "sub" ? "block" : "none";
    }
}

// ═══════════════════════════════════════════════════════════
//    ✅ جلب الكود التالي تلقائياً
// ═══════════════════════════════════════════════════════════
async function fetchNextCode() {
    try {
        const response = await fetch("/api/Expenses/next-code");
        const result = await response.json();

        if (result.success && result.data && result.data.nextCode) {
            const codeInput = document.getElementById("ExpenseCode");
            if (codeInput && !codeInput.value) {
                codeInput.value = result.data.nextCode;
            }
        }
    } catch (error) {
        console.error("Error fetching next code:", error);
        // Fallback: generate locally
        generateExpenseCodeLocal();
    }
}

// ═══════════════════════════════════════════════════════════
//    توليد كود محلي (fallback)
// ═══════════════════════════════════════════════════════════
function generateExpenseCodeLocal() {
    const count = allExpensesData.length + 1;
    const code = "EXP-" + String(count).padStart(3, "0");
    const codeInput = document.getElementById("ExpenseCode");
    if (codeInput) codeInput.value = code;
}

// ═══════════════════════════════════════════════════════════
//    تعديل مصروف
// ═══════════════════════════════════════════════════════════
function editExpense(id) {
    const Expense = allExpensesData.find(e => e._id === id || e._id == id);
    if (!Expense) {
        ArbahToast.error("المصروف غير موجود", 3000, { title: "خطأ !" });
        return;
    }

    currentEditingId = id;

    const setValue = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value || "";
    };

    setValue("ExpenseId", id);
    setValue("ExpenseCode", Expense.code);
    setValue("ExpenseName", Expense.name);
    setValue("ExpenseType", Expense.type);
    setValue("ExpenseDescription", Expense.description);

    // تحديث حقل الأب
    onExpenseTypeChange();

    // ✅ لو مصروف فرعي وعنده أب، نحط القيمة في SelectOption
    if (Expense.type === "sub" && Expense.parent) {
        const parentField = document.querySelector('#ParentField');
        if (parentField) {
            const searchInput = parentField.querySelector('.select-search');
            const hiddenInput = parentField.querySelector('.select-value');

            // نحط الـ ID في hidden input
            if (hiddenInput) hiddenInput.value = Expense.parent._id || Expense.parent;

            // نحط اسم الأب في search input
            if (searchInput && Expense.parent.name) {
                searchInput.value = Expense.parent.name;
            }
        }
    }

    const popupTitle = document.getElementById("PopupTitle");
    const popupSubtitle = document.getElementById("PopupSubtitle");
    if (popupTitle) popupTitle.textContent = "تعديل بيانات المصروف";
    if (popupSubtitle) popupSubtitle.textContent = "تعديل بيانات: " + Expense.name;

    openPopUpWindow("AddNewPopup");
}

// ═══════════════════════════════════════════════════════════
//    عرض تفاصيل المصروف
// ═══════════════════════════════════════════════════════════
function viewExpenseDetails(id) {
    const Expense = allExpensesData.find(e => e._id === id || e._id == id);
    if (!Expense) return;

    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value || "-";
    };

    setText("DetailsCode", Expense.code);
    setText("DetailsName", Expense.name);
    setText("DetailsType", Expense.type === "main" ? "رئيسي (أب)" : "فرعي (ابن)");
    setText("DetailsParent", Expense.parent ? Expense.parent.name : "لا يوجد");
    setText("DetailsDescription", Expense.description);
    setText("DetailsStatus", Expense.isActive ? "نشط" : "غير نشط");

    if (Expense.linkedAccount) {
        setText("DetailsAccount", Expense.linkedAccount.code + " - " + Expense.linkedAccount.name);
    } else {
        setText("DetailsAccount", "غير مرتبط");
    }

    openPopUpWindow("DetailsPopup");
}

// ═══════════════════════════════════════════════════════════
//    إخفاء مصروف (Soft Delete)
// ═══════════════════════════════════════════════════════════
async function hideExpense(id) {
    const ok = await ArbahToast.confirm("هل تريد إخفاء المصروف؟ (لن يظهر في القائمة لكن بياناته محفوظة)",
        { title: "اخفاء", confirmText: "اخفاء", cancelText: "إلغاء" }
    );
    if (!ok) return;

    try {
        const response = await fetch("/api/Expenses/hide/" + id, {
            method: "PUT",
            headers: { "Content-Type": "application/json" }
        });
        const result = await response.json();

        if (result.success) {
            ArbahToast.success("تم إخفاء المصروف بنجاح", 3000, { title: "تم!" });
            getExpenses();
        } else {
            ArbahToast.error(result.message || "حدث خطأ", 3000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error hiding Expense:", error);
        ArbahToast.error("حدث خطأ في الاتصال", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    إظهار مصروف مخفي
// ═══════════════════════════════════════════════════════════
async function restoreExpense(id) {
    const ok = await ArbahToast.confirm("هل تريد إظهار المصروف؟");
    if (!ok) return;

    try {
        const response = await fetch("/api/Expenses/restore/" + id, {
            method: "PUT",
            headers: { "Content-Type": "application/json" }
        });
        const result = await response.json();

        if (result.success) {
            ArbahToast.success("تم إظهار المصروف بنجاح", 3000, { title: "تم!" });
            getExpenses();
        } else {
            ArbahToast.error(result.message || "حدث خطأ", 3000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error restoring Expense:", error);
        ArbahToast.error("حدث خطأ في الاتصال", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    تصدير Excel
// ═══════════════════════════════════════════════════════════
function exportExpensesExcel() {
    if (allExpensesData.length === 0) {
        ArbahToast.warning("لا يوجد بيانات للتصدير", 3000, { title: "تنبيه" });
        return;
    }

    let csv = "\uFEFFكود,الاسم,النوع,عنصر الأب,حساب شجرة الحسابات,الوصف,الحالة\n";

    allExpensesData.forEach(e => {
        const type = e.type === "main" ? "رئيسي" : "فرعي";
        const parent = e.parent ? e.parent.name : "-";
        const account = e.linkedAccount ? `${e.linkedAccount.code} - ${e.linkedAccount.name}` : "-";
        const status = e.isActive ? "نشط" : "غير نشط";

        csv += `"${e.code}","${e.name}","${type}","${parent}","${account}","${e.description || ''}","${status}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "المصروفات_" + new Date().toISOString().slice(0, 10) + ".csv";
    link.click();
}

// ═══════════════════════════════════════════════════════════
//    دوال مساعدة
// ═══════════════════════════════════════════════════════════
function resetExpenseForm() {
    const form = document.getElementById("ExpenseForm");
    if (form) form.reset();

    const expenseId = document.getElementById("ExpenseId");
    if (expenseId) expenseId.value = "";

    currentEditingId = null;

    const popupTitle = document.getElementById("PopupTitle");
    const popupSubtitle = document.getElementById("PopupSubtitle");
    if (popupTitle) popupTitle.textContent = "إضافة مصروف جديد";
    if (popupSubtitle) popupSubtitle.textContent = "أدخل بيانات المصروف بدقة";

    // ✅ إعادة تعيين SelectOption
    const parentField = document.querySelector('#ParentField');
    if (parentField) {
        const searchInput = parentField.querySelector('.select-search');
        const hiddenInput = parentField.querySelector('.select-value');
        if (searchInput) searchInput.value = "";
        if (hiddenInput) hiddenInput.value = "";
    }

    onExpenseTypeChange();

    // ✅ جلب الكود التالي تلقائياً
    fetchNextCode();

    const popup = document.querySelector("#AddNewPopup .PopUp-Window");
    if (popup) {
        popup.style.transform = "translate(-50%, -50%)";
        popup.style.top = "50%";
        popup.style.left = "50%";
    }
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
    getExpenses();
    onExpenseTypeChange();
});