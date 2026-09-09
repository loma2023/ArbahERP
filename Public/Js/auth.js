/**
 * ArbahERP - Frontend Auth Helper
 * Handles authentication, token storage, and API requests
 */

const API_BASE_URL = window.location.origin + '/api';

// ─── Token Management ──────────────────────────────────────

const Auth = {
  setToken(token) {
    localStorage.setItem('arbah_token', token);
    document.cookie = `jwt=${token}; path=/; max-age=${7 * 24 * 60 * 60}`;
  },

  getToken() {
    return localStorage.getItem('arbah_token');
  },

  removeToken() {
    localStorage.removeItem('arbah_token');
    localStorage.removeItem('arbah_user');
    document.cookie = 'jwt=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  },

  setUser(user) {
    localStorage.setItem('arbah_user', JSON.stringify(user));
  },

  getUser() {
    const user = localStorage.getItem('arbah_user');
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  hasRole(role) {
    const user = this.getUser();
    return user && user.role === role;
  }
};

// ─── API Helper ────────────────────────────────────────────

const API = {
  async request(endpoint, options = {}) {
    const token = Auth.getToken();
    const url = `${API_BASE_URL}${endpoint}`;

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers
      },
      ...options
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (response.status === 401) {
        Auth.removeToken();
        window.location.replace('/login');
        return;
      }

      return { ok: response.ok, status: response.status, data };
    } catch (error) {
      console.error('API Error:', error);
      return { ok: false, status: 500, data: { message: 'حدث خطأ في الاتصال بالخادم' } };
    }
  },

  // Auth endpoints (כולל الدوال التي تم استرجاعها)
  async register(userData) {
    return this.request('/Users/Register', {
      method: 'POST',
      body: userData
    });
  },

  async verifyOtp(email, otp) {
    return this.request('/Users/Verify-Otp', {
      method: 'POST',
      body: { email, otp }
    });
  },

  async resendOtp(email) {
    return this.request('/Users/Resend-Otp', {
      method: 'POST',
      body: { email }
    });
  },

  async login(credentials) {
    return this.request('/Users/Login', {
      method: 'POST',
      body: credentials
    });
  },

  async forgotPassword(email) {
    return this.request('/Users/Forgot-Password', {
      method: 'POST',
      body: { email }
    });
  },

  async getMe() {
    return this.request('/Users/Me', {
      method: 'GET'
    });
  },

  async logout(e) {
    if (e && e.preventDefault) e.preventDefault();
    try {
      // إرسال طلب الخروج للسيرفر
      await this.request('/Users/Logout', { method: 'POST' });
    } catch (err) {
      console.log('Logout notice:', err);
    } finally {
      // تنظيف شامل وإجباري وتوجيه لصفحة الدخول
      Auth.removeToken();
      localStorage.clear();
      sessionStorage.clear();
      document.cookie = 'jwt=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      window.location.replace('/login');
    }
  }
};

// ─── Route Guard ──────────────────────────────────────────

const RouteGuard = {
  requireAuth() {
    if (!Auth.isAuthenticated()) {
      window.location.replace('/login');
      return false;
    }
    return true;
  },

  redirectIfAuth() {
    if (Auth.isAuthenticated()) {
      window.location.replace('/index');
      return true;
    }
    return false;
  },

  init() {
    const originalFetch = window.fetch;
    window.fetch = function (...args) {
      const token = Auth.getToken();
      if (token && args[1] && !args[1].headers?.Authorization) {
        args[1].headers = {
          ...args[1].headers,
          'Authorization': `Bearer ${token}`
        };
      }
      return originalFetch.apply(this, args);
    };
  }
};

// ─── Toast Notifications ───────────────────────────────────

const Toast = {
  show(message, type = 'info') {
    const existing = document.querySelector('.auth-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `auth-toast auth-toast-${type}`;
    toast.innerHTML = `
      <i class="fa-solid ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-circle-xmark' : 'fa-circle-info'}"></i>
      <span>${message}</span>
    `;

    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  success(message) { this.show(message, 'success'); },
  error(message) { this.show(message, 'error'); },
  info(message) { this.show(message, 'info'); }
};

RouteGuard.init();

window.Auth = Auth;
window.API = API;
window.RouteGuard = RouteGuard;
window.Toast = Toast;