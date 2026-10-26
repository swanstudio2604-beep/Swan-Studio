/**
 * SWAN STUDIO — Coupon Management & Trusted Validation
 * Brand: Swan Studio | Founder: Bhumika Nama
 * Tagline: Every Stitch Tells a Story.
 * 
 * SECURITY RULES (PRD Section 10 & 15):
 * 1. Client discount calculations are advisory previews only.
 * 2. True discounts are validated and enforced server-side via Supabase RPC validate_coupon() & place_order().
 * 3. In offline/demo mode, localStorage simulates the exact rules (caps, min orders, limits).
 */

const DEFAULT_DEMO_COUPONS = [
  {
    id: 'c1-swanfirst',
    code: 'SWANFIRST',
    discount_type: 'PERCENTAGE',
    discount_value: 10,
    min_order_amount: 499,
    max_discount_cap: 200,
    total_usage_limit: 500,
    per_customer_limit: 1,
    times_used: 14,
    start_date: '2026-01-01T00:00:00Z',
    expiry_date: null,
    is_active: true,
    created_at: '2026-01-01T10:00:00Z'
  },
  {
    id: 'c2-bhumika100',
    code: 'BHUMIKA100',
    discount_type: 'FIXED',
    discount_value: 100,
    min_order_amount: 799,
    max_discount_cap: null,
    total_usage_limit: 200,
    per_customer_limit: 1,
    times_used: 28,
    start_date: '2026-01-01T00:00:00Z',
    expiry_date: null,
    is_active: true,
    created_at: '2026-01-15T10:00:00Z'
  },
  {
    id: 'c3-festive20',
    code: 'FESTIVE20',
    discount_type: 'PERCENTAGE',
    discount_value: 20,
    min_order_amount: 1299,
    max_discount_cap: 400,
    total_usage_limit: 100,
    per_customer_limit: 1,
    times_used: 5,
    start_date: '2026-01-01T00:00:00Z',
    expiry_date: null,
    is_active: true,
    created_at: '2026-02-01T10:00:00Z'
  }
];

