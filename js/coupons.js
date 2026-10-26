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
  DELETED_KEY: 'swan_deleted_coupon_ids',
  OVERRIDES_KEY: 'swan_coupon_status_overrides',

  /**
   * Helper to retrieve list of permanently deleted coupon IDs and uppercase codes
   */
  getDeletedIds() {
    try {
      const raw = localStorage.getItem(this.DELETED_KEY);
      const list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list.map(x => String(x).toUpperCase()) : [];
    } catch {
      return [];
    }
  },

  /**
   * Helper to record permanently deleted coupon by ID and/or Code
   */
  addDeletedId(id, code) {
    try {
      const list = this.getDeletedIds();
      if (id && !list.includes(String(id).toUpperCase())) list.push(String(id).toUpperCase());
      if (code && !list.includes(String(code).toUpperCase())) list.push(String(code).toUpperCase());
      localStorage.setItem(this.DELETED_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Error saving deleted coupon id:', e);
    }
  },

  /**
   * Helper to remove ID/Code from deleted list (e.g. when recreating a coupon)
   */
  removeDeletedId(id, code) {
    try {
      let list = this.getDeletedIds();
      const remove = [];
      if (id) remove.push(String(id).toUpperCase());
      if (code) remove.push(String(code).toUpperCase());
      list = list.filter(item => !remove.includes(item));
      localStorage.setItem(this.DELETED_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Error removing deleted coupon id:', e);
    }
  },

  /**
   * Helper to get status overrides (for active/inactive states across offline/schema issues)
   */
  getStatusOverrides() {
    try {
      const raw = localStorage.getItem(this.OVERRIDES_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  /**
   * Helper to set status override
   */
  setStatusOverride(id, code, isActive) {
    try {
      const overrides = this.getStatusOverrides();
      if (id) overrides[String(id)] = Boolean(isActive);
      if (code) overrides[String(code).toUpperCase()] = Boolean(isActive);
      localStorage.setItem(this.OVERRIDES_KEY, JSON.stringify(overrides));
    } catch (e) {
      console.warn('Error saving status override:', e);
    }
  },

  /**
   * Filters out permanently deleted coupons and applies status overrides
   */
  filterCoupons(list) {
    if (!Array.isArray(list)) return [];
    const deleted = this.getDeletedIds();
    const overrides = this.getStatusOverrides();

    return list
      .filter(c => {
        if (!c) return false;
        const cid = c.id ? String(c.id).toUpperCase() : '';
        const code = c.code ? String(c.code).toUpperCase() : '';
        if (deleted.includes(cid) || deleted.includes(code)) {
          return false; // permanently deleted
        }
        return true;
      })
      .map(c => {
        const cid = c.id ? String(c.id) : '';
        const code = c.code ? String(c.code).toUpperCase() : '';
        let active = c.is_active !== false;
        if (overrides[cid] !== undefined) active = overrides[cid];
        else if (overrides[code] !== undefined) active = overrides[code];
        return {
          ...c,
          is_active: active
        };
      });
  },

  /**
   * Helper to load coupons from localStorage fallback
   */
  getLocal() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored !== null) {
        // If storage was already created (even as empty array []), honor it!
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return this.filterCoupons(parsed);
        }
      }
    } catch (e) {
      console.warn('Error reading stored coupons:', e);
    }

    // Only if never initialized before
    const initial = this.filterCoupons(DEFAULT_DEMO_COUPONS.slice());
    this.saveLocal(initial);
    return initial;
  },

  /**
   * Helper to persist coupons to localStorage fallback
   */
  saveLocal(list) {
    try {
      const sanitized = this.filterCoupons(list);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sanitized));
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
        if (!error && data && Array.isArray(data)) {
          const sanitized = this.filterCoupons(data);
          this.saveLocal(sanitized);
          return sanitized;
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

    // Reject permanently deleted coupons immediately
    const deleted = this.getDeletedIds();
    if (deleted.includes(code)) {
      return { valid: false, message: `Coupon "${code}" is invalid or does not exist.` };
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
          // If marked invalid locally via overrides, enforce it
          const overrides = this.getStatusOverrides();
          if (overrides[code] === false) {
            return { valid: false, message: `Coupon "${code}" is currently deactivated.` };
          }
          return data;
        }
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
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.code) return null;

      // If applied coupon was since deleted or deactivated, clear it
      const deleted = this.getDeletedIds();
      if (deleted.includes(String(parsed.code).toUpperCase())) {
        this.removeApplied();
        return null;
      }
      return parsed;
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

    // If this code was previously in deleted list, resurrect it for this new coupon
    this.removeDeletedId(newCoupon.id, formatted.code);
    this.setStatusOverride(newCoupon.id, formatted.code, formatted.is_active);

    // Prepend and save
    all.unshift(newCoupon);
    this.saveLocal(all);
    return newCoupon;
  },

  /**
   * Admin: Toggles coupon active state
   */
  async toggleActive(id, optionalCode = null) {
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
    const all = this.getLocal();
    const target = all.find(c => String(c.id) === String(id) || (optionalCode && String(c.code).toUpperCase() === String(optionalCode).toUpperCase()));
    const code = optionalCode || (target ? target.code : null);
    const newState = target ? !target.is_active : false;

    // 1. Record status override so it persists across all reloads
    this.setStatusOverride(id, code, newState);

    // 2. Update local storage
    if (target) {
      target.is_active = newState;
      this.saveLocal(all);
    }

    // 3. Try remote update
    if (client) {
      try {
        if (id) await client.from('coupons').update({ is_active: newState }).eq('id', id);
        if (code) await client.from('coupons').update({ is_active: newState }).eq('code', code.toUpperCase());
      } catch (err) {
        console.warn('Supabase toggleActive remote note:', err);
      }
    }

    return newState;
  },

  /**
   * Admin: Permanently deletes coupon
   */
  async delete(id, optionalCode = null) {
    const all = this.getLocal();
    const target = all.find(c => String(c.id) === String(id) || (optionalCode && String(c.code).toUpperCase() === String(optionalCode).toUpperCase()));
    const code = optionalCode || (target ? target.code : null);

    // 1. Permanently record as deleted
    this.addDeletedId(id, code);

    // 2. Remove from local list
    const filtered = all.filter(c => {
      if (id && String(c.id) === String(id)) return false;
      if (code && String(c.code).toUpperCase() === String(code).toUpperCase()) return false;
      return true;
    });
    this.saveLocal(filtered);

    // 3. Clear applied coupon if matching
    const applied = this.getApplied();
    if (applied && ((id && String(applied.id) === String(id)) || (code && String(applied.code).toUpperCase() === String(code).toUpperCase()))) {
      this.removeApplied();
    }

    // 4. Try remote delete on Supabase
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
    if (client) {
      try {
        if (id) await client.from('coupons').delete().eq('id', id);
        if (code) await client.from('coupons').delete().eq('code', code.toUpperCase());
      } catch (err) {
        console.warn('Supabase remote coupon delete note:', err);
      }
    }

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
