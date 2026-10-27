-- ============================================================================
-- SWAN STUDIO — Migration 006: Customer Reviews & Kind Notes Pipeline
-- Brand: Swan Studio | Founder: Bhumika Nama
-- Project Ref: hzlimdfxvojkqsszmulj
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Table Evolution: public.reviews
-- Ensures columns for customer notes, ratings, photo attachments, consent,
-- admin moderation, verified buyer badge, edit history, and soft deletion.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  author_name TEXT,
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT DEFAULT '',
  comment TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'hidden')),
  verified_purchase BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add extended columns if not already present
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'note' CHECK (type IN ('review', 'note'));
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS body TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS city TEXT DEFAULT '';
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS photo_path TEXT DEFAULT NULL;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS consent_public BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS verified_buyer BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS featured BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS admin_reply TEXT DEFAULT NULL;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS original_body TEXT DEFAULT NULL;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS customer_contact TEXT DEFAULT NULL;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Backfill legacy records if any exist
UPDATE public.reviews
SET body = comment
WHERE body IS NULL AND comment IS NOT NULL;

UPDATE public.reviews
SET display_name = COALESCE(NULLIF(split_part(author_name, ' ', 1), ''), 'Friend')
WHERE display_name IS NULL AND author_name IS NOT NULL;

-- In case customer_name was used in earlier seed
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'customer_name'
  ) THEN
    EXECUTE 'UPDATE public.reviews SET display_name = COALESCE(display_name, split_part(customer_name, '' '', 1)) WHERE display_name IS NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'is_verified_buyer'
  ) THEN
    EXECUTE 'UPDATE public.reviews SET verified_buyer = COALESCE(verified_buyer, is_verified_buyer)';
  END IF;
END $$;

-- Set defaults for null values before enforcing NOT NULL
UPDATE public.reviews SET body = 'Handcrafted with love.' WHERE body IS NULL;
UPDATE public.reviews SET display_name = 'Kind Buyer' WHERE display_name IS NULL;
UPDATE public.reviews SET consent_public = true WHERE is_public = true AND consent_public = false;
UPDATE public.reviews SET approved_at = updated_at WHERE status = 'approved' AND approved_at IS NULL;

ALTER TABLE public.reviews ALTER COLUMN body SET NOT NULL;
ALTER TABLE public.reviews ALTER COLUMN display_name SET NOT NULL;

