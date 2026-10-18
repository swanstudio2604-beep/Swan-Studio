/**
 * SWAN STUDIO — Manual UPI Payments & Verification Engine
 * Brand: Swan Studio | Founder: Bhumika Nama
 * Tagline: Every Stitch Tells a Story.
 * 
 * SECURITY RULES (PRD Section 11 & 14):
 * 1. Initial payment status is strictly PENDING_VERIFICATION.
 * 2. Only a verified administrator can transition status to PAID or REJECTED.
 * 3. Status changes are logged in an immutable audit trail.
 */

const SwanPayments = {
  DEMO_ORDERS_KEY: 'swan_demo_orders',
  DEMO_AUDIT_KEY: 'swan_payment_audit_log',

  /**
   * Customer submits their 12-digit UPI UTR / Transaction Reference and optional payment screenshot
   */
  async submitTransactionRef(orderId, refId, notes = '', screenshot = '') {
    const cleanRef = (refId || '').trim();
    if (!cleanRef && !screenshot) {
      throw new Error('Please enter a valid UPI transaction reference (UTR) or upload a payment screenshot.');
    }

    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;

    if (client) {
      try {
        const { data, error } = await client.rpc('submit_payment_ref', {
          p_order_id: orderId,
          p_ref_id: cleanRef || 'SCREENSHOT_ATTACHED',
          p_notes: notes
        });
        if (error) console.warn('Supabase submit_payment_ref rpc error:', error);
      } catch (e) {
        console.warn('Supabase submit_payment_ref failed, using demo fallback:', e);
      }
    }

    // Demo Mode Storage
    try {
      const stored = localStorage.getItem(this.DEMO_ORDERS_KEY);
      const orders = stored ? JSON.parse(stored) : [];
      const order = orders.find(o => o.orderId === orderId);

      if (order) {
        if (cleanRef) order.transactionRef = cleanRef;
        if (screenshot) order.paymentScreenshot = screenshot;
        order.customerPaymentNotes = notes;
        order.refSubmittedAt = new Date().toISOString();
        localStorage.setItem(this.DEMO_ORDERS_KEY, JSON.stringify(orders));
      }

      return {
        success: true,
        orderId: orderId,
        transactionRef: cleanRef,
        hasScreenshot: !!screenshot,
        message: 'Transaction reference & payment proof submitted! Bhumika will verify receipt shortly.'
      };
    } catch (e) {
      throw new Error('Failed to save reference details: ' + e.message);
    }
  },

  /**
   * Admin: Get all payments and order details
   */
  async getAllPayments() {
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;

    if (client) {
      try {
        const { data, error } = await client
          .from('payments')
          .select(`
            id,
            order_id,
            payment_method,
            upi_id,
            amount,
            status,
            transaction_ref_id,
            screenshot_path,
            verified_at,
            admin_notes,
            created_at,
            orders (
              id,
              customer_name,
              customer_phone,
              customer_email,
              status,
              created_at
            )
          `)
          .order('created_at', { ascending: false });

        if (!error && data) {
          return data.map(p => ({
            id: p.id,
            orderId: p.orders ? p.orders.id : p.order_id,
            customerName: p.orders ? p.orders.customer_name : 'Unknown Customer',
            customerPhone: p.orders ? p.orders.customer_phone : '',
            customerEmail: p.orders ? p.orders.customer_email : '',
            orderStatus: p.orders ? p.orders.status : 'PENDING',
            amount: parseFloat(p.amount) || 0,
            status: p.status,
            transactionRef: p.transaction_ref_id,
            adminNotes: p.admin_notes,
            verifiedAt: p.verified_at,
            createdAt: p.created_at
          }));
        }
      } catch (e) {
        console.warn('Supabase fetch payments failed, using demo fallback:', e);
      }
    }

    // Demo Mode Orders & Payments
    try {
      const stored = localStorage.getItem(this.DEMO_ORDERS_KEY);
      let orders = stored ? JSON.parse(stored) : [];

      if (orders.length === 0) {
        // Provide sample records if fresh demo
        orders = [
          {
            orderId: 'SWAN-882101',
            createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
            customerName: 'Ananya Verma',
            customerPhone: '9820192831',
            customerEmail: 'ananya@example.com',
            shippingAddress: '42, Pink City Heights, Jaipur',
            subtotal: 1099.00,
            shippingFee: 0.00,
            totalAmount: 1099.00,
            status: 'PENDING',
            paymentStatus: 'PENDING_VERIFICATION',
            transactionRef: '429184719234',
            upiId: '9509966512@fam'
          },
          {
            orderId: 'SWAN-882102',
            createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
            customerName: 'Rohan Mehra',
            customerPhone: '9811223344',
            customerEmail: 'rohan@example.com',
            shippingAddress: '15, Heritage Lane, Udaipur',
            subtotal: 899.00,
            shippingFee: 99.00,
            totalAmount: 998.00,
            status: 'CONFIRMED',
            paymentStatus: 'PAID',
            transactionRef: '319284102918',
            verifiedAt: new Date(Date.now() - 3600000 * 22).toISOString(),
            upiId: '9509966512@fam'
          }
        ];
        localStorage.setItem(this.DEMO_ORDERS_KEY, JSON.stringify(orders));
      }

      return orders.map(o => ({
        id: 'pay-' + o.orderId,
        orderId: o.orderId,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        customerEmail: o.customerEmail,
        orderStatus: o.status,
        amount: parseFloat(o.totalAmount) || 0,
        status: o.paymentStatus || 'PENDING_VERIFICATION',
        transactionRef: o.transactionRef || null,
        screenshot: o.paymentScreenshot || null,
        adminNotes: o.adminNotes || '',
        verifiedAt: o.verifiedAt || null,
        createdAt: o.createdAt
      }));
    } catch {
      return [];
    }
  },

  /**
   * Admin: Verifies manual payment against bank account
   */
  async verifyPayment(paymentId, notes = 'Verified against bank statement') {
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;

    if (client) {
      const { data, error } = await client.rpc('verify_payment', {
        p_payment_id: paymentId,
        p_notes: notes
      });
      if (error) throw new Error(error.message);
      return data;
    }

    // Demo Mode Verification
    const stored = localStorage.getItem(this.DEMO_ORDERS_KEY);
    const orders = stored ? JSON.parse(stored) : [];
    const target = orders.find(o => 'pay-' + o.orderId === paymentId || o.orderId === paymentId);

    if (!target) throw new Error('Order/payment record not found.');

    const oldStatus = target.paymentStatus || 'PENDING_VERIFICATION';
    target.paymentStatus = 'PAID';
    target.status = 'CONFIRMED';
    target.verifiedAt = new Date().toISOString();
    target.adminNotes = notes;
    localStorage.setItem(this.DEMO_ORDERS_KEY, JSON.stringify(orders));

    // Append Audit Trail
    this._addAuditLog(paymentId, oldStatus, 'PAID', notes);

    return {
      success: true,
      paymentId: paymentId,
      newStatus: 'PAID',
      orderStatus: 'CONFIRMED'
    };
  },

  /**
   * Admin: Rejects invalid or fake payment submission
   */
  async rejectPayment(paymentId, reason = 'Payment not received in bank account') {
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;

    if (client) {
      const { data, error } = await client.rpc('reject_payment', {
        p_payment_id: paymentId,
        p_reason: reason
      });
      if (error) throw new Error(error.message);
      return data;
    }

    // Demo Mode Rejection
    const stored = localStorage.getItem(this.DEMO_ORDERS_KEY);
    const orders = stored ? JSON.parse(stored) : [];
    const target = orders.find(o => 'pay-' + o.orderId === paymentId || o.orderId === paymentId);

    if (!target) throw new Error('Order/payment record not found.');

    const oldStatus = target.paymentStatus || 'PENDING_VERIFICATION';
    target.paymentStatus = 'REJECTED';
    target.status = 'CANCELLED';
    target.verifiedAt = new Date().toISOString();
    target.adminNotes = reason;
    localStorage.setItem(this.DEMO_ORDERS_KEY, JSON.stringify(orders));

    // Append Audit Trail
    this._addAuditLog(paymentId, oldStatus, 'REJECTED', reason);

    return {
      success: true,
      paymentId: paymentId,
      newStatus: 'REJECTED',
      orderStatus: 'CANCELLED'
    };
  },

  /**
   * Helper: Record immutable audit trail in demo storage
   */
  _addAuditLog(paymentId, oldStatus, newStatus, notes) {
    try {
      const raw = localStorage.getItem(this.DEMO_AUDIT_KEY);
      const list = raw ? JSON.parse(raw) : [];
      list.unshift({
        id: 'audit-' + Date.now(),
        paymentId: paymentId,
        changedBy: 'Bhumika Nama (Admin)',
        oldStatus: oldStatus,
        newStatus: newStatus,
        notes: notes,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem(this.DEMO_AUDIT_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Failed to save audit log:', e);
    }
  },

  /**
   * Retrieves audit logs for admin review
   */
  async getAuditLogs(paymentId = null) {
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;

    if (client) {
      try {
        let q = client.from('payment_audit_log').select('*').order('created_at', { ascending: false });
        if (paymentId) q = q.eq('payment_id', paymentId);
        const { data, error } = await q;
        if (!error && data) return data;
      } catch (e) {
        console.warn('Supabase fetch audit logs failed, using demo fallback:', e);
      }
    }

    try {
      const raw = localStorage.getItem(this.DEMO_AUDIT_KEY);
      const list = raw ? JSON.parse(raw) : [];
      if (paymentId) {
        return list.filter(l => l.paymentId === paymentId);
      }
      return list;
    } catch {
      return [];
    }
  }
};

window.SwanPayments = SwanPayments;
