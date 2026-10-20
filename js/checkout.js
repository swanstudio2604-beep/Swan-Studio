/**
 * SWAN STUDIO — Checkout & Order Placement Client
 * Brand: Swan Studio | Founder: Bhumika Nama
 * 
 * STRICT SECURITY & INTEGRITY RULES:
 * 1. Client totals are preview only; true totals are calculated by Supabase RPC.
 * 2. Orders are placed directly into the live database. No mock demo orders.
 * 3. If an order insert fails, a clear error is shown with an instant WhatsApp fallback.
 */

const CHECKOUT = {
  getSettings() {
    return {
      threshold: 999.00,
      standardShipping: 79.00,
      upiId: '9509966512@fam',
      whatsapp: '9509966512',
      email: 'swanstudio2604@gmail.com'
    };
  },

  getRawCart() {
    try {
      const raw = localStorage.getItem('swan_cart');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  async loadCartWithDetails() {
    const rawCart = this.getRawCart();
    if (rawCart.length === 0) {
      return { items: [], subtotal: 0, shipping: 0, total: 0, hasBlockedItems: false, blockedReasons: [] };
    }

    const itemsWithDetails = [];
    let subtotal = 0;
    let hasBlockedItems = false;
    const blockedReasons = [];

    for (const item of rawCart) {
      const qty = parseInt(item.quantity, 10) || 1;
      let product = null;

      if (typeof fetchProductBySlug === 'function' && item.slug) {
        const res = await fetchProductBySlug(item.slug);
        product = res.data;
      }

      if (!product) {
        hasBlockedItems = true;
        blockedReasons.push(`"${item.name || 'Creation'}" is no longer available.`);
        itemsWithDetails.push({
          productId: item.id,
          slug: item.slug,
          name: item.name || 'Unavailable Creation',
          unitPrice: parseFloat(item.price) || 0,
          quantity: qty,
          lineTotal: (parseFloat(item.price) || 0) * qty,
          madeToOrder: false,
          isUnavailable: true,
          isOutOfStock: false,
          stock: 0
        });
      } else {
        const isOutOfStock = !product.madeToOrder && (product.stock <= 0 || product.stock < qty);
        const effectivePrice = product.salePrice || product.price;
        const lineTotal = effectivePrice * qty;

        if (isOutOfStock) {
          hasBlockedItems = true;
          blockedReasons.push(`"${product.name}" has only ${product.stock} left in stock.`);
        } else {
          subtotal += lineTotal;
        }

        itemsWithDetails.push({
          productId: product.id,
          slug: product.slug,
          name: product.name,
          imageUrl: product.imageUrl,
          unitPrice: effectivePrice,
          regularPrice: product.price,
          quantity: qty,
          lineTotal: lineTotal,
          madeToOrder: product.madeToOrder,
          isUnavailable: false,
          isOutOfStock: isOutOfStock,
          stock: product.stock
        });
      }
    }

    const cfg = this.getSettings();
    const shipping = subtotal >= cfg.threshold || subtotal === 0 ? 0.00 : cfg.standardShipping;
    const total = subtotal + shipping;

    return {
      items: itemsWithDetails,
      subtotal,
      discount: 0,
      shipping,
      total,
      hasBlockedItems,
      blockedReasons
    };
  },

  /**
   * Places the order directly in Supabase using the secure database function.
   */
  async placeOrder(deliveryDetails) {
    const rawCart = this.getRawCart();
    if (rawCart.length === 0) {
      throw new Error('Your shopping bag is empty. Please add items before checkout.');
    }

    const cartDetails = await this.loadCartWithDetails();
    if (cartDetails.hasBlockedItems) {
      const firstReason = cartDetails.blockedReasons[0] || 'One or more items in your shopping bag are sold out or unavailable.';
      throw new Error(firstReason);
    }

    const shippingAddress = {
      address_line: deliveryDetails.address.trim(),
      city: deliveryDetails.city.trim(),
      state: deliveryDetails.state.trim(),
      postal_code: deliveryDetails.postalCode.trim(),
      country: 'India'
    };

    const itemsPayload = cartDetails.items.map(it => ({
      product_id: it.productId,
      quantity: it.quantity,
      selected_color: it.selectedColor || null,
      selected_size: it.selectedSize || null
    }));

    try {
      const result = await submitOrderSecure({
        customerName: deliveryDetails.name.trim(),
        customerEmail: deliveryDetails.email.trim(),
        customerPhone: deliveryDetails.phone.trim(),
        shippingAddress: shippingAddress,
        customerNotes: (deliveryDetails.notes || '').trim(),
        items: itemsPayload,
        couponCode: deliveryDetails.couponCode || null,
        honeypot: deliveryDetails.honeypot || null
      });

      // Clear cart upon successful order
      localStorage.removeItem('swan_cart');
      const bagCount = document.getElementById('bag-count');
      if (bagCount) bagCount.textContent = '0';

      return {
        orderId: result.order_id,
        orderNumber: result.order_number,
        totalAmount: result.total_amount,
        subtotal: result.subtotal,
        shippingFee: result.shipping,
        discountAmount: result.discount,
        paymentStatus: result.payment_status,
        upiId: this.getSettings().upiId
      };
    } catch (err) {
      // Build WhatsApp Fallback URL
      const itemsListText = cartDetails.items
        .map(i => `• ${i.name} (x${i.quantity}) - ₹${i.lineTotal}`)
        .join('%0A');
      
      const waMsg = `Hello Bhumika! I would like to place an order for:%0A${itemsListText}%0A%0A*Total:* ₹${cartDetails.total}%0A*Delivery To:* ${deliveryDetails.name}, ${deliveryDetails.phone}%0A${deliveryDetails.address}, ${deliveryDetails.city}, ${deliveryDetails.state} - ${deliveryDetails.postalCode}`;
      const waUrl = `https://wa.me/919509966512?text=${waMsg}`;

      const enhancedError = new Error(err.message || 'Unable to place order in database.');
      enhancedError.whatsappFallbackUrl = waUrl;
      enhancedError.orderDetails = {
        name: deliveryDetails.name,
        phone: deliveryDetails.phone,
        total: cartDetails.total,
        items: cartDetails.items
      };
      throw enhancedError;
    }
  }
};
