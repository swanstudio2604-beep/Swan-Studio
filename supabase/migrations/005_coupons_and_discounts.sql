-- ============================================================================
-- Migration: 005_coupons_and_discounts.sql
-- Description: Creates public.coupons & public.coupon_usage tables, RLS policies,
--              RPC validate_coupon function, and initial seed promotional codes.
-- ============================================================================

-- 1. Table: coupons
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('PERCENTAGE', 'FIXED')),
  discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  min_order_amount NUMERIC(10,2) DEFAULT 0.00 CHECK (min_order_amount >= 0),
  max_discount_cap NUMERIC(10,2) DEFAULT NULL,
  total_usage_limit INT DEFAULT NULL,
  per_customer_limit INT DEFAULT 1,
  times_used INT NOT NULL DEFAULT 0,
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expiry_date TIMESTAMPTZ DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.coupons IS 'Admin-managed coupon discount rules and usage limitations.';
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.coupons(is_active);

-- 2. Table: coupon_usage
CREATE TABLE IF NOT EXISTS public.coupon_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(coupon_id, order_id)
);

COMMENT ON TABLE public.coupon_usage IS 'Tracks redemptions per coupon, order, and customer.';

-- 3. Row Level Security
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active coupons" ON public.coupons;
CREATE POLICY "Public can view active coupons"
  ON public.coupons FOR SELECT
  USING (is_active = true AND (expiry_date IS NULL OR expiry_date > NOW()));

DROP POLICY IF EXISTS "Admin can manage coupons" ON public.coupons;
CREATE POLICY "Admin can manage coupons"
  ON public.coupons FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can view own coupon usage" ON public.coupon_usage;
CREATE POLICY "Users can view own coupon usage"
  ON public.coupon_usage FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "System can insert coupon usage" ON public.coupon_usage;
CREATE POLICY "System can insert coupon usage"
  ON public.coupon_usage FOR INSERT
  WITH CHECK (true);

-- 4. RPC: validate_coupon
CREATE OR REPLACE FUNCTION public.validate_coupon(
  p_code TEXT,
  p_subtotal NUMERIC,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_coupon RECORD;
  v_discount NUMERIC := 0;
  v_user_uses INT := 0;
BEGIN
  -- Look up coupon (case insensitive)
  SELECT * INTO v_coupon
  FROM public.coupons
  WHERE UPPER(code) = UPPER(TRIM(p_code));

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'message', 'Coupon code is invalid.');
  END IF;

  IF NOT v_coupon.is_active THEN
    RETURN jsonb_build_object('valid', false, 'message', 'This coupon is no longer active.');
  END IF;

  IF v_coupon.start_date > NOW() THEN
    RETURN jsonb_build_object('valid', false, 'message', 'This coupon is not yet active.');
  END IF;

  IF v_coupon.expiry_date IS NOT NULL AND v_coupon.expiry_date < NOW() THEN
    RETURN jsonb_build_object('valid', false, 'message', 'This coupon has expired.');
  END IF;

  IF p_subtotal < v_coupon.min_order_amount THEN
    RETURN jsonb_build_object(
      'valid', false,
      'message', format('Minimum order value of ₹%s required for this coupon.', v_coupon.min_order_amount)
    );
  END IF;

  IF v_coupon.total_usage_limit IS NOT NULL AND v_coupon.times_used >= v_coupon.total_usage_limit THEN
    RETURN jsonb_build_object('valid', false, 'message', 'This coupon has reached its maximum total redemptions.');
  END IF;

  IF p_user_id IS NOT NULL THEN
    SELECT COUNT(*) INTO v_user_uses
    FROM public.coupon_usage
    WHERE coupon_id = v_coupon.id AND user_id = p_user_id;

    IF v_user_uses >= v_coupon.per_customer_limit THEN
      RETURN jsonb_build_object('valid', false, 'message', 'You have already used this coupon.');
    END IF;
  END IF;

  -- Calculate discount
  IF v_coupon.discount_type = 'PERCENTAGE' THEN
    v_discount := ROUND((p_subtotal * (v_coupon.discount_value / 100.0)), 2);
    IF v_coupon.max_discount_cap IS NOT NULL AND v_discount > v_coupon.max_discount_cap THEN
      v_discount := v_coupon.max_discount_cap;
    END IF;
  ELSE
    v_discount := v_coupon.discount_value;
  END IF;

  IF v_discount > p_subtotal THEN
    v_discount := p_subtotal;
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'code', v_coupon.code,
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value,
    'discount_amount', v_discount,
    'message', format('Coupon "%s" applied! You saved ₹%s.', v_coupon.code, v_discount)
  );
END;
$$;

-- 5. Seed Demonstration Coupons
INSERT INTO public.coupons (code, discount_type, discount_value, min_order_amount, max_discount_cap, total_usage_limit, per_customer_limit, is_active)
VALUES 
  ('SWANFIRST', 'PERCENTAGE', 10.00, 499.00, 200.00, 500, 1, true),
  ('BHUMIKA100', 'FIXED', 100.00, 799.00, NULL, 200, 1, true),
  ('FESTIVE20', 'PERCENTAGE', 20.00, 1299.00, 400.00, 100, 1, true)
ON CONFLICT (code) DO NOTHING;
