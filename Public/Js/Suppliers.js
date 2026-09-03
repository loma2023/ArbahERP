// ═══════════════════════════════════════════════════════════
//    متغيرات عامة
// ═══════════════════════════════════════════════════════════
let currentEditingId = null;
let allSuppliersData = [];

// ═══════════════════════════════════════════════════════════
//    حفظ مورد جديد أو تعديل موجود
// ═══════════════════════════════════════════════════════════
async function saveSupplier() {
  const SupplierId = document.getElementById("SupplierId")?.value;

  const Supplier = {
    name: document.getElementById("SupplierName")?.value?.trim() || "",
    phone: document.getElementById("SupplierPhone")?.value?.trim() || "",
    taxNumber: document.getElementById("SupplierTax")?.value?.trim() || "",
    commercialReg: document.getElementById("SupplierReg")?.value?.trim() || "",
    city: document.getElementById("SupplierCity")?.value?.trim() || "",
    address: document.getElementById("SupplierAddress")?.value?.trim() || "",
    openingBalance: parseFloat(document.getElementById("OpenBalance")?.value) || 0,
    balanceType: document.getElementById("SupplierStatus")?.value || "debit",
    creditLimit: parseFloat(document.getElementById("SupplierCreditLimit")?.value) || 0,
    notes: document.getElementById("SupplierNotes")?.value?.trim() || ""
  };

  // إرسال الكود في الإضافة فقط
  if (!SupplierId) {
    const codeInput = document.getElementById("SupplierCode");
    if (codeInput) {
      Supplier.code = codeInput.value?.trim();
    }
  }

  // ── التحقق من البيانات ──
  if (!Supplier.name) {
    ArbahToast.warning("يرجى إدخال اسم المورد", 4000, { title: "خلي بالك !!" });
    return;
  }

  let url = "/api/Suppliers/create";
  let method = "POST";

  if (SupplierId) {
    url = `/api/Suppliers/${SupplierId}`;
    method = "PUT";
  }

  try {
    const response = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Supplier)
    });

    const result = await response.json();

    if (result.success) {
      ArbahToast.success(
        SupplierId
          ? "تم تعديل المورد بنجاح"
          : "تم إضافة المورد وإنشاء حسابه في شجرة الحسابات بنجاح",
        4000,
        { title: "تم!" }
      );
      closePopUpWindow("AddNewPopup");
      resetForm();
      getSuppliers();
    } else {
      ArbahToast.error(result.message || "حدث خطأ", 4000, { title: "خطأ !" });
    }
  } catch (error) {
    console.error("Error saving supplier:", error);
    ArbahToast.error("حدث خطأ في الاتصال بالخادم", 3000, { title: "خطأ !" });
  }
}

