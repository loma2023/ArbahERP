// ═══════════════════════════════════════════════════════════
//    متغيرات عامة
// ═══════════════════════════════════════════════════════════
let currentEditingId = null;
let allAssetsData = [];
let allBranchesData = []; // لتخزين بيانات الفروع

// ═══════════════════════════════════════════════════════════
//    mapping لأسماء حسابات الأصول
// ═══════════════════════════════════════════════════════════
const accountNames = {
    "110200": "أراضي",
    "110201": "مباني",
    "110202": "سيارات",
    "110203": "أثاث وتجهيزات",
    "110204": "حاسب آلي وطابعات",
    "110205": "تحسينات على المأجور",
    "110206": "آلات ومعدات"
};

const accountIcons = {
    "110200": "fa-map",
    "110201": "fa-building",
    "110202": "fa-car",
    "110203": "fa-couch",
    "110204": "fa-desktop",
    "110205": "fa-hammer",
    "110206": "fa-industry"
};

const accountColors = {
    "110200": "Color-Bg-green",
    "110201": "Color-Bg-blue",
    "110202": "Color-Bg-purple",
    "110203": "Color-Bg-orange",
    "110204": "Color-Bg-cyan",
    "110205": "Color-Bg-red",
    "110206": "Color-Bg-yellow"
};

const methodNames = {
    "straight": "القسط الثابت",
    "declining": "القيمة المتناقصة",
    "units": "وحدات الإنتاج"
};

const assetTypeNames = {
    "new": "أصل جديد",
    "existing": "أصل موجود"
};

const paymentMethodNames = {
    "cash": "الصندوق",
    "bank": "البنك",
    "credit": "دائنون"
};

// ═══════════════════════════════════════════════════════════
//    جلب الفروع من السيرفر (لـ SelectOption)
// ═══════════════════════════════════════════════════════════
async function loadBranches() {
    try {
        const response = await fetch("/api/Branches");
        if (!response.ok) throw new Error("Failed to load branches");

        const result = await response.json();
        if (result.success) {
            allBranchesData = result.data || [];
            populateBranchSelect();
        }
    } catch (error) {
        console.error("Error loading branches:", error);
        // fallback: static branches
        allBranchesData = [
            { _id: "main", name: "الفرع الرئيسي", code: "BR-00001" },
            { _id: "riyadh", name: "فرع الرياض", code: "BR-00002" },
            { _id: "jeddah", name: "فرع جدة", code: "BR-00003" }
        ];
        populateBranchSelect();
    }
}

// ═══════════════════════════════════════════════════════════
//    تعبئة قائمة الفروع في SelectOption
// ═══════════════════════════════════════════════════════════
function populateBranchSelect() {
    const dropdown = document.querySelector('[data-select="branch"] .select-content');
    if (!dropdown) return;

    dropdown.innerHTML = "";

    allBranchesData.forEach(branch => {
        const item = document.createElement("div");
        item.className = "select-item";
        item.dataset.value = branch._id;
        item.innerHTML = `
            <div class="select-item-info">
                <span class="select-item-name">${escapeHtml(branch.name)}</span>
                <span class="select-item-code">${escapeHtml(branch.code || '')}</span>
            </div>
        `;
        item.addEventListener("click", function () {
            const field = this.closest('[data-select="branch"]');
            const searchInput = field.querySelector('.select-search');
            const hiddenInput = field.querySelector('.select-value');

            searchInput.value = branch.name;
            hiddenInput.value = branch._id;

            dropdown.closest('.SelectOptionDropdown').classList.remove('active');
        });
        dropdown.appendChild(item);
    });
}

// ═══════════════════════════════════════════════════════════
//    تبديل ظهور/إخفاء قسم الدفع حسب نوع الأصل
// ═══════════════════════════════════════════════════════════
function togglePaymentSection() {
    const assetType = document.getElementById("AssetType")?.value;
    const paymentSection = document.getElementById("PaymentSection");
    const paymentMethod = document.getElementById("PaymentMethod");

    if (paymentSection) {
        if (assetType === "new") {
            paymentSection.style.display = "block";
            if (paymentMethod) paymentMethod.setAttribute("required", "required");
            updatePaymentAccount();
        } else {
            paymentSection.style.display = "none";
            if (paymentMethod) paymentMethod.removeAttribute("required");
        }
    }
}

