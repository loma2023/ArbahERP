// ═══════════════════════════════════════════════════════════
//    متغيرات عامة
// ═══════════════════════════════════════════════════════════
let currentEditingId = null;
let allProductsData = [];

// ═══════════════════════════════════════════════════════════
//    حفظ منتج جديد أو تعديل موجود
// ═══════════════════════════════════════════════════════════
async function saveItem() {
  const itemId = document.getElementById("ItemId").value;

  // ✅ جمع الوحدات من الجدول (متوافق مع السكيما الجديدة)
  const unitRows = document.querySelectorAll("#UnitsTableBody tr");
  const units = [];
  unitRows.forEach((row, index) => {
    const inputs = row.querySelectorAll(".unit-input");
    const unitName = inputs[0]?.value.trim();
    const purchasePrice = inputs[1]?.value;
    // ✅ تغيير: salePrice → retailPrice
    const retailPrice = inputs[2]?.value;
    // ✅ جديد: سعر الجملة
    const wholesalePrice = inputs[3]?.value;
    // ✅ جديد: سعر VIP
    const vipPrice = inputs[4]?.value;
    const conversionFactor = inputs[5]?.value;

    if (unitName) {
      units.push({
        name: unitName,
        code: unitName, // ✅ نفس الاسم كـ code
        purchasePrice: parseFloat(purchasePrice) || 0,
        // ✅ تغيير: salePrice → retailPrice
        retailPrice: parseFloat(retailPrice) || 0,
        // ✅ جديد: سعر الجملة
        wholesalePrice: parseFloat(wholesalePrice) || 0,
        // ✅ جديد: سعر VIP
        vipPrice: parseFloat(vipPrice) || 0,
        conversionFactor: index === 0 ? 1 : (parseFloat(conversionFactor) || 1),
        isDefault: index === 0, // ✅ أول وحدة هي الأساسية
      });
    }
  });

  const item = {
    name: document.getElementById("ItemName").value.trim(),
    category: document.getElementById("ItemCategory")?.value || '',
    barcode: document.getElementById("ItemBarcode")?.value || '',
    units: units,
    stock: parseFloat(document.getElementById("ItemStock").value) || 0,
    minStock: parseFloat(document.getElementById("MinStockAlert").value) || 5,
    maxStock: 0,
    avgCost: 0,
    // ✅ جديد: description (لو عندك حقل وصف في الفورم)
    description: document.getElementById("ItemDescription")?.value?.trim() || '',
    // ✅ جديد: active (لو عندك toggle في الفورم)
    active: document.getElementById("ItemActive")?.checked !== false
  };

  if (!itemId) {
    item.code = document.getElementById("ItemCode").value;
  }

  if (!item.name) {
    ArbahToast.warning("يرجى إدخال اسم الصنف", 4000, { title: 'خلي بالك !!' });
    return;
  }

  if (units.length === 0) {
    ArbahToast.warning("يرجى إضافة وحدة واحدة على الأقل", 4000, { title: 'خلي بالك !!' });
    return;
  }

  let url = "/api/Products/create";
  let method = "POST";

  if (itemId) {
    url = `/api/Products/${itemId}`;
    method = "PUT";
  }

  try {
    const response = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(item)
    });

    const result = await response.json();
    if (result.success) {
      ArbahToast.success(itemId ? "تم تعديل الصنف بنجاح" : "تم إضافة الصنف بنجاح", 4000, { title: 'تم!' });
      closePopUpWindow('AddNewPopup');
      resetForm();
      getProducts();
    } else {
      ArbahToast.error(result.message || "حدث خطأ", 4000, { title: 'خطأ !' });
    }
  } catch (error) {
    console.error("Error:", error);
    ArbahToast.error("حدث خطأ في الاتصال", 4000, { title: 'خطأ !' });
  }
}

