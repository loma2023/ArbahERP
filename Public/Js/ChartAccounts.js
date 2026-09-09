// =============================================
// ChartAccounts.js — شجرة الحسابات (Optimized)
// =============================================

const API_URL = '/api/Accounts';

// State
let treeData = [];
let expandedNodes = new Set();
let selectedId = null;
let isLoading = false;

// Cache for rendered HTML
const htmlCache = new Map();

// =============================================
// جلب الشجرة من السيرفر
// =============================================
async function fetchAccountTree() {
  if (isLoading) return;
  isLoading = true;

  const container = document.getElementById('AccountTreeContainer');
  if (container) {
    container.innerHTML = `<div style="text-align:center;padding:40px;">
                                <i class="fa-solid fa-spinner fa-spin"></i>
                                <p style="margin-top:10px;color:#6b7280;">جاري تحميل ...</p>
                        </div>`;
  }

  try {
    const res = await fetch(`${API_URL}/tree`);
    const result = await res.json();

    if (!result.success || !result.data?.length) {
      showEmptyState();
      return;
    }

    treeData = result.data;

    // Clear cache when data changes
    htmlCache.clear();

    // افتح الجذر والمستوى الأول تلقائياً
    expandedNodes = new Set(collectIdsByLevel(treeData, [0, 1]));

    // Use requestAnimationFrame for smooth rendering
    requestAnimationFrame(() => {
      renderTree(treeData);
      isLoading = false;
    });

  } catch (err) {
    console.error('Error fetching tree:', err);
    isLoading = false;
    if (typeof ArbahToast !== 'undefined') {
      ArbahToast.error('خطأ في جلب بيانات شجرة الحسابات');
    } else {
      showToast('خطأ في جلب البيانات', 'error');
    }
  }
}

// =============================================
// عرض حالة فارغة
// =============================================
function showEmptyState() {
  const container = document.getElementById('AccountTreeContainer');
  if (container) {
    container.innerHTML = '<div class="empty-state"><i class="fa-solid fa-folder-open"></i><p>لا توجد حسابات مسجلة</p></div>';
  }
}

// =============================================
// جمع IDs حسب المستوى
// =============================================
function collectIdsByLevel(nodes, targetLevels, currentLevel = 0) {
  const ids = [];
  nodes.forEach(node => {
    if (targetLevels.includes(currentLevel)) {
      ids.push(node.id);
    }
    if (node.children?.length) {
      ids.push(...collectIdsByLevel(node.children, targetLevels, currentLevel + 1));
    }
  });
  return ids;
}

// =============================================
// عرض الشجرة (Optimized with DocumentFragment)
// =============================================
function renderTree(nodes) {
  const container = document.getElementById('AccountTreeContainer');
  if (!container) return;

  container.innerHTML = '';

  if (!nodes || nodes.length === 0) {
    showEmptyState();
    return;
  }

  // Use DocumentFragment for better performance
  const fragment = document.createDocumentFragment();

  nodes.forEach(node => {
    const nodeElement = renderNodeElement(node, 0);
    if (nodeElement) {
      fragment.appendChild(nodeElement);
    }
  });

  container.appendChild(fragment);
}

// =============================================
// عرض عنصر واحد (Returns DOM Element instead of string)
// =============================================
function renderNodeElement(node, level) {
  const hasChildren = node.children?.length > 0;
  const isExpanded = expandedNodes.has(node.id);
  const isSelected = selectedId === node.id;

  const icon = hasChildren
    ? (isExpanded ? 'fa-folder-open' : 'fa-folder')
    : 'fa-file';
  const toggleIcon = hasChildren ? (isExpanded ? '−' : '+') : '';
  const nameClass = ['root', 'main', 'sub', 'detail'][level] || 'detail';

  const balanceDisplay = node.isLeaf
    ? `<span class="Tree-Balance">${formatNumber(node.currentBalance || 0)}</span>`
    : '';

  // Create main node container
  const nodeDiv = document.createElement('div');
  nodeDiv.className = 'Tree-Node';

  // Create row
  const rowDiv = document.createElement('div');
  rowDiv.className = `Tree-Row tree-l${level} ${isSelected ? 'selected' : ''}`;
  rowDiv.dataset.id = node.id;
  rowDiv.dataset.code = node.code;
  rowDiv.onclick = () => selectRow(node.id);

  rowDiv.innerHTML = `
    <span class="Tree-Toggle ${hasChildren ? '' : 'leaf'}"
          onclick="event.stopPropagation(); toggleNode('${node.id}')">
      ${toggleIcon}
    </span>
    <i class="fa-regular ${icon} tree-icon"></i>
    <span class="Tree-Name ${nameClass}">${escapeHtml(node.name)}</span>
    <span class="Tree-Code">${node.code}</span>
  `;

  nodeDiv.appendChild(rowDiv);

  // Create children container (only if has children)
  if (hasChildren) {
    const childrenDiv = document.createElement('div');
    childrenDiv.className = `Tree-Children ${isExpanded ? 'expanded' : ''} has-line`;
    childrenDiv.id = `children-${node.id}`;

    // Only render children if expanded (lazy loading)
    if (isExpanded) {
      const childrenFragment = document.createDocumentFragment();
      node.children.forEach(child => {
        const childElement = renderNodeElement(child, level + 1);
        if (childElement) {
          childrenFragment.appendChild(childElement);
        }
      });
      childrenDiv.appendChild(childrenFragment);
    }

    nodeDiv.appendChild(childrenDiv);
  }

  return nodeDiv;
}

