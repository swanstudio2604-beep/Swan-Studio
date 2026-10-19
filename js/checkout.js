/**
 * SWAN STUDIO — Checkout & Order Placement Client
 * Brand: Swan Studio | Founder: Bhumika Nama
 * 
 * SECURITY RULES (PRD Section 2 & 8):
 * 1. Client totals are advisory for user preview only.
 * 2. True order totals, discounts, shipping fees, and stock reservations
 *    are computed inside the atomic place_order() database function.
 * 3. An order is NEVER marked as PAID on submit. Initial status is always
 *    PENDING_VERIFICATION.
 */

const CHECKOUT = {
  getSettings() {
    try {
      const s = JSON.parse(localStorage.getItem('swan_site_settings') || '{}');
      return {
        threshold: s.freeShip ? parseFloat(s.freeShip) : 1499.00,
        standardShipping: s.stdShip !== undefined ? parseFloat(s.stdShip) : 99.00,
        upiId: s.upiId || '9509966512@fam',
        whatsapp: s.whatsapp || '9509966512',
        email: s.email || 'swanstudio2604@gmail.com'
      };
    } catch {
      return {
        threshold: 1499.00,
        standardShipping: 99.00,
        upiId: '9509966512@fam',
        whatsapp: '9509966512',
        email: 'swanstudio2604@gmail.com'
      };
    }
  },

  /**
   * Safely reads cart items from localStorage (untrusted)
   */
  getRawCart() {
    try {
      const raw = localStorage.getItem('swan_cart');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  /**
   * Loads fresh product details for each cart item to calculate preview totals
   * Strictly flags deleted, draft, and out-of-stock creations.
   */
  async loadCartWithDetails() {
    const rawCart = this.getRawCart();
    if (rawCart.length === 0) return { items: [], subtotal: 0, shipping: 0, total: 0, hasBlockedItems: false, blockedReasons: [] };

    const itemsWithDetails = [];
    let subtotal = 0;
    let hasBlockedItems = false;
    const blockedReasons = [];

    const deletedIds = JSON.parse(localStorage.getItem('swan_deleted_product_ids') || '[]');
    const archivedIds = JSON.parse(localStorage.getItem('swan_archived_product_ids') || '[]');

    for (const item of rawCart) {
      const qty = parseInt(item.quantity, 10) || 1;
      let product = null;

      if (typeof fetchProductBySlug === 'function' && item.slug) {
        const res = await fetchProductBySlug(item.slug);
        product = res.data;
      }
      
      // If not resolved from fetchProductBySlug, check local admin store or demo, but ensure not deleted or unpublished
      if (!product) {
        let localList = [];
        const stored = localStorage.getItem('swan_admin_products');
        if (stored) {
          try { localList = JSON.parse(stored); } catch (e) { localList = []; }
        }
        if (!localList || localList.length === 0) {
          localList = typeof getDemoProducts === 'function' ? getDemoProducts() : [];
        }
        const candidate = localList.find(p => p.id === item.id || p.slug === item.slug);
        if (candidate) {
          const cid = String(candidate.id);
          const cslug = String(candidate.slug || '');
          const isDeleted = deletedIds.includes(cid) || (cslug && deletedIds.includes(cslug));
          const isArchived = archivedIds.includes(cid) || (cslug && archivedIds.includes(cslug));
          const isDraft = candidate.isPublished === false || candidate.is_published === false;
          if (!isDeleted && !isArchived && !isDraft) {
            product = candidate;
          }
        }
      }

      const isUnavailable = !product;
      const isOutOfStock = Boolean(product && (product.stock !== undefined && product.stock !== null) && Number(product.stock) <= 0);

      if (isUnavailable) {
        hasBlockedItems = true;
        blockedReasons.push(`"${item.name || 'Creation'}" is no longer available.`);
        itemsWithDetails.push({
          productId: item.id,
          slug: item.slug,
          name: item.name || 'Unavailable Creation',
          unitPrice: parseFloat(item.price) || 0,
          regularPrice: parseFloat(item.price) || 0,
          quantity: qty,
          lineTotal: (parseFloat(item.price) || 0) * qty,
          iconType: 'flower',
          madeToOrder: false,
          isUnavailable: true,
          isOutOfStock: false,
          stock: 0
        });
      } else if (isOutOfStock) {
        hasBlockedItems = true;
        blockedReasons.push(`"${product.name}" is currently sold out.`);
        const effectivePrice = product.salePrice || product.price;
        itemsWithDetails.push({
          productId: product.id,
          slug: product.slug,
          name: product.name,
          unitPrice: effectivePrice,
          regularPrice: product.price,
          quantity: qty,
          lineTotal: effectivePrice * qty,
          iconType: product.iconType || 'flower',
          madeToOrder: product.madeToOrder,
          isUnavailable: false,
          isOutOfStock: true,
          stock: product.stock
        });
      } else {
        const effectivePrice = product.salePrice || product.price;
        const lineTotal = effectivePrice * qty;
        subtotal += lineTotal;

        itemsWithDetails.push({
          productId: product.id,
          slug: product.slug,
          name: product.name,
          unitPrice: effectivePrice,
          regularPrice: product.price,
          quantity: qty,
          lineTotal: lineTotal,
          iconType: product.iconType || 'flower',
          madeToOrder: product.madeToOrder,
          isUnavailable: false,
          isOutOfStock: false,
          stock: product.stock
        });
      }
    }

    const cfg = this.getSettings();
    const shipping = subtotal >= cfg.threshold || subtotal === 0 ? 0.00 : cfg.standardShipping;
    
    // Check for applied coupon
    let discount = 0;
    let appliedCoupon = null;
    if (window.SwanCoupons) {
      const storedCoupon = window.SwanCoupons.getApplied();
      if (storedCoupon) {
        // Re-validate against current subtotal
        const val = await window.SwanCoupons.validate(storedCoupon.code, subtotal);
        if (val.valid) {
          discount = val.discount_amount;
          appliedCoupon = val;
        } else {
          // If subtotal dropped below min order threshold, remove applied coupon
          window.SwanCoupons.removeApplied();
        }
      }
    }

    const total = Math.max(0, subtotal - discount) + shipping;

    return {
      items: itemsWithDetails,
      subtotal,
      discount,
      appliedCoupon,
      shipping,
      total,
      hasBlockedItems,
      blockedReasons
    };
  },

  /**
   * Submits the order via trusted place_order RPC or local demo simulation
   */
  async placeOrder(deliveryDetails) {
    const rawCart = this.getRawCart();
    if (rawCart.length === 0) {
      throw new Error('Your shopping bag is empty. Please add items before checkout.');
    }

    // Verify all items are strictly in-stock and published
    const cartDetails = await this.loadCartWithDetails();
    if (cartDetails.hasBlockedItems) {
      const firstReason = cartDetails.blockedReasons[0] || 'One or more items in your shopping bag are sold out or unavailable.';
      throw new Error(`${firstReason} Please return to your shopping bag and remove it before completing your order.`);
    }

    const client = typeof getSupabaseClient === 'function' ? getSupabaseClient() : null;
    const idempotencyKey = 'order-' + (window.crypto?.randomUUID ? window.crypto.randomUUID() : Date.now());

    // Check if a coupon is currently applied
    const appliedCoupon = window.SwanCoupons ? window.SwanCoupons.getApplied() : null;

    // Prepare payload
    const payload = {
      customer_name: deliveryDetails.name.trim(),
      customer_email: deliveryDetails.email.trim(),
      customer_phone: deliveryDetails.phone.trim(),
      shipping_address: deliveryDetails.address.trim(),
      city: deliveryDetails.city.trim(),
      state: deliveryDetails.state.trim(),
      postal_code: deliveryDetails.postalCode.trim(),
      notes: (deliveryDetails.notes || '').trim(),
      coupon_code: appliedCoupon ? appliedCoupon.code : null,
      idempotency_key: idempotencyKey,
      items: rawCart.map(item => ({
        product_id: item.id,
        quantity: parseInt(item.quantity, 10) || 1
      }))
    };

    if (client) {
      // Live Supabase RPC place_order execution
      const { data, error } = await client.rpc('place_order', { payload });
      if (error) {
        throw new Error(error.message || 'Unable to place order. Please review your details.');
      }

      // Clear shopping bag & applied coupon upon verified order creation
      localStorage.removeItem('swan_cart');
      if (window.SwanCoupons) window.SwanCoupons.removeApplied();
      const bagCount = document.getElementById('bag-count');
      if (bagCount) bagCount.textContent = '0';

      return {
        orderId: data.order_id,
        totalAmount: data.total_amount,
        discountAmount: data.discount_amount || 0,
        couponCode: data.coupon_code || null,
        shippingFee: data.shipping_fee,
        upiId: data.upi_id || this.STORE_UPI,
        isDemo: false
      };
    }

    // Local Demo Checkout Simulation
    const { subtotal, discount, shipping, total, items } = await this.loadCartWithDetails();
    const demoOrderId = 'SWAN-' + Math.floor(100000 + Math.random() * 900000);

    const demoOrder = {
      orderId: demoOrderId,
      createdAt: new Date().toISOString(),
      customerName: payload.customer_name,
      customerPhone: payload.customer_phone,
      customerEmail: payload.customer_email,
      shippingAddress: `${payload.shipping_address}, ${payload.city}, ${payload.state} - ${payload.postal_code}`,
      items: items,
      subtotal: subtotal,
      discountAmount: discount,
      couponCode: appliedCoupon ? appliedCoupon.code : null,
      shippingFee: shipping,
      totalAmount: total,
      status: 'PENDING',
      paymentStatus: 'PENDING_VERIFICATION',
      upiId: this.getSettings().upiId,
      isDemo: true
    };

    // Store in demo orders list
    try {
      const stored = localStorage.getItem('swan_demo_orders');
      const orderList = stored ? JSON.parse(stored) : [];
      orderList.unshift(demoOrder);
      localStorage.setItem('swan_demo_orders', JSON.stringify(orderList));

      // Increment coupon usage in demo coupons
      if (appliedCoupon) {
        const storedCoupons = localStorage.getItem('swan_admin_coupons');
        if (storedCoupons) {
          const couponList = JSON.parse(storedCoupons);
          const cTarget = couponList.find(c => c.code === appliedCoupon.code);
          if (cTarget) {
            cTarget.times_used = (cTarget.times_used || 0) + 1;
            localStorage.setItem('swan_admin_coupons', JSON.stringify(couponList));
          }
        }
      }
    } catch (e) {
      console.warn('Failed to store demo order:', e);
    }

    // Clear cart and applied coupon
    localStorage.removeItem('swan_cart');
    if (window.SwanCoupons) window.SwanCoupons.removeApplied();
    const bagCount = document.getElementById('bag-count');
    if (bagCount) bagCount.textContent = '0';

    return {
      orderId: demoOrder.orderId,
      totalAmount: demoOrder.totalAmount,
      discountAmount: demoOrder.discountAmount,
      couponCode: demoOrder.couponCode,
      shippingFee: demoOrder.shippingFee,
      upiId: demoOrder.upiId,
      isDemo: true
    };
  }
};

