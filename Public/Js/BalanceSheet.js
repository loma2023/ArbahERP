function formatMoney(num) {
  if (num === null || num === undefined || isNaN(num)) return "0.00";
  return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatAmount(num) {
  const formatted = formatMoney(Math.abs(num));
  if (num < 0) {
    return `<span class="negative">(${formatted})</span>`;
  }
  return formatted;
}

/**
 * Format change value: positive = plain number, negative = (number) in red
 * Examples: 1000.00  |  (500.00)
 */
function formatChange(num) {
  if (num === null || num === undefined || isNaN(num)) return "0.00";
  const formatted = formatMoney(Math.abs(num));
  if (num < 0) {
    return `<span class="negative">(${formatted})</span>`;
  }
  return formatted;
}

/**
 * Format percentage: positive = plain number + %, negative = (number)% in red
 * Examples: 100.00%  |  (50.00%)
 */
function formatPercent(num) {
  if (num === null || num === undefined || isNaN(num)) return "0.00%";
  const formatted = num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (num < 0) {
    return `<span class="negative">(${formatted}%)</span>`;
  }
  return formatted + "%";
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function buildSectionRows(section, sectionType) {
  let html = "";

  if (!section.categories || section.categories.length === 0) {
    return html;
  }

  // Section header (Assets / Liabilities / Equity)
  html += `<tr class="Category-Row ${sectionType}">
          <td colspan="6"><i class="fa-solid fa-folder-open"></i> ${escapeHtml(section.title)}</td>
        </tr>`;

  section.categories.forEach(cat => {
    // Category header
    html += `<tr class="Category-Row">
          <td colspan="6"><i class="fa-solid fa-file"></i> ${escapeHtml(cat.name)}</td>
          </tr>`;

    // Items
    if (cat.items && cat.items.length > 0) {
      cat.items.forEach(item => {
        const contraClass = item.isContra ? "contra" : "";
        const codeCell = item.code
          ? `<td class="bs-code">${escapeHtml(item.code)}</td>`
          : `<td class="bs-code">—</td>`;

        html += `<tr>
                ${codeCell}
                <td class="bs-name">${escapeHtml(item.name)}</td>
                <td class="bs-amount">${formatAmount(item.balance)}</td>
                <td class="bs-compare">${formatAmount(item.compareBalance)}</td>
                <td class="bs-change">${formatChange(item.change)}</td>
                <td class="bs-change-percent">${formatPercent(item.changePercent)}</td>
              </tr>`;
      });
    }

    // Category total
    html += `<tr class="total-row">
            <td colspan="2">إجمالي ${escapeHtml(cat.name)}</td>
            <td class="bs-amount">${formatAmount(cat.total)}</td>
            <td class="bs-compare">${formatAmount(cat.compareTotal)}</td>
            <td class="bs-change">${formatChange(cat.change)}</td>
            <td class="bs-change-percent">${formatPercent(cat.changePercent)}</td>
          </tr>`;
  });

  // Section grand total
  html += `<tr class="Grand-total-row ${sectionType}">
          <td colspan="2">إجمالي ${escapeHtml(section.title)}</td>
          <td class="bs-amount">${formatAmount(section.total)}</td>
          <td class="bs-compare">${formatAmount(section.compareTotal)}</td>
          <td class="bs-change">${formatChange(section.change)}</td>
          <td class="bs-change-percent">${formatPercent(section.changePercent)}</td>
        </tr>`;

  return html;
}

async function generateBalanceSheet() {
  const reportDate = document.getElementById("ReportDate").value;
  const compareDate = document.getElementById("CompareDate").value;

  const tableBody = document.getElementById("BalanceSheetBody");
  const balanceCheck = document.getElementById("BalanceCheck");

  tableBody.innerHTML = `<tr>
                            <td colspan="8" style="text-align:center;padding:40px;">
                                <i class="fa-solid fa-spinner fa-spin"></i>
                                <p style="margin-top:10px;color:#6b7280;">جاري تحميل ...</p>
                            </td>
                        </tr>`;
  try {
    const res = await fetch(`/api/BalanceSheet?reportDate=${reportDate}&compareDate=${compareDate}`);
    const result = await res.json();

    if (!result.success) {
      throw new Error(result.message || "خطأ في جلب البيانات");
    }

    const data = result.data;

    document.getElementById("TotalAssets").textContent = formatMoney(data.summary.totalAssets) + " ر.س";
    document.getElementById("TotalLiabilities").textContent = formatMoney(data.summary.totalLiabilities) + " ر.س";
    document.getElementById("TotalEquity").textContent = formatMoney(data.summary.totalEquity) + " ر.س";

    let html = "";
    html += buildSectionRows(data.assets, "assets");
    html += buildSectionRows(data.liabilities, "liabilities");
    html += buildSectionRows(data.equity, "equity");

    tableBody.innerHTML = html;

    if (data.summary.isBalanced) { balanceCheck.innerHTML = "✓ متوازن"; }
    else { balanceCheck.innerHTML = "✗ غير متوازن"; }

  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="6" class="error-cell">
            <i class="fa-solid fa-circle-xmark"></i>
            ❌ خطأ: ${escapeHtml(err.message)}
          </td></tr>`;
  }
}

function exportExcel() {
  const reportDate = document.getElementById("ReportDate").value;
  const compareDate = document.getElementById("CompareDate").value;
  window.open(`/api/BalanceSheet?reportDate=${reportDate}&compareDate=${compareDate}&format=excel`, "_blank");
}

document.addEventListener("DOMContentLoaded", generateBalanceSheet);

function openPrintPopup() {
  let now = new Date();
  // ── بناء صفوف الجدول ──
  const FromDate = document.getElementById('ReportDate');
  const ToDate = document.getElementById('CompareDate');
  const DetailsFromDate = document.getElementById('DetailsFromDate');
  const DetailsToDate = document.getElementById('DetailsToDate');
  DetailsFromDate.innerHTML = FromDate.value;
  DetailsToDate.innerHTML = ToDate.value;

  const tbody = document.getElementById('BalanceSheetPrintBody');
  if (tbody) { tbody.innerHTML = document.getElementById('BalanceSheetBody').innerHTML; }

  const footerEl = document.getElementById('DetailsFooterInfo');
  const TimeDate = document.getElementById('TimeDate');

  if (footerEl) footerEl.innerHTML = "تم إنشاؤها بواسطة: إسلام عبدالرحمن ";
  if (TimeDate) TimeDate.innerHTML = now.toLocaleString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  console.log(now.toLocaleString())
  openPopUpWindow('DetailsPopup');
}
