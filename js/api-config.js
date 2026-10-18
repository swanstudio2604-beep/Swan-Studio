/**
 * SWAN STUDIO — API Client Configuration
 * Brand: Swan Studio | Founder: Bhumika Nama
 * DevOps & Engineering: Mridul
 */

const SWAN_API = {
  getBaseUrl() {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:4000';
    }
    try {
      const custom = localStorage.getItem('swan_backend_url');
      if (custom && custom.trim()) return custom.trim();
    } catch (e) {}
    return window.SWAN_BACKEND_URL || 'https://swan-studio-api.onrender.com';
  },

  async checkHealth() {
    try {
      const res = await fetch(`${this.getBaseUrl()}/health`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn('Backend health check note:', err.message);
      return { status: 'offline', error: err.message };
    }
  },

  async submitContact(data) {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await res.json();
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  async submitCustomOrder(data) {
    try {
      const res = await fetch(`${this.getBaseUrl()}/api/custom-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      return await res.json();
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
};

window.SWAN_API = SWAN_API;