// ═══════════════════════════════════════════════════════════
//    جلب الموردين وعرضهم
// ═══════════════════════════════════════════════════════════
async function getSuppliers() {
  const tbody = document.querySelector("#SuppliersTable");
  if (!tbody) {
    console.error("SuppliersTable tbody not found!");
    return;
  }

  tbody.innerHTML = `<tr>
                            <td colspan="9" style="text-align:center;padding:40px;">
                                <i class="fa-solid fa-spinner fa-spin"></i>
                                <p style="margin-top:10px;color:#6b7280;">جاري تحميل ...</p>
                            </td>
                        </tr>`;

  try {
    const response = await fetch("/api/Suppliers");
    if (!response.ok) {
      throw new Error("HTTP error! status: " + response.status);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || "Server returned error");
    }

    const Suppliers = result.data || [];
    allSuppliersData = Suppliers;
    tbody.innerHTML = "";

    if (Suppliers.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="NotFound">لا يوجد موردين</td></tr>`;
      updateMetrics([]);
      return;
    }

    Suppliers.forEach((Supplier, i) => {
      const currentBalance = calculateCurrentBalance(Supplier);
      const SupplierId = Supplier._id;
      const creditLimit = parseFloat(Supplier.creditLimit) || 0;

      let iconColorClass = "Color-Bg-green";
      if (creditLimit > 0 && currentBalance > creditLimit) {
        iconColorClass = "Color-Bg-orange";
      } else if (currentBalance < 0) {
        iconColorClass = "Color-Bg-red";
      }

      const tr = document.createElement("tr");
      tr.dataset.id = SupplierId;
      tr.innerHTML = `
                <td class="row-number">${i + 1}</td>
                <td>
                    <div class="Name-Cell">
                        <i class="fa-solid fa-user ${iconColorClass}"></i>
                        <div class="Name-Cell-info">
                            <span class="name">${escapeHtml(Supplier.name)}</span>
                            <span class="code">${escapeHtml(Supplier.code || "CUST-" + String(i + 1).padStart(3, "0"))}</span>
                        </div>
                    </div>
                </td>
                <td>${escapeHtml(Supplier.taxNumber || "-")}</td>
                <td>${escapeHtml(Supplier.commercialReg || "-")}</td>
                <td>${escapeHtml(Supplier.city || "-")}${Supplier.address ? ", " + escapeHtml(Supplier.address) : ""}</td>
                <td dir="ltr" style="text-align:right;">${escapeHtml(Supplier.phone || "-")}</td>
                <td>${formatNumber(Supplier.creditLimit)}</td>
                <td>
                    <span class="status-badge ${iconColorClass}">
                        ${formatNumber(currentBalance)}
                    </span>
                </td>
                <td>
                    <div class="action-menu-container">
                        <button class="Action-Row-Btn"><i class="fa-solid fa-ellipsis"></i></button>
                        <div class="Profile-Dropdown">
                            <a class="Profile-Link" onclick="event.stopPropagation(); editSupplier('${SupplierId}')">
                                <i class="fa-regular fa-pen-to-square"></i> تعديل
                            </a>
                            <a class="Profile-Link" onclick="event.stopPropagation(); viewSupplierDetails('${SupplierId}')">
                                <i class="fa-solid fa-eye"></i> عرض التفاصيل
                            </a>
                            <div class="Separator"></div>
                            <a class="Profile-Link" onclick="event.stopPropagation(); hideSupplier('${SupplierId}')">
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
    updateMetrics(Suppliers);

  } catch (error) {
    console.error("Error fetching Suppliers:", error);
    tbody.innerHTML = `<tr><td colspan="9" class="NotFound">حدث خطأ في تحميل البيانات: ${escapeHtml(error.message)}</td></tr>`;
  }
}

// ═══════════════════════════════════════════════════════════
//    تحديث الإحصائيات
// ═══════════════════════════════════════════════════════════
function updateMetrics(Suppliers) {
  const totalSuppliers = Suppliers.length;
  const activeSuppliers = Suppliers.filter(c => c.isActive !== false).length;
  const totalReceivables = Suppliers.reduce((sum, c) => {
    const balance = calculateCurrentBalance(c);
    return balance > 0 ? sum + balance : sum;
  }, 0);
  const overLimit = Suppliers.filter(c => {
    const balance = calculateCurrentBalance(c);
    const limit = parseFloat(c.creditLimit) || 0;
    return balance > limit && limit > 0;
  }).length;

  const totalEl = document.getElementById("TotalSuppliers");
  const activeEl = document.getElementById("ActiveSuppliers");
  const receivablesEl = document.getElementById("TotalReceivables");
  const overLimitEl = document.getElementById("OverLimitSuppliers");

  if (totalEl) totalEl.textContent = totalSuppliers;
  if (activeEl) activeEl.textContent = activeSuppliers;
  if (receivablesEl) receivablesEl.textContent = formatNumber(totalReceivables) + " ر.س";
  if (overLimitEl) overLimitEl.textContent = overLimit;
}

