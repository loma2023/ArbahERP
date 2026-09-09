let activeTableFilter = null;

document.addEventListener("DOMContentLoaded", function () {
  const now = new Date();
  const currentYear = now.getFullYear();
  const prevYear = currentYear - 1;

  document.getElementById("DateFrom").value = `${currentYear}-01-01`;
  document.getElementById("DateTo").value = `${currentYear}-12-31`;
  document.getElementById("PrevDateFrom").value = `${prevYear}-01-01`;
  document.getElementById("PrevDateTo").value = `${prevYear}-12-31`;

  loadIncomeStatement();
});

async function loadIncomeStatement() {
  const fromDate = document.getElementById("DateFrom")?.value || "";
  const toDate = document.getElementById("DateTo")?.value || "";
  const prevFromDate = document.getElementById("PrevDateFrom")?.value || "";
  const prevToDate = document.getElementById("PrevDateTo")?.value || "";

  try {
    showLoading(true);

    let url = "/api/IncomeStatement";
    const params = [];
    if (fromDate) params.push(`fromDate=${fromDate}`);
    if (toDate) params.push(`toDate=${toDate}`);
    if (prevFromDate) params.push(`prevFromDate=${prevFromDate}`);
    if (prevToDate) params.push(`prevToDate=${prevToDate}`);
    if (params.length > 0) url += "?" + params.join("&");

    const response = await fetch(url);
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message);
    }

    renderIncomeStatement(result.data, result.summary);

  } catch (error) {
    console.error("❌ Error loading income statement:", error);
    showToast("error", "فشل تحميل بيانات قائمة الدخل");
  } finally {
    showLoading(false);
  }
}

