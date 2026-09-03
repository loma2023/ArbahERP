// ═══════════════════════════════════════════════════════════
// Branches.js - Frontend Controller for Branches Module
// ArbahERP - Integrated Accounting System
// ═══════════════════════════════════════════════════════════

let currentEditingId = null;
let allBranchesData = [];

// ═══════════════════════════════════════════════════════════
//    حفظ فرع جديد أو تعديل موجود
// ═══════════════════════════════════════════════════════════
async function saveBranch() {
  const BranchId = document.getElementById("BranchId")?.value;

  const Branch = {
    name: document.getElementById("BranchName")?.value?.trim() || "",
    city: document.getElementById("BranchCity")?.value?.trim() || "",
    address: document.getElementById("BranchAddress")?.value?.trim() || "",
    phone: document.getElementById("BranchPhone")?.value?.trim() || "",
    manager: document.getElementById("BranchManager")?.value?.trim() || "",
    warehouse: document.getElementById("BranchWarehouse")?.value?.trim() || "",
    status: document.getElementById("BranchStatus")?.value || "active",
    notes: document.getElementById("BranchNotes")?.value?.trim() || ""
  };

  // إرسال الكود في الإضافة فقط
  if (!BranchId) {
    const codeInput = document.getElementById("BranchCode");
    if (codeInput) {
      Branch.code = codeInput.value?.trim();
    }
  }

  // ── التحقق من البيانات ──
  if (!Branch.name) {
    ArbahToast.warning("يرجى إدخال اسم الفرع", 4000, { title: "خلي بالك !!" });
    return;
  }

  let url = "/api/Branches/create";
  let method = "POST";

  if (BranchId) {
    url = `/api/Branches/${BranchId}`;
    method = "PUT";
  }

  try {
    const response = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Branch)
    });

    const result = await response.json();

    if (result.success) {
      ArbahToast.success(
        BranchId
          ? "تم تعديل الفرع بنجاح"
          : "تم إضافة الفرع بنجاح",
        4000,
        { title: "تم!" }
      );
      closePopUpWindow("AddNewPopup");
      resetForm();
      getBranches();
    } else {
      ArbahToast.error(result.message || "حدث خطأ", 4000, { title: "خطأ !" });
    }
  } catch (error) {
    console.error("Error saving branch:", error);
    ArbahToast.error("حدث خطأ في الاتصال بالخادم", 3000, { title: "خطأ !" });
  }
}