// ═══════════════════════════════════════════════════════════
//    تحديث حقول الدفع حسب طريقة الدفع المختارة
// ═══════════════════════════════════════════════════════════
function updatePaymentAccount() {
    const method = document.getElementById("PaymentMethod")?.value;

    // Get the field containers
    const cashboxField = document.querySelector('[data-select="cashboxes"]');
    const bankField = document.querySelector('[data-select="Banks"]');
    const supplierField = document.querySelector('[data-select="supplier"]');

    // Hide all first
    if (cashboxField) cashboxField.style.display = "none";
    if (bankField) bankField.style.display = "none";
    if (supplierField) supplierField.style.display = "none";

    // Show the appropriate field based on payment method
    if (method === "cash") {
        if (cashboxField) {
            cashboxField.style.display = "block";
            // Initialize SelectOption for cashboxes if not already done
            initSelectOptionIfNeeded(cashboxField, "cashboxes");
        }
    } else if (method === "bank") {
        if (bankField) {
            bankField.style.display = "block";
            // Initialize SelectOption for Banks if not already done
            initSelectOptionIfNeeded(bankField, "Banks");
        }
    } else if (method === "credit") {
        if (supplierField) {
            supplierField.style.display = "block";
            // Initialize SelectOption for supplier if not already done
            initSelectOptionIfNeeded(supplierField, "supplier");
        }
    }
}

// ═══════════════════════════════════════════════════════════
//    Initialize SelectOption if not already initialized
// ═══════════════════════════════════════════════════════════
function initSelectOptionIfNeeded(field, entityType) {
    // Check if already initialized by SelectManager
    if (field.dataset.selectInitialized) return;

    // If SelectManager exists, use it
    if (window.selectManager) {
        const instance = window.selectManager.init(field);
        if (instance) {
            instance.loadData();
            field.dataset.selectInitialized = "true";
        }
    }
}

// ═══════════════════════════════════════════════════════════
//    جلب كود الحساب المحاسبي من SelectOption
// ═══════════════════════════════════════════════════════════
function getPaymentAccountCode() {
    const method = document.getElementById("PaymentMethod")?.value;
    let accountCode = null;
    let entityId = null;

    if (method === "cash") {
        const field = document.querySelector('[data-select="cashboxes"]');
        if (field) {
            const hiddenInput = field.querySelector('.select-value');
            entityId = hiddenInput ? hiddenInput.value : null;
            accountCode = hiddenInput ? hiddenInput.getAttribute('AccountCode') : null;
        }
    } else if (method === "bank") {
        const field = document.querySelector('[data-select="Banks"]');
        if (field) {
            const hiddenInput = field.querySelector('.select-value');
            entityId = hiddenInput ? hiddenInput.value : null;
            accountCode = hiddenInput ? hiddenInput.getAttribute('AccountCode') : null;
        }
    } else if (method === "credit") {
        const field = document.querySelector('[data-select="supplier"]');
        if (field) {
            const hiddenInput = field.querySelector('.select-value');
            entityId = hiddenInput ? hiddenInput.value : null;
            accountCode = hiddenInput ? hiddenInput.getAttribute('AccountCode') : null;
        }
    }

    return { method, accountCode, entityId };
}

// ═══════════════════════════════════════════════════════════
//    تعيين قيمة SelectOption programmatically
// ═══════════════════════════════════════════════════════════
function setSelectOptionValue(fieldSelector, value, displayText) {
    const field = document.querySelector(fieldSelector);
    if (!field) return;

    const searchInput = field.querySelector('.select-search');
    const hiddenInput = field.querySelector('.select-value');

    if (searchInput) searchInput.value = displayText || "";
    if (hiddenInput) hiddenInput.value = value || "";
}

// ═══════════════════════════════════════════════════════════
//    مسح قيمة SelectOption
// ═══════════════════════════════════════════════════════════
function clearSelectOption(fieldSelector) {
    const field = document.querySelector(fieldSelector);
    if (!field) return;

    const searchInput = field.querySelector('.select-search');
    const hiddenInput = field.querySelector('.select-value');

    if (searchInput) searchInput.value = "";
    if (hiddenInput) {
        hiddenInput.value = "";
        hiddenInput.removeAttribute('AccountCode');
    }
}