function renderIncomeStatement(data, summary) {
  const tbody = document.getElementById("StatementBody");
  tbody.innerHTML = "";

  const sections = data.sections || [];
  const currentRev = summary.currentYear.totalRevenue || 1;
  const prevRev = summary.prevYear.totalRevenue || 1;

  if (sections.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px;">
          <i class="fa-solid fa-inbox" style="font-size: 48px; color: #ccc; display: block;"></i>
          لا توجد بيانات لعرضها
        </td>
      </tr>
    `;
    updateSummary(summary);
    return;
  }

  let lastGrandTitle = "صافي الربح";

  sections.forEach(section => {
    const tr = document.createElement("tr");

    if (section.type === "category") {
      // عنوان القسم
      tr.className = "Category-Row";
      tr.innerHTML = `
        <td colspan="7">
          <i class="fa-solid ${section.icon}" style="color: ${section.color};"></i> ${escapeHtml(section.title)}
        </td>
      `;
    } else if (section.type === "item") {
      // بند فرعي
      tr.className = "sub-item";
      const currentPct = currentRev > 0 ? ((section.currentYear / currentRev) * 100).toFixed(2) : 0;
      const prevPct = prevRev > 0 ? ((section.prevYear / prevRev) * 100).toFixed(2) : 0;
      const changeIcon = section.changeAmount >= 0 ? "▲" : "▼";
      const changeColor = section.changeAmount >= 0 ? "#2e7d32" : "#c62828";

      tr.innerHTML = `
        <td>${escapeHtml(section.name)}</td>
        <td class="amount-cell">${formatNumber(section.currentYear)}</td>
        <td class="amount-cell">${currentPct}%</td>
        <td class="amount-cell">${formatNumber(section.prevYear)}</td>
        <td class="amount-cell">${prevPct}%</td>
        <td style="color: ${changeColor};">${changeIcon} ${formatNumber(Math.abs(section.changeAmount))}</td>
        <td style="color: ${changeColor};">${section.changePercent.toFixed(2)}%</td>
      `;
    } else if (section.type === "subtotal") {
      // إجمالي القسم
      tr.className = "total-row";
      tr.style.fontWeight = "700";
      const currentPct = currentRev > 0 ? ((section.currentYear / currentRev) * 100).toFixed(2) : 0;
      const prevPct = prevRev > 0 ? ((section.prevYear / prevRev) * 100).toFixed(2) : 0;
      const changeIcon = section.changeAmount >= 0 ? "▲" : "▼";
      const changeColor = section.changeAmount >= 0 ? "#2e7d32" : "#c62828";

      tr.innerHTML = `
        <td>${escapeHtml(section.title)}</td>
        <td class="amount-cell ${section.isPositive ? 'positive' : 'negative'}" style="font-weight: 700;">${formatNumber(section.currentYear)}</td>
        <td class="amount-cell">${currentPct}%</td>
        <td class="amount-cell">${formatNumber(section.prevYear)}</td>
        <td class="amount-cell">${prevPct}%</td>
        <td style="color: ${changeColor}; font-weight: 700;">${changeIcon} ${formatNumber(Math.abs(section.changeAmount))}</td>
        <td style="color: ${changeColor}; font-weight: 700;">${section.changePercent.toFixed(2)}%</td>
      `;
    } else if (section.type === "total") {
      // إجمالي وسيط (مجمل ربح، ربح تشغيلي، صافي قبل الضريبة)
      tr.className = "total-row";
      tr.style.backgroundColor = "#f0f7ff";
      tr.style.fontWeight = "700";
      const changeIcon = section.changeAmount >= 0 ? "▲" : "▼";
      const changeColor = section.changeAmount >= 0 ? "#2e7d32" : "#c62828";

      tr.innerHTML = `
        <td style="font-weight: 700; padding-right: 24px;">${escapeHtml(section.title)}</td>
        <td class="amount-cell ${section.isPositive ? 'positive' : 'negative'}" style="font-weight: 700;">${formatNumber(section.currentYear)}</td>
        <td class="amount-cell"></td>
        <td class="amount-cell">${formatNumber(section.prevYear)}</td>
        <td class="amount-cell"></td>
        <td style="color: ${changeColor}; font-weight: 700;">${changeIcon} ${formatNumber(Math.abs(section.changeAmount))}</td>
        <td style="color: ${changeColor}; font-weight: 700;">${section.changePercent.toFixed(2)}%</td>
      `;
    } else if (section.type === "grand-total") {
      // صافي الربح / الخسارة النهائي
      tr.className = "Grand-total-row";
      lastGrandTitle = section.title;
      const changeIcon = section.changeAmount >= 0 ? "▲" : "▼";
      const changeColor = section.changeAmount >= 0 ? "#2e7d32" : "#c62828";

      tr.innerHTML = `
        <td style="font-weight: 700;">${escapeHtml(section.title)}</td>
        <td class="amount-cell ${section.isPositive ? 'positive' : 'negative'}" style="font-weight: 700;">${formatNumber(section.currentYear)}</td>
        <td class="amount-cell"></td>
        <td class="amount-cell">${formatNumber(section.prevYear)}</td>
        <td class="amount-cell"></td>
        <td style="color: ${changeColor}; font-weight: 700;">${changeIcon} ${formatNumber(Math.abs(section.changeAmount))}</td>
        <td style="color: ${changeColor}; font-weight: 700;">${section.changePercent.toFixed(2)}%</td>
      `;
    }
    tbody.appendChild(tr);
  });

  // Update the net profit text in summary cards
  const netProfitTxt = document.getElementById("NetProfitTxt");
  if (netProfitTxt) netProfitTxt.textContent = lastGrandTitle;

  updateSummary(summary);

  if (activeTableFilter) {
    activeTableFilter.reinit();
  } else {
    activeTableFilter = new ArbahTable("MainPerfectTable", {
      rowsPerPage: 100
    });
  }
}

function updateSummary(summary) {
  if (!summary) return;
  const cur = summary.currentYear;

  // Update summary cards if elements exist
  const totalRevenueEl = document.getElementById("TotalRevenue");
  const totalCOGSEl = document.getElementById("TotalCOGS");
  const grossProfitEl = document.getElementById("GrossProfit");
  const netProfitEl = document.getElementById("NetProfit");

  if (totalRevenueEl) {
    totalRevenueEl.textContent = formatNumber(cur.totalRevenue || 0) + " ر.س";
  }

  if (totalCOGSEl) {
    totalCOGSEl.textContent = formatNumber(cur.totalCOGS || 0) + " ر.س";
  }

  if (grossProfitEl) {
    const gross = cur.grossProfit || 0;
    grossProfitEl.textContent = formatNumber(Math.abs(gross)) + " ر.س";
    grossProfitEl.style.color = gross >= 0 ? "var(--accent-green)" : "var(--accent-red)";
  }

  if (netProfitEl) {
    const net = cur.netIncome || 0;
    netProfitEl.textContent = formatNumber(Math.abs(net)) + " ر.س";
    netProfitEl.style.color = net >= 0 ? "var(--accent-green)" : "var(--accent-red)";
  }
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
  const tbody = document.getElementById("StatementBody");
  if (show) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px;">
          <i class="fa-solid fa-spinner fa-spin" style="font-size: 32px; color: #007bff; display: block;"></i>
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
  const FromDate = document.getElementById('DateFrom');
  const ToDate = document.getElementById('DateTo');
  const DetailsFromDate = document.getElementById('DetailsFromDate');
  const DetailsToDate = document.getElementById('DetailsToDate');

  if (DetailsFromDate) DetailsFromDate.innerHTML = FromDate ? FromDate.value : '';
  if (DetailsToDate) DetailsToDate.innerHTML = ToDate ? ToDate.value : '';

  const tbody = document.getElementById('StatementPrintBody');
  if (tbody) { tbody.innerHTML = document.getElementById('StatementBody').innerHTML; }

  const footerEl = document.getElementById('DetailsFooterInfo');
  const TimeDate = document.getElementById('TimeDate');

  if (footerEl) footerEl.innerHTML = "تم إنشاؤها بواسطة: إسلام عبدالرحمن ";
  if (TimeDate) TimeDate.innerHTML = now.toLocaleString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });

  openPopUpWindow('DetailsPopup');
}