-- Consent integrity constraint: public reviews must have consent_public = true
DO $$
BEGIN
  ALTER TABLE public.reviews DROP CONSTRAINT IF EXISTS chk_reviews_consent_public;
  ALTER TABLE public.reviews ADD CONSTRAINT chk_reviews_consent_public
    CHECK (is_public = false OR consent_public = true);
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_reviews_status ON public.reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_public_approved ON public.reviews(status, is_public, deleted_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_featured ON public.reviews(featured) WHERE status = 'approved' AND is_public = true;

-- ----------------------------------------------------------------------------
-- 2. Triggers: Integrity & Audit
-- Enforces:
-- - Anon submissions are ALWAYS forced to status 'pending', verified_buyer false,
--   deleted_at null, approved_at null, admin_reply null.
-- - Text modifications by admin preserve original_body.
-- - Approvals timestamp approved_at.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_fn_reviews_protect_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- If user is NOT admin, strictly enforce safe customer submission defaults
    IF NOT public.is_admin() THEN
      NEW.status := 'pending';
      NEW.verified_buyer := false;
      NEW.deleted_at := NULL;
      NEW.approved_at := NULL;
      NEW.admin_reply := NULL;
      NEW.featured := false;
    END IF;

    IF NEW.original_body IS NULL THEN
      NEW.original_body := NEW.body;
    END IF;
    NEW.created_at := COALESCE(NEW.created_at, NOW());
    NEW.updated_at := NOW();

    -- Also keep legacy fields synced for backwards compatibility
    NEW.comment := NEW.body;
    NEW.author_name := NEW.display_name;
    NEW.verified_purchase := NEW.verified_buyer;

    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Admin edit tracking: if body changes and original_body is empty, capture it
    IF OLD.body IS DISTINCT FROM NEW.body AND NEW.original_body IS NULL THEN
      NEW.original_body := OLD.body;
    END IF;

    -- Timestamp approval
    IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'approved' AND NEW.approved_at IS NULL THEN
      NEW.approved_at := NOW();
    END IF;

    NEW.updated_at := NOW();
    NEW.comment := NEW.body;
    NEW.author_name := NEW.display_name;
    NEW.verified_purchase := NEW.verified_buyer;

    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reviews_protect_integrity ON public.reviews;
CREATE TRIGGER trg_reviews_protect_integrity
  BEFORE INSERT OR UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_reviews_protect_integrity();

-- ----------------------------------------------------------------------------
-- 3. Public Safe View: public.approved_reviews
-- Strips private notes, unapproved items, order IDs, and customer contact info
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.approved_reviews AS
SELECT
  r.id,
  r.type,
  r.rating,
  r.body,
  r.display_name,
  r.city,
  r.product_id,
  p.name AS product_name,
  p.slug AS product_slug,
  r.photo_path,
  r.is_public,
  r.verified_buyer,
  r.featured,
  r.admin_reply,
  r.created_at,
  r.approved_at
FROM public.reviews r
LEFT JOIN public.products p ON p.id = r.product_id
WHERE r.status = 'approved'
  AND r.is_public = true
  AND r.deleted_at IS NULL;

COMMENT ON VIEW public.approved_reviews IS 'Secure sanitized view of public approved customer reviews and notes.';

-- ----------------------------------------------------------------------------
-- 4. Row Level Security (RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Drop existing review policies to prevent conflicts
DROP POLICY IF EXISTS "Public can view approved reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins have full access to reviews" ON public.reviews;
DROP POLICY IF EXISTS "Customers can submit reviews" ON public.reviews;
DROP POLICY IF EXISTS "Anon can submit reviews" ON public.reviews;
DROP POLICY IF EXISTS "Public can select approved public reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admin full access to reviews" ON public.reviews;

-- Anon can read ONLY public, approved, non-deleted reviews
CREATE POLICY "Public can select approved public reviews"
  ON public.reviews FOR SELECT
  TO anon, authenticated
  USING (status = 'approved' AND is_public = true AND deleted_at IS NULL);

-- Anon can INSERT pending reviews with verified_buyer false
CREATE POLICY "Anon can submit reviews"
  ON public.reviews FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    status = 'pending'
    AND verified_buyer = false
    AND deleted_at IS NULL
    AND approved_at IS NULL
    AND admin_reply IS NULL
  );

-- Admins have full access to ALL reviews (pending, private, hidden, deleted)
CREATE POLICY "Admin full access to reviews"
  ON public.reviews FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Explicitly deny anon update and delete
REVOKE UPDATE, DELETE ON public.reviews FROM anon;
GRANT SELECT, INSERT ON public.reviews TO anon, authenticated;
GRANT SELECT ON public.approved_reviews TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 5. Storage Buckets: pending-review-photos (Private) & public-review-photos (Public)
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('pending-review-photos', 'pending-review-photos', false, 1048576, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('public-review-photos', 'public-review-photos', true, 1048576, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage Policies
DROP POLICY IF EXISTS "Anon can upload pending review photos" ON storage.objects;
CREATE POLICY "Anon can upload pending review photos"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'pending-review-photos');

DROP POLICY IF EXISTS "Public can view approved review photos" ON storage.objects;
CREATE POLICY "Public can view approved review photos"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'public-review-photos');

DROP POLICY IF EXISTS "Admin full access to pending review photos" ON storage.objects;
CREATE POLICY "Admin full access to pending review photos"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'pending-review-photos' AND public.is_admin())
  WITH CHECK (bucket_id = 'pending-review-photos' AND public.is_admin());

DROP POLICY IF EXISTS "Admin full access to public review photos" ON storage.objects;
CREATE POLICY "Admin full access to public review photos"
  ON storage.objects FOR ALL
  TO authenticated
  USING (bucket_id = 'public-review-photos' AND public.is_admin())
  WITH CHECK (bucket_id = 'public-review-photos' AND public.is_admin());

