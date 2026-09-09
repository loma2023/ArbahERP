// ═══════════════════════════════════════════════════════════════
//  ArbahTable.js — Universal Data Table Controller
//  يشتغل على أي صفحة مهما اختلفت الفلاتر
// ═══════════════════════════════════════════════════════════════

class ArbahTable {
    constructor(tableId, options = {}) {
        this.table = document.getElementById(tableId);
        if (!this.table) {
            console.error(`[ArbahTable] Table not found: "${tableId}"`);
            return;
        }

        this.tbody = this.table.querySelector("tbody");
        if (!this.tbody) {
            console.error(`[ArbahTable] No <tbody> found in table: "${tableId}"`);
            return;
        }

        // DOM References
        this.dropdown = document.getElementById("Advanced-Filter-Dropdown");
        this.checkboxGroup = this.dropdown?.querySelector(".Filter-Checkboxes-list");

        // Pagination
        this.rowsPerPage = options.rowsPerPage || 15;
        this.currentPage = 1;

        // Data
        this.allRows = [];
        this.filteredRows = [];

        // Filter States
        this.activeFilters = {};          // Advanced checkbox filters { colIndex: [values] }
        this.searchKeyword = "";
        this.dateFrom = null;
        this.dateTo = null;
        this.dateColumnIndex = options.dateColumnIndex ?? null;

        // ✅ Custom filters من الـ HTML — { inputId: { columnIndex, type, value } }
        this.customFilters = {};

        // UI State
        this.currentColumn = null;
        this.currentBtn = null;
        this.selectedValues = [];

        // Initialize
        this.init();
        window.activeTableFilter = this;
    }

    // ─── Initialization ────────────────────────────────────────────
    init() {
        this.allRows = [...this.tbody.querySelectorAll("tr")];
        this.filteredRows = [...this.allRows];

        this.detectDateColumn();
        this.bindFilterButtons();
        this.bindCustomFilterInputs(); // ✅ جديد
        this.bindGlobalEvents();
        this.updateRowNumbers();
        this.paginate();
    }

    reinit() {
        this.allRows = [...this.tbody.querySelectorAll("tr")];
        this.filteredRows = [...this.allRows];
        this.activeFilters = {};
        this.customFilters = {};
        this.searchKeyword = "";
        this.dateFrom = null;
        this.dateTo = null;
        this.currentPage = 1;

        this.bindFilterButtons();
        this.bindCustomFilterInputs(); // ✅
        this.updateRowNumbers();
        this.paginate();
    }