// ═══════════════════════════════════════════════════════════
//    تعديل مورد
// ═══════════════════════════════════════════════════════════
function editSupplier(id) {
  const Supplier = allSuppliersData.find(c => c._id === id || c._id == id);
  if (!Supplier) {
    ArbahToast.error("المورد غير موجود", 3000, { title: "خطأ !" });
    return;
  }

  currentEditingId = id;

  const setValue = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value || "";
  };

  setValue("SupplierId", id);
  setValue("SupplierCode", Supplier.code || "");
  setValue("SupplierName", Supplier.name);
  setValue("SupplierPhone", Supplier.phone);
  setValue("SupplierTax", Supplier.taxNumber);
  setValue("SupplierReg", Supplier.commercialReg);
  setValue("SupplierCity", Supplier.city);
  setValue("SupplierAddress", Supplier.address);
  setValue("OpenBalance", Supplier.openingBalance);
  setValue("SupplierStatus", Supplier.balanceType || "debit");
  setValue("SupplierCreditLimit", Supplier.creditLimit);
  setValue("SupplierNotes", Supplier.notes);

  const popupTitle = document.getElementById("PopupTitle");
  const popupSubtitle = document.getElementById("PopupSubtitle");
  if (popupTitle) popupTitle.textContent = "تعديل بيانات المورد";
  if (popupSubtitle) popupSubtitle.textContent = "تعديل بيانات: " + Supplier.name;

  openPopUpWindow("AddNewPopup");
}

// ═══════════════════════════════════════════════════════════
//    عرض تفاصيل المورد
// ═══════════════════════════════════════════════════════════
function viewSupplierDetails(id) {
  const Supplier = allSuppliersData.find(c => c._id === id || c._id == id);
  if (!Supplier) return;

  const currentBalance = calculateCurrentBalance(Supplier);
  const linkedAccount = Supplier.linkedAccount;

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value || "-";
  };

  setText("DetailsCode", Supplier.code);
  setText("DetailsName", Supplier.name);
  setText("DetailsSupCode", Supplier.code);
  setText("DetailsTax", Supplier.taxNumber);
  setText("DetailsReg", Supplier.commercialReg);
  setText("DetailsPhone", Supplier.phone);
  setText("DetailsAddress", (Supplier.city || "") + (Supplier.address ? " | " + Supplier.address : ""));
  setText("DetailsOpenBalance", formatNumber(Supplier.openingBalance || 0));
  setText("DetailsCreditLimit", formatNumber(Supplier.creditLimit || 0));
  setText("DetailsCurrentBalance", formatNumber(currentBalance));
  setText("DetailsAccountBalance", formatNumber(Supplier.currentBalance || currentBalance));

  // إضافة كود الحساب المرتبط إذا موجود
  if (linkedAccount) {
    setText("DetailsLinkedAccount", linkedAccount.code + " - " + linkedAccount.name);
  } else {
    setText("DetailsLinkedAccount", "غير مرتبط");
  }

  openPopUpWindow("DetailsPopup");
}

// ═══════════════════════════════════════════════════════════
//    إخفاء مورد (Soft Delete)
// ═══════════════════════════════════════════════════════════
async function hideSupplier(id) {
  const ok = await ArbahToast.confirm("هل تريد إخفاء المورد؟ (لن يظهر في القائمة لكن بياناته محفوظة)",
    { title: "اخفاء", confirmText: "اخفاء", cancelText: "إلغاء" }
  ); if (!ok) return;

  try {
    const response = await fetch("/api/Suppliers/hide/" + id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" }
    });
    const result = await response.json();

    if (result.success) {
      ArbahToast.success("تم إخفاء المورد بنجاح", 3000, { title: "تم!" });
      getSuppliers();
    } else {
      ArbahToast.error(result.message || "حدث خطأ", 3000, { title: "خطأ !" });
    }
  } catch (error) {
    console.error("Error hiding Supplier:", error);
    ArbahToast.error("حدث خطأ في الاتصال", 3000, { title: "خطأ !" });
  }
}

// ═══════════════════════════════════════════════════════════
//    إظهار مورد مخفي
// ═══════════════════════════════════════════════════════════
async function restoreSupplier(id) {
  const ok = await ArbahToast.confirm("هل تريد إظهار المورد؟");
  if (!ok) return;

  try {
    const response = await fetch("/api/Suppliers/restore/" + id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" }
    });
    const result = await response.json();

    if (result.success) {
      ArbahToast.success("تم إظهار المورد بنجاح", 3000, { title: "تم!" });
      getSuppliers();
    } else {
      ArbahToast.error(result.message || "حدث خطأ", 3000, { title: "خطأ !" });
    }
  } catch (error) {
    console.error("Error restoring Supplier:", error);
    ArbahToast.error("حدث خطأ في الاتصال", 3000, { title: "خطأ !" });
  }
}