const SwanCoupons = {
  APPLIED_KEY: 'swan_applied_coupon',
  STORAGE_KEY: 'swan_admin_coupons',

  /**
   * Helper to load coupons from localStorage fallback
   */
  getLocal() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(DEFAULT_DEMO_COUPONS));
      return DEFAULT_DEMO_COUPONS.slice();
    } catch {
      return DEFAULT_DEMO_COUPONS.slice();
    }
  },

  /**
   * Helper to persist coupons to localStorage fallback
   */
  saveLocal(list) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to save coupons to local storage:', e);
    }
  },

  /**
   * Retrieves the coupon catalog (Supabase if live, otherwise demo storage)
   */
  async getAll() {
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
    if (client) {
      try {
        const { data, error } = await client
          .from('coupons')
          .select('*')
          .order('created_at', { ascending: false });
        if (!error && data && Array.isArray(data) && data.length > 0) {
          this.saveLocal(data);
          return data;
        }
      } catch (e) {
        console.warn('Supabase fetch coupons failed, using local fallback:', e);
      }
    }

    return this.getLocal();
  },

  /**
   * Validates a coupon code against bag subtotal and user
   */
  async validate(rawCode, subtotal, userId = null) {
    const code = (rawCode || '').trim().toUpperCase();
    if (!code) {
      return { valid: false, message: 'Please enter a coupon code.' };
    }

    const sub = parseFloat(subtotal) || 0;
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;

    if (client) {
      try {
        const { data, error } = await client.rpc('validate_coupon', {
          p_code: code,
          p_subtotal: sub,
          p_user_id: userId
        });
        if (!error && data && typeof data.valid === 'boolean') {
          return data;
        }
        // If error message indicates missing schema/table/function, fall through to local fallback
        console.warn('Supabase RPC validate_coupon returned error/missing, using fallback:', error ? error.message : 'no data');
      } catch (e) {
        console.warn('Supabase RPC validate_coupon failed, using fallback:', e);
      }
    }

    // Resilient Fallback Validation
    const all = await this.getAll();
    const coupon = all.find(c => (c.code || '').toUpperCase() === code);

    if (!coupon) {
      return { valid: false, message: `Coupon "${code}" is invalid or does not exist.` };
    }

    if (!coupon.is_active) {
      return { valid: false, message: `Coupon "${code}" is currently deactivated.` };
    }

    const now = new Date();
    if (coupon.start_date && new Date(coupon.start_date) > now) {
      return { valid: false, message: `Coupon "${code}" is not yet active.` };
    }
    if (coupon.expiry_date && new Date(coupon.expiry_date) < now) {
      return { valid: false, message: `Coupon "${code}" has expired.` };
    }

    const minAmount = parseFloat(coupon.min_order_amount) || 0;
    if (sub < minAmount) {
      return {
        valid: false,
        message: `This coupon requires a minimum bag value of ₹${minAmount.toFixed(2)}. Add ₹${(minAmount - sub).toFixed(2)} more to apply!`
      };
    }

    if (coupon.total_usage_limit && coupon.times_used >= coupon.total_usage_limit) {
      return { valid: false, message: `Coupon "${code}" has reached its maximum total redemptions.` };
    }

    let discount = 0;
    if (coupon.discount_type === 'PERCENTAGE') {
      discount = (sub * (parseFloat(coupon.discount_value) / 100));
      if (coupon.max_discount_cap && discount > parseFloat(coupon.max_discount_cap)) {
        discount = parseFloat(coupon.max_discount_cap);
      }
    } else {
      discount = parseFloat(coupon.discount_value);
    }

    discount = Math.min(discount, sub); // discount cannot exceed subtotal
    discount = Math.round(discount * 100) / 100;

    return {
      valid: true,
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: parseFloat(coupon.discount_value),
      discount_amount: discount,
      message: `Coupon "${coupon.code}" applied! You saved ₹${discount.toFixed(2)}.`
    };
  },

  /**
   * Applies coupon to current session
   */
  async apply(code, subtotal, userId = null) {
    const res = await this.validate(code, subtotal, userId);
    if (res.valid) {
      sessionStorage.setItem(this.APPLIED_KEY, JSON.stringify(res));
    }
    return res;
  },

  /**
   * Gets currently applied coupon
   */
  getApplied() {
    try {
      const raw = sessionStorage.getItem(this.APPLIED_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  /**
   * Removes currently applied coupon
   */
  removeApplied() {
    sessionStorage.removeItem(this.APPLIED_KEY);
  },

  /**
   * Admin: Creates a new coupon
   */
  async create(couponData) {
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
    const formatted = {
      code: couponData.code.trim().toUpperCase(),
      discount_type: couponData.discount_type,
      discount_value: parseFloat(couponData.discount_value),
      min_order_amount: parseFloat(couponData.min_order_amount) || 0.00,
      max_discount_cap: couponData.max_discount_cap ? parseFloat(couponData.max_discount_cap) : null,
      total_usage_limit: couponData.total_usage_limit ? parseInt(couponData.total_usage_limit, 10) : null,
      per_customer_limit: couponData.per_customer_limit ? parseInt(couponData.per_customer_limit, 10) : 1,
      start_date: couponData.start_date || new Date().toISOString(),
      expiry_date: couponData.expiry_date || null,
      is_active: couponData.is_active !== false,
      times_used: 0
    };

    let remoteCreated = null;
    if (client) {
      try {
        const { data, error } = await client.from('coupons').insert([formatted]).select().single();
        if (!error && data) {
          remoteCreated = data;
        } else if (error) {
          console.warn('Supabase coupon create failed, saving locally:', error.message);
        }
      } catch (err) {
        console.warn('Supabase coupon create exception:', err);
      }
    }

    // Local Storage synchronization
    const all = this.getLocal();
    if (all.some(c => (c.code || '').toUpperCase() === formatted.code && (!remoteCreated || c.id !== remoteCreated.id))) {
      if (!remoteCreated) {
        throw new Error(`A coupon with code "${formatted.code}" already exists.`);
      }
    }

    const newCoupon = remoteCreated || {
      ...formatted,
      id: 'coupon-' + Date.now(),
      created_at: new Date().toISOString()
    };

    // Prepend and save
    all.unshift(newCoupon);
    this.saveLocal(all);
    return newCoupon;
  },

  /**
   * Admin: Toggles coupon active state
   */
  async toggleActive(id) {
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
    const all = this.getLocal();
    const target = all.find(c => String(c.id) === String(id));
    const newState = target ? !target.is_active : false;

    if (client) {
      try {
        const { error } = await client.from('coupons').update({ is_active: newState }).eq('id', id);
        if (error) {
          console.warn('Supabase toggleActive failed, persisting locally:', error.message);
        }
      } catch (err) {
        console.warn('Supabase toggleActive exception:', err);
      }
    }

    if (target) {
      target.is_active = newState;
      this.saveLocal(all);
      return newState;
    }

    return newState;
  },

  /**
   * Admin: Deletes coupon
   */
  async delete(id) {
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
    if (client) {
      try {
        const { error } = await client.from('coupons').delete().eq('id', id);
        if (error) {
          console.warn('Supabase delete coupon failed, deleting locally:', error.message);
        }
      } catch (err) {
        console.warn('Supabase delete coupon exception:', err);
      }
    }

    // Always update local storage
    const all = this.getLocal();
    const filtered = all.filter(c => String(c.id) !== String(id));
    this.saveLocal(filtered);
    return true;
  },

  /**
   * Helper: Generates a random uppercase coupon code
   */
  generateRandomCode(prefix = 'SWAN') {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = prefix ? `${prefix}-` : '';
    for (let i = 0; i < 5; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
};

window.SwanCoupons = SwanCoupons;
