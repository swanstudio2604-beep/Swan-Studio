/**
 * SWAN STUDIO — Manual UPI Payments & Verification Engine
 * Brand: Swan Studio | Founder: Bhumika Nama
 * Tagline: Every Stitch Tells a Story.
 * 
 * Single Source of Truth: Supabase PostgreSQL (orders & order_status_history)
 */

const SwanPayments = {
  /**
   * Customer submits their 12-digit UPI UTR / Transaction Reference and optional payment screenshot
   */
  async submitTransactionRef(orderRef, refId, notes = '', screenshot = '') {
    const cleanRef = (refId || '').trim();
    if (!cleanRef && !screenshot) {
      throw new Error('Please enter a valid UPI transaction reference (UTR) or upload a payment screenshot.');
    }

    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
    if (!client) throw new Error('Database connection is not configured.');

    // Look up order by id (UUID) or order_number
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderRef);
    let matchQuery = client.from('orders').update({
      utr_number: cleanRef || 'SCREENSHOT_ATTACHED',
      customer_notes: notes || undefined
    });

    if (isUuid) {
      matchQuery = matchQuery.eq('id', orderRef);
    } else {
      matchQuery = matchQuery.eq('order_number', orderRef);
    }

    const { data, error } = await matchQuery.select().single();
    if (error) {
      console.warn('submitTransactionRef error:', error.message);
      // Attempt fallback by matching order_number loosely
      const { error: looseErr } = await client
        .from('orders')
        .update({ utr_number: cleanRef })
        .eq('order_number', orderRef);
      if (looseErr) throw new Error('Could not update payment reference: ' + error.message);
    }

    return {
      success: true,
      orderId: orderRef,
      transactionRef: cleanRef,
      hasScreenshot: !!screenshot,
      message: 'Transaction reference & payment proof submitted! Bhumika will verify receipt shortly.'
    };
  },

  /**
   * Admin: Get all payments and order details from Supabase orders table
   */
  async getAllPayments() {
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
    if (!client) return [];

    try {
      const { data, error } = await client
        .from('orders')
        .select(`
          id,
          order_number,
          customer_name,
          customer_phone,
          customer_email,
          total_amount,
          payment_status,
          order_status,
          utr_number,
          admin_notes,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('getAllPayments error:', error.message);
        return [];
      }

      return (data || []).map(o => ({
        id: o.id,
        orderId: o.order_number || o.id,
        customerName: o.customer_name || 'Customer',
        customerPhone: o.customer_phone || '',
        customerEmail: o.customer_email || '',
        orderStatus: o.order_status || 'NEW',
        amount: parseFloat(o.total_amount) || 0,
        status: o.payment_status || 'PENDING_VERIFICATION',
        transactionRef: o.utr_number || null,
        screenshot: null,
        adminNotes: o.admin_notes || '',
        verifiedAt: o.payment_status === 'PAID' ? o.updated_at : null,
        createdAt: o.created_at
      }));
    } catch (e) {
      console.error('getAllPayments exception:', e);
      return [];
    }
  },

  /**
   * Admin: Verifies manual payment against bank account
   */
  async verifyPayment(paymentId, notes = 'Verified against bank statement') {
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
    if (!client) throw new Error('Database not connected.');

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paymentId);
    let query = client.from('orders').update({
      payment_status: 'PAID',
      order_status: 'CONFIRMED',
      admin_notes: notes
    });

    if (isUuid) {
      query = query.eq('id', paymentId);
    } else {
      query = query.eq('order_number', paymentId);
    }

    const { data, error } = await query.select().single();
    if (error) throw new Error(error.message);

    // Audit log
    if (data?.id) {
      await client.from('order_status_history').insert([{
        order_id: data.id,
        old_status: 'PENDING_VERIFICATION',
        new_status: 'PAID',
        notes: notes
      }]).catch(() => {});
    }

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
    if (!client) throw new Error('Database not connected.');

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(paymentId);
    let query = client.from('orders').update({
      payment_status: 'FAILED',
      order_status: 'CANCELLED',
      admin_notes: reason
    });

    if (isUuid) {
      query = query.eq('id', paymentId);
    } else {
      query = query.eq('order_number', paymentId);
    }

    const { data, error } = await query.select().single();
    if (error) throw new Error(error.message);

    // Audit log
    if (data?.id) {
      await client.from('order_status_history').insert([{
        order_id: data.id,
        old_status: 'PENDING_VERIFICATION',
        new_status: 'FAILED',
        notes: reason
      }]).catch(() => {});
    }

    return {
      success: true,
      paymentId: paymentId,
      newStatus: 'FAILED',
      orderStatus: 'CANCELLED'
    };
  },

  /**
   * Retrieves audit logs for admin review
   */
  async getAuditLogs(orderIdentifier = null) {
    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
    if (!client) return [];

    try {
      let orderId = orderIdentifier;
      if (orderIdentifier && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderIdentifier)) {
        const { data: o } = await client.from('orders').select('id').eq('order_number', orderIdentifier).maybeSingle();
        if (o) orderId = o.id;
      }

      let q = client.from('order_status_history').select('*').order('created_at', { ascending: false });
      if (orderId) q = q.eq('order_id', orderId);

      const { data, error } = await q;
      if (!error && data) {
        return data.map(l => ({
          id: l.id,
          paymentId: l.order_id,
          changedBy: 'Bhumika Nama (Admin)',
          oldStatus: l.old_status,
          newStatus: l.new_status,
          notes: l.notes || '',
          createdAt: l.created_at
        }));
      }
    } catch (e) {
      console.warn('Supabase fetch audit logs failed:', e);
    }
    return [];
  }
};

window.SwanPayments = SwanPayments;