// ═══════════════════════════════════════════════════════════
//    حفظ أصل جديد أو تعديل موجود
// ═══════════════════════════════════════════════════════════
async function saveAsset() {
    const assetId = document.getElementById("AssetId")?.value;

    // جلب قيمة الفرع من hidden input بتاع SelectOption
    const branchField = document.querySelector('[data-select="branch"]');
    const branchHiddenInput = branchField ? branchField.querySelector('.select-value') : null;
    const branchValue = branchHiddenInput ? branchHiddenInput.value : "";

    const assetType = document.getElementById("AssetType")?.value || "new";

    const asset = {
        code: document.getElementById("AssetCode")?.value?.trim() || "",
        name: document.getElementById("AssetName")?.value?.trim() || "",
        assetType: assetType,
        assetAccountCode: document.getElementById("AssetAccount")?.value || "",
        branch: branchValue || null,
        originalValue: Number(document.getElementById("AssetOriginalValue")?.value) || 0,
        purchaseDate: document.getElementById("AssetPurchaseDate")?.value || null,
        depreciationRate: Number(document.getElementById("AssetDepreciationRate")?.value) || 10,
        depreciationMethod: document.getElementById("DepreciationMethod")?.value || "straight",
        notes: document.getElementById("AssetNotes")?.value?.trim() || ""
    };

    // ── إضافة بيانات الدفع للأصول الجديدة ──
    if (assetType === "new") {
        asset.paymentMethod = document.getElementById("PaymentMethod")?.value || "bank";
        const paymentInfo = getPaymentAccountCode();

        if (!paymentInfo.accountCode) {
            ArbahToast.warning("يرجى اختيار حساب الدفع المناسب", 4000, { title: "خلي بالك !!" });
            return;
        }

        asset.paymentAccountCode = paymentInfo.accountCode;
        asset.paymentEntityId = paymentInfo.entityId;
    }

    // ── التحقق من البيانات ──
    if (!asset.code) {
        ArbahToast.warning("يرجى إدخال كود الأصل", 4000, { title: "خلي بالك !!" });
        return;
    }
    if (!asset.name) {
        ArbahToast.warning("يرجى إدخال اسم الأصل", 4000, { title: "خلي بالك !!" });
        return;
    }
    if (!asset.assetAccountCode) {
        ArbahToast.warning("يرجى اختيار حساب الأصل", 4000, { title: "خلي بالك !!" });
        return;
    }
    if (asset.originalValue <= 0) {
        ArbahToast.warning("القيمة الأصلية يجب أن تكون أكبر من صفر", 4000, { title: "خلي بالك !!" });
        return;
    }

    let url = "/api/FixedAssets/create";
    let method = "POST";

    if (assetId) {
        url = `/api/FixedAssets/${assetId}`;
        method = "PUT";
        delete asset.code; // ما نبعتش الكود في التعديل
    }

    try {
        const response = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(asset)
        });

        const result = await response.json();

        if (result.success) {
            const msg = assetId 
                ? "تم تعديل الأصل بنجاح" 
                : (assetType === "new" 
                    ? "تم إضافة الأصل وإنشاء قيد الشراء بنجاح" 
                    : "تم إضافة الأصل وإنشاء القيد الافتتاحي بنجاح");

            ArbahToast.success(msg, 4000, { title: "تم!" });
            closePopUpWindow("AddNewPopup");
            resetAssetForm();
            getAssets();
        } else {
            ArbahToast.error(result.message || "حدث خطأ", 4000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error saving asset:", error);
        ArbahToast.error("حدث خطأ في الاتصال بالخادم", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    جلب الأصول وعرضها
// ═══════════════════════════════════════════════════════════
async function getAssets() {
    const tbody = document.querySelector("#AssetsTable");
    if (!tbody) {
        console.error("AssetsTable tbody not found!");
        return;
    }

    tbody.innerHTML = `<tr><td colspan="11" class="NotFound">جاري التحميل...</td></tr>`;

    try {
        const [assetsRes, statsRes] = await Promise.all([
            fetch("/api/FixedAssets"),
            fetch("/api/FixedAssets/stats")
        ]);

        if (!assetsRes.ok) throw new Error("HTTP error! status: " + assetsRes.status);

        const assetsResult = await assetsRes.json();
        const statsResult = await statsRes.json();

        if (!assetsResult.success) {
            throw new Error(assetsResult.message || "Server returned error");
        }

        const assets = assetsResult.data || [];
        allAssetsData = assets;
        tbody.innerHTML = "";

        // تحديث الإحصائيات
        if (statsResult.success) {
            updateMetrics(statsResult.data);
        }

        if (assets.length === 0) {
            tbody.innerHTML = `<tr><td colspan="11" class="NotFound">لا يوجد أصول ثابتة</td></tr>`;
            return;
        }

        assets.forEach((asset, i) => {
            const assetId = asset._id;
            const accCode = asset.assetAccountCode || "";
            const accName = accountNames[accCode] || accCode;
            const accIcon = accountIcons[accCode] || "fa-box";
            const accColor = accountColors[accCode] || "Color-Bg-blue";

            // اسم الفرع من populate أو fallback
            const branchName = asset.branch?.name || "-";

            const statusBadge = asset.isActive
                ? `<span class="status-badge Color-Bg-green">نشط</span>`
                : `<span class="status-badge Color-Bg-red">غير نشط</span>`;

            const bookValueClass = asset.bookValue > 0 ? "Color-Bg-blue" : "Color-Bg-red";

            const tr = document.createElement("tr");
            tr.dataset.id = assetId;
            tr.innerHTML = `
                <td class="row-number">${i + 1}</td>
                <td>
                    <div class="Name-Cell">
                        <i class="fa-solid ${accIcon} ${accColor}"></i>
                        <div class="Name-Cell-info">
                            <span class="name">${escapeHtml(asset.name)}</span>
                            <span class="code">${escapeHtml(asset.code)}</span>
                        </div>
                    </div>
                </td>
                <td>${formatDate(asset.purchaseDate)}</td>
                <td><span class="status-badge ${accColor}">${escapeHtml(accName)}</span></td>
                <td>${escapeHtml(branchName)}</td>
                <td>${formatCurrency(asset.originalValue)}</td>
                <td>${formatCurrency(asset.accumulatedDepreciation)}</td>
                <td><span class="status-badge ${bookValueClass}">${formatCurrency(asset.bookValue)}</span></td>
                <td><span class="status-badge Color-Bg-purple">${asset.depreciationRate}% سنوي</span></td>
                <td>${statusBadge}</td>
                <td>
                    <div class="action-menu-container">
                        <button class="Action-Row-Btn"><i class="fa-solid fa-ellipsis"></i></button>
                        <div class="Profile-Dropdown">
                            <a class="Profile-Link" onclick="event.stopPropagation(); editAsset('${assetId}')">
                                <i class="fa-regular fa-pen-to-square"></i> تعديل
                            </a>
                            <a class="Profile-Link" onclick="event.stopPropagation(); viewAssetDetails('${assetId}')">
                                <i class="fa-solid fa-eye"></i> عرض التفاصيل
                            </a>
                            <a class="Profile-Link" onclick="event.stopPropagation(); calculateDepreciation('${assetId}')">
                                <i class="fa-solid fa-calculator"></i> حساب الإهلاك
                            </a>
                            <a class="Profile-Link" onclick="event.stopPropagation(); recordAssetDepreciation('${assetId}')">
                                <i class="fa-solid fa-file-invoice"></i> تسجيل إهلاك
                            </a>
                            <div class="Separator"></div>
                            <a class="Profile-Link" onclick="event.stopPropagation(); hideAsset('${assetId}')">
                                <i class="fa-solid fa-eye-slash"></i> إخفاء
                            </a>
                        </div>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // إعادة تهيئة الجدول
        if (window.assetsFilter) {
            window.assetsFilter.reinit();
        } else if (typeof ArbahTable !== "undefined") {
            window.assetsFilter = new ArbahTable("MainPerfectTable", { rowsPerPage: 15, dateColumnIndex: 2 });
        }

        bindActionMenus();
        updateShowingMetrics(assets.length);

    } catch (error) {
        console.error("Error fetching assets:", error);
        tbody.innerHTML = `<tr><td colspan="11" class="NotFound">حدث خطأ في تحميل البيانات: ${escapeHtml(error.message)}</td></tr>`;
    }
}

// ═══════════════════════════════════════════════════════════
//    تحديث الإحصائيات
// ═══════════════════════════════════════════════════════════
function updateMetrics(stats) {
    const totalEl = document.getElementById("TotalAssets");
    const activeEl = document.getElementById("ActiveAssets");
    const originalEl = document.getElementById("TotalOriginalValue");
    const depreciationEl = document.getElementById("TotalDepreciation");
    const netEl = document.getElementById("NetBookValue");

    if (totalEl) totalEl.textContent = stats.total || 0;
    if (activeEl) activeEl.textContent = stats.active || 0;
    if (originalEl) originalEl.textContent = formatCurrency(stats.totalOriginalValue || 0);
    if (depreciationEl) depreciationEl.textContent = formatCurrency(stats.totalAccumulatedDepreciation || 0);
    if (netEl) netEl.textContent = formatCurrency(stats.totalBookValue || 0);
}

function updateShowingMetrics(count) {
    const el = document.getElementById("showingDataMetrics");
    if (el) el.textContent = `عرض ${count} من ${count}`;
}

// ═══════════════════════════════════════════════════════════
//    ✅ جلب الكود التالي تلقائياً
// ═══════════════════════════════════════════════════════════
async function fetchNextCode() {
    try {
        const response = await fetch("/api/FixedAssets/next-code");
        const result = await response.json();

        if (result.success && result.data && result.data.nextCode) {
            const codeInput = document.getElementById("AssetCode");
            if (codeInput && !codeInput.value) {
                codeInput.value = result.data.nextCode;
            }
        }
    } catch (error) {
        console.error("Error fetching next code:", error);
        generateAssetCodeLocal();
    }
}

// ═══════════════════════════════════════════════════════════
//    توليد كود محلي (fallback)
// ═══════════════════════════════════════════════════════════
function generateAssetCodeLocal() {
    const count = allAssetsData.length + 1;
    const code = "AST-" + String(count).padStart(3, "0");
    const codeInput = document.getElementById("AssetCode");
    if (codeInput) codeInput.value = code;
}

// ═══════════════════════════════════════════════════════════
//    تعديل أصل
// ═══════════════════════════════════════════════════════════
function editAsset(id) {
    const asset = allAssetsData.find(a => a._id === id || a._id == id);
    if (!asset) {
        ArbahToast.error("الأصل غير موجود", 3000, { title: "خطأ !" });
        return;
    }

    currentEditingId = id;

    const setValue = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value !== undefined && value !== null ? value : "";
    };

    setValue("AssetId", id);
    setValue("AssetCode", asset.code);
    setValue("AssetName", asset.name);
    setValue("AssetType", asset.assetType || "new");
    setValue("AssetAccount", asset.assetAccountCode);
    setValue("AssetOriginalValue", asset.originalValue);
    setValue("AssetPurchaseDate", asset.purchaseDate ? asset.purchaseDate.split("T")[0] : "");
    setValue("AssetDepreciationRate", asset.depreciationRate);
    setValue("DepreciationMethod", asset.depreciationMethod);
    setValue("AssetNotes", asset.notes);

    // تعبئة بيانات الدفع
    if (asset.paymentMethod) {
        setValue("PaymentMethod", asset.paymentMethod);
        updatePaymentAccount(); // Show correct field

        // Set the SelectOption value based on payment method
        if (asset.paymentAccountCode && asset.paymentEntityId) {
            if (asset.paymentMethod === "cash") {
                const field = document.querySelector('[data-select="cashboxes"]');
                if (field) {
                    const hiddenInput = field.querySelector('.select-value');
                    if (hiddenInput) {
                        hiddenInput.value = asset.paymentEntityId || "";
                        hiddenInput.setAttribute('AccountCode', asset.paymentAccountCode || "");
                    }
                }
            } else if (asset.paymentMethod === "bank") {
                const field = document.querySelector('[data-select="Banks"]');
                if (field) {
                    const hiddenInput = field.querySelector('.select-value');
                    if (hiddenInput) {
                        hiddenInput.value = asset.paymentEntityId || "";
                        hiddenInput.setAttribute('AccountCode', asset.paymentAccountCode || "");
                    }
                }
            } else if (asset.paymentMethod === "credit") {
                const field = document.querySelector('[data-select="supplier"]');
                if (field) {
                    const hiddenInput = field.querySelector('.select-value');
                    if (hiddenInput) {
                        hiddenInput.value = asset.paymentEntityId || "";
                        hiddenInput.setAttribute('AccountCode', asset.paymentAccountCode || "");
                    }
                }
            }
        }
    }

    // القيمة الدفترية ومجمع الإهلاك يُحسبان تلقائياً من النظام

    // تبديل قسم الدفع
    togglePaymentSection();

    // ✅ تعبئة الفرع في SelectOption
    if (asset.branch) {
        const branchField = document.querySelector('[data-select="branch"]');
        if (branchField) {
            const searchInput = branchField.querySelector('.select-search');
            const hiddenInput = branchField.querySelector('.select-value');

            if (hiddenInput) hiddenInput.value = asset.branch._id || asset.branch;

            const branchName = asset.branch.name || getBranchNameById(asset.branch._id || asset.branch);
            if (searchInput) searchInput.value = branchName;
        }
    }

    const popupTitle = document.getElementById("PopupTitle");
    const popupSubtitle = document.getElementById("PopupSubtitle");
    if (popupTitle) popupTitle.textContent = "تعديل بيانات الأصل";
    if (popupSubtitle) popupSubtitle.textContent = "تعديل بيانات: " + asset.name;

    openPopUpWindow("AddNewPopup");
}

// ═══════════════════════════════════════════════════════════
//    جلب اسم الفرع من الـ ID
// ═══════════════════════════════════════════════════════════
function getBranchNameById(branchId) {
    const branch = allBranchesData.find(b => b._id === branchId || b._id == branchId);
    return branch ? branch.name : branchId;
}

// ═══════════════════════════════════════════════════════════
//    عرض تفاصيل الأصل
// ═══════════════════════════════════════════════════════════
function viewAssetDetails(id) {
    const asset = allAssetsData.find(a => a._id === id || a._id == id);
    if (!asset) return;

    const accCode = asset.assetAccountCode || "";
    const accName = accountNames[accCode] || accCode;
    const branchName = asset.branch?.name || getBranchNameById(asset.branch) || "-";
    const assetTypeText = assetTypeNames[asset.assetType] || (asset.assetType === "new" ? "أصل جديد" : "أصل موجود");
    const paymentText = asset.paymentMethod ? (paymentMethodNames[asset.paymentMethod] || asset.paymentMethod) : "-";

    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value || "-";
    };

    setText("DetailsCode", asset.code);
    setText("DetailsName", asset.name);
    setText("DetailsCodeLabel", asset.code);
    setText("DetailsAssetAccount", accName + " (" + accCode + ")");
    setText("DetailsBranch", branchName);
    setText("DetailsStatus", asset.isActive ? "نشط" : "غير نشط");
    setText("DetailsOriginalValue", formatCurrency(asset.originalValue));
    setText("DetailsAccumulated", formatCurrency(asset.accumulatedDepreciation));
    setText("DetailsBookValue", formatCurrency(asset.bookValue));
    setText("DetailsRate", asset.depreciationRate + "% سنوي");
    setText("DetailsMethod", methodNames[asset.depreciationMethod] || asset.depreciationMethod);
    setText("DetailsPurchaseDate", asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString("ar-SA-u-nu-latn", { year: "numeric", month: "2-digit", day: "2-digit" }) : "-");
    setText("DetailsAssetAccountCode", accCode + " - " + accName);
    setText("DetailsDepreciationAccount", "110207 - مجمع إهلاك الأصول الثابتة");
    setText("DetailsNotes", asset.notes || "لا توجد ملاحظات");

    openPopUpWindow("DetailsPopup");
}

// ═══════════════════════════════════════════════════════════
//    تسجيل إهلاك جميع الأصول (Batch Depreciation)
// ═══════════════════════════════════════════════════════════
async function recordBatchDepreciation() {
    const now = new Date();
    const monthNames = [
        "يناير", "فبراير", "مارس", "إبريل", "مايو", "يونيو",
        "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
    ];
    const monthName = monthNames[now.getMonth()];
    const year = now.getFullYear();

    const ok = await ArbahToast.confirm(
        `هل تريد تسجيل إهلاك شهر ${monthName} ${year} لجميع الأصول النشطة؟`,
        { title: "تسجيل إهلاك جماعي", confirmText: "تسجيل", cancelText: "إلغاء" }
    );
    if (!ok) return;

    try {
        const response = await fetch("/api/FixedAssets/batch-depreciation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                year: year,
                month: now.getMonth()
            })
        });

        const result = await response.json();

        if (result.success) {
            const successCount = result.data.successful.length;
            const failCount = result.data.failed.length;
            const totalAmount = result.data.totalAmount;

            let message = `تم تسجيل إهلاك ${successCount} أصل`;
            if (failCount > 0) {
                message += `، وفشل ${failCount}`;
            }
            if (totalAmount > 0) {
                message += `
إجمالي الإهلاك: ${formatCurrency(totalAmount)}`;
            }

            ArbahToast.success(message, 6000, { title: "تم تسجيل الإهلاك!" });
            getAssets(); // refresh table
        } else {
            ArbahToast.error(result.message || "حدث خطأ", 4000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error recording batch depreciation:", error);
        ArbahToast.error("حدث خطأ في الاتصال بالخادم", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    تسجيل إهلاك أصل واحد
// ═══════════════════════════════════════════════════════════
async function recordAssetDepreciation(id) {
    const asset = allAssetsData.find(a => a._id === id || a._id == id);
    if (!asset) {
        ArbahToast.error("الأصل غير موجود", 3000, { title: "خطأ !" });
        return;
    }

    const now = new Date();
    const monthNames = [
        "يناير", "فبراير", "مارس", "إبريل", "مايو", "يونيو",
        "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
    ];
    const monthName = monthNames[now.getMonth()];
    const year = now.getFullYear();

    const ok = await ArbahToast.confirm(
        `تسجيل إهلاك ${asset.name} لشهر ${monthName} ${year}؟`,
        { title: "تسجيل إهلاك", confirmText: "تسجيل", cancelText: "إلغاء" }
    );
    if (!ok) return;

    try {
        const response = await fetch(`/api/FixedAssets/${id}/depreciation-journal`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                year: year,
                month: now.getMonth()
            })
        });

        const result = await response.json();

        if (result.success) {
            const amount = result.data.journalEntry?.amount || 0;
            const entryNo = result.data.journalEntry?.entryNo || "";

            ArbahToast.success(
                `تم تسجيل إهلاك ${asset.name}
المبلغ: ${formatCurrency(amount)}
رقم القيد: ${entryNo}`,
                5000,
                { title: "تم تسجيل الإهلاك!" }
            );
            getAssets(); // refresh table
        } else {
            ArbahToast.error(result.message || "حدث خطأ", 4000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error recording asset depreciation:", error);
        ArbahToast.error("حدث خطأ في الاتصال بالخادم", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    حساب الإهلاك
// ═══════════════════════════════════════════════════════════
async function calculateDepreciation(id) {
    try {
        const response = await fetch(`/api/FixedAssets/${id}/depreciation`);
        const result = await response.json();

        if (result.success) {
            const data = result.data;
            ArbahToast.success(
                `الإهلاك السنوي: ${formatCurrency(data.annualDepreciation)}
الشهري: ${formatCurrency(data.monthlyDepreciation)}
القيمة المتبقية: ${formatCurrency(data.remainingDepreciation)}`,
                6000,
                { title: "حساب الإهلاك" }
            );
        } else {
            ArbahToast.error(result.message || "حدث خطأ", 3000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error calculating depreciation:", error);
        ArbahToast.error("حدث خطأ في الاتصال", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    إخفاء أصل (Soft Delete)
// ═══════════════════════════════════════════════════════════
async function hideAsset(id) {
    const ok = await ArbahToast.confirm(
        "هل تريد إخفاء الأصل؟ (لن يظهر في القائمة لكن بياناته محفوظة)",
        { title: "إخفاء", confirmText: "إخفاء", cancelText: "إلغاء" }
    );
    if (!ok) return;

    try {
        const response = await fetch("/api/FixedAssets/hide/" + id, {
            method: "PUT",
            headers: { "Content-Type": "application/json" }
        });
        const result = await response.json();

        if (result.success) {
            ArbahToast.success("تم إخفاء الأصل بنجاح", 3000, { title: "تم!" });
            getAssets();
        } else {
            ArbahToast.error(result.message || "حدث خطأ", 3000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error hiding asset:", error);
        ArbahToast.error("حدث خطأ في الاتصال", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    إظهار أصل مخفي
// ═══════════════════════════════════════════════════════════
async function restoreAsset(id) {
    const ok = await ArbahToast.confirm("هل تريد إظهار الأصل؟");
    if (!ok) return;

    try {
        const response = await fetch("/api/FixedAssets/restore/" + id, {
            method: "PUT",
            headers: { "Content-Type": "application/json" }
        });
        const result = await response.json();

        if (result.success) {
            ArbahToast.success("تم إظهار الأصل بنجاح", 3000, { title: "تم!" });
            getAssets();
        } else {
            ArbahToast.error(result.message || "حدث خطأ", 3000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error restoring asset:", error);
        ArbahToast.error("حدث خطأ في الاتصال", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    حذف أصل نهائي
// ═══════════════════════════════════════════════════════════
async function deleteAsset(id) {
    const ok = await ArbahToast.confirm(
        "هل تريد حذف الأصل نهائياً؟ لا يمكن التراجع عن هذا الإجراء",
        { title: "حذف نهائي", confirmText: "حذف", cancelText: "إلغاء" }
    );
    if (!ok) return;

    try {
        const response = await fetch("/api/FixedAssets/" + id, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" }
        });
        const result = await response.json();

        if (result.success) {
            ArbahToast.success("تم حذف الأصل نهائياً", 3000, { title: "تم!" });
            getAssets();
        } else {
            ArbahToast.error(result.message || "حدث خطأ", 3000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error deleting asset:", error);
        ArbahToast.error("حدث خطأ في الاتصال", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    تصدير Excel
// ═══════════════════════════════════════════════════════════
function exportAssetsExcel() {
    if (allAssetsData.length === 0) {
        ArbahToast.warning("لا يوجد بيانات للتصدير", 3000, { title: "تنبيه" });
        return;
    }

    let csv = "\uFEFFكود,الاسم,نوع الأصل,حساب الأصل,الفرع,القيمة الأصلية,مجمع الإهلاك,القيمة الدفترية,نسبة الإهلاك,الحالة,ملاحظات\n";

    allAssetsData.forEach(a => {
        const status = a.isActive ? "نشط" : "غير نشط";
        const accName = accountNames[a.assetAccountCode] || a.assetAccountCode;
        const branchName = a.branch?.name || getBranchNameById(a.branch) || "";
        const assetType = assetTypeNames[a.assetType] || (a.assetType === "new" ? "جديد" : "موجود");

        csv += `"${a.code}","${a.name}","${assetType}","${accName}","${branchName}",${a.originalValue},${a.accumulatedDepreciation},${a.bookValue},"${a.depreciationRate}%","${status}","${a.notes || ''}"\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "الأصول_الثابتة_" + new Date().toISOString().slice(0, 10) + ".csv";
    link.click();
}

// ═══════════════════════════════════════════════════════════
//    دوال مساعدة
// ═══════════════════════════════════════════════════════════
function resetAssetForm() {
    const form = document.getElementById("AssetForm");
    if (form) form.reset();

    const assetId = document.getElementById("AssetId");
    if (assetId) assetId.value = "";

    currentEditingId = null;

    // إعادة تعيين SelectOption الفرع
    const branchField = document.querySelector('[data-select="branch"]');
    if (branchField) {
        const searchInput = branchField.querySelector('.select-search');
        const hiddenInput = branchField.querySelector('.select-value');
        if (searchInput) searchInput.value = "";
        if (hiddenInput) hiddenInput.value = "";
    }

    // مسح حقول الدفع (SelectOptions)
    clearSelectOption('[data-select="cashboxes"]');
    clearSelectOption('[data-select="Banks"]');
    clearSelectOption('[data-select="supplier"]');

    // القيمة الدفترية ومجمع الإهلاك يُحسبان تلقائياً من النظام

    // إعادة تعيين نوع الأصل وإظهار قسم الدفع
    const assetType = document.getElementById("AssetType");
    if (assetType) assetType.value = "new";
    togglePaymentSection();

    const popupTitle = document.getElementById("PopupTitle");
    const popupSubtitle = document.getElementById("PopupSubtitle");
    if (popupTitle) popupTitle.textContent = "إضافة أصل ثابت جديد";
    if (popupSubtitle) popupSubtitle.textContent = "أدخل بيانات الأصل ونسبة الإهلاك";

    fetchNextCode();

    const popup = document.querySelector("#AddNewPopup .PopUp-Window");
    if (popup) {
        popup.style.transform = "translate(-50%, -50%)";
        popup.style.top = "50%";
        popup.style.left = "50%";
    }
}

function formatCurrency(value) {
    if (value === undefined || value === null) return "0 ر.س";
    return Number(value).toLocaleString("ar-SA-u-nu-latn") + " ر.س";
}

function formatDate(dateStr) {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("ar-SA-u-nu-latn", { year: "numeric", month: "2-digit", day: "2-digit" });
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
    loadBranches(); // جلب الفروع أولاً
    getAssets();    // ثم جلب الأصول
});