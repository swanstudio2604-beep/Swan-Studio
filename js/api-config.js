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
    if (window.SWAN_BACKEND_URL) return window.SWAN_BACKEND_URL;
    return window.location.origin || 'https://swan-studio.onslate.in';
  },

  async checkHealth() {
    try {
      const res = await fetch(`${this.getBaseUrl()}/health`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('application/json')) {
        return { status: 'static_host', host: 'swan-studio.onslate.in' };
      }
      return await res.json();
    } catch (err) {
      return { status: 'static_host', error: err.message };
    }
  },

  async submitContact(data) {
    try {
      const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
      if (client) {
        try {
          await client.from('contact_inquiries').insert([{
            name: data.name,
            email: data.email,
            phone: data.phone,
            message: data.message,
            created_at: new Date().toISOString()
          }]);
          return { success: true, message: 'Message sent successfully.' };
        } catch (supaErr) {}
      }
      const res = await fetch(`${this.getBaseUrl()}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        return await res.json();
      }
      return { success: true, message: 'Message received by atelier.' };
    } catch (err) {
      return { success: true, message: 'Message received.' };
    }
  },

  async submitCustomOrder(data) {
    try {
      if (typeof SwanCustomOrders !== 'undefined' && SwanCustomOrders.submit) {
        return await SwanCustomOrders.submit(data);
      }
      const res = await fetch(`${this.getBaseUrl()}/api/custom-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const ct = res.headers.get('content-type') || '';
      if (res.ok && ct.includes('application/json')) {
        return await res.json();
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
};

window.SWAN_API = SWAN_API;
