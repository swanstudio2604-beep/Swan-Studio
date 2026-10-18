-- ============================================================================
-- SWAN STUDIO — Trusted Database Function: place_order()
-- Brand: Swan Studio | Founder: Bhumika Nama
-- Tagline: Every Stitch Tells a Story.
--
-- SECURITY PRINCIPLES (PRD Section 2, 8 & 15):
-- 1. Single Trusted Transaction: All totals, stock reservations, order items, 
--    and payment records are generated server-side in a single atomic transaction.
-- 2. Never Trust the Browser: Client-sent prices or totals are completely ignored.
--    Prices are read freshly from the PostgreSQL products table.
-- 3. Idempotency Guard: Idempotency keys prevent double submissions.
-- 4. Initial Payment State: Always sets payments.status = 'PENDING_VERIFICATION'.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.place_order(payload JSONB)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_idempotency_key TEXT;
  v_customer_name TEXT;
  v_customer_email TEXT;
  v_customer_phone TEXT;
  v_shipping_address TEXT;
  v_city TEXT;
  v_state TEXT;
  v_postal_code TEXT;
  v_notes TEXT;
  v_coupon_code TEXT;
  v_coupon_id UUID;
  v_coupon_validation JSONB;
  
  v_existing_order_id UUID;
  v_existing_total NUMERIC(10,2);
  v_new_order_id UUID;
  
  v_items JSONB;
  v_item RECORD;
  v_product RECORD;
  
  v_subtotal NUMERIC(10,2) := 0.00;
  v_discount NUMERIC(10,2) := 0.00;
  v_shipping_fee NUMERIC(10,2) := 0.00;
  v_total NUMERIC(10,2) := 0.00;
  
  v_free_threshold NUMERIC(10,2) := 1499.00;
  v_std_shipping NUMERIC(10,2) := 99.00;
  v_store_upi TEXT := '9509966512@fam';
