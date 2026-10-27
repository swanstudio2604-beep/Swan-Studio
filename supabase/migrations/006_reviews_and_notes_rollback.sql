-- ============================================================================
-- SWAN STUDIO — Rollback Migration 006: Reviews & Kind Notes Pipeline
-- ============================================================================

DROP VIEW IF EXISTS public.approved_reviews CASCADE;
DROP TRIGGER IF EXISTS trg_reviews_protect_integrity ON public.reviews;
DROP FUNCTION IF EXISTS public.trg_fn_reviews_protect_integrity();
DROP FUNCTION IF EXISTS public.submit_customer_note(TEXT, INT, TEXT, TEXT, TEXT, UUID, TEXT, BOOLEAN, BOOLEAN, UUID, TEXT, TEXT);

-- Revert table policies
DROP POLICY IF EXISTS "Public can select approved public reviews" ON public.reviews;
DROP POLICY IF EXISTS "Anon can submit reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admin full access to reviews" ON public.reviews;

CREATE POLICY "Public can view approved reviews"
  ON public.reviews FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Admins have full access to reviews"
  ON public.reviews FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