// ═══════════════════════════════════════════════════════════
//    جلب المنتجات وعرضها
// ═══════════════════════════════════════════════════════════
async function getProducts() {
  const tbody = document.querySelector("#ProductsTable");
  if (!tbody) {
    console.error("ProductsTable tbody not found!");
    return;
  }

  tbody.innerHTML = '<tr><td colspan="9" class="NotFound">جاري التحميل...</td></tr>';

  try {
    const response = await fetch("/api/Products");
    if (!response.ok) {
      throw new Error("HTTP error! status: " + response.status);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || "Server returned error");
    }

    const products = result.data || [];
    allProductsData = products;
    tbody.innerHTML = "";

    if (products.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="NotFound">لا يوجد أصناف</td></tr>`;
      updateMetrics([]);
      return;
    }

    products.forEach((product, i) => {
      const productId = product._id;
      const units = product.units || [];
      const totalStock = parseFloat(product.stock) || 0;
      const minAlert = parseFloat(product.minStock) || 0;

      let statusColor = 'Color-Bg-green';
      let statusText = 'متوفر';

      if (totalStock <= 0) {
        statusColor = 'Color-Bg-red';
        statusText = 'نفذ';
      } else if (totalStock <= minAlert) {
        statusColor = 'Color-Bg-orange';
        statusText = 'وشك على النفاذ';
      }

      // ✅ الوحدات والأسعار - عرض سعر التجزئة (retailPrice)
      let unitsHtml = '';
      units.forEach((unit, idx) => {
        const colorClass = idx === 0 ? 'Color-Bg-green' : (idx === 1 ? 'Color-Bg-orange' : 'Color-Bg-blue');
        // ✅ تغيير: unit.salePrice → unit.retailPrice
        unitsHtml += `
          <span class="unit-badge ${colorClass}">
            <span class="unit-name">${escapeHtml(unit.name)}</span>
            <span class="unit-price">&nbsp;${formatNumber(unit.retailPrice || 0)}</span>
          </span>`;
      });

      const stockHtml = formatStockDisplay(totalStock, units);
      const taxText = '15%';
      const taxColor = 'Color-Bg-green';

      const tr = document.createElement('tr');
      tr.dataset.id = productId;
      tr.innerHTML = `
        <td class="row-number">${i + 1}</td>
        <td>
          <div class="Name-Cell">
            <i class="fa-solid fa-cube ${statusColor}"></i>
            <div class="Name-Cell-info">
              <span class="name">${escapeHtml(product.name)}</span>
              <span class="code">${escapeHtml(product.code || 'ITM-' + String(i + 1).padStart(3, '0'))}</span>
            </div>
          </div>
        </td>
        <td>
          <span class="status-badge ${statusColor}">${escapeHtml(product.category || 'عام')}</span>
        </td>
        <td>${unitsHtml}</td>
        <td>${stockHtml}</td>
        <td>
          <span class="status-badge ${statusColor}">${statusText}</span>
        </td>
        <td>
          <span class="status-badge ${taxColor}">${taxText}</span>
        </td>
        <td>
          <div class="action-menu-container">
            <button class="Action-Row-Btn"><i class="fa-solid fa-ellipsis"></i></button>
            <div class="Profile-Dropdown">
              <a class="Profile-Link" onclick="event.stopPropagation(); editProduct('${productId}')">
                <i class="fa-regular fa-pen-to-square"></i> تعديل
              </a>
              <a class="Profile-Link" onclick="event.stopPropagation(); viewProductDetails('${productId}')">
                <i class="fa-solid fa-eye"></i> عرض التفاصيل
              </a>
              <a class="Profile-Link" onclick="event.stopPropagation(); hideProduct('${productId}')">
                <i class="fa-solid fa-eye-slash"></i> إخفاء
              </a>
            </div>
          </div>
        </td>`;
      tbody.appendChild(tr);
    });

    // إعادة تهيئة الجدول بعد تحميل البيانات
    if (window.productsFilter) {
      window.productsFilter.reinit();
    } else if (typeof ArbahTable !== "undefined") {
      window.productsFilter = new ArbahTable("MainPerfectTable", { rowsPerPage: 15,dateColumnIndex: 2});
    }

    bindActionMenus();
    updateMetrics(products);

  } catch (error) {
    console.error("Error fetching Products:", error);
    tbody.innerHTML = `<tr><td colspan="8" class="NotFound">حدث خطأ في تحميل البيانات: ${escapeHtml(error.message)}</td></tr>`;
  }
}

// ═══════════════════════════════════════════════════════════
//    تحديث الإحصائيات
// ═══════════════════════════════════════════════════════════
function updateMetrics(products) {
  const totalItems = products.length;
  const lowStock = products.filter(p => {
    const stock = parseFloat(p.stock) || 0;
    const minAlert = parseFloat(p.minStock) || 0;
    return stock > 0 && stock <= minAlert;
  }).length;

  const inventoryValue = products.reduce((sum, p) => {
    const stock = parseFloat(p.stock) || 0;
    const units = p.units || [];
    const basePrice = units.length > 0 ? (units[0].purchasePrice || 0) : 0;
    return sum + (stock * basePrice);
  }, 0);

  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  const totalEl = document.getElementById("TotalItemsCount");
  const lowStockEl = document.getElementById("LowStockCount");
  const valueEl = document.getElementById("InventoryValue");
  const catEl = document.getElementById("CategoriesCount");

  if (totalEl) totalEl.textContent = totalItems;
  if (lowStockEl) lowStockEl.textContent = lowStock;
  if (valueEl) valueEl.textContent = `${formatNumber(inventoryValue)} ر.س`;
  if (catEl) catEl.textContent = categories.length;
}

// ═══════════════════════════════════════════════════════════
//    تعديل منتج
// ═══════════════════════════════════════════════════════════
function editProduct(id) {
  const product = allProductsData.find(p => p._id === id || p._id == id);
  if (!product) {
    ArbahToast.error("الصنف غير موجود", 3000, { title: 'خطأ !' });
    return;
  }

  currentEditingId = id;

  document.getElementById("ItemId").value = id;

  const codeInput = document.getElementById("ItemCode");
  codeInput.value = product.code || '';

  document.getElementById("ItemName").value = product.name || '';
  document.getElementById("ItemBarcode").value = product.barcode || '';
  document.getElementById("ItemCategory").value = product.category || 'electronics';
  document.getElementById("ItemStock").value = product.stock || 0;
  document.getElementById("MinStockAlert").value = product.minStock || 5;

  // ✅ جديد: تعبئة حقل الوصف لو موجود
  const descInput = document.getElementById("ItemDescription");
  if (descInput) descInput.value = product.description || '';

  // ✅ جديد: تعبئة حالة التفعيل لو موجود
  const activeInput = document.getElementById("ItemActive");
  if (activeInput) activeInput.checked = product.active !== false;

  const unitsTableBody = document.getElementById("UnitsTableBody");
  unitsTableBody.innerHTML = '';

  const units = product.units || [];
  if (units.length > 0) {
    const baseUnitName = units[0]?.name || 'قطعة';
    units.forEach((unit, index) => {
      const isBase = index === 0;
      const factor = isBase ? '1' : (unit.conversionFactor || '');
      // ✅ تغيير: unit.salePrice → unit.retailPrice
      // ✅ جديد: wholesalePrice, vipPrice
      addUnitRow(
        unit.name,
        unit.purchasePrice,
        unit.retailPrice,      // ✅ تغيير
        unit.wholesalePrice,   // ✅ جديد
        unit.vipPrice,         // ✅ جديد
        factor,
        isBase,
        baseUnitName
      );
    });
  } else {
    addUnitRow('', '', '', '', '', '', true, 'قطعة');
  }

  document.getElementById("PopupTitle").textContent = "تعديل بيانات الصنف";
  document.getElementById("PopupSubtitle").textContent = `تعديل بيانات: ${product.name}`;

  openPopUpWindow('AddNewPopup');
}

// ═══════════════════════════════════════════════════════════
//    عرض تفاصيل المنتج
// ═══════════════════════════════════════════════════════════
function viewProductDetails(id) {
  const product = allProductsData.find(p => p._id === id || p._id == id);
  if (!product) return;

  const units = product.units || [];
  const stock = parseFloat(product.stock) || 0;
  const minAlert = parseFloat(product.minStock) || 0;

  document.getElementById("DetailsCode").textContent = product.code || 'ITM-001';
  document.getElementById("DetailsCodeLabel").textContent = product.code || 'ITM-001';
  document.getElementById("DetailsName").textContent = product.name || '-';
  document.getElementById("DetailsBarcode").textContent = '-';
  document.getElementById("DetailsCategory").textContent = product.category || 'عام';
  document.getElementById("DetailsTax").textContent = 'خاضع للضريبة 15%';

  // ✅ جديد: عرض الوصف لو موجود
  const descEl = document.getElementById("DetailsDescription");
  if (descEl) descEl.textContent = product.description || '-';

  const unitsSection = document.getElementById("DetailsUnits");
  if (unitsSection) {
    let unitsHtml = '';
    units.forEach((unit, idx) => {
      const colorClass = idx === 0 ? 'Color-Bg-blue' : (idx === 1 ? 'Color-Bg-green' : 'Color-Bg-orange');
      // ✅ تغيير: عرض كل الأسعار (تجزئة + جملة + VIP)
      unitsHtml += `
        <div class="unit-detail-row" style="margin-bottom:8px;">
          <span class="unit-badge ${colorClass}">${escapeHtml(unit.name)}</span>
          <div style="margin-top:4px; font-size:12px; color:#666;">
            <span>تجزئة: ${formatNumber(unit.retailPrice || 0)} ريال</span>
            ${unit.wholesalePrice ? ` | <span>جملة: ${formatNumber(unit.wholesalePrice)} ريال</span>` : ''}
            ${unit.vipPrice ? ` | <span>VIP: ${formatNumber(unit.vipPrice)} ريال</span>` : ''}
          </div>
        </div>`;
    });
    unitsSection.innerHTML = unitsHtml || '<span class="unit-badge Color-Bg-gray">لا توجد وحدات</span>';
  }

  document.getElementById("DetailsOpeningStock").textContent = formatNumber(product.stock || 0);
  document.getElementById("DetailsMinAlert").textContent = formatNumber(minAlert);
  document.getElementById("DetailsStock").textContent = formatNumber(stock);

  // ✅ جديد: عرض الحالة (مفعل/معطل)
  const statusEl = document.getElementById("DetailsStatus");
  if (statusEl) {
    const isActive = product.active !== false;
    statusEl.innerHTML = `<span class="status-badge ${isActive ? 'Color-Bg-green' : 'Color-Bg-red'}">${isActive ? 'مفعل' : 'معطل'}</span>`;
  }

  openPopUpWindow('DetailsPopup');
}

// ═══════════════════════════════════════════════════════════
//    إخفاء منتج (Soft Delete)
// ═══════════════════════════════════════════════════════════
async function hideProduct(id) {
  const ok = await ArbahToast.confirm("هل تريد إخفاء الصنف؟ (لن يظهر في القائمة لكن بياناته محفوظة)",
    { title: "اخفاء", confirmText: "اخفاء", cancelText: "إلغاء" }
  ); if (!ok) return;

  try {
    const response = await fetch("/api/Products/hide/" + id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" }
    });
    const result = await response.json();

    if (result.success) {
      ArbahToast.success("تم إخفاء الصنف بنجاح", 3000, { title: 'تم!' });
      getProducts();
    } else {
      ArbahToast.error(result.message || "حدث خطأ", 3000, { title: 'خطأ !' });
    }
  } catch (error) {
    console.error("Error hiding Product:", error);
    ArbahToast.error("حدث خطأ في الاتصال", 3000, { title: 'خطأ !' });
  }
}

// ═══════════════════════════════════════════════════════════
//    إظهار منتج مخفي
// ═══════════════════════════════════════════════════════════
async function restoreProduct(id) {
  const ok = await ArbahToast.confirm("هل تريد إظهار الصنف؟");
  if (!ok) return;

  try {
    const response = await fetch("/api/Products/restore/" + id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" }
    });
    const result = await response.json();

    if (result.success) {
      ArbahToast.success("تم إظهار الصنف بنجاح", 3000, { title: 'تم!' });
      getProducts();
    } else {
      ArbahToast.error(result.message || "حدث خطأ", 3000, { title: 'خطأ !' });
    }
  } catch (error) {
    console.error("Error restoring Product:", error);
    ArbahToast.error("حدث خطأ في الاتصال", 3000, { title: 'خطأ !' });
  }
}

// ═══════════════════════════════════════════════════════════
//    جلب الكود التالي تلقائياً
// ═══════════════════════════════════════════════════════════
async function fetchNextCode() {
  try {
    const response = await fetch("/api/Products/next-code");
    const result = await response.json();

    if (result.success && result.data && result.data.nextCode) {
      const codeInput = document.getElementById("ItemCode");
      if (codeInput && !codeInput.value) {
        codeInput.value = result.data.nextCode;
      }
    }
  } catch (error) {
    console.error("Error fetching next code:", error);
    // Fallback: generate locally
    generateProductCodeLocal();
  }
}

// ═══════════════════════════════════════════════════════════
//    إعادة تعيين النموذج
// ═══════════════════════════════════════════════════════════
function resetForm() {
  const form = document.getElementById("ItemForm");
  if (form) form.reset();

  const itemId = document.getElementById("ItemId");
  if (itemId) itemId.value = "";

  currentEditingId = null;

  const popupTitle = document.getElementById("PopupTitle");
  const popupSubtitle = document.getElementById("PopupSubtitle");
  if (popupTitle) popupTitle.textContent = "إضافة صنف جديد";
  if (popupSubtitle) popupSubtitle.textContent = "أدخل بيانات الصنف والوحدات والأسعار";

  const unitsTableBody = document.getElementById("UnitsTableBody");
  if (unitsTableBody) {
    unitsTableBody.innerHTML = '';
    // ✅ تغيير: إضافة 5 قيم فارغة للأسعار الجديدة
    addUnitRow('', '', '', '', '', '', true, 'قطعة');
  }

  // جلب الكود التالي
  fetchNextCode();

  const popup = document.querySelector("#AddNewPopup .PopUp-Window");
  if (popup) {
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.top = '50%';
    popup.style.left = '50%';
  }
}

// ═══════════════════════════════════════════════════════════
//    توليد كود المنتج محلياً
// ═══════════════════════════════════════════════════════════
function generateProductCodeLocal() {
  const count = allProductsData.length + 1;
  const code = "ITM-" + String(count).padStart(3, '0');
  const codeInput = document.getElementById("ItemCode");
  if (codeInput) codeInput.value = code;
}

// ═══════════════════════════════════════════════════════════
//    دوال مساعدة
// ═══════════════════════════════════════════════════════════
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
//    تحميل المنتجات عند بدء التشغيل
// ═══════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", function () {
  getProducts();
});


// ═══════════════════════════════════════════════════════════
//    تنسيق عرض المخزون
// ═══════════════════════════════════════════════════════════
function formatStockDisplay(totalStock, units) {
  const stock = parseFloat(totalStock) || 0;

  if (!units || units.length === 0) {
    return `<span class="unit-badge Color-Bg-green"><span class="unit-name">${formatNumber(stock)}</span><span class="unit-price">&nbsp;قطعة</span></span>`;
  }

  if (units.length === 1) {
    return `<span class="unit-badge Color-Bg-green"><span class="unit-name">${formatNumber(stock)}</span><span class="unit-price">&nbsp;${escapeHtml(units[0].name)}</span></span>`;
  }

  const sortedUnits = [...units].sort((a, b) => (b.conversionFactor || 1) - (a.conversionFactor || 1));

  let remaining = stock;
  let html = '';

  for (let i = 0; i < sortedUnits.length; i++) {
    const unit = sortedUnits[i];
    const factor = parseFloat(unit.conversionFactor) || 1;

    if (remaining <= 0) break;

    const count = Math.floor(remaining / factor);
    remaining = remaining % factor;

    if (count > 0) {
      const colorClass = i === 0 ? 'Color-Bg-green' : (i === 1 ? 'Color-Bg-orange' : 'Color-Bg-blue');
      html += `<span class="unit-badge ${colorClass}"><span class="unit-name">${count}</span><span class="unit-price">&nbsp;${escapeHtml(unit.name)}</span></span>`;
    }
  }

  if (remaining > 0) {
    const baseUnit = units[0];
    html += `<span class="unit-badge Color-Bg-red"><span class="unit-name">${remaining}</span><span class="unit-price">&nbsp;${escapeHtml(baseUnit.name)}</span></span>`;
  }

  return html || `<span class="unit-badge Color-Bg-gray"><span class="unit-name">0</span></span>`;
}


// ═══════════════════════════════════════════════════════════
//    إضافة صف وحدة جديدة
// ═══════════════════════════════════════════════════════════
function addUnitRow(name, purchasePrice, retailPrice, wholesalePrice, vipPrice, conversionFactor, isDefault, baseUnitName) {
  name = name || '';
  purchasePrice = purchasePrice || '';
  // ✅ تغيير: salePrice → retailPrice
  retailPrice = retailPrice || '';
  // ✅ جديد: سعر الجملة
  wholesalePrice = wholesalePrice || '';
  // ✅ جديد: سعر VIP
  vipPrice = vipPrice || '';
  conversionFactor = conversionFactor || '';
  isDefault = isDefault !== false;
  baseUnitName = baseUnitName || '';

  const tbody = document.getElementById("UnitsTableBody");
  const rowCount = tbody.querySelectorAll("tr").length;

  const isFirstRow = rowCount === 0;
  const isBaseUnit = isFirstRow;

  let baseName = baseUnitName;
  if (!baseName && isBaseUnit) {
    baseName = name || 'قطعة';
  } else if (!baseName) {
    const firstRow = tbody.querySelector("tr");
    if (firstRow) {
      const firstNameInput = firstRow.querySelector("td:first-child .unit-input");
      baseName = firstNameInput ? firstNameInput.value : 'قطعة';
    } else {
      baseName = 'قطعة';
    }
  }

  const tr = document.createElement('tr');

  let baseUnitHtml;
  if (isBaseUnit) {
    baseUnitHtml = `<span class="status-badge Color-Bg-green">أساسية</span>`;
  } else {
    baseUnitHtml = `<span class="status-badge Color-Bg-blue">${escapeHtml(baseName)}</span>`;
  }

  const factorValue = isBaseUnit ? '1' : conversionFactor;

  // ✅ تغيير: إضافة عمودين جديدين (سعر الجملة + سعر VIP)
  tr.innerHTML = `
    <td>
      <div class="Field">
        <div class="input"><input type="text" class="unit-input" placeholder="اسم الوحدة" value="${escapeHtml(name)}"><i class="fa fa-file-lines"></i></div>
      </div>
    </td>
    <td>
      <div class="Field">
        <div class="input"><input type="number" class="unit-input" placeholder="0.00" value="${purchasePrice}"><i class="fa fa-file-lines"></i></div>
      </div>
    </td>
    <td>
      <div class="Field">
        <div class="input"><input type="number" class="unit-input" placeholder="0.00" value="${retailPrice}"><i class="fa fa-file-lines"></i></div>
      </div>
    </td>
    <td>
      <div class="Field">
        <div class="input"><input type="number" class="unit-input" placeholder="0.00" value="${wholesalePrice}"><i class="fa fa-file-lines"></i></div>
      </div>
    </td>
    <td>
      <div class="Field">
        <div class="input"><input type="number" class="unit-input" placeholder="0.00" value="${vipPrice}"><i class="fa fa-file-lines"></i></div>
      </div>
    </td>
    <td>
      <div class="Field">
        <div class="input"><input type="number" class="unit-input" placeholder="الكمية " value="${factorValue}" ${isBaseUnit ? 'disabled' : ''}><i class="fa fa-file-lines"></i></div>
      </div>
    </td>
    <td>${baseUnitHtml}</td>
    <td>
      <button type="button" class="btn-remove-unit" onclick="removeUnitRow(this)"><i class="fa fa-trash"></i></button>
    </td>`;

  tbody.appendChild(tr);
}

// ═══════════════════════════════════════════════════════════
//    حذف صف وحدة
// ═══════════════════════════════════════════════════════════
function removeUnitRow(btn) {
  const tbody = document.getElementById("UnitsTableBody");
  const rows = tbody.querySelectorAll("tr");

  if (rows.length <= 1) {
    ArbahToast.warning("يجب الاحتفاظ بوحدة واحدة على الأقل", 3000, { title: 'تنبيه!' });
    return;
  }

  btn.closest('tr').remove();

  const remainingRows = tbody.querySelectorAll("tr");
  const firstNameInput = remainingRows[0] ? remainingRows[0].querySelector("td:first-child .unit-input") : null;
  const baseUnitName = firstNameInput ? firstNameInput.value : 'قطعة';

  remainingRows.forEach((row, index) => {
    const baseCell = row.querySelector('td:nth-child(7)'); // ✅ تغيير: العمود 7 بدل 5
    const factorInput = row.querySelector('td:nth-child(6) .unit-input'); // ✅ تغيير: العمود 6 بدل 4

    if (baseCell) {
      if (index === 0) {
        baseCell.innerHTML = `<span class="status-badge Color-Bg-green">أساسية</span>`;
        if (factorInput) {
          factorInput.value = '1';
          factorInput.setAttribute('disabled', 'true');
        }
      } else {
        baseCell.innerHTML = `<span class="status-badge Color-Bg-blue">${escapeHtml(baseUnitName)}</span>`;
        if (factorInput) factorInput.removeAttribute('disabled');
      }
    }
  });
}