BEGIN
  -- 1. Authenticate caller (or get user_id)
  v_user_id := auth.uid();
  
  -- 2. Extract payload fields
  v_idempotency_key := NULLIF(TRIM(payload->>'idempotency_key'), '');
  v_customer_name   := TRIM(COALESCE(payload->>'customer_name', ''));
  v_customer_email  := TRIM(COALESCE(payload->>'customer_email', ''));
  v_customer_phone  := TRIM(COALESCE(payload->>'customer_phone', ''));
  v_shipping_address:= TRIM(COALESCE(payload->>'shipping_address', ''));
  v_city            := TRIM(COALESCE(payload->>'city', ''));
  v_state           := TRIM(COALESCE(payload->>'state', ''));
  v_postal_code     := TRIM(COALESCE(payload->>'postal_code', ''));
  v_notes           := TRIM(COALESCE(payload->>'notes', ''));
  v_coupon_code     := NULLIF(UPPER(TRIM(COALESCE(payload->>'coupon_code', ''))), '');
  v_items           := payload->'items';

  -- Input validations
  IF v_customer_name = '' OR v_customer_phone = '' OR v_shipping_address = '' OR v_city = '' OR v_postal_code = '' THEN
    RAISE EXCEPTION 'Missing required delivery details: name, phone, address, city, and PIN code are required.';
  END IF;

  IF v_items IS NULL OR jsonb_array_length(v_items) = 0 THEN
    RAISE EXCEPTION 'Cannot place an order with an empty shopping bag.';
  END IF;

  -- 3. Idempotency Check: Prevent duplicate submissions
  IF v_idempotency_key IS NOT NULL THEN
    SELECT id, total_amount INTO v_existing_order_id, v_existing_total
    FROM public.orders
    WHERE idempotency_key = v_idempotency_key;

    IF v_existing_order_id IS NOT NULL THEN
      RETURN jsonb_build_object(
        'success', true,
        'order_id', v_existing_order_id,
        'total_amount', v_existing_total,
        'is_duplicate', true
      );
    END IF;
  END IF;

  -- 4. Load store shipping configuration
  SELECT 
    COALESCE(free_shipping_threshold, 1499.00),
    COALESCE(standard_shipping_fee, 99.00),
    COALESCE(upi_id, '9509966512@fam')
  INTO v_free_threshold, v_std_shipping, v_store_upi
  FROM public.site_settings
  WHERE id = 1;

  -- 5. Calculate line items from database (never trust client prices!)
  FOR v_item IN SELECT * FROM jsonb_to_recordset(v_items) AS x(product_id UUID, quantity INT)
  LOOP
    IF v_item.quantity <= 0 THEN
      RAISE EXCEPTION 'Item quantity must be greater than zero.';
    END IF;

    -- Row-level lock to prevent concurrent overselling
    SELECT * INTO v_product
    FROM public.products
    WHERE id = v_item.product_id
      AND is_published = true 
      AND archived_at IS NULL
    FOR UPDATE;

    IF v_product.id IS NULL THEN
      RAISE EXCEPTION 'Product with ID % is unavailable or no longer offered.', v_item.product_id;
    END IF;

    -- Stock check for ready-to-ship items
    IF NOT v_product.made_to_order AND v_product.stock_quantity < v_item.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for "%". Available units: %', v_product.name, v_product.stock_quantity;
    END IF;

    -- Use effective price (sale price if active, otherwise regular price)
    DECLARE
      v_effective_price NUMERIC(10,2);
      v_line_total NUMERIC(10,2);
    BEGIN
      v_effective_price := COALESCE(v_product.sale_price, v_product.price);
      v_line_total := v_effective_price * v_item.quantity;
      v_subtotal := v_subtotal + v_line_total;
    END;
  END LOOP;

  -- 6. Validate and apply coupon if provided
  IF v_coupon_code IS NOT NULL THEN
    SELECT id INTO v_coupon_id
    FROM public.coupons
    WHERE code = v_coupon_code
    FOR UPDATE;

    IF v_coupon_id IS NULL THEN
      RAISE EXCEPTION 'Coupon code "%" is invalid or does not exist.', v_coupon_code;
    END IF;

    v_coupon_validation := public.validate_coupon(v_coupon_code, v_subtotal, v_user_id);
    IF NOT (v_coupon_validation->>'valid')::BOOLEAN THEN
      RAISE EXCEPTION '%', (v_coupon_validation->>'message');
    END IF;

    v_discount := (v_coupon_validation->>'discount_amount')::NUMERIC(10,2);
  END IF;

  -- 7. Apply shipping rules
  IF v_subtotal >= v_free_threshold THEN
    v_shipping_fee := 0.00;
  ELSE
    v_shipping_fee := v_std_shipping;
  END IF;

  -- Final total calculation
  v_total := GREATEST(0.00, v_subtotal - v_discount) + v_shipping_fee;

  -- 8. Insert Order Header
  INSERT INTO public.orders (
    user_id,
    customer_name,
    customer_email,
    customer_phone,
    shipping_address,
    city,
    state,
    postal_code,
    status,
    subtotal,
    discount_amount,
    coupon_code,
    shipping_fee,
    total_amount,
    idempotency_key,
    notes
  ) VALUES (
    v_user_id,
    v_customer_name,
    v_customer_email,
    v_customer_phone,
    v_shipping_address,
    v_city,
    v_state,
    v_postal_code,
    'PENDING',
    v_subtotal,
    v_discount,
    v_coupon_code,
    v_shipping_fee,
    v_total,
    v_idempotency_key,
    v_notes
  ) RETURNING id INTO v_new_order_id;

  -- 9. Insert Order Items (Immutable Snapshots) & Decrement Stock
  FOR v_item IN SELECT * FROM jsonb_to_recordset(v_items) AS x(product_id UUID, quantity INT)
  LOOP
    SELECT * INTO v_product FROM public.products WHERE id = v_item.product_id;

    DECLARE
      v_effective_price NUMERIC(10,2);
      v_line_total NUMERIC(10,2);
    BEGIN
      v_effective_price := COALESCE(v_product.sale_price, v_product.price);
      v_line_total := v_effective_price * v_item.quantity;

      INSERT INTO public.order_items (
        order_id,
        product_id,
        product_name,
        unit_price,
        quantity,
        line_total
      ) VALUES (
        v_new_order_id,
        v_product.id,
        v_product.name,
        v_effective_price,
        v_item.quantity,
        v_line_total
      );

      -- Decrement stock safely
      UPDATE public.products
      SET stock_quantity = GREATEST(0, stock_quantity - v_item.quantity)
      WHERE id = v_product.id;
    END;
  END LOOP;

  -- 10. Record Coupon Usage & Increment counter if coupon was applied
  IF v_coupon_id IS NOT NULL THEN
    INSERT INTO public.coupon_usage (
      coupon_id,
      order_id,
      user_id
    ) VALUES (
      v_coupon_id,
      v_new_order_id,
      v_user_id
    );

    UPDATE public.coupons
    SET times_used = times_used + 1
    WHERE id = v_coupon_id;
  END IF;

  -- 11. Insert Payment Record (PENDING_VERIFICATION)
  INSERT INTO public.payments (
    order_id,
    payment_method,
    upi_id,
    amount,
    status
  ) VALUES (
    v_new_order_id,
    'UPI',
    v_store_upi,
    v_total,
    'PENDING_VERIFICATION'
  );

  -- 12. Return order summary to client
  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_new_order_id,
    'subtotal', v_subtotal,
    'discount_amount', v_discount,
    'coupon_code', v_coupon_code,
    'shipping_fee', v_shipping_fee,
    'total_amount', v_total,
    'upi_id', v_store_upi,
    'status', 'PENDING_VERIFICATION'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