// ═══════════════════════════════════════════════════════════
//    جلب الكود التالي تلقائياً
// ═══════════════════════════════════════════════════════════
async function fetchNextCode() {
  try {
    const response = await fetch("/api/Suppliers/next-code");
    const result = await response.json();

    if (result.success && result.data && result.data.nextCode) {
      const codeInput = document.getElementById("SupplierCode");
      if (codeInput && !codeInput.value) {
        codeInput.value = result.data.nextCode;
      }
    }
  } catch (error) {
    console.error("Error fetching next code:", error);
    // Fallback: generate locally
    generateSupplierCodeLocal();
  }
}

// ═══════════════════════════════════════════════════════════
//    دوال مساعدة
// ═══════════════════════════════════════════════════════════
function resetForm() {
  const form = document.getElementById("SupplierForm");
  if (form) form.reset();

  const supplierId = document.getElementById("SupplierId");
  if (supplierId) supplierId.value = "";

  currentEditingId = null;

  const popupTitle = document.getElementById("PopupTitle");
  const popupSubtitle = document.getElementById("PopupSubtitle");
  if (popupTitle) popupTitle.textContent = "إضافة مورد جديد";
  if (popupSubtitle) popupSubtitle.textContent = "أدخل بيانات المورد بدقة";

  // جلب الكود التالي
  fetchNextCode();

  const popup = document.querySelector("#AddNewPopup .PopUp-Window");
  if (popup) {
    popup.style.transform = "translate(-50%, -50%)";
    popup.style.top = "50%";
    popup.style.left = "50%";
  }
}

function generateSupplierCodeLocal() {
  const count = allSuppliersData.length + 1;
  const code = "CUST-" + String(count).padStart(3, "0");
  const codeInput = document.getElementById("SupplierCode");
  if (codeInput) codeInput.value = code;
}

function calculateCurrentBalance(Supplier) {
  // أولوية 1: الرصيد المخزن في المورد (يتم تحديثه تلقائياً)
  if (Supplier.currentBalance !== undefined && Supplier.currentBalance !== null) {
    return parseFloat(Supplier.currentBalance) || 0;
  }

  // أولوية 2: الرصيد من الحساب المرتبط
  if (Supplier.linkedAccount && Supplier.linkedAccount.currentBalance !== undefined) {
    return parseFloat(Supplier.linkedAccount.currentBalance) || 0;
  }

  // fallback: الرصيد الافتتاحي
  const opening = parseFloat(Supplier.openingBalance) || 0;
  const balanceType = Supplier.balanceType || "debit";
  return balanceType === "debit" ? opening : -opening;
}

// ═══════════════════════════════════════════════════════════
//    تحديث رصيد مورد واحد من السيرفر
// ═══════════════════════════════════════════════════════════
async function refreshSupplierBalance(supplierId) {
  try {
    const response = await fetch(`/api/Suppliers/${supplierId}`);
    const result = await response.json();

    if (result.success && result.data) {
      const supplier = result.data;
      const newBalance = supplier.currentBalance !== undefined
        ? parseFloat(supplier.currentBalance)
        : (supplier.linkedAccount?.currentBalance || 0);

      // تحديث البيانات المحلية
      const idx = allSuppliersData.findIndex(c => c._id === supplierId || c._id == supplierId);
      if (idx !== -1) {
        allSuppliersData[idx].currentBalance = newBalance;
        if (allSuppliersData[idx].linkedAccount) {
          allSuppliersData[idx].linkedAccount.currentBalance = newBalance;
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
//    تحديث أرصدة كل الموردين
// ═══════════════════════════════════════════════════════════
async function refreshAllBalances() {
  ArbahToast.info("جاري تحديث الأرصدة...", 2000, { title: "تحديث" });

  try {
    const response = await fetch("/api/Suppliers");
    const result = await response.json();

    if (result.success && result.data) {
      allSuppliersData = result.data;
      getSuppliers(); // إعادة رسم الجدول
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
//    تحميل الموردين عند بدء التشغيل
// ═══════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", function () {
  getSuppliers();
});