    // ─── Auto Detect Date Column ──────────────────────────────────
    detectDateColumn() {
        if (this.dateColumnIndex !== null) return;

        const headers = this.table.querySelectorAll("thead th");
        headers.forEach((th, index) => {
            const text = th.textContent.toLowerCase();
            if (text.includes("تاريخ") || text.includes("date") || text.includes("التاريخ")) {
                this.dateColumnIndex = index;
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════
    //  ✅ CUSTOM FILTERS — يقرأ من data-filter attribute
    // ═══════════════════════════════════════════════════════════════

    /**
     * Bind inputs with data-filter attribute
     * data-filter="search" → بحث نصي عام
     * data-filter="date-from" → تاريخ من
     * data-filter="date-to" → تاريخ إلى
     * data-filter="column:3" → فلتر عمود محدد (index 3)
     * data-filter="column:branch" → فلتر بـ data-attribute
     */
    bindCustomFilterInputs() {
        // البحث النصي
        const searchInput = document.querySelector('[data-filter="search"]');
        if (searchInput) {
            searchInput.addEventListener("keyup", debounce(() => {
                this.searchKeyword = searchInput.value.toLowerCase().trim();
                this.applyAllFilters();
            }, 300));
        }

        // تاريخ من
        const dateFromInput = document.querySelector('[data-filter="date-from"]');
        if (dateFromInput) {
            dateFromInput.addEventListener("change", () => {
                this.dateFrom = dateFromInput.value ? new Date(dateFromInput.value + "T00:00:00") : null;
                this.applyAllFilters();
            });
        }

        // تاريخ إلى
        const dateToInput = document.querySelector('[data-filter="date-to"]');
        if (dateToInput) {
            dateToInput.addEventListener("change", () => {
                this.dateTo = dateToInput.value ? new Date(dateToInput.value + "T23:59:59") : null;
                this.applyAllFilters();
            });
        }

        // ✅ فلاتر أعمدة مخصصة (select boxes)
        document.querySelectorAll('[data-filter^="column:"]').forEach(input => {
            const filterDef = input.dataset.filter; // "column:3" أو "column:data-branch"
            const parts = filterDef.split(":");

            input.addEventListener("change", () => {
                const value = input.value;
                if (value && value !== "all") {
                    this.customFilters[filterDef] = {
                        type: parts[1].startsWith("data-") ? "data-attribute" : "cell-text",
                        target: parts[1], // "3" أو "data-branch"
                        value: value
                    };
                } else {
                    delete this.customFilters[filterDef];
                }
                this.applyAllFilters();
            });
        });
    }

    // ─── Event Bindings ────────────────────────────────────────────
    bindFilterButtons() {
        const btns = this.table.querySelectorAll(".Filter-Btn");
        btns.forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);

            newBtn.addEventListener("pointerdown", (e) => {
                e.preventDefault();
                e.stopPropagation();
                const columnIndex = parseInt(newBtn.dataset.columnindex);
                if (isNaN(columnIndex)) {
                    console.warn("[ArbahTable] Invalid column index on filter button");
                    return;
                }
                this.showFilter(columnIndex, newBtn);
            });
        });
    }

    bindGlobalEvents() {
        document.addEventListener("click", (e) => {
            const filterBtn = e.target.closest(".Filter-Btn");
            if (this.dropdown && !this.dropdown.contains(e.target) && !filterBtn) {
                this.closeFilter();
            }
        });
    }

    // ─── Cell Text Extraction ──────────────────────────────────────
    getCellText(cell) {
        if (!cell) return "";
        const nameEl = cell.querySelector(".name");
        if (nameEl) return nameEl.innerText.trim();
        return cell.innerText.trim();
    }

    // ─── Row Numbering ───────────────────────────────────────────
    updateRowNumbers() {
        const visibleRows = this.filteredRows.filter(row => row.style.display !== "none");
        visibleRows.forEach((row, index) => {
            const numCell = row.querySelector(".row-number");
            if (numCell) numCell.textContent = index + 1;
        });
    }

    // ═══════════════════════════════════════════════════════════════
    //  ADVANCED FILTER DROPDOWN (Checkbox Filter)
    // ═══════════════════════════════════════════════════════════════

    showFilter(columnIndex, btn) {
        window.activeTableFilter = this;
        this.currentColumn = columnIndex;
        this.currentBtn = btn;

        if (!this.dropdown || !this.checkboxGroup) {
            console.error("[ArbahTable] Dropdown or checkbox group not found");
            return;
        }

        const rows = this.filteredRows;
        const valuesSet = new Set();

        rows.forEach(row => {
            const cell = row.cells[columnIndex];
            if (!cell) return;
            valuesSet.add(this.getCellText(cell));
        });

        const values = [...valuesSet].sort((a, b) => a.localeCompare(b, "ar"));

        let html = `
            <label class="Filter-Checkbox-Item">
                <input type="checkbox" id="selectAllFilter" checked>
                <span>الكل</span>
            </label>`;

        values.forEach(value => {
            html += `
                <label class="Filter-Checkbox-Item">
                    <input type="checkbox" class="filter-item" value="${this.escapeHtml(value)}" checked>
                    <span>${this.escapeHtml(value)}</span>
                </label>`;
        });

        this.checkboxGroup.innerHTML = html;

        const selectAll = document.getElementById("selectAllFilter");
        const items = this.checkboxGroup.querySelectorAll(".filter-item");

        if (this.activeFilters[columnIndex]) {
            const savedValues = this.activeFilters[columnIndex];
            let checkedCount = 0;
            items.forEach(item => {
                const isChecked = savedValues.includes(item.value);
                item.checked = isChecked;
                if (isChecked) checkedCount++;
            });
            selectAll.checked = checkedCount === items.length;
        }

        selectAll.addEventListener("change", () => {
            items.forEach(item => { item.checked = selectAll.checked; });
        });

        items.forEach(item => {
            item.addEventListener("change", () => {
                const checkedCount = this.checkboxGroup.querySelectorAll(".filter-item:checked").length;
                selectAll.checked = checkedCount === items.length;
            });
        });

        this.positionDropdown(btn);
    }

    positionDropdown(btn) {
        const rect = btn.getBoundingClientRect();
        const dropdownWidth = 280;
        const margin = 10;

        let left = rect.left + window.scrollX;
        let top = rect.bottom + window.scrollY + 5;

        if (left + dropdownWidth > window.innerWidth) {
            left = window.innerWidth - dropdownWidth - margin;
        }
        if (left < margin) left = margin;

        this.dropdown.style.cssText = `
            display: block;
            top: ${top}px;
            left: ${left}px;
        `;
    }

    applyFilter() {
        const checkedItems = this.checkboxGroup.querySelectorAll(".filter-item:checked");
        this.selectedValues = [...checkedItems].map(item => item.value);

        if (this.selectedValues.length > 0) {
            this.activeFilters[this.currentColumn] = [...this.selectedValues];
        } else {
            delete this.activeFilters[this.currentColumn];
        }

        this.applyAllFilters();
        this.currentPage = 1;
        this.paginate();
        this.closeFilter();
    }

    // ─── Sorting ───────────────────────────────────────────────────
    sortAZ() {
        this.filteredRows.sort((a, b) => {
            const aText = this.getCellText(a.cells[this.currentColumn]);
            const bText = this.getCellText(b.cells[this.currentColumn]);
            return aText.localeCompare(bText, "ar");
        });

        this.filteredRows.forEach(row => this.tbody.appendChild(row));
        this.currentPage = 1;
        this.paginate();
    }

    sortZA() {
        this.filteredRows.sort((a, b) => {
            const aText = this.getCellText(a.cells[this.currentColumn]);
            const bText = this.getCellText(b.cells[this.currentColumn]);
            return bText.localeCompare(aText, "ar");
        });

        this.filteredRows.forEach(row => this.tbody.appendChild(row));
        this.currentPage = 1;
        this.paginate();
    }

    // ─── Search Inside Filter Dropdown ────────────────────────────
    searchFilterItems(keyword) {
        keyword = keyword.toLowerCase().trim();
        const items = this.checkboxGroup.querySelectorAll(".Filter-Checkbox-Item");

        items.forEach((item, index) => {
            if (index === 0) return;

            const checkbox = item.querySelector(".filter-item");
            const text = item.querySelector("span")?.innerText.toLowerCase() || "";

            if (text.includes(keyword)) {
                item.style.display = "";
                checkbox.checked = true;
            } else {
                item.style.display = "none";
                checkbox.checked = false;
            }
        });

        const selectAll = document.getElementById("selectAllFilter");
        const visibleItems = this.checkboxGroup.querySelectorAll(".filter-item");
        const checkedVisible = this.checkboxGroup.querySelectorAll(".filter-item:checked").length;
        if (selectAll) {
            selectAll.checked = visibleItems.length > 0 && checkedVisible === visibleItems.length;
        }
    }

    closeFilter() {
        if (this.dropdown) this.dropdown.style.display = "none";
    }

    // ═══════════════════════════════════════════════════════════════
    //  FILTER ENGINE (Combines ALL filters)
    // ═══════════════════════════════════════════════════════════════

    applyAllFilters() {
        this.filteredRows = this.allRows.filter(row => {
            // 1. Advanced checkbox filters
            for (const [colIndex, values] of Object.entries(this.activeFilters)) {
                const cell = row.cells[colIndex];
                if (!cell) return false;
                const text = this.getCellText(cell);
                if (!values.includes(text)) return false;
            }

            // 2. Global text search
            if (this.searchKeyword) {
                let found = false;
                const cells = row.cells;
                for (let i = 0; i < cells.length; i++) {
                    if (i === 0) continue;
                    if (this.getCellText(cells[i]).toLowerCase().includes(this.searchKeyword)) {
                        found = true;
                        break;
                    }
                }
                if (!found) return false;
            }

            // 3. Date range filter
            if (!this.rowMatchesDate(row)) return false;

            // ✅ 4. Custom column filters (from select boxes)
            for (const [key, filter] of Object.entries(this.customFilters)) {
                if (filter.type === "data-attribute") {
                    // فلتر بـ data-attribute (مثلاً data-branch, data-account)
                    const attrValue = row.getAttribute(filter.target) || row.dataset[filter.target.replace("data-", "")] || "";
                    if (attrValue !== filter.value) return false;
                } else {
                    // فلتر بـ cell text (عمود محدد)
                    const cell = row.cells[parseInt(filter.target)];
                    if (!cell) return false;
                    const text = this.getCellText(cell);
                    if (text !== filter.value) return false;
                }
            }

            return true;
        });

        this.currentPage = 1;
        this.updateRowNumbers();
        this.paginate();
    }

    // ─── Date Filter ───────────────────────────────────────────────
    rowMatchesDate(row) {
        if (!this.dateFrom && !this.dateTo) return true;

        // ✅ استخدم data-date attribute (YYYY-MM-DD) — أدق وأسرع
        const rawDate = row.dataset.date;
        if (rawDate) {
            const rowDate = new Date(rawDate + "T00:00:00");
            if (!isNaN(rowDate.getTime())) {
                if (this.dateFrom && rowDate < this.dateFrom) return false;
                if (this.dateTo && rowDate > this.dateTo) return false;
                return true;
            }
        }

        // Fallback: parse from cell text
        if (this.dateColumnIndex === null) return true;
        const cell = row.cells[this.dateColumnIndex];
        if (!cell) return true;

        const rowDate = this.parseDate(this.getCellText(cell));
        if (!rowDate) return true;

        if (this.dateFrom && rowDate < this.dateFrom) return false;
        if (this.dateTo && rowDate > this.dateTo) return false;

        return true;
    }

    parseDate(dateStr) {
        if (!dateStr) return null;
        const clean = dateStr.trim();

        // YYYY-MM-DD
        if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
            return new Date(clean + "T00:00:00");
        }

        // DD-MM-YYYY
        let m = clean.match(/^(\d{2})-(\d{2})-(\d{4})$/);
        if (m) return new Date(`${m[3]}-${m[2]}-${m[1]}T00:00:00`);

        // DD/MM/YYYY
        m = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
        if (m) return new Date(`${m[3]}-${m[2]}-${m[1]}T00:00:00`);

        // ✅ YYYY/MM/DD
        m = clean.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
        if (m) return new Date(`${m[1]}-${m[2]}-${m[3]}T00:00:00`);

        // ✅ YYYY/M/D
        m = clean.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
        if (m) return new Date(`${m[1]}-${String(m[2]).padStart(2, '0')}-${String(m[3]).padStart(2, '0')}T00:00:00`);

        const d = new Date(clean);
        return isNaN(d.getTime()) ? null : d;
    }

