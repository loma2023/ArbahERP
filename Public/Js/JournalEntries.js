// ═══════════════════════════════════════════════════════════
//    JournalEntries.js — القيود اليومية
//    كل الفلترة client-side عبر ArbahTable + data-filter
// ═══════════════════════════════════════════════════════════

let currentEditingEntryId = null;
let allEntriesData = [];
let entryLineCounter = 0;

// ═══════════════════════════════════════════════════════════
//    حفظ قيد جديد أو تعديل موجود
// ═══════════════════════════════════════════════════════════
async function saveEntry() {
    const EntryId = document.getElementById("EntryId")?.value;
    const entryNo = document.getElementById("NewEntryNo")?.value?.trim();
    const entryDate = document.getElementById("NewEntryDate")?.value;
    const description = document.getElementById("NewEntryDesc")?.value?.trim() || "";
    const branchId = document.getElementById("BranchId")?.value || null;
    const costCenterId = document.getElementById("CostcenterId")?.value || null;

    const lines = collectEntryLines();

    if (!entryNo) {
        ArbahToast.warning("يرجى إدخال رقم القيد", 4000, { title: "خلي بالك !!" });
        return;
    }
    if (lines.length < 2) {
        ArbahToast.warning("يجب إدخال سطرين على الأقل في القيد", 4000, { title: "خلي بالك !!" });
        return;
    }

    const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
        ArbahToast.error(
            `القيد غير متوازن! المدين: ${formatNumber(totalDebit)} ≠ الدائن: ${formatNumber(totalCredit)}`,
            5000,
            { title: "خطأ في التوازن !" }
        );
        return;
    }

    const entryData = {
        entryNo, date: entryDate || new Date().toISOString().split("T")[0],
        description, branch: branchId, costCenter: costCenterId,
        lines, reference: entryNo
    };

    let url = "/api/JournalEntries/create";
    let method = "POST";
    if (EntryId) { url = `/api/JournalEntries/${EntryId}`; method = "PUT"; }

    try {
        const response = await fetch(url, {
            method: method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(entryData)
        });
        const result = await response.json();

        if (result.success) {
            ArbahToast.success(EntryId ? "تم تعديل القيد بنجاح" : "تم إنشاء القيد اليومي بنجاح", 4000, { title: "تم!" });
            closePopUpWindow("AddNewPopup");
            resetEntryForm();
            getJournalEntries();
        } else {
            ArbahToast.error(result.message || "حدث خطأ", 4000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error saving entry:", error);
        ArbahToast.error("حدث خطأ في الاتصال بالخادم", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    حفظ كمسودة
// ═══════════════════════════════════════════════════════════
async function saveAsDraft() {
    const entryNo = document.getElementById("NewEntryNo")?.value?.trim();
    const entryDate = document.getElementById("NewEntryDate")?.value;
    const description = document.getElementById("NewEntryDesc")?.value?.trim() || "";
    const branchId = document.getElementById("BranchId")?.value || null;
    const costCenterId = document.getElementById("CostcenterId")?.value || null;
    const lines = collectEntryLines();

    if (!entryNo) { ArbahToast.warning("يرجى إدخال رقم القيد", 4000, { title: "خلي بالك !!" }); return; }
    if (lines.length === 0) { ArbahToast.warning("يجب إدخال سطر واحد على الأقل", 4000, { title: "خلي بالك !!" }); return; }

    const entryData = {
        entryNo, date: entryDate || new Date().toISOString().split("T")[0],
        description, branch: branchId, costCenter: costCenterId,
        lines, reference: entryNo
    };

    try {
        const response = await fetch("/api/JournalEntries/draft", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(entryData)
        });
        const result = await response.json();

        if (result.success) {
            ArbahToast.success("تم حفظ القيد كمسودة بنجاح", 4000, { title: "تم!" });
            closePopUpWindow("AddNewPopup");
            resetEntryForm();
            getJournalEntries();
        } else {
            ArbahToast.error(result.message || "حدث خطأ", 4000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error saving draft:", error);
        ArbahToast.error("حدث خطأ في الاتصال بالخادم", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    حفظ وترحيل
// ═══════════════════════════════════════════════════════════
async function saveAndPostEntry() {
    const entryNo = document.getElementById("NewEntryNo")?.value?.trim();
    const entryDate = document.getElementById("NewEntryDate")?.value;
    const description = document.getElementById("NewEntryDesc")?.value?.trim() || "";
    const branchId = document.getElementById("BranchId")?.value || null;
    const costCenterId = document.getElementById("CostcenterId")?.value || null;
    const lines = collectEntryLines();

    if (!entryNo) { ArbahToast.warning("يرجى إدخال رقم القيد", 4000, { title: "خلي بالك !!" }); return; }
    if (lines.length < 2) { ArbahToast.warning("يجب إدخال سطرين على الأقل في القيد", 4000, { title: "خلي بالك !!" }); return; }

    const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
    const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.001) {
        ArbahToast.error(
            `القيد غير متوازن! المدين: ${formatNumber(totalDebit)} ≠ الدائن: ${formatNumber(totalCredit)}`,
            5000,
            { title: "خطأ في التوازن !" }
        );
        return;
    }

    const entryData = {
        entryNo, date: entryDate || new Date().toISOString().split("T")[0],
        description, branch: branchId, costCenter: costCenterId,
        lines, reference: entryNo
    };

    try {
        const response = await fetch("/api/JournalEntries/post", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(entryData)
        });
        const result = await response.json();

        if (result.success) {
            ArbahToast.success("تم حفظ وترحيل القيد اليومي بنجاح", 4000, { title: "تم!" });
            closePopUpWindow("AddNewPopup");
            resetEntryForm();
            getJournalEntries();
        } else {
            ArbahToast.error(result.message || "حدث خطأ", 4000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error saving and posting:", error);
        ArbahToast.error("حدث خطأ في الاتصال بالخادم", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    جمع أسطر القيد
// ═══════════════════════════════════════════════════════════
function collectEntryLines() {
    const lines = [];
    document.querySelectorAll("#EntryLinesBody tr").forEach(row => {
        const accountId = row.querySelector(".select-value")?.value;
        const lineDesc = row.querySelector(".line-description")?.value?.trim() || "";
        const debitVal = parseFloat(row.querySelector(".line-debit")?.value) || 0;
        const creditVal = parseFloat(row.querySelector(".line-credit")?.value) || 0;

        if (accountId && (debitVal > 0 || creditVal > 0)) {
            lines.push({ account: accountId, description: lineDesc, debit: debitVal, credit: creditVal });
        }
    });
    return lines;
}

// ═══════════════════════════════════════════════════════════
//    جلب القيود وعرضها — بدون فلترة server-side
// ═══════════════════════════════════════════════════════════
async function getJournalEntries() {
    const tbody = document.querySelector("#JournalTableBody");
    if (!tbody) { console.error("JournalTableBody tbody not found!"); return; }

    tbody.innerHTML = `<tr><td colspan="11" class="NotFound">جاري التحميل...</td></tr>`;

    try {
        const response = await fetch(`/api/JournalEntries`);
        if (!response.ok) throw new Error("HTTP error! status: " + response.status);

        const result = await response.json();
        if (!result.success) throw new Error(result.message || "Server returned error");

        const entries = result.data || [];
        allEntriesData = entries;
        tbody.innerHTML = "";

        if (entries.length === 0) {
            tbody.innerHTML = `<tr><td colspan="11" class="NotFound">لا توجد قيود يومية</td></tr>`;
            updateMetrics([]);
            return;
        }

        entries.forEach((entry, i) => {
            const entryId = entry._id;
            const isPosted = entry.status === "posted";

            let statusBadge = isPosted
                ? `<span class="status-badge Color-Bg-green"><i class="fa-solid fa-check"></i> مرحل</span>`
                : `<span class="status-badge Color-Bg-orange"><i class="fa-solid fa-pen"></i> مسودة</span>`;

            let typeBadge = entry.type === "manual"
                ? `<span class="status-badge Color-Bg-blue">يدوي</span>`
                : entry.type === "auto"
                    ? `<span class="status-badge Color-Bg-purple">تلقائي</span>`
                    : `<span class="status-badge Color-Bg-orange">افتتاحي</span>`;

            const tr = document.createElement("tr");
            tr.dataset.id = entryId;
            // ✅ data-attributes للفلترة
            tr.dataset.date = entry.date ? new Date(entry.date).toISOString().split("T")[0] : "";
            tr.dataset.status = entry.status || "";
            tr.dataset.type = entry.type || "";
            tr.dataset.branch = entry.branch?._id || entry.branch || "";
            tr.dataset.costCenter = entry.costCenter?._id || entry.costCenter || "";

            tr.innerHTML = `
                <td class="row-number">${i + 1}</td>
                <td><span class="entry-no">${escapeHtml(entry.entryNo || "-")}</span></td>
                <td>${formatDate(entry.date)}</td>
                <td>${escapeHtml(entry.branchName || entry.branch?.name || "-")}</td>
                <td>${escapeHtml(entry.costCenterName || entry.costCenter?.name || "-")}</td>
                <td>${escapeHtml(entry.description || "-")}</td>
                <td dir="ltr" style="text-align:right;">${formatNumber(entry.totalDebit || 0)}</td>
                <td dir="ltr" style="text-align:right;">${formatNumber(entry.totalCredit || 0)}</td>
                <td>${statusBadge}</td>
                <td>${typeBadge}</td>
                <td>
                    <div class="action-menu-container">
                        <button class="Action-Row-Btn"><i class="fa-solid fa-ellipsis"></i></button>
                        <div class="Profile-Dropdown">
                            ${!isPosted ? `
                            <a class="Profile-Link" onclick="event.stopPropagation(); editEntry('${entryId}')">
                                <i class="fa-regular fa-pen-to-square"></i> تعديل
                            </a>
                            ` : ""}
                            <a class="Profile-Link" onclick="event.stopPropagation(); viewEntryDetails('${entryId}')">
                                <i class="fa-solid fa-eye"></i> عرض التفاصيل
                            </a>
                            ${!isPosted ? `
                            <a class="Profile-Link" onclick="event.stopPropagation(); postEntry('${entryId}')">
                                <i class="fa-solid fa-check"></i> ترحيل
                            </a>
                            ` : ""}
                            ${isPosted && entry.type === "manual" ? `
                            <a class="Profile-Link" onclick="event.stopPropagation(); unpostEntry('${entryId}')">
                                <i class="fa-solid fa-rotate-left"></i> إلغاء الترحيل
                            </a>
                            ` : ""}
                            <div class="Separator"></div>
                            <a class="Profile-Link text-danger" onclick="event.stopPropagation(); deleteEntry('${entryId}')">
                                <i class="fa-solid fa-trash"></i> حذف
                            </a>
                        </div>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // ✅ شغل ArbahTable
        if (window.journalFilter) {
            window.journalFilter.reinit();
        } else if (typeof ArbahTable !== "undefined") {
            window.journalFilter = new ArbahTable("MainPerfectTable", { rowsPerPage: 15,dateColumnIndex: 2});
        }

        bindActionMenus();
        updateMetrics(entries);

    } catch (error) {
        console.error("Error fetching entries:", error);
        tbody.innerHTML = `<tr><td colspan="11" class="NotFound">حدث خطأ في تحميل البيانات: ${escapeHtml(error.message)}</td></tr>`;
    }
}

// ═══════════════════════════════════════════════════════════
//    مسح كل الفلاتر
// ═══════════════════════════════════════════════════════════
function clearAllFilters() {
    if (window.journalFilter) {
        window.journalFilter.clearFilter();
    }
}

// ═══════════════════════════════════════════════════════════
//    تحديث الإحصائيات
// ═══════════════════════════════════════════════════════════
function updateMetrics(entries) {
    const totalEntries = entries.length;
    const postedEntries = entries.filter(e => e.status === "posted").length;
    const draftEntries = entries.filter(e => e.status === "draft").length;
    const totalDebit = entries.reduce((sum, e) => sum + (e.totalDebit || 0), 0);
    const totalCredit = entries.reduce((sum, e) => sum + (e.totalCredit || 0), 0);
    const diff = totalDebit - totalCredit;

    const totalEl = document.getElementById("TotalEntries");
    const debitEl = document.getElementById("TotalDebit");
    const creditEl = document.getElementById("TotalCredit");
    const balanceEl = document.getElementById("BalanceDiff");
    const postedEl = document.getElementById("PostedEntries");
    const draftEl = document.getElementById("DraftEntries");

    if (totalEl) totalEl.textContent = totalEntries;
    if (debitEl) debitEl.textContent = formatNumber(totalDebit) + " ر.س";
    if (creditEl) creditEl.textContent = formatNumber(totalCredit) + " ر.س";
    if (balanceEl) {
        if (Math.abs(diff) < 0.001) {
            balanceEl.textContent = "متوازن";
            balanceEl.className = "num balanced";
        } else {
            balanceEl.textContent = formatNumber(diff) + " ر.س";
            balanceEl.className = "num unbalanced";
        }
    }
    if (postedEl) postedEl.textContent = postedEntries;
    if (draftEl) draftEl.textContent = draftEntries;
}

// ═══════════════════════════════════════════════════════════
//    تعديل قيد
// ═══════════════════════════════════════════════════════════
function editEntry(id) {
    const entry = allEntriesData.find(e => e._id === id || e._id == id);
    if (!entry) { ArbahToast.error("القيد غير موجود", 3000, { title: "خطأ !" }); return; }
    if (entry.status === "posted") { ArbahToast.warning("لا يمكن تعديل قيد مرحل", 3000, { title: "تنبيه" }); return; }

    currentEditingEntryId = id;

    const setValue = (id, value) => { const el = document.getElementById(id); if (el) el.value = value || ""; };
    setValue("EntryId", id);
    setValue("NewEntryNo", entry.entryNo);
    setValue("NewEntryDate", entry.date ? new Date(entry.date).toISOString().split("T")[0] : "");
    setValue("NewEntryDesc", entry.description);

    const popupTitle = document.getElementById("PopupTitle");
    const popupSubtitle = document.getElementById("PopupSubtitle");
    if (popupTitle) popupTitle.textContent = "تعديل قيد يومي";
    if (popupSubtitle) popupSubtitle.textContent = "تعديل قيد: " + entry.entryNo;

    loadEntryLinesForEdit(id);
    openPopUpWindow("AddNewPopup");
}

// ═══════════════════════════════════════════════════════════
//    تحميل أسطر القيد للتعديل
// ═══════════════════════════════════════════════════════════
async function loadEntryLinesForEdit(entryId) {
    try {
        const response = await fetch(`/api/JournalEntries/${entryId}`);
        const result = await response.json();
        if (!result.success || !result.data) return;

        const entry = result.data;
        const tbody = document.getElementById("EntryLinesBody");
        if (!tbody) return;

        tbody.innerHTML = "";
        entryLineCounter = 0;

        if (entry.lines && entry.lines.length > 0) {
            entry.lines.forEach(line => addEntryLine(line));
        } else {
            addEntryLine();
            addEntryLine();
        }
        updateTotalsBar();

        if (window.selectManager) {
            window.selectManager.initAll(document.getElementById("EntryLinesBody"));
        }

    } catch (error) { console.error("Error loading entry lines:", error); }
}

// ═══════════════════════════════════════════════════════════
//    عرض تفاصيل القيد
// ═══════════════════════════════════════════════════════════
async function viewEntryDetails(id) {
    try {
        const response = await fetch(`/api/JournalEntries/${id}`);
        const result = await response.json();
        if (!result.success || !result.data) {
            ArbahToast.error("القيد غير موجود", 3000, { title: "خطأ !" });
            return;
        }

        const entry = result.data;
        const setText = (id, value) => { const el = document.getElementById(id); if (el) el.textContent = value || "-"; };

        setText("DetailsCode", entry.entryNo);
        setText("ViewEntryNo", entry.entryNo);
        setText("ViewEntryDate", formatDate(entry.date));
        setText("ViewEntryStatus", entry.status === "posted" ? "مرحل" : "مسودة");
        setText("ViewEntryType", entry.type === "manual" ? "يدوي" : entry.type === "auto" ? "تلقائي" : "افتتاحي");
        setText("ViewBranch", entry.branchName || entry.branch?.name || "-");
        setText("ViewCostCenter", entry.costCenterName || entry.costCenter?.name || "-");
        setText("ViewEntryDescription", entry.description || "-");

        const linesBody = document.getElementById("ViewEntryLinesBody");
        if (linesBody) {
            linesBody.innerHTML = "";
            let totalDebit = 0;
            let totalCredit = 0;

            if (entry.lines && entry.lines.length > 0) {
                entry.lines.forEach(line => {
                    totalDebit += line.debit || 0;
                    totalCredit += line.credit || 0;
                    const tr = document.createElement("tr");
                    tr.innerHTML = `
                        <td>${escapeHtml(line.accountCode || line.account?.code || "-")}</td>
                        <td>${escapeHtml(line.accountName || line.account?.name || "-")}</td>
                        <td>${escapeHtml(line.description || "-")}</td>
                        <td dir="ltr" style="text-align:right;">${formatNumber(line.debit || 0)}</td>
                        <td dir="ltr" style="text-align:right;">${formatNumber(line.credit || 0)}</td>
                    `;
                    linesBody.appendChild(tr);
                });

                const totalRow = document.createElement("tr");
                totalRow.className = "Grand-total-row";
                totalRow.innerHTML = `
                    <td colspan="3" style="text-align: center;">الإجمالي</td>
                    <td dir="ltr" style="color: #2563eb;">${formatNumber(totalDebit)}</td>
                    <td dir="ltr" style="color: #dc2626;">${formatNumber(totalCredit)}</td>
                `;
                linesBody.appendChild(totalRow);
            }
        }

        const postBtn = document.getElementById("PostEntryBtn");
        if (postBtn) {
            if (entry.status === "draft") {
                postBtn.style.display = "inline-flex";
                postBtn.onclick = () => postEntry(id);
            } else {
                postBtn.style.display = "none";
            }
        }

        openPopUpWindow("DetailsPopup");
    } catch (error) {
        console.error("Error viewing entry:", error);
        ArbahToast.error("حدث خطأ في تحميل التفاصيل", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    ترحيل قيد
// ═══════════════════════════════════════════════════════════
async function postEntry(id) {
    const ok = await ArbahToast.confirm("هل تريد ترحيل هذا القيد؟ بعد الترحيل لا يمكن التعديل.",
        { title: "ترحيل", confirmText: "ترحيل", cancelText: "إلغاء" }
    );
    if (!ok) return;

    try {
        const response = await fetch(`/api/JournalEntries/${id}/post`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" }
        });
        const result = await response.json();

        if (result.success) {
            ArbahToast.success("تم ترحيل القيد بنجاح", 3000, { title: "تم!" });
            closePopUpWindow("DetailsPopup");
            getJournalEntries();
        } else {
            ArbahToast.error(result.message || "حدث خطأ", 3000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error posting entry:", error);
        ArbahToast.error("حدث خطأ في الاتصال", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    إلغاء ترحيل قيد
// ═══════════════════════════════════════════════════════════
async function unpostEntry(id) {
    const ok = await ArbahToast.confirm("هل تريد إلغاء ترحيل هذا القيد؟",
        { title: "إلغاء الترحيل", confirmText: "إلغاء الترحيل", cancelText: "إلغاء" }
    );
    if (!ok) return;

    try {
        const response = await fetch(`/api/JournalEntries/${id}/unpost`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" }
        });
        const result = await response.json();

        if (result.success) {
            ArbahToast.success("تم إلغاء ترحيل القيد بنجاح", 3000, { title: "تم!" });
            getJournalEntries();
        } else {
            ArbahToast.error(result.message || "حدث خطأ", 3000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error unposting entry:", error);
        ArbahToast.error("حدث خطأ في الاتصال", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    حذف قيد
// ═══════════════════════════════════════════════════════════
async function deleteEntry(id) {
    const ok = await ArbahToast.confirm("هل تريد حذف هذا القيد؟ لا يمكن التراجع عن هذا الإجراء.",
        { title: "حذف", confirmText: "حذف", cancelText: "إلغاء" }
    );
    if (!ok) return;

    try {
        const response = await fetch(`/api/JournalEntries/${id}`, {
            method: "DELETE",
            headers: { "Content-Type": "application/json" }
        });
        const result = await response.json();

        if (result.success) {
            ArbahToast.success("تم حذف القيد بنجاح", 3000, { title: "تم!" });
            getJournalEntries();
        } else {
            ArbahToast.error(result.message || "حدث خطأ", 3000, { title: "خطأ !" });
        }
    } catch (error) {
        console.error("Error deleting entry:", error);
        ArbahToast.error("حدث خطأ في الاتصال", 3000, { title: "خطأ !" });
    }
}

// ═══════════════════════════════════════════════════════════
//    تصدير Excel
// ═══════════════════════════════════════════════════════════
function exportJournalExcel() {
    const entries = allEntriesData;
    if (!entries || entries.length === 0) {
        ArbahToast.warning("لا توجد بيانات للتصدير", 3000, { title: "تنبيه" });
        return;
    }

    let csvContent = "\uFEFF";
    csvContent += "رقم القيد,التاريخ,الفرع,مركز التكلفة,البيان,المدين,الدائن,الحالة,النوع\n";

    entries.forEach(e => {
        csvContent += `${e.entryNo},${formatDate(e.date)},${e.branchName || "-"},${e.costCenterName || "-"},${e.description || ""},${e.totalDebit || 0},${e.totalCredit || 0},${e.status === "posted" ? "مرحل" : "مسودة"},${e.type === "manual" ? "يدوي" : "تلقائي"}\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Journal_Entries_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();

    ArbahToast.success("تم تصدير البيانات بنجاح", 3000, { title: "تم!" });
}

// ═══════════════════════════════════════════════════════════
//    إضافة سطر قيد جديد
// ═══════════════════════════════════════════════════════════
function addEntryLine(lineData = null) {
    entryLineCounter++;
    const tbody = document.getElementById("EntryLinesBody");
    if (!tbody) return;

    const tr = document.createElement("tr");
    tr.dataset.lineId = entryLineCounter;
    tr.innerHTML = `
        <td>
            <div class="Field" data-select="account" >
                <div class="input SelectInput">
                    <input type="text" class="select-search" placeholder="اختر الحساب..." autocomplete="off"
                           value="${lineData && lineData.accountName ? escapeHtml(lineData.accountName) : ''}">
                    <input type="hidden" class="select-value" value="${lineData && lineData.account ? lineData.account : ''}">
                    <i class="fa fa-book select-icon"></i>
                </div>
                <div class="SelectOptionDropdown">
                    <div class="select-content"></div>
                </div>
            </div>
        </td>
        <td>
            <div class="input" >
                <i class="fa fa-file-lines"></i>
                <input type="text" class="line-description" placeholder="بيان السطر..."
                       value="${lineData && lineData.description ? escapeHtml(lineData.description) : ''}">
            </div>
        </td>
        <td>
            <div class="input">
                <i class="fa fa-arrow-down"></i>
                <input type="number" class="line-debit" placeholder="0.00" step="0.01" min="0"
                       value="${lineData && lineData.debit ? lineData.debit : ''}"
                       oninput="onDebitCreditInput(this, 'debit')">
            </div>
        </td>
        <td>
            <div class="input" >
                <i class="fa fa-arrow-up"></i>
                <input type="number" class="line-credit" placeholder="0.00" step="0.01" min="0"
                       value="${lineData && lineData.credit ? lineData.credit : ''}"
                       oninput="onDebitCreditInput(this, 'credit')">
            </div>
        </td>
        <td style="text-align:center;">
            <button type="button" class="btn-delete-line" onclick="removeEntryLine(this)" title="حذف السطر">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        </td>
    `;

    tbody.appendChild(tr);

    if (window.selectManager) {
        const field = tr.querySelector('[data-select="account"]');
        if (field) window.selectManager.init(field);
    }

    updateTotalsBar();
}

// ═══════════════════════════════════════════════════════════
//    حذف سطر قيد
// ═══════════════════════════════════════════════════════════
function removeEntryLine(btn) {
    const tbody = document.getElementById("EntryLinesBody");
    const rows = tbody.querySelectorAll("tr");
    if (rows.length <= 2) {
        ArbahToast.warning("يجب الاحتفاظ بسطرين على الأقل", 3000, { title: "تنبيه" });
        return;
    }
    const row = btn.closest("tr");
    if (row) { row.remove(); updateTotalsBar(); }
}

// ═══════════════════════════════════════════════════════════
//    عند إدخال مدين/دائن
// ═══════════════════════════════════════════════════════════
function onDebitCreditInput(input, type) {
    const row = input.closest("tr");
    if (!row) return;
    const debitInput = row.querySelector(".line-debit");
    const creditInput = row.querySelector(".line-credit");
    if (type === "debit" && parseFloat(input.value) > 0) { if (creditInput) creditInput.value = ""; }
    else if (type === "credit" && parseFloat(input.value) > 0) { if (debitInput) debitInput.value = ""; }
    updateTotalsBar();
}

// ═══════════════════════════════════════════════════════════
//    تحديث شريط الإجماليات
// ═══════════════════════════════════════════════════════════
function updateTotalsBar() {
    const rows = document.querySelectorAll("#EntryLinesBody tr");
    let totalDebit = 0, totalCredit = 0;
    rows.forEach(row => {
        totalDebit += parseFloat(row.querySelector(".line-debit")?.value) || 0;
        totalCredit += parseFloat(row.querySelector(".line-credit")?.value) || 0;
    });
    const diff = totalDebit - totalCredit;

    const debitEl = document.getElementById("TotalDebitLine");
    const creditEl = document.getElementById("TotalCreditLine");
    const diffEl = document.getElementById("TotalDiffLine");

    if (debitEl) { debitEl.textContent = formatNumber(totalDebit); debitEl.className = "value debit"; }
    if (creditEl) { creditEl.textContent = formatNumber(totalCredit); creditEl.className = "value credit"; }
    if (diffEl) {
        diffEl.textContent = formatNumber(diff);
        if (Math.abs(diff) < 0.001) {
            diffEl.className = "value diff balanced";
            diffEl.style.color = "#22c55e";
        } else {
            diffEl.className = "value diff unbalanced";
            diffEl.style.color = "#ef4444";
        }
    }
}

// ═══════════════════════════════════════════════════════════
//    جلب رقم القيد التالي
// ═══════════════════════════════════════════════════════════
async function fetchNextEntryNo() {
    try {
        const response = await fetch("/api/JournalEntries/next-entry-no");
        const result = await response.json();
        if (result.success && result.data && result.data.nextNo) {
            const noInput = document.getElementById("NewEntryNo");
            if (noInput && !noInput.value) noInput.value = result.data.nextNo;
        }
    } catch (error) {
        console.error("Error fetching next entry no:", error);
        generateEntryNoLocal();
    }
}

function generateEntryNoLocal() {
    const count = allEntriesData.length + 1;
    const no = "JV-" + String(count).padStart(4, "0");
    const noInput = document.getElementById("NewEntryNo");
    if (noInput) noInput.value = no;
}

// ═══════════════════════════════════════════════════════════
//    إعادة تعيين النموذج
// ═══════════════════════════════════════════════════════════
function resetEntryForm() {
    const form = document.getElementById("EntryForm");
    if (form) form.reset();
    const entryId = document.getElementById("EntryId");
    if (entryId) entryId.value = "";
    currentEditingEntryId = null;
    entryLineCounter = 0;

    const popupTitle = document.getElementById("PopupTitle");
    const popupSubtitle = document.getElementById("PopupSubtitle");
    if (popupTitle) popupTitle.textContent = "قيد يدوي جديد";
    if (popupSubtitle) popupSubtitle.textContent = "أدخل بيانات القيد والحسابات المشاركة";

    const tbody = document.getElementById("EntryLinesBody");
    if (tbody) {
        tbody.innerHTML = "";
        addEntryLine();
        addEntryLine();
    }
    updateTotalsBar();
    fetchNextEntryNo();

    const dateInput = document.getElementById("NewEntryDate");
    if (dateInput) dateInput.value = new Date().toISOString().split("T")[0];
}

// ═══════════════════════════════════════════════════════════
//    دوال مساعدة
// ═══════════════════════════════════════════════════════════
function formatNumber(num) {
    if (num === null || num === undefined || num === "") return "0.00";
    const parsed = parseFloat(num);
    if (isNaN(parsed)) return "0.00";
    return parsed.toLocaleString("ar-SA-u-nu-latn", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
            document.querySelectorAll(".Profile-Dropdown.active").forEach(menu => menu.classList.remove("active"));
            if (!isOpen) dropdown.classList.add("active");
        });
    });
}

// ═══════════════════════════════════════════════════════════
//    تحميل البيانات عند بدء التشغيل
// ═══════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", function () {
    getJournalEntries();

    const dateInput = document.getElementById("NewEntryDate");
    if (dateInput) dateInput.value = new Date().toISOString().split("T")[0];

    const tbody = document.getElementById("EntryLinesBody");
    if (tbody && tbody.children.length === 0) {
        addEntryLine();
        addEntryLine();
    }
    updateTotalsBar();
});