// =============================================
// فتح/إغلاق فرع (Optimized - only renders when expanding)
// =============================================
function toggleNode(nodeId) {
  const childrenDiv = document.getElementById(`children-${nodeId}`);
  const toggleBtn = document.querySelector(`.Tree-Row[data-id="${nodeId}"] .Tree-Toggle`);
  const row = document.querySelector(`.Tree-Row[data-id="${nodeId}"]`);

  if (!childrenDiv || !row) return;

  if (expandedNodes.has(nodeId)) {
    // Collapse
    expandedNodes.delete(nodeId);
    childrenDiv.classList.remove('expanded');
    if (toggleBtn) toggleBtn.textContent = '+';

    // Update folder icon
    const icon = row.querySelector('.tree-icon');
    if (icon) icon.className = 'fa-regular fa-folder tree-icon';

  } else {
    // Expand - render children if not already rendered
    expandedNodes.add(nodeId);
    childrenDiv.classList.add('expanded');
    if (toggleBtn) toggleBtn.textContent = '−';

    // Update folder icon
    const icon = row.querySelector('.tree-icon');
    if (icon) icon.className = 'fa-regular fa-folder-open tree-icon';

    // If children div is empty, render them now (lazy loading)
    if (childrenDiv.children.length === 0) {
      const node = findNodeById(treeData, nodeId);
      if (node && node.children) {
        const fragment = document.createDocumentFragment();
        node.children.forEach(child => {
          const childElement = renderNodeElement(child, getNodeLevel(nodeId) + 1);
          if (childElement) {
            fragment.appendChild(childElement);
          }
        });
        childrenDiv.appendChild(fragment);
      }
    }
  }
}

// =============================================
// Helper: Find node by ID in tree
// =============================================
function findNodeById(nodes, id) {
  for (const node of nodes) {
    if (node.id === id) return node;
    if (node.children) {
      const found = findNodeById(node.children, id);
      if (found) return found;
    }
  }
  return null;
}

// =============================================
// Helper: Get node level from DOM
// =============================================
function getNodeLevel(nodeId) {
  const row = document.querySelector(`.Tree-Row[data-id="${nodeId}"]`);
  if (!row) return 0;
  const match = row.className.match(/tree-l([0-9]+)/);
  return match ? parseInt(match[1]) : 0;
}

// =============================================
// توسيع / تقليص الكل
// =============================================
function expandAll() {
  // Use batch processing for better performance
  const allNodes = getAllNodeIds(treeData);
  expandedNodes = new Set(allNodes);

  requestAnimationFrame(() => {
    renderTree(treeData);
  });
}

function collapseAll() {
  expandedNodes.clear();
  // Keep root expanded
  requestAnimationFrame(() => {
    renderTree(treeData);
  });
}

// =============================================
// Helper: Get all node IDs
// =============================================
function getAllNodeIds(nodes) {
  const ids = [];
  nodes.forEach(node => {
    ids.push(node.id);
    if (node.children) {
      ids.push(...getAllNodeIds(node.children));
    }
  });
  return ids;
}

// =============================================
// تحديد صف
// =============================================
function selectRow(id) {
  selectedId = id;
  document.querySelectorAll('.Tree-Row').forEach(r => r.classList.remove('selected'));
  document.querySelector(`.Tree-Row[data-id="${id}"]`)?.classList.add('selected');
}

// =============================================
// جلب تفاصيل الحساب
// =============================================
async function loadAccountDetails(accountId) {
  try {
    const res = await fetch(`${API_URL}/${accountId}`);
    const result = await res.json();

    if (result.success) {
      console.log('Account details:', result.data);
    }
  } catch (err) {
    console.error('Error loading account details:', err);
  }
}

// =============================================
// دوال مساعدة
// =============================================
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatNumber(num) {
  if (num === undefined || num === null) return '0.00';
  return parseFloat(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function showToast(msg, type = 'info') {
  if (typeof ArbahToast !== 'undefined') {
    const method = type === 'error' ? 'error' : type === 'success' ? 'success' : type === 'warning' ? 'warning' : 'info';
    ArbahToast[method](msg);
  } else if (typeof showNotification === 'function') {
    showNotification(msg, type);
  } else {
    console.log(`[${type}] ${msg}`);
  }
}

// =============================================
// Initialize
// =============================================
document.addEventListener('DOMContentLoaded', fetchAccountTree);