    // ─── Clear All Filters ─────────────────────────────────────────
    clearFilter() {
        this.activeFilters = {};
        this.customFilters = {};
        this.searchKeyword = "";
        this.dateFrom = null;
        this.dateTo = null;
        this.filteredRows = [...this.allRows];
        this.currentPage = 1;

        this.allRows.forEach(row => this.tbody.appendChild(row));

        if (this.checkboxGroup) {
            this.checkboxGroup.querySelectorAll("input[type='checkbox']").forEach(chk => {
                chk.checked = true;
            });
        }

        // ✅ Clear external inputs
        document.querySelectorAll('[data-filter]').forEach(input => {
            if (input.tagName === "SELECT") {
                input.value = "all";
            } else {
                input.value = "";
            }
        });

        this.closeFilter();
        this.paginate();
    }

    // ═══════════════════════════════════════════════════════════════
    //  PAGINATION
    // ═══════════════════════════════════════════════════════════════

    paginate() {
        const visibleRows = this.filteredRows;
        const totalPages = Math.ceil(visibleRows.length / this.rowsPerPage) || 1;

        if (this.currentPage > totalPages) this.currentPage = totalPages;
        if (this.currentPage < 1) this.currentPage = 1;

        const start = (this.currentPage - 1) * this.rowsPerPage;
        const end = start + this.rowsPerPage;

        this.allRows.forEach(row => { row.style.display = "none"; });

        visibleRows.forEach((row, index) => {
            row.style.display = (index >= start && index < end) ? "" : "none";
        });

        this.updateRowNumbers();
        this.renderPagination(totalPages, visibleRows.length);
    }

