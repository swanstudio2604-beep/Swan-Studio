/**
 * SWAN STUDIO — Bespoke Custom Orders & Commissions Engine
 * Brand: Swan Studio | Founder: Bhumika Nama
 * Tagline: Every Stitch Tells a Story.
 * 
 * SECURITY RULES (PRD Section 7 & 13):
 * 1. Customer submissions enter status 'RECEIVED'.
 * 2. Status transitions (QUOTED, DEPOSIT_PAID, IN_PROGRESS, COMPLETED, DECLINED) 
 *    are performed by the administrator.
 */

const DEFAULT_DEMO_CUSTOM_ORDERS = [
  {
    id: 'bespoke-1001',
    refId: 'SWAN-CUSTOM-1001',
    customerName: 'Meera Kapoor',
    customerEmail: 'meera.k@example.com',
    customerPhone: '9820011223',
    itemType: 'bouquet',
    occasion: 'Graduation Gift',
    colors: 'Pastel Lilac, Cream & Baby Pink',
    description: 'Looking for a custom 7-flower everlasting bouquet with 3 lilacs, 2 daisies, and 2 blush roses, wrapped in craft paper with a personalized card.',
    budget: '1000-2000',
    neededBy: '2026-11-15',
    status: 'QUOTED',
    quotePrice: 1399.00,
    depositAmount: 500.00,
    adminNotes: 'Confirmed yarn stock available. Quoted ₹1,399 with ₹500 advance deposit.',
    createdAt: new Date(Date.now() - 3600000 * 48).toISOString()
  },
  {
    id: 'bespoke-1002',
    refId: 'SWAN-CUSTOM-1002',
    customerName: 'Arjun Singhania',
    customerEmail: 'arjun.s@example.com',
    customerPhone: '9877112233',
    itemType: 'plushie',
    occasion: 'Anniversary Surprise',
    colors: 'Warm Brown & Cream',
    description: 'Custom couple bear amigurumi holding a tiny red crochet heart with initials M & A stitched on the paws.',
    budget: '500-1000',
    neededBy: '2026-11-20',
    status: 'IN_PROGRESS',
    quotePrice: 999.00,
    depositAmount: 500.00,
    adminNotes: 'Deposit of ₹500 verified. Currently stitching the paws.',
    createdAt: new Date(Date.now() - 3600000 * 96).toISOString()
  }
];

const SwanCustomOrders = {
  STORAGE_KEY: 'swan_demo_custom_orders',

  /**
   * Submits a new custom commission inquiry
   */
  async submit(data) {
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
    const refId = 'SWAN-CUSTOM-' + Math.floor(1000 + Math.random() * 9000);

    const record = {
      customer_name: data.name.trim(),
      customer_email: data.email.trim(),
      customer_phone: data.phone.trim(),
      item_type: data.type,
      occasion: data.occasion || '',
      preferred_colors: data.colors || '',
      description: data.description.trim(),
      budget_range: data.budget || 'flexible',
      needed_by: data.neededBy || null,
      reference_image_url: data.referenceImageUrl || null,
      status: 'RECEIVED'
    };

    if (client) {
      try {
        const { data: inserted, error } = await client
          .from('custom_orders')
          .insert([record])
          .select()
          .single();

        if (!error && inserted) {
          return {
            success: true,
            refId: refId,
            id: inserted.id,
            data: inserted
          };
        }
      } catch (e) {
        console.warn('Supabase custom order submit failed, falling back:', e);
      }
    }

    // Demo Mode Storage
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      const list = stored ? JSON.parse(stored) : DEFAULT_DEMO_CUSTOM_ORDERS;
      const demoOrder = {
        id: 'bespoke-' + Date.now(),
        refId: refId,
        customerName: record.customer_name,
        customerEmail: record.customer_email,
        customerPhone: record.customer_phone,
        itemType: record.item_type,
        occasion: record.occasion,
        colors: record.preferred_colors,
        description: record.description,
        budget: record.budget_range,
        neededBy: record.needed_by,
        referenceImageUrl: record.reference_image_url,
        status: 'RECEIVED',
        quotePrice: null,
        depositAmount: null,
        adminNotes: '',
        createdAt: new Date().toISOString()
      };
      list.unshift(demoOrder);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(list));

      return {
        success: true,
        refId: refId,
        id: demoOrder.id,
        data: demoOrder
      };
    } catch (e) {
      throw new Error('Failed to save custom order inquiry: ' + e.message);
    }
  },

  /**
   * Admin: Retrieves all custom orders
   */
  async getAll() {
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;

    if (client) {
      try {
        const { data, error } = await client
          .from('custom_orders')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data) {
          return data.map(c => ({
            id: c.id,
            refId: 'SWAN-CUSTOM-' + c.id.slice(0, 6).toUpperCase(),
            customerName: c.customer_name,
            customerEmail: c.customer_email,
            customerPhone: c.customer_phone,
            itemType: c.item_type,
            occasion: c.occasion,
            colors: c.preferred_colors,
            description: c.description,
            budget: c.budget_range,
            neededBy: c.needed_by,
            referenceImageUrl: c.reference_image_url || null,
            status: c.status,
            quotePrice: c.quote_price ? parseFloat(c.quote_price) : null,
            depositAmount: c.deposit_amount ? parseFloat(c.deposit_amount) : null,
            adminNotes: c.admin_notes || '',
            createdAt: c.created_at
          }));
        }
      } catch (e) {
        console.warn('Supabase fetch custom orders failed, falling back:', e);
      }
    }

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) return JSON.parse(stored);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(DEFAULT_DEMO_CUSTOM_ORDERS));
      return DEFAULT_DEMO_CUSTOM_ORDERS;
    } catch {
      return DEFAULT_DEMO_CUSTOM_ORDERS;
    }
  },

  /**
   * Admin: Updates stage, quote, and notes
   */
  async updateStage(id, updates) {
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;

    if (client) {
      const payload = {};
      if (updates.status) payload.status = updates.status;
      if (updates.quotePrice !== undefined) payload.quote_price = updates.quotePrice ? parseFloat(updates.quotePrice) : null;
      if (updates.depositAmount !== undefined) payload.deposit_amount = updates.depositAmount ? parseFloat(updates.depositAmount) : null;
      if (updates.adminNotes !== undefined) payload.admin_notes = updates.adminNotes;
      payload.updated_at = new Date().toISOString();

      const { data, error } = await client.from('custom_orders').update(payload).eq('id', id).select().single();
      if (error) throw new Error(error.message);
      return data;
    }

    // Demo Mode
    const all = await this.getAll();
    const target = all.find(c => c.id === id);
    if (!target) throw new Error('Custom order not found');

    if (updates.status) target.status = updates.status;
    if (updates.quotePrice !== undefined) target.quotePrice = updates.quotePrice ? parseFloat(updates.quotePrice) : null;
    if (updates.depositAmount !== undefined) target.depositAmount = updates.depositAmount ? parseFloat(updates.depositAmount) : null;
    if (updates.adminNotes !== undefined) target.adminNotes = updates.adminNotes;

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(all));
    return target;
  }
};

window.SwanCustomOrders = SwanCustomOrders;