-- ----------------------------------------------------------------------------
-- 6. RPC Function: submit_customer_note
-- Validates: honeypot, links, text length (10-600), rating (1-5), name length,
-- consent, and rate limiting (max 3/hour).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.submit_customer_note(
  p_type TEXT DEFAULT 'note',
  p_rating INT DEFAULT 5,
  p_body TEXT DEFAULT '',
  p_display_name TEXT DEFAULT '',
  p_city TEXT DEFAULT '',
  p_product_id UUID DEFAULT NULL,
  p_photo_path TEXT DEFAULT NULL,
  p_is_public BOOLEAN DEFAULT true,
  p_consent_public BOOLEAN DEFAULT false,
  p_order_id UUID DEFAULT NULL,
  p_customer_contact TEXT DEFAULT NULL,
  p_honeypot TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_id UUID;
  v_clean_name TEXT;
  v_clean_city TEXT;
  v_clean_body TEXT;
  v_clean_contact TEXT;
  v_is_verified BOOLEAN := false;
  v_recent_count INT := 0;
  v_type TEXT;
BEGIN
  -- 1. Honeypot check (anti-spam)
  IF p_honeypot IS NOT NULL AND length(trim(p_honeypot)) > 0 THEN
    RAISE EXCEPTION 'Bot submission detected.';
  END IF;

  -- 2. Clean input
  v_clean_name := trim(COALESCE(p_display_name, ''));
  v_clean_city := trim(COALESCE(p_city, ''));
  v_clean_body := trim(COALESCE(p_body, ''));
  v_clean_contact := trim(COALESCE(p_customer_contact, ''));
  v_type := CASE WHEN lower(p_type) = 'review' THEN 'review' ELSE 'note' END;

  -- 3. Length and rating validations
  IF length(v_clean_name) < 2 OR length(v_clean_name) > 60 THEN
    RAISE EXCEPTION 'Please enter your first name (2 to 60 characters).';
  END IF;

  IF p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5 stars.';
  END IF;

  IF length(v_clean_body) < 10 OR length(v_clean_body) > 600 THEN
    RAISE EXCEPTION 'Your note must be between 10 and 600 characters.';
  END IF;

  -- 4. Block links/URLs in note body
  IF v_clean_body ~* '(https?://|www\.|[a-zA-Z0-9-]+\.(com|in|org|net|xyz|co|io|biz|info|site|online|me|app))' THEN
    RAISE EXCEPTION 'To protect our community, notes cannot contain website links or URLs.';
  END IF;

  -- 5. Consent requirement for public notes
  IF p_is_public AND NOT p_consent_public THEN
    RAISE EXCEPTION 'Please confirm your consent to display your note on the website.';
  END IF;

  -- 6. Rate limiting: max 3 submissions per hour per contact or recent submissions
  IF length(v_clean_contact) > 0 THEN
    SELECT COUNT(*) INTO v_recent_count
    FROM public.reviews
    WHERE customer_contact = v_clean_contact
      AND created_at > (NOW() - INTERVAL '1 hour');

    IF v_recent_count >= 3 THEN
      RAISE EXCEPTION 'You have submitted several notes recently. Please wait a little while before sharing another.';
    END IF;
  END IF;

  -- 7. Check verified buyer if order_id is provided
  IF p_order_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = p_order_id
        AND (p_product_id IS NULL OR EXISTS (
          SELECT 1 FROM public.order_items oi WHERE oi.order_id = o.id AND oi.product_id = p_product_id
        ))
    ) INTO v_is_verified;
  END IF;

  -- 8. Insert record
  INSERT INTO public.reviews (
    type,
    rating,
    body,
    display_name,
    city,
    product_id,
    order_id,
    photo_path,
    is_public,
    consent_public,
    status,
    verified_buyer,
    featured,
    customer_contact,
    original_body,
    created_at
  ) VALUES (
    v_type,
    p_rating,
    v_clean_body,
    v_clean_name,
    v_clean_city,
    p_product_id,
    p_order_id,
    p_photo_path,
    p_is_public,
    p_consent_public,
    'pending',
    v_is_verified,
    false,
    NULLIF(v_clean_contact, ''),
    v_clean_body,
    NOW()
  ) RETURNING id INTO v_new_id;

  RETURN jsonb_build_object(
    'success', true,
    'id', v_new_id,
    'message', 'Note received successfully. Bhumika reads every note personally.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_customer_note TO anon, authenticated;

-- Also update legacy submit_review_secure to redirect to the new schema
CREATE OR REPLACE FUNCTION public.submit_review_secure(
  p_product_id UUID,
  p_order_id UUID,
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_rating INT,
  p_title TEXT,
  p_comment TEXT,
  p_honeypot TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.submit_customer_note(
    p_type => 'review',
    p_rating => p_rating,
    p_body => p_comment,
    p_display_name => split_part(COALESCE(p_customer_name, 'Kind Customer'), ' ', 1),
    p_city => '',
    p_product_id => p_product_id,
    p_photo_path => NULL,
    p_is_public => true,
    p_consent_public => true,
    p_order_id => p_order_id,
    p_customer_contact => p_customer_email,
    p_honeypot => p_honeypot
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_review_secure TO anon, authenticated;