    renderPagination(totalPages, totalVisibleRows) {
        const container = document.getElementById("PaginationPages");
        const info = document.getElementById("showingDataMetrics");

        if (!container || !info) return;

        const start = totalVisibleRows === 0 ? 0 : ((this.currentPage - 1) * this.rowsPerPage) + 1;
        const end = Math.min(this.currentPage * this.rowsPerPage, totalVisibleRows);

        info.innerText = `عرض ${start}-${end} من ${totalVisibleRows}`;

        let html = "";

        html += `<span class="Table-Page-Btn text-trigger ${this.currentPage === 1 ? "disabled" : ""}" 
                    onclick="activeTableFilter.goToPage(${this.currentPage - 1})">
                    <i class="fa-solid fa-angle-right"></i>
                </span>`;

        const maxVisible = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);

        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        if (startPage > 1) {
            html += `<span class="Table-Page-Btn num-btn" onclick="activeTableFilter.goToPage(1)">1</span>`;
            if (startPage > 2) html += `<span class="Table-Page-Btn dots">...</span>`;
        }

        for (let i = startPage; i <= endPage; i++) {
            html += `
                <span class="Table-Page-Btn num-btn ${i === this.currentPage ? "active" : ""}" 
                      onclick="activeTableFilter.goToPage(${i})">
                    ${i}
                </span>`;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) html += `<span class="Table-Page-Btn dots">...</span>`;
            html += `<span class="Table-Page-Btn num-btn" onclick="activeTableFilter.goToPage(${totalPages})">${totalPages}</span>`;
        }

        html += `<span class="Table-Page-Btn text-trigger ${this.currentPage === totalPages ? "disabled" : ""}" 
                    onclick="activeTableFilter.goToPage(${this.currentPage + 1})">
                    <i class="fa-solid fa-angle-left"></i>
                 </span>`;

        container.innerHTML = html;
    }

    goToPage(page) {
        const totalPages = Math.ceil(this.filteredRows.length / this.rowsPerPage) || 1;
        if (page < 1 || page > totalPages) return;
        this.currentPage = page;
        this.paginate();
    }

    // ─── Utilities ─────────────────────────────────────────────────
    escapeHtml(text) {
        if (!text) return "";
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    }

    setRowsPerPage(count) {
        this.rowsPerPage = Math.max(1, parseInt(count) || 15);
        this.currentPage = 1;
        this.paginate();
    }

    getFilterState() {
        return {
            searchKeyword: this.searchKeyword,
            dateFrom: this.dateFrom,
            dateTo: this.dateTo,
            activeFilters: { ...this.activeFilters },
            customFilters: { ...this.customFilters },
            currentPage: this.currentPage,
            totalFiltered: this.filteredRows.length,
            totalAll: this.allRows.length
        };
    }
}

