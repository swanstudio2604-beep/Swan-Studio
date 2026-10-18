-- ============================================================================
-- SWAN STUDIO — Trusted Payment Verification & Audit Trail Functions
-- Brand: Swan Studio | Founder: Bhumika Nama
-- Tagline: Every Stitch Tells a Story.
--
-- SECURITY PRINCIPLES (PRD Section 11, 12 & 15):
-- 1. All payment status transitions (PAID, REJECTED, REFUNDED) MUST be performed
--    by a verified administrator (is_admin()).
-- 2. Every transition inserts an immutable record into payment_audit_log.
-- 3. Verified payments transition the master order to CONFIRMED.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Function: submit_payment_ref
-- Customer submits their UPI UTR / Transaction Reference ID
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_payment_ref(
  p_order_id UUID,
  p_ref_id TEXT,
  p_notes TEXT DEFAULT ''
)
RETURNS JSONB AS $$
DECLARE
  v_payment RECORD;
  v_cleaned_ref TEXT;
BEGIN
  v_cleaned_ref := TRIM(COALESCE(p_ref_id, ''));
  IF v_cleaned_ref = '' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Please provide a valid transaction reference number.');
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE order_id = p_order_id;

  IF v_payment.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'Payment record not found for this order.');
  END IF;

  IF v_payment.status = 'PAID' THEN
    RETURN jsonb_build_object('success', false, 'message', 'This payment has already been verified and marked as PAID.');
  END IF;

  UPDATE public.payments
  SET 
    transaction_ref_id = v_cleaned_ref,
    admin_notes = CASE WHEN p_notes <> '' THEN p_notes ELSE admin_notes END,
    updated_at = NOW()
  WHERE id = v_payment.id;

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', v_payment.id,
    'transaction_ref_id', v_cleaned_ref,
    'message', 'Transaction reference submitted successfully. Bhumika will verify receipt shortly.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ----------------------------------------------------------------------------
-- 2. Function: verify_payment (Admin Only)
-- Verifies receipt of manual UPI transfer and sets status = PAID
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_payment(
  p_payment_id UUID,
  p_notes TEXT DEFAULT ''
)
RETURNS JSONB AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_payment RECORD;
BEGIN
  -- Strict Admin Guard
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access Denied: Only atelier administrator can verify payments.';
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF v_payment.id IS NULL THEN
    RAISE EXCEPTION 'Payment record with ID % does not exist.', p_payment_id;
  END IF;

  IF v_payment.status = 'PAID' THEN
    RETURN jsonb_build_object('success', true, 'message', 'Payment is already marked as PAID.');
  END IF;

  -- 1. Update Payment Record
  UPDATE public.payments
  SET 
    status = 'PAID',
    verified_by = v_caller,
    verified_at = NOW(),
    admin_notes = TRIM(COALESCE(p_notes, admin_notes)),
    updated_at = NOW()
  WHERE id = p_payment_id;

  -- 2. Update Order Record
  UPDATE public.orders
  SET 
    status = 'CONFIRMED',
    updated_at = NOW()
  WHERE id = v_payment.order_id;

  -- 3. Write Immutable Audit Trail Log
  INSERT INTO public.payment_audit_log (
    payment_id,
    changed_by,
    old_status,
    new_status,
    notes
  ) VALUES (
    p_payment_id,
    v_caller,
    v_payment.status,
    'PAID',
    COALESCE(p_notes, 'Manual UPI payment verified against bank account.')
  );

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', p_payment_id,
    'order_id', v_payment.order_id,
    'new_status', 'PAID',
    'order_status', 'CONFIRMED'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ----------------------------------------------------------------------------
-- 3. Function: reject_payment (Admin Only)
-- Rejects unverified or invalid payment reference
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reject_payment(
  p_payment_id UUID,
  p_reason TEXT DEFAULT 'Payment not received in bank account.'
)
RETURNS JSONB AS $$
DECLARE
  v_caller UUID := auth.uid();
  v_payment RECORD;
BEGIN
  -- Strict Admin Guard
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access Denied: Only atelier administrator can reject payments.';
  END IF;

  SELECT * INTO v_payment
  FROM public.payments
  WHERE id = p_payment_id
  FOR UPDATE;

  IF v_payment.id IS NULL THEN
    RAISE EXCEPTION 'Payment record with ID % does not exist.', p_payment_id;
  END IF;

  -- 1. Update Payment Record
  UPDATE public.payments
  SET 
    status = 'REJECTED',
    verified_by = v_caller,
    verified_at = NOW(),
    admin_notes = TRIM(COALESCE(p_reason, 'Rejected by owner')),
    updated_at = NOW()
  WHERE id = p_payment_id;

  -- 2. Update Order Record
  UPDATE public.orders
  SET 
    status = 'CANCELLED',
    updated_at = NOW()
  WHERE id = v_payment.order_id;

  -- 3. Write Immutable Audit Trail Log
  INSERT INTO public.payment_audit_log (
    payment_id,
    changed_by,
    old_status,
    new_status,
    notes
  ) VALUES (
    p_payment_id,
    v_caller,
    v_payment.status,
    'REJECTED',
    COALESCE(p_reason, 'Payment rejected by administrator.')
  );

  RETURN jsonb_build_object(
    'success', true,
    'payment_id', p_payment_id,
    'order_id', v_payment.order_id,
    'new_status', 'REJECTED',
    'order_status', 'CANCELLED'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
