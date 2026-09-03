// ═══════════════════════════════════════════════════════════
//    متغيرات عامة
// ═══════════════════════════════════════════════════════════
let currentEditingId = null;
let allRevenuesData = [];

// ═══════════════════════════════════════════════════════════
//    حفظ ايراد جديد أو تعديل موجود
// ═══════════════════════════════════════════════════════════
async function saveRevenue() {
    const RevenueId = document.getElementById("RevenueId")?.value;

    const type = document.getElementById("RevenueType")?.value;

    // ✅ جلب قيمة عنصر الأب من hidden input بتاع SelectOption
    const parentHiddenInput = document.querySelector('#ParentField .select-value');
    const parentValue = parentHiddenInput ? parentHiddenInput.value : "";

    const Revenue = {
        code: document.getElementById("RevenueCode")?.value?.trim() || "",
        name: document.getElementById("RevenueName")?.value?.trim() || "",
        type: type,
        description: document.getElementById("RevenueDescription")?.value?.trim() || ""
    };

    // إضافة الأب فقط للايرادات الفرعية
    if (type === "sub" && parentValue) {
        Revenue.parent = parentValue;
    }

    // ── التحقق من البيانات ──
    if (!Revenue.code) {
        ArbahToast.warning("يرجى إدخال كود الايراد", 4000, { title: "خلي بالك !!" });
        return;
    }
    if (!Revenue.name) {
        ArbahToast.warning("يرجى إدخال اسم الايراد", 4000, { title: "خلي بالك !!" });
        return;
    }
    if (Revenue.type === "sub" && !Revenue.parent) {
        ArbahToast.warning("يرجى اختيار عنصر الأب للايراد الفرعي", 4000, { title: "خلي بالك !!" });
        return;
    }

    let url = "/api/Revenues/create";
    let method = "POST";

    if (RevenueId) {
        url = `/api/Revenues/${RevenueId}`;
        method = "PUT";
        // ما نبعتش الكود في التعديل لو مش متغير
        delete Revenue.code;
    }

    try {
        const response = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(Revenue)
        });

        const result = await response.json();

        if (result.success) {
            ArbahToast.success(
                RevenueId
                    ? "تم تعديل الايراد بنجاح"
                    : "تم إضافة الايراد وإنشاء حسابه في شجرة الحسابات بنجاح",
                4000,
                { title: "تم!" }
            );
            closePopUpWindow("AddNewPopup");
            resetRevenueForm();
            getRevenues();
        } else {
            ArbahToast.error(result.message || "حدث خطأ", 4000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error saving Revenue:", error);
        ArbahToast.error("حدث خطأ في الاتصال بالخادم", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    جلب الايرادات وعرضها
// ═══════════════════════════════════════════════════════════
async function getRevenues() {
    const tbody = document.querySelector("#RevenuesTable");
    if (!tbody) {
        console.error("RevenuesTable tbody not found!");
        return;
    }

    tbody.innerHTML = `<tr><td colspan="9" class="NotFound">جاري التحميل...</td></tr>`;

    try {
        const response = await fetch("/api/Revenues");
        if (!response.ok) {
            throw new Error("HTTP error! status: " + response.status);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.message || "Server returned error");
        }

        const Revenues = result.data || [];
        allRevenuesData = Revenues;
        tbody.innerHTML = "";

        if (Revenues.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" class="NotFound">لا يوجد ايرادات</td></tr>`;
            updateMetrics([]);
            return;
        }

        Revenues.forEach((Revenue, i) => {
            const RevenueId = Revenue._id;
            const isMain = Revenue.type === "main";
            const typeBadge = isMain 
                ? `<span class="status-badge Color-Bg-blue">رئيسي</span>`
                : `<span class="status-badge Color-Bg-green">فرعي</span>`;

            const statusBadge = Revenue.isActive 
                ? `<span class="status-badge Color-Bg-green">نشط</span>`
                : `<span class="status-badge Color-Bg-red">غير نشط</span>`;

            const parentName = Revenue.parent 
                ? escapeHtml(Revenue.parent.name) 
                : (isMain ? "-" : "غير محدد");

            const accountInfo = Revenue.linkedAccount 
                ? `${escapeHtml(Revenue.linkedAccount.code)} - ${escapeHtml(Revenue.linkedAccount.name)}`
                : "غير مرتبط";

            const tr = document.createElement("tr");
            tr.dataset.id = RevenueId;
            // إضافة مسافة بادئة للايرادات الفرعية
            const indent = !isMain ? "pr-4" : "";
            tr.innerHTML = `
                <td class="row-number">${i + 1}</td>
                <td>${escapeHtml(Revenue.code)}</td>
                <td class="${indent}">
                    <div class="Name-Cell">
                        <i class="fa-solid ${isMain ? 'fa-folder' : 'fa-file-invoice-dollar'} ${isMain ? 'Color-Bg-orange' : 'Color-Bg-blue'}"></i>
                        <div class="Name-Cell-info">
                            <span class="name">${escapeHtml(Revenue.name)}</span>
                        </div>
                    </div>
                </td>
                <td>${typeBadge}</td>
                <td>${escapeHtml(parentName)}</td>
                <td>
                    <span class="code-badge">${escapeHtml(accountInfo)}</span>
                </td>
                <td>${escapeHtml(Revenue.description || "-")}</td>
                <td>${statusBadge}</td>
                <td>
                    <div class="action-menu-container">
                        <button class="Action-Row-Btn"><i class="fa-solid fa-ellipsis"></i></button>
                        <div class="Profile-Dropdown">
                            <a class="Profile-Link" onclick="event.stopPropagation(); editRevenue('${RevenueId}')">
                                <i class="fa-regular fa-pen-to-square"></i> تعديل
                            </a>
                            <a class="Profile-Link" onclick="event.stopPropagation(); viewRevenueDetails('${RevenueId}')">
                                <i class="fa-solid fa-eye"></i> عرض التفاصيل
                            </a>
                            <a class="Profile-Link" onclick="event.stopPropagation(); hideRevenue('${RevenueId}')">
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
        updateMetrics(Revenues);

    } catch (error) {
        console.error("Error fetching Revenues:", error);
        tbody.innerHTML = `<tr><td colspan="9" class="NotFound">حدث خطأ في تحميل البيانات: ${escapeHtml(error.message)}</td></tr>`;
    }
}

// ═══════════════════════════════════════════════════════════
//    تحديث الإحصائيات
// ═══════════════════════════════════════════════════════════
function updateMetrics(Revenues) {
    const total = Revenues.length;
    const main = Revenues.filter(e => e.type === "main").length;
    const sub = Revenues.filter(e => e.type === "sub").length;
    const active = Revenues.filter(e => e.isActive !== false).length;

    const totalEl = document.getElementById("TotalRevenues");
    const mainEl = document.getElementById("MainRevenues");
    const subEl = document.getElementById("SubRevenues");
    const activeEl = document.getElementById("ActiveRevenues");

    if (totalEl) totalEl.textContent = total;
    if (mainEl) mainEl.textContent = main;
    if (subEl) subEl.textContent = sub;
    if (activeEl) activeEl.textContent = active;
}

// ═══════════════════════════════════════════════════════════
//    تغيير نوع الايراد - يخفي/يظهر حقل الأب فقط
// ═══════════════════════════════════════════════════════════
function onRevenueTypeChange() {
    const type = document.getElementById("RevenueType")?.value;
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
        const response = await fetch("/api/Revenues/next-code");
        const result = await response.json();

        if (result.success && result.data && result.data.nextCode) {
            const codeInput = document.getElementById("RevenueCode");
            if (codeInput && !codeInput.value) {
                codeInput.value = result.data.nextCode;
            }
        }
    } catch (error) {
        console.error("Error fetching next code:", error);
        // Fallback: generate locally
        generateRevenueCodeLocal();
    }
}

// ═══════════════════════════════════════════════════════════
//    توليد كود محلي (fallback)
// ═══════════════════════════════════════════════════════════
function generateRevenueCodeLocal() {
    const count = allRevenuesData.length + 1;
    const code = "EXP-" + String(count).padStart(3, "0");
    const codeInput = document.getElementById("RevenueCode");
    if (codeInput) codeInput.value = code;
}

// ═══════════════════════════════════════════════════════════
//    تعديل ايراد
// ═══════════════════════════════════════════════════════════
function editRevenue(id) {
    const Revenue = allRevenuesData.find(e => e._id === id || e._id == id);
    if (!Revenue) {
        ArbahToast.error("الايراد غير موجود", 3000, { title: "خطأ !" });
        return;
    }

    currentEditingId = id;

    const setValue = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value || "";
    };

    setValue("RevenueId", id);
    setValue("RevenueCode", Revenue.code);
    setValue("RevenueName", Revenue.name);
    setValue("RevenueType", Revenue.type);
    setValue("RevenueDescription", Revenue.description);

    // تحديث حقل الأب
    onRevenueTypeChange();

    // ✅ لو ايراد فرعي وعنده أب، نحط القيمة في SelectOption
    if (Revenue.type === "sub" && Revenue.parent) {
        const parentField = document.querySelector('#ParentField');
        if (parentField) {
            const searchInput = parentField.querySelector('.select-search');
            const hiddenInput = parentField.querySelector('.select-value');

            // نحط الـ ID في hidden input
            if (hiddenInput) hiddenInput.value = Revenue.parent._id || Revenue.parent;

            // نحط اسم الأب في search input
            if (searchInput && Revenue.parent.name) {
                searchInput.value = Revenue.parent.name;
            }
        }
    }

    const popupTitle = document.getElementById("PopupTitle");
    const popupSubtitle = document.getElementById("PopupSubtitle");
    if (popupTitle) popupTitle.textContent = "تعديل بيانات الايراد";
    if (popupSubtitle) popupSubtitle.textContent = "تعديل بيانات: " + Revenue.name;

    openPopUpWindow("AddNewPopup");
}

// ═══════════════════════════════════════════════════════════
//    عرض تفاصيل الايراد
// ═══════════════════════════════════════════════════════════
function viewRevenueDetails(id) {
    const Revenue = allRevenuesData.find(e => e._id === id || e._id == id);
    if (!Revenue) return;

    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value || "-";
    };

    setText("DetailsCode", Revenue.code);
    setText("DetailsName", Revenue.name);
    setText("DetailsType", Revenue.type === "main" ? "رئيسي (أب)" : "فرعي (ابن)");
    setText("DetailsParent", Revenue.parent ? Revenue.parent.name : "لا يوجد");
    setText("DetailsDescription", Revenue.description);
    setText("DetailsStatus", Revenue.isActive ? "نشط" : "غير نشط");

    if (Revenue.linkedAccount) {
        setText("DetailsAccount", Revenue.linkedAccount.code + " - " + Revenue.linkedAccount.name);
    } else {
        setText("DetailsAccount", "غير مرتبط");
    }

    openPopUpWindow("DetailsPopup");
}

// ═══════════════════════════════════════════════════════════
//    إخفاء ايراد (Soft Delete)
// ═══════════════════════════════════════════════════════════
async function hideRevenue(id) {
    const ok = await ArbahToast.confirm("هل تريد إخفاء الايراد؟ (لن يظهر في القائمة لكن بياناته محفوظة)",
        { title: "اخفاء", confirmText: "اخفاء", cancelText: "إلغاء" }
    );
    if (!ok) return;

    try {
        const response = await fetch("/api/Revenues/hide/" + id, {
            method: "PUT",
            headers: { "Content-Type": "application/json" }
        });
        const result = await response.json();

        if (result.success) {
            ArbahToast.success("تم إخفاء الايراد بنجاح", 3000, { title: "تم!" });
            getRevenues();
        } else {
            ArbahToast.error(result.message || "حدث خطأ", 3000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error hiding Revenue:", error);
        ArbahToast.error("حدث خطأ في الاتصال", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    إظهار ايراد مخفي
// ═══════════════════════════════════════════════════════════
async function restoreRevenue(id) {
    const ok = await ArbahToast.confirm("هل تريد إظهار الايراد؟");
    if (!ok) return;

    try {
        const response = await fetch("/api/Revenues/restore/" + id, {
            method: "PUT",
            headers: { "Content-Type": "application/json" }
        });
        const result = await response.json();

        if (result.success) {
            ArbahToast.success("تم إظهار الايراد بنجاح", 3000, { title: "تم!" });
            getRevenues();
        } else {
            ArbahToast.error(result.message || "حدث خطأ", 3000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error restoring Revenue:", error);
        ArbahToast.error("حدث خطأ في الاتصال", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    تصدير Excel
// ═══════════════════════════════════════════════════════════
function exportRevenuesExcel() {
    if (allRevenuesData.length === 0) {
        ArbahToast.warning("لا يوجد بيانات للتصدير", 3000, { title: "تنبيه" });
        return;
    }

    let csv = "\uFEFFكود,الاسم,النوع,عنصر الأب,حساب شجرة الحسابات,الوصف,الحالة\n";

    allRevenuesData.forEach(e => {
        const type = e.type === "main" ? "رئيسي" : "فرعي";
        const parent = e.parent ? e.parent.name : "-";
        const account = e.linkedAccount ? `${e.linkedAccount.code} - ${e.linkedAccount.name}` : "-";
        const status = e.isActive ? "نشط" : "غير نشط";

        csv += `"${e.code}","${e.name}","${type}","${parent}","${account}","${e.description || ''}","${status}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "الايرادات_" + new Date().toISOString().slice(0, 10) + ".csv";
    link.click();
}

// ═══════════════════════════════════════════════════════════
//    دوال مساعدة
// ═══════════════════════════════════════════════════════════
function resetRevenueForm() {
    const form = document.getElementById("RevenueForm");
    if (form) form.reset();

    const RevenueId = document.getElementById("RevenueId");
    if (RevenueId) RevenueId.value = "";

    currentEditingId = null;

    const popupTitle = document.getElementById("PopupTitle");
    const popupSubtitle = document.getElementById("PopupSubtitle");
    if (popupTitle) popupTitle.textContent = "إضافة ايراد جديد";
    if (popupSubtitle) popupSubtitle.textContent = "أدخل بيانات الايراد بدقة";

    // ✅ إعادة تعيين SelectOption
    const parentField = document.querySelector('#ParentField');
    if (parentField) {
        const searchInput = parentField.querySelector('.select-search');
        const hiddenInput = parentField.querySelector('.select-value');
        if (searchInput) searchInput.value = "";
        if (hiddenInput) hiddenInput.value = "";
    }

    onRevenueTypeChange();

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
    getRevenues();
    onRevenueTypeChange();
});