// ═══════════════════════════════════════════════════════════
//    جلب الفروع وعرضها
// ═══════════════════════════════════════════════════════════
async function getBranches() {
  const tbody = document.querySelector("#BranchesTable");
  if (!tbody) {
    console.error("BranchesTable tbody not found!");
    return;
  }

  tbody.innerHTML = `<tr><td colspan="9" class="NotFound">جاري التحميل...</td></tr>`;

  try {
    const response = await fetch("/api/Branches");
    if (!response.ok) {
      throw new Error("HTTP error! status: " + response.status);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || "Server returned error");
    }

    const Branches = result.data || [];
    allBranchesData = Branches;
    tbody.innerHTML = "";

    if (Branches.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="NotFound">لا يوجد فروع</td></tr>`;
      updateMetrics([]);
      return;
    }

    Branches.forEach((Branch, i) => {
      const BranchId = Branch._id;

      let iconColorClass = "Color-Bg-green";
      if (Branch.status === "inactive") {
        iconColorClass = "Color-Bg-orange";
      } else if (Branch.status === "closed") {
        iconColorClass = "Color-Bg-red";
      }

      const tr = document.createElement("tr");
      tr.dataset.id = BranchId;
      tr.innerHTML = `
                <td class="row-number">${i + 1}</td>
                <td>
                    <div class="Name-Cell">
                        <i class="fa-solid fa-building ${iconColorClass}"></i>
                        <div class="Name-Cell-info">
                            <span class="name">${escapeHtml(Branch.name)}</span>
                            <span class="code">${escapeHtml(Branch.code || "BR-" + String(i + 1).padStart(3, "0"))}</span>
                        </div>
                    </div>
                </td>
                <td>${escapeHtml(Branch.code || "-")}</td>
                <td>${escapeHtml(Branch.city || "-")}</td>
                <td>${escapeHtml(Branch.address || "-")}</td>
                <td><span class="status-badge ${iconColorClass}">${escapeHtml(Branch.warehouse || "-")}</span></td>
                <td dir="ltr" style="text-align:right;">${escapeHtml(Branch.phone || "-")}</td>
                <td><span class="status-badge ${iconColorClass}">${getStatusText(Branch.status)}</span></td>
                <td>
                    <div class="action-menu-container">
                        <button class="Action-Row-Btn"><i class="fa-solid fa-ellipsis"></i></button>
                        <div class="Profile-Dropdown">
                            <a class="Profile-Link" onclick="event.stopPropagation(); editBranch('${BranchId}')">
                                <i class="fa-regular fa-pen-to-square"></i> تعديل
                            </a>
                            <a class="Profile-Link" onclick="event.stopPropagation(); viewBranchDetails('${BranchId}')">
                                <i class="fa-solid fa-eye"></i> عرض التفاصيل
                            </a>
                            <a class="Profile-Link" onclick="event.stopPropagation(); hideBranch('${BranchId}')">
                                <i class="fa-solid fa-eye-slash"></i> إخفاء
                            </a>
                        </div>
                    </div>
                </td>
            `;
      tbody.appendChild(tr);
    });

    // إعادة تهيئة الجدول بعد تحميل البيانات
    if (window.branchesFilter) {
      window.branchesFilter.reinit();
    } else if (typeof ArbahTable !== "undefined") {
      window.branchesFilter = new ArbahTable("MainPerfectTable", { rowsPerPage: 15,dateColumnIndex: 2});
    }

    bindActionMenus();
    updateMetrics(Branches);

  } catch (error) {
    console.error("Error fetching Branches:", error);
    tbody.innerHTML = `<tr><td colspan="9" class="NotFound">حدث خطأ في تحميل البيانات: ${escapeHtml(error.message)}</td></tr>`;
  }
}

// ═══════════════════════════════════════════════════════════
//    تحديث الإحصائيات
// ═══════════════════════════════════════════════════════════
function updateMetrics(Branches) {
  const totalBranches = Branches.length;
  const activeBranches = Branches.filter(b => b.status === "active").length;
  const inactiveBranches = Branches.filter(b => b.status === "inactive").length;
  const closedBranches = Branches.filter(b => b.status === "closed").length;

  const totalEl = document.getElementById("TotalBranches");
  const activeEl = document.getElementById("ActiveBranches");
  const inactiveEl = document.getElementById("InactiveBranches");
  const closedEl = document.getElementById("ClosedBranches");

  if (totalEl) totalEl.textContent = totalBranches;
  if (activeEl) activeEl.textContent = activeBranches;
  if (inactiveEl) inactiveEl.textContent = inactiveBranches;
  if (closedEl) closedEl.textContent = closedBranches;
}

// ═══════════════════════════════════════════════════════════
//    تعديل فرع
// ═══════════════════════════════════════════════════════════
function editBranch(id) {
  const Branch = allBranchesData.find(b => b._id === id || b._id == id);
  if (!Branch) {
    ArbahToast.error("الفرع غير موجود", 3000, { title: "خطأ !" });
    return;
  }

  currentEditingId = id;

  const setValue = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.value = value || "";
  };

  setValue("BranchId", id);
  setValue("BranchCode", Branch.code || "");
  setValue("BranchName", Branch.name);
  setValue("BranchCity", Branch.city);
  setValue("BranchPhone", Branch.phone);
  setValue("BranchAddress", Branch.address);
  setValue("BranchWarehouse", Branch.warehouse);
  setValue("BranchManager", Branch.manager);
  setValue("BranchStatus", Branch.status || "active");
  setValue("BranchNotes", Branch.notes);

  const popupTitle = document.getElementById("PopupTitle");
  const popupSubtitle = document.getElementById("PopupSubtitle");
  if (popupTitle) popupTitle.textContent = "تعديل بيانات الفرع";
  if (popupSubtitle) popupSubtitle.textContent = "تعديل بيانات: " + Branch.name;

  openPopUpWindow("AddNewPopup");
}

// ═══════════════════════════════════════════════════════════
//    عرض تفاصيل الفرع
// ═══════════════════════════════════════════════════════════
function viewBranchDetails(id) {
  const Branch = allBranchesData.find(b => b._id === id || b._id == id);
  if (!Branch) return;

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value || "-";
  };

  setText("DetailsCode", Branch.code);
  setText("DetailBranchName", Branch.name);
  setText("DetailBranchCode", Branch.code);
  setText("DetailCity", Branch.city);
  setText("DetailPhone", Branch.phone);
  setText("DetailAddress", Branch.address);
  setText("DetailWarehouse", Branch.warehouse);
  setText("DetailManager", Branch.manager);
  setText("DetailStatus", getStatusText(Branch.status));

  // Notes
  const notesSection = document.getElementById("NotesSection");
  if (notesSection) notesSection.style.display = Branch.notes ? "block" : "none";
  setText("DetailNotes", Branch.notes);

  // Created info
  const createdAt = Branch.createdAt ? new Date(Branch.createdAt).toLocaleString("ar-SA-u-nu-latn") : "--";
  const createdByEl = document.getElementById("DetailCreatedBy");
  if (createdByEl) createdByEl.innerHTML = "تم إنشاؤها: " + createdAt;

  openPopUpWindow("DetailsPopup");
}

// ═══════════════════════════════════════════════════════════
//    إخفاء فرع (Soft Delete)
// ═══════════════════════════════════════════════════════════
async function hideBranch(id) {
  const ok = await ArbahToast.confirm(
    "هل تريد إخفاء الفرع؟ (لن يظهر في القائمة لكن بياناته محفوظة ويمكن إظهاره مرة أخرى)",
    { title: "إخفاء", confirmText: "إخفاء", cancelText: "إلغاء" }
  );
  if (!ok) return;

  try {
    const response = await fetch("/api/Branches/hide/" + id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" }
    });
    const result = await response.json();

    if (result.success) {
      ArbahToast.success(result.message || "تم إخفاء الفرع بنجاح", 3000, { title: "تم!" });
      getBranches();
    } else {
      ArbahToast.error(result.message || "حدث خطأ", 3000, { title: "خطأ !" });
    }
  } catch (error) {
    console.error("Error hiding Branch:", error);
    ArbahToast.error("حدث خطأ في الاتصال", 3000, { title: "خطأ !" });
  }
}

// ═══════════════════════════════════════════════════════════
//    إظهار فرع مخفي
// ═══════════════════════════════════════════════════════════
async function restoreBranch(id) {
  const ok = await ArbahToast.confirm("هل تريد إظهار الفرع؟");
  if (!ok) return;

  try {
    const response = await fetch("/api/Branches/restore/" + id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" }
    });
    const result = await response.json();

    if (result.success) {
      ArbahToast.success("تم إظهار الفرع بنجاح", 3000, { title: "تم!" });
      getBranches();
    } else {
      ArbahToast.error(result.message || "حدث خطأ", 3000, { title: "خطأ !" });
    }
  } catch (error) {
    console.error("Error restoring Branch:", error);
    ArbahToast.error("حدث خطأ في الاتصال", 3000, { title: "خطأ !" });
  }
}

// ═══════════════════════════════════════════════════════════
//    بحث الفروع
// ═══════════════════════════════════════════════════════════
async function searchBranches(keyword) {
  if (!keyword || keyword.trim().length === 0) {
    getBranches();
    return;
  }

  try {
    const response = await fetch("/api/Branches/search/" + encodeURIComponent(keyword.trim()));
    const result = await response.json();

    if (result.success) {
      allBranchesData = result.data || [];
      renderBranches(allBranchesData);
      updateMetrics(allBranchesData);
    } else {
      ArbahToast.error(result.message || "حدث خطأ في البحث", 3000, { title: "خطأ !" });
    }
  } catch (error) {
    console.error("Error searching branches:", error);
    ArbahToast.error("حدث خطأ في الاتصال", 3000, { title: "خطأ !" });
  }
}

// ═══════════════════════════════════════════════════════════
//    تصفية الفروع حسب الحالة
// ═══════════════════════════════════════════════════════════
function filterBranches(status) {
  if (!status || status === "all") {
    renderBranches(allBranchesData);
    updateMetrics(allBranchesData);
    return;
  }

  const filtered = allBranchesData.filter(b => b.status === status);
  renderBranches(filtered);
  updateMetrics(filtered);
}

// ═══════════════════════════════════════════════════════════
//    عرض الفروع (render helper)
// ═══════════════════════════════════════════════════════════
function renderBranches(Branches) {
  const tbody = document.querySelector("#BranchesTable");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (Branches.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="NotFound">لا يوجد فروع</td></tr>`;
    return;
  }

  Branches.forEach((Branch, i) => {
    const BranchId = Branch._id;

    let iconColorClass = "Color-Bg-green";
    if (Branch.status === "inactive") {
      iconColorClass = "Color-Bg-orange";
    } else if (Branch.status === "closed") {
      iconColorClass = "Color-Bg-red";
    }

    const tr = document.createElement("tr");
    tr.dataset.id = BranchId;
    tr.innerHTML = `
            <td class="row-number">${i + 1}</td>
            <td>
                <div class="Name-Cell">
                    <i class="fa-solid fa-building ${iconColorClass}"></i>
                    <div class="Name-Cell-info">
                        <span class="name">${escapeHtml(Branch.name)}</span>
                        <span class="code">${escapeHtml(Branch.code || "BR-" + String(i + 1).padStart(3, "0"))}</span>
                    </div>
                </div>
            </td>
            <td>${escapeHtml(Branch.code || "-")}</td>
            <td>${escapeHtml(Branch.city || "-")}</td>
            <td>${escapeHtml(Branch.address || "-")}</td>
            <td><span class="status-badge ${iconColorClass}">${escapeHtml(Branch.warehouse || "-")}</span></td>
            <td dir="ltr" style="text-align:right;">${escapeHtml(Branch.phone || "-")}</td>
            <td><span class="status-badge ${iconColorClass}">${getStatusText(Branch.status)}</span></td>
            <td>
                <div class="action-menu-container">
                    <button class="Action-Row-Btn"><i class="fa-solid fa-ellipsis"></i></button>
                    <div class="Profile-Dropdown">
                        <a class="Profile-Link" onclick="event.stopPropagation(); editBranch('${BranchId}')">
                            <i class="fa-regular fa-pen-to-square"></i> تعديل
                        </a>
                        <a class="Profile-Link" onclick="event.stopPropagation(); viewBranchDetails('${BranchId}')">
                            <i class="fa-solid fa-eye"></i> عرض التفاصيل
                        </a>
                        <a class="Profile-Link" onclick="event.stopPropagation(); hideBranch('${BranchId}')">
                            <i class="fa-solid fa-eye-slash"></i> إخفاء
                        </a>
                    </div>
                </div>
            </td>
        `;
    tbody.appendChild(tr);
  });

  if (window.branchesFilter) {
    window.branchesFilter.reinit();
  }

  bindActionMenus();
}

