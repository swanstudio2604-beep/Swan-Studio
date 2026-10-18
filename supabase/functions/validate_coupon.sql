-- ============================================================================
-- SWAN STUDIO — Trusted Database Function: validate_coupon()
-- Brand: Swan Studio | Founder: Bhumika Nama
-- Tagline: Every Stitch Tells a Story.
--
-- SECURITY PRINCIPLES (PRD Section 10):
-- 1. Evaluates existence, active status, date range, min order threshold,
--    usage limits, and maximum discount caps.
-- 2. Discount can NEVER exceed the subtotal.
-- 3. Returns structured validation result for client preview.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.validate_coupon(
  p_code TEXT,
  p_subtotal NUMERIC(10,2),
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_coupon RECORD;
  v_user_uses INT := 0;
  v_discount NUMERIC(10,2) := 0.00;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- 1. Sanitize code
  p_code := UPPER(TRIM(COALESCE(p_code, '')));
  IF p_code = '' THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Please enter a coupon code.');
  END IF;

  -- 2. Lookup coupon
  SELECT * INTO v_coupon
  FROM public.coupons
  WHERE code = p_code;

  IF v_coupon.id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Coupon code does not exist.');
  END IF;

  -- 3. Active check
  IF NOT v_coupon.is_active THEN
    RETURN jsonb_build_object('valid', false, 'message', 'This coupon is currently inactive.');
  END IF;

  -- 4. Date validation
  IF v_coupon.start_date > v_now THEN
    RETURN jsonb_build_object('valid', false, 'message', 'This coupon is not active yet.');
  END IF;

  IF v_coupon.expiry_date IS NOT NULL AND v_coupon.expiry_date < v_now THEN
    RETURN jsonb_build_object('valid', false, 'message', 'This coupon has expired.');
  END IF;

  -- 5. Minimum order amount check
  IF p_subtotal < v_coupon.min_order_amount THEN
    RETURN jsonb_build_object(
      'valid', false, 
      'message', format('This coupon requires a minimum bag value of ₹%s.', v_coupon.min_order_amount)
    );
  END IF;

  -- 6. Total usage limit
  IF v_coupon.total_usage_limit IS NOT NULL AND v_coupon.times_used >= v_coupon.total_usage_limit THEN
    RETURN jsonb_build_object('valid', false, 'message', 'This coupon has reached its maximum total usage limit.');
  END IF;

  -- 7. Per-customer limit
  IF p_user_id IS NOT NULL AND v_coupon.per_customer_limit IS NOT NULL THEN
    SELECT COUNT(*) INTO v_user_uses
    FROM public.coupon_usage
    WHERE coupon_id = v_coupon.id AND user_id = p_user_id;

    IF v_user_uses >= v_coupon.per_customer_limit THEN
      RETURN jsonb_build_object('valid', false, 'message', 'You have already reached the redemption limit for this coupon.');
    END IF;
  END IF;

  -- 8. Compute discount amount
  IF v_coupon.discount_type = 'PERCENTAGE' THEN
    v_discount := ROUND((p_subtotal * (v_coupon.discount_value / 100.0)), 2);
    -- Apply maximum cap if configured
    IF v_coupon.max_discount_cap IS NOT NULL AND v_discount > v_coupon.max_discount_cap THEN
      v_discount := v_coupon.max_discount_cap;
    END IF;
  ELSE -- FIXED amount
    v_discount := v_coupon.discount_value;
  END IF;

  -- Safety check: Discount cannot exceed subtotal
  IF v_discount > p_subtotal THEN
    v_discount := p_subtotal;
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'code', v_coupon.code,
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value,
    'discount_amount', v_discount,
    'message', format('Coupon %s applied! Saved ₹%s', v_coupon.code, v_discount)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
