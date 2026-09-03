// ============================================
// ArbahERP SelectOption Engine v3.3
// Professional Smart Auto-Detecting Dropdown Component
// Usage: Add data-select="customer|supplier|representative|costcenter|account" to any field
// ============================================

(function (global) {
  'use strict';

  // ───────────────────────────────────────────
  // Configuration Registry
  // ───────────────────────────────────────────
  const ENTITY_CONFIG = {
    // العملاء
    customer: {
      label: 'اسم العميل',
      placeholder: 'ابحث عن العميل...',
      icon: 'fa-user',
      colorClass: 'Color-Bg-green',
      endpoint: '/api/Customers',
      searchFields: ['name', 'code', 'phone'],
      debounceMs: 200,
      mapItem: (c) => ({
        id: c._id,
        name: c.name,
        code: c.code || '',
        LeftData: c.currentBalance,
        AccountCode: c.linkedAccountCode,
        phone: c.phone || '',
        icon: 'fa-user',
        colorClass: 'Color-Bg-green'
      }),
      renderItem: renderEntityItem
    },

    // الموردين
    supplier: {
      label: 'اسم المورد',
      placeholder: 'ابحث عن المورد...',
      icon: 'fa-truck',
      colorClass: 'Color-Bg-orange',
      endpoint: '/api/Suppliers',
      searchFields: ['name', 'code', 'phone'],
      debounceMs: 200,
      mapItem: (s) => ({
        id: s._id,
        name: s.name,
        code: s.code || '',
        LeftData: s.currentBalance,
        AccountCode: s.linkedAccountCode,
        phone: s.phone || '',
        icon: 'fa-truck',
        colorClass: 'Color-Bg-orange'
      }),
      renderItem: renderEntityItem
    },

    // الفرع
    branch: {
      label: 'الفرع',
      placeholder: 'ابحث عن الفرع...',
      icon: 'fa-location',
      colorClass: 'Color-Bg-blue',
      endpoint: '/api/Branches',
      searchFields: ['name', 'code', 'phone'],
      debounceMs: 200,
      mapItem: (b) => ({
        id: b._id,
        name: b.name,
        code: b.code || '',
        LeftData: b.status,
        AccountCode: b._id,
        phone: b.phone || '',
        icon: 'fa-location-dot',
        colorClass: 'Color-Bg-blue'
      }),
      renderItem: renderEntityItem
    },

    // مراكز التلكفة
    costcenter: {
      label: 'مركز التكلفة',
      placeholder: 'ابحث عن مركز التكلفة...',
      icon: 'fa-sitemap',
      colorClass: 'Color-Bg-purple',
      endpoint: '/api/CostCenters',
      searchFields: ['name', 'code'],
      debounceMs: 200,
      mapItem: (cc) => ({
        id: cc._id,
        name: cc.name,
        code: cc.code || '',
        LeftData: cc.budget || 0,
        AccountCode: cc._id,
        icon: 'fa-sitemap',
        colorClass: 'Color-Bg-purple'
      }),
      renderItem: renderEntityItem
    },

    // المناديب
    SalesReps: {
      label: 'اسم المندوب',
      placeholder: 'ابحث عن المندوب...',
      icon: 'fa-user-tie',
      colorClass: 'Color-Bg-blue',
      endpoint: '/api/SalesReps',
      searchFields: ['name', 'code', 'phone'],
      debounceMs: 200,
      mapItem: (r) => ({
        id: r._id,
        name: r.name,
        code: r.code || '',
        LeftData: r.currentBalance || 0,
        AccountCode: r.linkedAccountCode,
        phone: r.phone || '',
        icon: 'fa-user-tie',
        colorClass: 'Color-Bg-blue'
      }),
      renderItem: renderEntityItem
    },

    // الصناديق 
    cashboxes: {
      label: 'الصندوق',
      placeholder: 'ابحث عن مركز الصندوق...',
      icon: 'fa-box',
      colorClass: 'Color-Bg-purple',
      endpoint: '/api/CashBoxes',
      searchFields: ['name', 'code'],
      debounceMs: 200,
      mapItem: (cb) => ({
        id: cb._id,
        name: cb.name,
        code: cb.code || '',
        LeftData: cb.currentBalance || 0,
        AccountCode: cb.linkedAccountCode,
        icon: 'fa-box',
        colorClass: 'Color-Bg-purple'
      }),
      renderItem: renderEntityItem
    },

    // البنوك 
    Banks: {
      label: 'البنك',
      placeholder: 'ابحث عن مركز البنك...',
      icon: 'fa-building-columns',
      colorClass: 'Color-Bg-purple',
      endpoint: '/api/Banks',
      searchFields: ['name', 'code'],
      debounceMs: 200,
      mapItem: (B) => ({
        id: B._id,
        name: B.name,
        code: B.code || '',
        LeftData: B.currentBalance || 0,
        AccountCode: B.linkedAccountCode,
        icon: 'fa-building-columns',
        colorClass: 'Color-Bg-purple'
      }),
      renderItem: renderEntityItem
    },

    // المخازن 
    Warehouses: {
      label: 'المخزن',
      placeholder: 'ابحث عن مركز المخزن...',
      icon: 'fa-warehouse',
      colorClass: 'Color-Bg-purple',
      endpoint: '/api/Warehouses',
      searchFields: ['name', 'code', 'phone'],
      debounceMs: 200,
      mapItem: (W) => ({
        id: W._id,
        name: W.name,
        code: W.code || '',
        LeftData: W.status || 0,
        AccountCode: W._id,
        phone: W.phone,
        icon: 'fa-warehouse',
        colorClass: 'Color-Bg-blue'
      }),
      renderItem: renderEntityItem
    },

    // المصاريف 
    Expenses: {
      label: 'عنصر الاب',
      placeholder: 'ابحث عن عنصر الاب ...',
      icon: 'fa-building',
      colorClass: 'Color-Bg-purple',
      endpoint: '/api/Expenses',
      searchFields: ['name', 'code'],
      debounceMs: 200,
      mapItem: (EX) => ({
        id: EX._id,
        name: EX.name,
        code: EX.code || '',
        LeftData: EX.linkedAccountCode || 0,
        AccountCode: EX.linkedAccountCode,
        icon: 'fa-building',
        colorClass: 'Color-Bg-blue'
      }),
      renderItem: renderEntityItem
    },

    // ايرادات 
    Revenues: {
      label: 'عنصر الاب',
      placeholder: 'ابحث عن عنصر الاب ...',
      icon: 'fa-building',
      colorClass: 'Color-Bg-purple',
      endpoint: '/api/Revenues',
      searchFields: ['name', 'code'],
      debounceMs: 200,
      valueField: '_id',
      displayField: 'name',
      mapItem: (RV) => ({
        id: RV._id,
        name: RV.name,
        code: RV.code || '',
        LeftData: RV.linkedAccountCode || 0,
        AccountCode: RV.linkedAccountCode || 0,
        icon: 'fa-building',
        colorClass: 'Color-Bg-blue'
      }),
      renderItem: renderEntityItem
    },

    // ═══════════════════════════════════════════
    // الحسابات المحاسبية (للقيود اليومية)
    // ═══════════════════════════════════════════
    account: {
      label: 'الحساب',
      placeholder: 'اختر الحساب...',
      icon: 'fa-book',
      colorClass: 'Color-Bg-blue',
      // ✅ endpoint جديد: بس الحسابات النهائية اللي ينفع تسجل عليها
      endpoint: '/api/Accounts/leaves?allowTransactions=true',
      searchFields: ['name', 'code'],
      debounceMs: 200,
      mapItem: (acc) => ({
        id: acc._id,
        name: acc.name,
        code: acc.code || '',
        // LeftData: acc.currentBalance !== undefined ? formatNumber(acc.currentBalance) : '',
        LeftData: acc.currentBalance,
        AccountCode: acc.code || 0,
        type: acc.type || '',
        icon: 'fa-book',
        colorClass: acc.type === 'asset' ? 'Color-Bg-green' :
          acc.type === 'liability' ? 'Color-Bg-red' :
            acc.type === 'equity' ? 'Color-Bg-purple' :
              acc.type === 'revenue' ? 'Color-Bg-blue' :
                acc.type === 'expense' ? 'Color-Bg-orange' : 'Color-Bg-gray'
      }),
      renderItem: renderEntityItem
    },

    Customeraccount: {
      label: 'اسم العميل',
      placeholder: 'ابحث عن العميل...',
      icon: 'fa-user',
      colorClass: 'Color-Bg-green',
      endpoint: '/api/Customers',
      searchFields: ['name', 'code', 'phone'],
      debounceMs: 200,
      mapItem: (c) => ({
        id: c.linkedAccount._id,
        name: c.name,
        code: c.code || '',
        LeftData: c.currentBalance,
        AccountCode: c.linkedAccountCode || 0,
        phone: c.phone || '',
        icon: 'fa-user',
        colorClass: 'Color-Bg-green'
      }),
      renderItem: renderEntityItem
    },
  };

  function renderEntityItem(item, searchTerm = '') {
    return `
      <div class="Name-Cell">
        <i class="fa-solid ${item.icon} ${item.colorClass}"></i>
        <div class="Name-Cell-info">
          <span class="name">${highlightText(item.name, searchTerm)}</span>
          <span class="code">${highlightText(item.code, searchTerm)}</span>
        </div>
      </div>
      <div class="SelectOption-Item-Balance">${item.LeftData}</div>`
  }

  // ───────────────────────────────────────────
  // Generic Fetch Helper
  // ───────────────────────────────────────────
  async function fetchFromEndpoint(endpoint, mapper) {
    try {
      const res = await fetch(endpoint);
      if (!res.ok) {
        console.warn(`[SelectOption] API not found: ${endpoint}, returning empty`);
        return [];
      }
      const result = await res.json();
      if (!result.success) throw new Error(result.message);
      return (result.data || []).map(mapper);
    } catch (err) {
      console.warn(`[SelectOption] Fetch error: ${err.message}`);
      return [];
    }
  }

  // ───────────────────────────────────────────
  // SelectDropdown Class
  // ───────────────────────────────────────────
  class SelectDropdown {
    constructor(container, entityType) {
      this.container = container;
      this.entityType = entityType;
      this.config = ENTITY_CONFIG[entityType];
      this.id = `select-${entityType}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

      this.items = [];
      this.filteredItems = [];
      this.selectedItem = null;
      this.isOpen = false;
      this.searchTimeout = null;
      this.activeIndex = -1;
      this.currentSearchTerm = '';
      this.isDestroyed = false;

      this._cacheDOM();
      this._bindEvents();
    }

    _cacheDOM() {
      this.input = this.container.querySelector('.select-search');
      this.hiddenInput = this.container.querySelector('.select-value');
      this.icon = this.container.querySelector('.select-icon');
      this.dropdown = this.container.querySelector('.SelectOptionDropdown');
      this.content = this.container.querySelector('.select-content');

      if (!this.input || !this.dropdown || !this.content) {
        throw new Error(`[SelectDropdown] Missing required elements in container: ${this.entityType}`);
      }
    }

    _bindEvents() {
      this._onInput = this._onInput.bind(this);
      this._onKeydown = this._onKeydown.bind(this);
      this._onFocus = this._onFocus.bind(this);
      this._onDocumentClick = this._onDocumentClick.bind(this);

      this.input.addEventListener('input', this._onInput);
      this.input.addEventListener('keydown', this._onKeydown);
      this.input.addEventListener('focus', this._onFocus);
      document.addEventListener('click', this._onDocumentClick);

      this._onContentClick = (e) => {
        const item = e.target.closest('.SelectOption-Item');
        if (item) this._selectItem(parseInt(item.dataset.index));
      };
      this.content.addEventListener('click', this._onContentClick);
    }

    async loadData() {
      if (!this.config || this.isDestroyed) return;

      try {
        this._setLoading(true);
        const data = await fetchFromEndpoint(this.config.endpoint, (item) => {
          const mapped = this.config.mapItem(item);
          mapped._entityType = this.entityType;
          return mapped;
        });
        this.items = data;
        this.filteredItems = [...data];
        this._renderList(data);
      } catch (err) {
        console.error(`[SelectDropdown ${this.id}] Error:`, err);
        this._renderMessage('خطأ في تحميل البيانات', 'error');
      } finally {
        this._setLoading(false);
      }
    }

    _renderList(items) {
      this.filteredItems = items;
      this.activeIndex = -1;

      if (!items.length) {
        this._renderMessage('لا يوجد نتائج', 'empty');
        return;
      }

      const renderFn = this.config.renderItem || renderEntityItem;
      this.content.innerHTML = items.map((item, index) => `
        <div class="SelectOption-Item" data-index="${index}" data-id="${item.id || ''}">
          ${renderFn(item, this.currentSearchTerm)}
        </div>
      `).join('');
    }

    _renderMessage(text, type) {
      const icon = type === 'error' ? 'fa-circle-exclamation' : 'fa-search';
      this.content.innerHTML = `
        <div class="SelectOption-Item ${type}">
          <i class="fa-solid ${icon}"></i>
          <span>${text}</span>
        </div>`;
    }

    _setLoading(isLoading) {
      this.container.classList.toggle('loading', isLoading);
    }

    _onInput(e) {
      if (this.isDestroyed) return;
      const term = e.target.value.trim();
      this.currentSearchTerm = term;
      clearTimeout(this.searchTimeout);

      if (!term) {
        this._renderList(this.items);
        this.open();
        return;
      }

      const debounceMs = this.config.debounceMs || 200;
      this.searchTimeout = setTimeout(() => this._filter(term), debounceMs);
    }

    _filter(term) {
      if (this.isDestroyed) return;
      const lower = term.toLowerCase();
      const fields = this.config.searchFields || ['name', 'code'];

      const filtered = this.items.filter(item =>
        fields.some(field => {
          const val = String(item[field] || '').toLowerCase();
          return val.includes(lower);
        })
      );

      this._renderList(filtered);
      this.open();
    }

    _selectItem(index) {
      if (this.isDestroyed) return;
      const item = this.filteredItems[index];
      if (!item) return;

      this.selectedItem = item;
      // For accounts, show "code - name" in input
      this.input.value = item.code ? `${item.code} - ${item.name}` : (item.name || '');
      if (this.hiddenInput) this.hiddenInput.value = item.id || '';
      if (this.hiddenInput) { this.hiddenInput.setAttribute('AccountCode', item.AccountCode || ''); }

      if (this.icon && item.icon) {
        this.icon.className = `fa-solid ${item.icon} ${item.colorClass || ''}`;
      }

      this.close();

      if (typeof this.config.onSelect === 'function') {
        this.config.onSelect(item, this);
      }

      this.container.dispatchEvent(new CustomEvent('select:change', {
        detail: { item, entityType: this.entityType, instance: this },
        bubbles: true
      }));
    }

    selectById(id) {
      if (this.isDestroyed) return;
      const item = this.items.find(i => i.id === id);
      if (item) {
        const idx = this.filteredItems.indexOf(item);
        if (idx !== -1) this._selectItem(idx);
      }
    }

    clear() {
      if (this.isDestroyed) return;
      this.selectedItem = null;
      this.currentSearchTerm = '';
      this.input.value = '';
      if (this.hiddenInput) this.hiddenInput.value = '';
      this._renderList(this.items);
    }

    getValue() {
      return this.hiddenInput ? this.hiddenInput.value : null;
    }

    getSelectedItem() {
      return this.selectedItem;
    }

    open() {
      if (this.isDestroyed || this.isOpen) return;
      this._closeAll();
      this.dropdown.classList.add('active');
      this.isOpen = true;
      if (!this.items.length) this.loadData();
    }

    close() {
      if (this.isDestroyed || !this.isOpen) return;
      this.dropdown.classList.remove('active');
      this.isOpen = false;
      this.activeIndex = -1;
      // ✅ Clear keyboard highlight when closing
      this._clearActiveHighlight();
    }

    toggle() {
      this.isDestroyed ? void 0 : (this.isOpen ? this.close() : this.open());
    }

    _closeAll() {
      document.querySelectorAll('.SelectOptionDropdown.active').forEach(d => d.classList.remove('active'));
    }

    // ✅ NEW: Clear all active highlights from items
    _clearActiveHighlight() {
      const items = this.content.querySelectorAll('.SelectOption-Item[data-index]');
      items.forEach(el => el.classList.remove('active', 'keyboard-active'));
    }

    // ✅ NEW: Set active highlight on a specific item by index
    _setActiveItem(index) {
      const items = this.content.querySelectorAll('.SelectOption-Item[data-index]');
      items.forEach((el, i) => {
        // Remove both classes first
        el.classList.remove('active', 'keyboard-active');
        // Add to the target item
        if (i === index) {
          el.classList.add('active', 'keyboard-active');
        }
      });
      this.activeIndex = index;
    }

    _onKeydown(e) {
      if (this.isDestroyed) return;
      const items = this.content.querySelectorAll('.SelectOption-Item[data-index]');
      if (!items.length) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          if (!this.isOpen) { this.open(); return; }
          this.activeIndex = (this.activeIndex + 1) % items.length;
          this._setActiveItem(this.activeIndex);
          break;
        case 'ArrowUp':
          e.preventDefault();
          if (!this.isOpen) { this.open(); return; }
          this.activeIndex = this.activeIndex <= 0 ? items.length - 1 : this.activeIndex - 1;
          this._setActiveItem(this.activeIndex);
          break;
        case 'Enter':
          e.preventDefault();
          if (!this.isOpen) { this.open(); return; }
          if (this.activeIndex >= 0 && items[this.activeIndex]) {
            this._selectItem(parseInt(items[this.activeIndex].dataset.index));
          } else if (items.length) {
            this._selectItem(0);
          }
          return;
        case 'Escape':
          this.close();
          return;
        default: return;
      }

      // ✅ Scroll active item into view
      const activeItem = items[this.activeIndex];
      if (activeItem) {
        activeItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }

    _onFocus() {
      if (!this.isOpen && !this.isDestroyed) this.open();
    }

    _onDocumentClick(e) {
      if (!this.container.contains(e.target)) this.close();
    }

    destroy() {
      if (this.isDestroyed) return;
      this.isDestroyed = true;

      clearTimeout(this.searchTimeout);
      this.input.removeEventListener('input', this._onInput);
      this.input.removeEventListener('keydown', this._onKeydown);
      this.input.removeEventListener('focus', this._onFocus);
      document.removeEventListener('click', this._onDocumentClick);
      this.content.removeEventListener('click', this._onContentClick);

      this.close();

      if (global.selectManager && global.selectManager.instances) {
        global.selectManager.instances.delete(this.id);
      }

      this.container = null;
      this.input = null;
      this.hiddenInput = null;
      this.icon = null;
      this.dropdown = null;
      this.content = null;
      this.items = null;
      this.filteredItems = null;
      this.selectedItem = null;
      this.config = null;
    }
  }

  // ───────────────────────────────────────────
  // SelectManager - Auto-Initializer
  // ───────────────────────────────────────────
  class SelectManager {
    constructor() {
      this.instances = new Map();
      this._initGlobalListeners();
    }

    init(container, customConfig = {}) {
      const el = typeof container === 'string' ? document.querySelector(container) : container;
      if (!el) {
        console.error(`[SelectManager] Container not found: ${container}`);
        return null;
      }

      const entityType = el.dataset.select;
      if (!entityType) {
        console.error(`[SelectManager] Missing data-select attribute on:`, el);
        return null;
      }

      const baseConfig = ENTITY_CONFIG[entityType];
      if (!baseConfig) {
        console.error(`[SelectManager] Unknown entity type: "${entityType}"`);
        console.error(`Available types: ${Object.keys(ENTITY_CONFIG).join(', ')}`);
        return null;
      }

      if (customConfig.onSelect) baseConfig.onSelect = customConfig.onSelect;
      if (customConfig.searchFields) baseConfig.searchFields = customConfig.searchFields;
      if (customConfig.debounceMs) baseConfig.debounceMs = customConfig.debounceMs;

      const instance = new SelectDropdown(el, entityType);
      this.instances.set(instance.id, instance);

      const label = el.querySelector('label');
      if (label && baseConfig.label) label.textContent = baseConfig.label;
      if (instance.input && baseConfig.placeholder) instance.input.placeholder = baseConfig.placeholder;
      if (instance.icon && baseConfig.icon) instance.icon.className = `fa ${baseConfig.icon}`;

      return instance;
    }

    initAll(scope = document) {
      const containers = scope.querySelectorAll('[data-select]');
      containers.forEach(container => this.init(container));
    }

    get(id) {
      return this.instances.get(id);
    }

    closeAll() {
      this.instances.forEach(i => i.close());
    }

    destroyAll() {
      this.instances.forEach(i => i.destroy());
      this.instances.clear();
    }

    _initGlobalListeners() {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.closeAll();
      });
    }
  }

  // ───────────────────────────────────────────
  // Utility Functions
  // ───────────────────────────────────────────
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function highlightText(text, searchTerm) {
    if (!searchTerm || !text) return escapeHtml(text);
    const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedTerm})`, 'gi');
    return escapeHtml(text).replace(regex, '<mark class="search-highlight">$1</mark>');
  }

  function formatNumber(num) {
    if (num == null) return '0.00';
    return parseFloat(num).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  // ───────────────────────────────────────────
  // Global Exports
  // ───────────────────────────────────────────
  const selectManager = new SelectManager();

  global.SelectManager = SelectManager;
  global.SelectDropdown = SelectDropdown;
  global.selectManager = selectManager;
  global.ENTITY_CONFIG = ENTITY_CONFIG;

  document.addEventListener('DOMContentLoaded', () => {
    selectManager.initAll();
  });

})(window);