// ═══════════════════════════════════════════════════════════════
//  GLOBAL EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════

document.addEventListener("DOMContentLoaded", function () {
    // Close action menus
    document.addEventListener("click", function (e) {
        if (!e.target.closest(".action-menu-container")) {
            document.querySelectorAll(".Profile-Dropdown.active").forEach(menu => {
                menu.classList.remove("active");
            });
        }
    });

    // Search inside Advanced Filter dropdown
    const filterSearchInput = document.getElementById("filterSearchInput");
    if (filterSearchInput) {
        filterSearchInput.addEventListener("keyup", function () {
            if (window.activeTableFilter) {
                activeTableFilter.searchFilterItems(this.value);
            }
        });
    }
});

// ═══════════════════════════════════════════════════════════════
//  DEBOUNCE UTILITY
// ═══════════════════════════════════════════════════════════════

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ═══════════════════════════════════════════════════════════════
//  GLOBAL HELPERS
// ═══════════════════════════════════════════════════════════════

function exportToExcel(tableId, filename = "export") {
    const table = document.getElementById(tableId);
    if (!table) return;

    let csv = [];
    const rows = table.querySelectorAll("tr");

    rows.forEach(row => {
        if (row.style.display === "none") return;
        const cols = row.querySelectorAll("td, th");
        const rowData = [];
        cols.forEach(col => {
            let data = col.innerText.replace(/"/g, '""');
            rowData.push(`"${data}"`);
        });
        csv.push(rowData.join(","));
    });

    const csvContent = "\uFEFF" + csv.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
}