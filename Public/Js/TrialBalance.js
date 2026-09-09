// ═══════════════════════════════════════════════════════════════
//  Trial Balance Page Script
// ═══════════════════════════════════════════════════════════════

let activeTableFilter = null;

document.addEventListener("DOMContentLoaded", function () {
  loadTrialBalance();
});

async function loadTrialBalance() {
  const fromDate = document.getElementById("DateFrom")?.value || "";
  const toDate = document.getElementById("DateTo")?.value || "";

  try {
    showLoading(true);

    let url = "/api/TrialBalance";
    const params = [];
    if (fromDate) params.push(`fromDate=${fromDate}`);
    if (toDate) params.push(`toDate=${toDate}`);
    if (params.length > 0) url += "?" + params.join("&");

    const response = await fetch(url);
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message);
    }

    renderTrialBalance(result.data, result.summary);

  } catch (error) {
    console.error("❌ Error loading trial balance:", error);
    showToast("error", "فشل تحميل بيانات ميزان المراجعة");
  } finally {
    showLoading(false);
  }
}

function renderTrialBalance(data, summary) {
  const tbody = document.getElementById("TrialBalanceBody");
  tbody.innerHTML = "";

  if (!data || data.length === 0) {
    tbody.innerHTML = `
            <tr>
              <td colspan="8" style="text-align: center; padding: 40px;">
                <i class="fa-solid fa-inbox" style="font-size: 48px; color: #ccc; margin-bottom: 16px; display: block;"></i>
                لا توجد بيانات لعرضها
              </td>
            </tr>
          `;
    updateSummary(summary);
    return;
  }

  const typeColors = {
    asset: "Color-Bg-green",
    liability: "Color-Bg-red",
    equity: "Color-Bg-orange",
    revenue: "Color-Bg-blue",
    expense: "Color-Bg-pink"
  };

  data.forEach(row => {
    const tr = document.createElement("tr");
    const openingDisplay = row.openingBalance !== 0
      ? formatNumber(Math.abs(row.openingBalance))
      : "-";

    const closingDisplay = row.closingBalance !== 0
      ? formatNumber(Math.abs(row.closingBalance))
      : "-";

    const balanceNature = row.closingBalance > 0
      ? (row.normalBalance === "debit" ? "مدين" : "دائن")
      : (row.closingBalance < 0
        ? (row.normalBalance === "debit" ? "دائن" : "مدين")
        : "-");

    const balanceClass = row.closingBalance > 0
      ? (row.normalBalance === "debit" ? "debit-cell" : "credit-cell")
      : (row.closingBalance < 0
        ? (row.normalBalance === "debit" ? "credit-cell" : "debit-cell")
        : "");

    const openingClass = row.openingBalance > 0
      ? (row.normalBalance === "debit" ? "debit-cell" : "credit-cell")
      : (row.openingBalance < 0
        ? (row.normalBalance === "debit" ? "credit-cell" : "debit-cell")
        : "");
    tr.innerHTML = `
            <td>${escapeHtml(row.code)}</td>
            <td>${escapeHtml(row.name)}</td>
            <td><span class="status-badge ${typeColors[row.type] || ''}">${escapeHtml(row.typeLabel)}</span></td>
            <td class="${openingClass}">${openingDisplay}</td>
            <td class="debit-cell">${row.periodDebit > 0 ? formatNumber(row.periodDebit) : '-'}</td>
            <td class="credit-cell">${row.periodCredit > 0 ? formatNumber(row.periodCredit) : '-'}</td>
            <td class="${balanceClass}">${closingDisplay}</td>
            <td>${balanceNature}</td>
          `;

    tbody.appendChild(tr);
  });

  updateSummary(summary);

  if (activeTableFilter) {
    activeTableFilter.reinit();
  } else {
    activeTableFilter = new ArbahTable("MainPerfectTable", {
      rowsPerPage: 50
    });
  }
}

function updateSummary(summary) {
  if (!summary) return;

  document.getElementById("TotalPeriodDebit").textContent = formatNumber(summary.totalPeriodDebit || 0) + " ر.س";
  document.getElementById("TotalPeriodCredit").textContent = formatNumber(summary.totalPeriodCredit || 0) + " ر.س";
  document.getElementById("BalanceDiff").textContent = formatNumber(Math.abs(summary.periodDiff || 0)) + " ر.س";

  const statusEl = document.getElementById("Status");
  const statusCard = document.getElementById("StatusCard");

  if (summary.isBalanced) {
    statusEl.innerHTML = "✓ متوازن";
    statusCard.className = "mini-metric-card card-green";
  } else {
    statusEl.innerHTML = "✗ غير متوازن";
    statusCard.className = "mini-metric-card card-red";
  }
  document.getElementById("TrialBalanceBody").innerHTML += `<tr class="Grand-total-row" id="GrandTotalRow">
                    <td colspan="3" style="text-align: center;">الإجمالي</td>
                    <td class="debit-cell" id="GrandOpening">${formatNumber((summary.totalOpeningDebit || 0) + (summary.totalOpeningCredit || 0))}</td>
                    <td class="debit-cell" id="GrandPeriodDebit">${formatNumber(summary.totalPeriodDebit || 0)}</td>
                    <td class="credit-cell" id="GrandPeriodCredit">${formatNumber(summary.totalPeriodCredit || 0)}</td>
                    <td class="debit-cell" id="GrandClosing">${formatNumber((summary.totalClosingDebit || 0) + (summary.totalClosingCredit || 0))}</td>
                    <td></td>
                  </tr>`
}

function formatNumber(num) {
  if (num === 0 || num === null || num === undefined) return "0.00";
  return num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function showLoading(show) {
  const tbody = document.getElementById("TrialBalanceBody");
  if (show) {
    tbody.innerHTML = `
            <tr>
              <td colspan="8" style="text-align: center; padding: 40px;">
                <i class="fa-solid fa-spinner fa-spin" style="font-size: 32px; color: #007bff; margin-bottom: 16px; display: block;"></i>
                جاري تحميل البيانات...
              </td>
            </tr>
          `;
  }
}

function showToast(type, message) {
  if (window.showToast && typeof window.showToast === "function") {
    window.showToast(type, message);
  } else {
    alert(message);
  }
}

function openPrintPopup() {
  let now = new Date();
  // ── بناء صفوف الجدول ──
  const FromDate = document.getElementById('DateFrom');
  const ToDate = document.getElementById('DateTo');
  const DetailsFromDate = document.getElementById('DetailsFromDate');
  const DetailsToDate = document.getElementById('DetailsToDate');
  DetailsFromDate.innerHTML = FromDate.value;
  DetailsToDate.innerHTML = ToDate.value;

  const tbody = document.getElementById('TrialPrintTableBody');
  if (tbody) { tbody.innerHTML = document.getElementById('TrialBalanceBody').innerHTML; }

  const footerEl = document.getElementById('DetailsFooterInfo');
  const TimeDate = document.getElementById('TimeDate');

  if (footerEl) footerEl.innerHTML = "تم إنشاؤها بواسطة: إسلام عبدالرحمن ";
  if (TimeDate) TimeDate.innerHTML = now.toLocaleString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  console.log(now.toLocaleString())
  openPopUpWindow('DetailsPopup');
}
