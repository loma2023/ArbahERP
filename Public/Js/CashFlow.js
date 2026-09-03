// =============================================
// Cash Flow Statement - Clean with proper colspan
// ArbahERP System
// =============================================

const CashFlowApp = {
    apiBase: "/api/CashFlow",
    currentData: null,

    init() {
        this.bindEvents();
        this.loadCashFlow();
    },

    bindEvents() {
        document.getElementById("FromDate")?.addEventListener("change", () => this.loadCashFlow());
        document.getElementById("ToDate")?.addEventListener("change", () => this.loadCashFlow());
        document.getElementById("MethodSelect")?.addEventListener("change", () => this.loadCashFlow());
    },

    async loadCashFlow() {
        const fromDate = document.getElementById("FromDate")?.value;
        const toDate = document.getElementById("ToDate")?.value;
        const method = document.getElementById("MethodSelect")?.value || "indirect";
        if (!fromDate || !toDate) return;

        this.showLoading();
        try {
            const response = await fetch(`${this.apiBase}?fromDate=${fromDate}&toDate=${toDate}&method=${method}`);
            const result = await response.json();
            if (result.success) {
                this.currentData = result.data;
                this.renderAll(result.data);
            } else {
                this.showError(result.message);
            }
        } catch (error) {
            console.error("Error:", error);
            this.showError("فشل تحميل البيانات");
        } finally {
            this.hideLoading();
        }
    },

    renderAll(data) {
        this.renderKPIs(data);
        this.renderTable(data);
    },

    renderKPIs(data) {
        const setValue = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = this.formatNumber(value) + " ر.س";
        };
        setValue("OperatingCF", data.operating.total);
        setValue("InvestingCF", data.investing.total);
        setValue("FinancingCF", data.financing.total);
        setValue("NetCF", data.summary.netCashFlow);
    },

    renderTable(data) {
        const tbody = document.getElementById("CashFlowBody");
        if (!tbody) return;

        let html = "";
        let rowNum = 1;

        // ═══════════════════════════════════════════════
        // SECTION: OPERATING ACTIVITIES
        // ═══════════════════════════════════════════════
        html += this.renderSectionHeader("الأنشطة التشغيلية", data.operating.total);

        if (data.operating.items.length === 0) {
            html += this.renderEmptyRow("لا توجد حركات تشغيلية في الفترة");
        } else {
            data.operating.items.forEach(item => {
                html += this.renderDataRow(rowNum++, item.label, "تشغيلي", item.amount, item.accountCode);
            });
        }

        html += this.renderTotalRow("صافي التدفق من الأنشطة التشغيلية", data.operating.total);

        // ═══════════════════════════════════════════════
        // SECTION: INVESTING ACTIVITIES
        // ═══════════════════════════════════════════════
        html += this.renderSectionHeader("الأنشطة الاستثمارية", data.investing.total);

        if (data.investing.items.length === 0) {
            html += this.renderEmptyRow("لا توجد حركات استثمارية في الفترة");
        } else {
            data.investing.items.forEach(item => {
                html += this.renderDataRow(rowNum++, item.label, "استثماري", item.amount, item.accountCode);
            });
        }

        html += this.renderTotalRow("صافي التدفق من الأنشطة الاستثمارية", data.investing.total);

        // ═══════════════════════════════════════════════
        // SECTION: FINANCING ACTIVITIES
        // ═══════════════════════════════════════════════
        html += this.renderSectionHeader("الأنشطة التمويلية", data.financing.total);

        if (data.financing.items.length === 0) {
            html += this.renderEmptyRow("لا توجد حركات تمويلية في الفترة");
        } else {
            data.financing.items.forEach(item => {
                html += this.renderDataRow(rowNum++, item.label, "تمويلي", item.amount, item.accountCode);
            });
        }

        html += this.renderTotalRow("صافي التدفق من الأنشطة التمويلية", data.financing.total);

        // ═══════════════════════════════════════════════
        // SECTION: SUMMARY
        // ═══════════════════════════════════════════════
        html += this.renderSectionHeader("ملخص التدفقات النقدية", data.summary.netCashFlow);

        html += this.renderSummaryRow("صافي التدفق النقدي من الأنشطة التشغيلية", data.operating.total);
        html += this.renderSummaryRow("صافي التدفق النقدي من الأنشطة الاستثمارية", data.investing.total);
        html += this.renderSummaryRow("صافي التدفق النقدي من الأنشطة التمويلية", data.financing.total);
        html += this.renderGrandTotalRow("صافي الزيادة/النقصان في النقدية", data.summary.netCashFlow);
        html += this.renderSummaryRow("النقدية في بداية الفترة", data.summary.openingCash);
        html += this.renderGrandTotalRow("النقدية في نهاية الفترة", data.summary.closingCash);

        tbody.innerHTML = html;
    },

    // ═══════════════════════════════════════════════
    // ROW RENDERERS - Proper colspan
    // ═══════════════════════════════════════════════

    renderSectionHeader(title, total) {
        return `
            <tr class="Category-Row">
                <td colspan="3">${title}</td>
                <td>${this.formatNumber(total)}</td>
            </tr>
        `;
    },

    renderDataRow(num, label, activity, amount, accountCode) {
        const desc = accountCode ? ` (${accountCode})` : "";
        return `
            <tr class="data-row">
                <td>${num}</td>
                <td>${this.escapeHtml(label)}${desc}</td>
                <td>${activity}</td>
                <td>${this.formatNumber(amount)}</td>
            </tr>
        `;
    },

    renderTotalRow(label, amount) {
        return `
            <tr class="total-row">
                <td colspan="3">${label}</td>
                <td>${this.formatNumber(amount)}</td>
            </tr>
        `;
    },

    renderSummaryRow(label, amount) {
        return `
            <tr class="summary-row">
                <td colspan="3">${label}</td>
                <td>${this.formatNumber(amount)}</td>
            </tr>
        `;
    },

    renderGrandTotalRow(label, amount) {
        return `
            <tr class="Grand-total-row">
                <td colspan="3">${label}</td>
                <td>${this.formatNumber(amount)}</td>
            </tr>
        `;
    },

    renderEmptyRow(message) {
        return `
            <tr class="empty-row">
                <td colspan="4">${message}</td>
            </tr>
        `;
    },

    // ═══════════════════════════════════════════════
    // UTILITIES
    // ═══════════════════════════════════════════════

    async exportExcel() {
        const fromDate = document.getElementById("FromDate")?.value;
        const toDate = document.getElementById("ToDate")?.value;
        const method = document.getElementById("MethodSelect")?.value || "indirect";
        if (!fromDate || !toDate) { this.showToast("يرجى تحديد الفترة", "warning"); return; }

        try {
            const response = await fetch(`${this.apiBase}/Export?fromDate=${fromDate}&toDate=${toDate}&method=${method}`);
            if (!response.ok) throw new Error("Export failed");
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `CashFlow_${fromDate}_${toDate}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            this.showToast("تم التصدير بنجاح", "success");
        } catch (error) {
            console.error("Export error:", error);
            this.showToast("فشل التصدير", "error");
        }
    },

    generateCashFlow() { this.loadCashFlow(); },

    formatNumber(num) {
        if (num === null || num === undefined) return "0.00";
        return Number(num).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },

    escapeHtml(text) {
        if (!text) return "";
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
    },

    showLoading() {
        const tbody = document.getElementById("CashFlowBody");
        if (tbody) {
            tbody.innerHTML = `<tr>
                            <td colspan="4" style="text-align:center;padding:40px;">
                                <i class="fa-solid fa-spinner fa-spin"></i>
                                <p style="margin-top:10px;color:#6b7280;">جاري تحميل ...</p>
                            </td>
                        </tr>`;
        }
    },

    hideLoading() {},

    showError(message) {
        this.showToast(message, "error");
    },

    showToast(message, type) {
        if (typeof window.showToast === "function") window.showToast(message, type);
        else if (typeof showToast === "function") showToast(message, type);
        else console.log(`[${type}] ${message}`);
    }
};

function generateCashFlow() { CashFlowApp.generateCashFlow(); }
function exportExcel() { CashFlowApp.exportExcel(); }

document.addEventListener("DOMContentLoaded", () => { CashFlowApp.init(); });


function openPrintPopup() {
  let now = new Date();
  // ── بناء صفوف الجدول ──
  const FromDate = document.getElementById('FromDate');
  const ToDate = document.getElementById('ToDate');
  const DetailsFromDate = document.getElementById('DetailsFromDate');
  const DetailsToDate = document.getElementById('DetailsToDate');
  DetailsFromDate.innerHTML = FromDate.value;
  DetailsToDate.innerHTML = ToDate.value;

  const tbody = document.getElementById('CashFlowPrintBody');
  if (tbody) { tbody.innerHTML = document.getElementById('CashFlowBody').innerHTML; }

  const footerEl = document.getElementById('DetailsFooterInfo');
  const TimeDate = document.getElementById('TimeDate');

  if (footerEl) footerEl.innerHTML = "تم إنشاؤها بواسطة: إسلام عبدالرحمن ";
  if (TimeDate) TimeDate.innerHTML = now.toLocaleString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  console.log(now.toLocaleString())
  openPopUpWindow('DetailsPopup');
}