// ═══════════════════════════════════════════════════════════
//    جلب الكود التالي تلقائياً
// ═══════════════════════════════════════════════════════════
async function fetchNextBranchCode() {
  try {
    const response = await fetch("/api/Branches/next-code");
    const result = await response.json();

    if (result.success && result.data && result.data.nextCode) {
      const codeInput = document.getElementById("BranchCode");
      if (codeInput && !codeInput.value) {
        codeInput.value = result.data.nextCode;
      }
    }
  } catch (error) {
    console.error("Error fetching next code:", error);
    generateBranchCodeLocal();
  }
}

// ═══════════════════════════════════════════════════════════
//    دوال مساعدة
// ═══════════════════════════════════════════════════════════
function resetForm() {
  const form = document.getElementById("BranchForm");
  if (form) form.reset();

  const branchId = document.getElementById("BranchId");
  if (branchId) branchId.value = "";

  currentEditingId = null;

  const popupTitle = document.getElementById("PopupTitle");
  const popupSubtitle = document.getElementById("PopupSubtitle");
  if (popupTitle) popupTitle.textContent = "إضافة فرع جديد";
  if (popupSubtitle) popupSubtitle.textContent = "أدخل بيانات الفرع والمخزن المرتبط به";

  fetchNextBranchCode();

  const popup = document.querySelector("#AddNewPopup .PopUp-Window");
  if (popup) {
    popup.style.transform = "translate(-50%, -50%)";
    popup.style.top = "50%";
    popup.style.left = "50%";
  }
}

function generateBranchCodeLocal() {
  const count = allBranchesData.length + 1;
  const code = "BR-" + String(count).padStart(3, "0");
  const codeInput = document.getElementById("BranchCode");
  if (codeInput) codeInput.value = code;
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
//    تحميل الفروع عند بدء التشغيل
// ═══════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", function () {
  getBranches();
});