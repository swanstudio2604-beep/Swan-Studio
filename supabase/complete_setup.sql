-- ============================================================================
-- SWAN STUDIO — Consolidated Setup for Supabase SQL Editor
-- Brand: Swan Studio | Founder: Bhumika Nama
-- Project Ref: hzlimdfxvojkqsszmulj
-- INSTRUCTIONS: Run this complete script in the Supabase SQL Editor.
-- ============================================================================

-- ============================================================================
-- SWAN STUDIO — Migration 001: Core Database Schema
-- Brand: Swan Studio | Founder: Bhumika Nama
-- Project Ref: hzlimdfxvojkqsszmulj
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Helper Function: update_updated_at_column
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ----------------------------------------------------------------------------
-- 2. Table: admins
-- Stores user IDs authorized for administrative atelier access.
-- Linked directly to Supabase Auth auth.users(id).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admins (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.admins IS 'List of authenticated user IDs granted admin atelier permissions.';

-- ----------------------------------------------------------------------------
-- 3. Table: categories
-- Product categories with soft delete, visibility, and sort order.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  icon_emoji TEXT DEFAULT '🌸',
  image_url TEXT DEFAULT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_visibility ON public.categories(is_hidden, deleted_at);

CREATE TRIGGER trg_categories_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 4. Table: products
-- Products with category constraint ON DELETE RESTRICT (categories with products cannot be deleted).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  sale_price NUMERIC(10,2) DEFAULT NULL CHECK (sale_price IS NULL OR (sale_price >= 0 AND sale_price < price)),
  description TEXT DEFAULT '',
  materials TEXT DEFAULT '',
  dimensions TEXT DEFAULT '',
  colors JSONB DEFAULT '[]'::jsonb,
  variants JSONB DEFAULT '[]'::jsonb,
  image_url TEXT DEFAULT NULL,
  stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT true,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  made_to_order BOOLEAN NOT NULL DEFAULT false,
  prep_time TEXT DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  archived_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(is_published, is_hidden, deleted_at);

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 5. Table: orders
-- Orders with complete totals, status, shipping snapshot, and verification fields.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  shipping_address JSONB NOT NULL,
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  shipping_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  coupon_code TEXT DEFAULT NULL,
  payment_status TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION' CHECK (payment_status IN ('PENDING_VERIFICATION', 'PAID', 'FAILED', 'REFUNDED')),
  order_status TEXT NOT NULL DEFAULT 'NEW' CHECK (order_status IN ('NEW', 'CONFIRMED', 'IN_MAKING', 'PACKED', 'SHIPPED', 'DELIVERED', 'CANCELLED')),
  utr_number TEXT DEFAULT NULL,
  tracking_number TEXT DEFAULT NULL,
  admin_notes TEXT DEFAULT '',
  customer_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_order_number ON public.orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON public.orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_order_status ON public.orders(order_status);

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 6. Table: order_items
-- Preserves immutable historical snapshot of product name, unit price, and image.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_price NUMERIC(10,2) NOT NULL,
  product_image TEXT DEFAULT NULL,
  quantity INT NOT NULL CHECK (quantity > 0 AND quantity <= 50),
  selected_color TEXT DEFAULT NULL,
  selected_size TEXT DEFAULT NULL,
  line_total NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);

-- ----------------------------------------------------------------------------
-- 7. Table: order_status_history
-- Full audit trail of order transitions.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  from_status TEXT DEFAULT NULL,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order ON public.order_status_history(order_id);

-- ----------------------------------------------------------------------------
-- 8. Table: customers (profile directory)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);

CREATE TRIGGER trg_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 9. Table: reviews
-- Customer reviews submitted as pending; verified buyer checked via order link.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT DEFAULT '',
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT DEFAULT '',
  comment TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'hidden')),
  is_verified_buyer BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reviews_product ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON public.reviews(status);

CREATE TRIGGER trg_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 10. Table: blog_posts
-- Editorial stories and crochet guides.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled')),
  published_at TIMESTAMPTZ DEFAULT NULL,
  excerpt TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  body TEXT NOT NULL,
  author TEXT DEFAULT 'Bhumika Nama',
  cover_image TEXT DEFAULT NULL,
  cover_image_alt TEXT DEFAULT '',
  seo_title TEXT DEFAULT NULL,
  seo_description TEXT DEFAULT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON public.blog_posts(status, published_at, deleted_at);

CREATE TRIGGER trg_blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 11. Table: site_content & site_content_history
-- Live storefront copy with version control and rollback capability.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_content (
  key TEXT PRIMARY KEY,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.site_content_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_key TEXT NOT NULL REFERENCES public.site_content(key) ON DELETE CASCADE,
  data JSONB NOT NULL,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_content_history_key ON public.site_content_history(content_key, created_at DESC);

-- Automatic version history trigger
CREATE OR REPLACE FUNCTION public.archive_site_content_version()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.site_content_history (content_key, data, changed_by, created_at)
  VALUES (OLD.key, OLD.data, auth.uid(), NOW());
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_site_content_versioning
  BEFORE UPDATE ON public.site_content
  FOR EACH ROW
  EXECUTE FUNCTION public.archive_site_content_version();

-- ----------------------------------------------------------------------------
-- 12. Table: faq_items
-- FAQ accordion items
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.faq_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  sort_order INT NOT NULL DEFAULT 0,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_faq_items_updated_at
  BEFORE UPDATE ON public.faq_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 13. Table: gallery_items
-- Portfolio gallery and Instagram banner cards
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.gallery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT DEFAULT '',
  image_url TEXT NOT NULL,
  caption TEXT DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_gallery_items_updated_at
  BEFORE UPDATE ON public.gallery_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 14. Table: submission_logs (Rate limiting & honeypot tracking)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.submission_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_type TEXT NOT NULL,
  identifier TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submission_logs_rate ON public.submission_logs(submission_type, identifier, created_at);



-- ============================================================================
-- SWAN STUDIO — Migration 002: Storage Bucket for Studio Assets & Product Images
-- Brand: Swan Studio | Founder: Bhumika Nama
-- Bucket: images (Public Read, Admin Write & Delete, 5MB limit, WebP/JPG/PNG/GIF)
-- ============================================================================

-- 1. Create or Update Storage Bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'images',
  'images',
  true,
  5242880, -- 5 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 2. Storage Policies
-- Public Read: anyone can view uploaded images
DROP POLICY IF EXISTS "Public can view images in images bucket" ON storage.objects;
CREATE POLICY "Public can view images in images bucket"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'images');

-- Admin Insert: Only verified atelier admins can upload
DROP POLICY IF EXISTS "Admin can upload images in images bucket" ON storage.objects;
CREATE POLICY "Admin can upload images in images bucket"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'images'
    AND (
      EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
      OR (auth.jwt() ->> 'email' = 'swanstudio2604@gmail.com')
    )
  );

-- Admin Update: Only verified atelier admins can update image files
DROP POLICY IF EXISTS "Admin can update images in images bucket" ON storage.objects;
CREATE POLICY "Admin can update images in images bucket"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'images'
    AND (
      EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
      OR (auth.jwt() ->> 'email' = 'swanstudio2604@gmail.com')
    )
  );

-- Admin Delete: Only verified atelier admins can delete image files
DROP POLICY IF EXISTS "Admin can delete images in images bucket" ON storage.objects;
CREATE POLICY "Admin can delete images in images bucket"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'images'
    AND (
      EXISTS (SELECT 1 FROM public.admins WHERE id = auth.uid())
      OR (auth.jwt() ->> 'email' = 'swanstudio2604@gmail.com')
    )
  );



-- ============================================================================
-- SWAN STUDIO — Migration 003: Row Level Security (RLS) & Server Security Functions
-- Brand: Swan Studio | Founder: Bhumika Nama
-- Project Ref: hzlimdfxvojkqsszmulj
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Helper Function: is_admin()
-- Verifies whether current caller is in public.admins or master email.
-- Immutable search_path prevents search_path injection vulnerabilities.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admins WHERE id = auth.uid()
  ) OR (
    auth.jwt() ->> 'email' = 'swanstudio2604@gmail.com'
  );
$$;

-- ----------------------------------------------------------------------------
-- 2. Enable Row Level Security (RLS) on ALL Tables
-- Default: DENY ALL
-- ----------------------------------------------------------------------------
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_content_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submission_logs ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 3. Policies: admins
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view admin list" ON public.admins;
CREATE POLICY "Admins can view admin list"
  ON public.admins FOR SELECT
  USING (public.is_admin());

DROP POLICY IF EXISTS "Admins can manage admin list" ON public.admins;
CREATE POLICY "Admins can manage admin list"
  ON public.admins FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 4. Policies: categories
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view active categories" ON public.categories;
CREATE POLICY "Public can view active categories"
  ON public.categories FOR SELECT
  USING (deleted_at IS NULL AND is_hidden = false);

DROP POLICY IF EXISTS "Admins have full access to categories" ON public.categories;
CREATE POLICY "Admins have full access to categories"
  ON public.categories FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 5. Policies: products
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view published products" ON public.products;
CREATE POLICY "Public can view published products"
  ON public.products FOR SELECT
  USING (is_published = true AND is_hidden = false AND deleted_at IS NULL AND archived_at IS NULL);

DROP POLICY IF EXISTS "Admins have full access to products" ON public.products;
CREATE POLICY "Admins have full access to products"
  ON public.products FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 6. Policies: orders
-- Public CANNOT read orders. Only admin or the owning customer can view.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Customers can view their own orders" ON public.orders;
CREATE POLICY "Customers can view their own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() IS NOT NULL AND customer_id = auth.uid());

DROP POLICY IF EXISTS "Admins have full access to orders" ON public.orders;
CREATE POLICY "Admins have full access to orders"
  ON public.orders FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 7. Policies: order_items
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Customers can view their own order items" ON public.order_items;
CREATE POLICY "Customers can view their own order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.customer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins have full access to order items" ON public.order_items;
CREATE POLICY "Admins have full access to order items"
  ON public.order_items FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 8. Policies: order_status_history
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Customers can view their order status history" ON public.order_status_history;
CREATE POLICY "Customers can view their order status history"
  ON public.order_status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_status_history.order_id
        AND o.customer_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins have full access to order status history" ON public.order_status_history;
CREATE POLICY "Admins have full access to order status history"
  ON public.order_status_history FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 9. Policies: customers
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Customers can view own profile" ON public.customers;
CREATE POLICY "Customers can view own profile"
  ON public.customers FOR SELECT
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid());

DROP POLICY IF EXISTS "Customers can update own profile" ON public.customers;
CREATE POLICY "Customers can update own profile"
  ON public.customers FOR UPDATE
  USING (auth.uid() IS NOT NULL AND user_id = auth.uid())
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

DROP POLICY IF EXISTS "Admins have full access to customers" ON public.customers;
CREATE POLICY "Admins have full access to customers"
  ON public.customers FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 10. Policies: reviews
-- Public can ONLY view approved reviews.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view approved reviews" ON public.reviews;
CREATE POLICY "Public can view approved reviews"
  ON public.reviews FOR SELECT
  USING (status = 'approved');

DROP POLICY IF EXISTS "Admins have full access to reviews" ON public.reviews;
CREATE POLICY "Admins have full access to reviews"
  ON public.reviews FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 11. Policies: blog_posts
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view published blog posts" ON public.blog_posts;
CREATE POLICY "Public can view published blog posts"
  ON public.blog_posts FOR SELECT
  USING (
    deleted_at IS NULL
    AND status = 'published'
    AND (published_at IS NULL OR published_at <= now())
  );

DROP POLICY IF EXISTS "Admins have full access to blog posts" ON public.blog_posts;
CREATE POLICY "Admins have full access to blog posts"
  ON public.blog_posts FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 12. Policies: site_content & site_content_history
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view site content" ON public.site_content;
CREATE POLICY "Public can view site content"
  ON public.site_content FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins have full access to site content" ON public.site_content;
CREATE POLICY "Admins have full access to site content"
  ON public.site_content FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can view site content history" ON public.site_content_history;
CREATE POLICY "Admins can view site content history"
  ON public.site_content_history FOR SELECT
  USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- 13. Policies: faq_items & gallery_items
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public can view visible FAQs" ON public.faq_items;
CREATE POLICY "Public can view visible FAQs"
  ON public.faq_items FOR SELECT
  USING (is_hidden = false);

DROP POLICY IF EXISTS "Admins have full access to FAQs" ON public.faq_items;
CREATE POLICY "Admins have full access to FAQs"
  ON public.faq_items FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Public can view visible gallery items" ON public.gallery_items;
CREATE POLICY "Public can view visible gallery items"
  ON public.gallery_items FOR SELECT
  USING (is_hidden = false);

DROP POLICY IF EXISTS "Admins have full access to gallery items" ON public.gallery_items;
CREATE POLICY "Admins have full access to gallery items"
  ON public.gallery_items FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins have full access to submission logs" ON public.submission_logs;
CREATE POLICY "Admins have full access to submission logs"
  ON public.submission_logs FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 14. Server-Side Function: create_order_secure
-- STRICT SECURITY RULES:
-- Recomputes prices from products table; never trusts client-sent prices.
-- Verifies honeypot, checks rate limits, creates order + order_items + history.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_order_secure(
  p_customer_name TEXT,
  p_customer_email TEXT,
  p_customer_phone TEXT,
  p_shipping_address JSONB,
  p_customer_notes TEXT DEFAULT '',
  p_items JSONB DEFAULT '[]'::jsonb,
  p_coupon_code TEXT DEFAULT NULL,
  p_honeypot TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id UUID;
  v_order_number TEXT;
  v_clean_name TEXT;
  v_clean_email TEXT;
  v_clean_phone TEXT;
  v_subtotal NUMERIC(10,2) := 0;
  v_discount NUMERIC(10,2) := 0;
  v_shipping NUMERIC(10,2) := 0;
  v_total NUMERIC(10,2) := 0;
  v_item RECORD;
  v_product RECORD;
  v_item_price NUMERIC(10,2);
  v_line_total NUMERIC(10,2);
  v_recent_count INT;
  v_date_prefix TEXT;
  v_random_suffix TEXT;
BEGIN
  -- 1. Honeypot check (Spam bots populate hidden fields)
  IF p_honeypot IS NOT NULL AND length(trim(p_honeypot)) > 0 THEN
    RAISE EXCEPTION 'Invalid submission detected.';
  END IF;

  -- 2. Input sanitization & validation
  v_clean_name := trim(COALESCE(p_customer_name, ''));
  v_clean_email := lower(trim(COALESCE(p_customer_email, '')));
  v_clean_phone := regexp_replace(COALESCE(p_customer_phone, ''), '[^0-9+]', '', 'g');

  IF length(v_clean_name) < 2 OR length(v_clean_name) > 100 THEN
    RAISE EXCEPTION 'Please provide a valid full name (2 to 100 characters).';
  END IF;

  IF v_clean_email NOT LIKE '%@%.%' OR length(v_clean_email) > 150 THEN
    RAISE EXCEPTION 'Please provide a valid email address.';
  END IF;

  IF length(v_clean_phone) < 8 OR length(v_clean_phone) > 15 THEN
    RAISE EXCEPTION 'Please provide a valid contact phone number.';
  END IF;

  IF p_shipping_address IS NULL OR jsonb_typeof(p_shipping_address) != 'object' THEN
    RAISE EXCEPTION 'Please provide complete delivery address details.';
  END IF;

  IF jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Your bag is empty. Please select at least one creation.';
  END IF;

  -- 3. Rate limiting: Max 5 orders per 10 minutes per email or phone
  SELECT COUNT(*) INTO v_recent_count
  FROM public.submission_logs
  WHERE submission_type = 'order'
    AND (identifier = v_clean_email OR identifier = v_clean_phone)
    AND created_at > (now() - interval '10 minutes');

  IF v_recent_count >= 5 THEN
    RAISE EXCEPTION 'Too many order requests. Please wait a few minutes or message us on WhatsApp.';
  END IF;

  -- 4. Calculate secure totals by querying the products table directly
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
    product_id UUID,
    quantity INT,
    selected_color TEXT,
    selected_size TEXT
  )
  LOOP
    IF v_item.quantity IS NULL OR v_item.quantity <= 0 OR v_item.quantity > 50 THEN
      RAISE EXCEPTION 'Invalid item quantity: %', v_item.quantity;
    END IF;

    SELECT id, name, price, sale_price, image_url, stock_quantity, made_to_order, is_published, is_hidden, deleted_at
    INTO v_product
    FROM public.products
    WHERE id = v_item.product_id;

    IF NOT FOUND OR v_product.is_published = false OR v_product.is_hidden = true OR v_product.deleted_at IS NOT NULL THEN
      RAISE EXCEPTION 'One or more creations in your bag are no longer available.';
    END IF;

    -- Strict stock check if not made-to-order
    IF v_product.made_to_order = false AND v_product.stock_quantity < v_item.quantity THEN
      RAISE EXCEPTION 'Insufficient stock for "%". Available: %', v_product.name, v_product.stock_quantity;
    END IF;

    v_item_price := COALESCE(v_product.sale_price, v_product.price);
    v_line_total := v_item_price * v_item.quantity;
    v_subtotal := v_subtotal + v_line_total;
  END LOOP;

  -- 5. Calculate shipping (Free shipping on orders >= ₹999; ₹79 standard shipping)
  IF v_subtotal >= 999 THEN
    v_shipping := 0;
  ELSE
    v_shipping := 79;
  END IF;

  -- Optional promo discount logic
  IF p_coupon_code IS NOT NULL AND upper(trim(p_coupon_code)) = 'SWAN10' THEN
    v_discount := round((v_subtotal * 0.10), 2);
  END IF;

  v_total := v_subtotal - v_discount + v_shipping;

  -- 6. Generate human-readable Order Number (e.g. SWAN-20261020-XXXX)
  v_date_prefix := to_char(now(), 'YYYYMMDD');
  v_random_suffix := upper(substr(md5(random()::text), 1, 4));
  v_order_number := 'SWAN-' || v_date_prefix || '-' || v_random_suffix;

  -- 7. Insert into public.orders
  INSERT INTO public.orders (
    order_number,
    customer_id,
    customer_name,
    customer_email,
    customer_phone,
    shipping_address,
    subtotal,
    discount_amount,
    shipping_fee,
    total_amount,
    coupon_code,
    payment_status,
    order_status,
    customer_notes
  ) VALUES (
    v_order_number,
    auth.uid(),
    v_clean_name,
    v_clean_email,
    v_clean_phone,
    p_shipping_address,
    v_subtotal,
    v_discount,
    v_shipping,
    v_total,
    p_coupon_code,
    'PENDING_VERIFICATION',
    'NEW',
    COALESCE(p_customer_notes, '')
  ) RETURNING id INTO v_order_id;

  -- 8. Insert order items snapshot
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(
    product_id UUID,
    quantity INT,
    selected_color TEXT,
    selected_size TEXT
  )
  LOOP
    SELECT name, price, sale_price, image_url INTO v_product
    FROM public.products
    WHERE id = v_item.product_id;

    v_item_price := COALESCE(v_product.sale_price, v_product.price);
    v_line_total := v_item_price * v_item.quantity;

    INSERT INTO public.order_items (
      order_id,
      product_id,
      product_name,
      product_price,
      product_image,
      quantity,
      selected_color,
      selected_size,
      line_total
    ) VALUES (
      v_order_id,
      v_item.product_id,
      v_product.name,
      v_item_price,
      v_product.image_url,
      v_item.quantity,
      v_item.selected_color,
      v_item.selected_size,
      v_line_total
    );

    -- Reduce inventory for non-made-to-order items
    UPDATE public.products
    SET stock_quantity = GREATEST(0, stock_quantity - v_item.quantity)
    WHERE id = v_item.product_id AND made_to_order = false;
  END LOOP;

  -- 9. Insert initial status history
  INSERT INTO public.order_status_history (order_id, to_status, notes)
  VALUES (v_order_id, 'NEW', 'Order placed via studio storefront.');

  -- 10. Upsert Customer directory record
  INSERT INTO public.customers (user_id, email, full_name, phone)
  VALUES (auth.uid(), v_clean_email, v_clean_name, v_clean_phone)
  ON CONFLICT (email) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    updated_at = NOW();

  -- 11. Log submission for rate limiting
  INSERT INTO public.submission_logs (submission_type, identifier)
  VALUES ('order', v_clean_email);

  RETURN jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'subtotal', v_subtotal,
    'discount', v_discount,
    'shipping', v_shipping,
    'total_amount', v_total,
    'payment_status', 'PENDING_VERIFICATION'
  );
END;
$$;

-- Allow anon and authenticated roles to execute order creation function
GRANT EXECUTE ON FUNCTION public.create_order_secure TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 15. Server-Side Function: submit_review_secure
-- Validates honeypot, length limits, verifies order for verified buyer badge.
-- Always inserts with status = 'pending'.
-- ----------------------------------------------------------------------------
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
DECLARE
  v_review_id UUID;
  v_clean_name TEXT;
  v_clean_email TEXT;
  v_clean_comment TEXT;
  v_is_verified BOOLEAN := false;
  v_recent_count INT;
BEGIN
  -- 1. Honeypot check
  IF p_honeypot IS NOT NULL AND length(trim(p_honeypot)) > 0 THEN
    RAISE EXCEPTION 'Invalid submission detected.';
  END IF;

  -- 2. Input validation
  v_clean_name := trim(COALESCE(p_customer_name, ''));
  v_clean_email := lower(trim(COALESCE(p_customer_email, '')));
  v_clean_comment := trim(COALESCE(p_comment, ''));

  IF length(v_clean_name) < 2 OR length(v_clean_name) > 100 THEN
    RAISE EXCEPTION 'Please enter your name (2 to 100 characters).';
  END IF;

  IF p_rating < 1 OR p_rating > 5 THEN
    RAISE EXCEPTION 'Rating must be between 1 and 5 stars.';
  END IF;

  IF length(v_clean_comment) < 5 OR length(v_clean_comment) > 1500 THEN
    RAISE EXCEPTION 'Review text must be between 5 and 1500 characters.';
  END IF;

  -- Rate limit: max 5 reviews per hour per email
  IF length(v_clean_email) > 0 THEN
    SELECT COUNT(*) INTO v_recent_count
    FROM public.submission_logs
    WHERE submission_type = 'review'
      AND identifier = v_clean_email
      AND created_at > (now() - interval '1 hour');

    IF v_recent_count >= 5 THEN
      RAISE EXCEPTION 'Too many reviews submitted recently. Please try again later.';
    END IF;
  END IF;

  -- 3. Verify buyer if order_id is provided
  IF p_order_id IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1 FROM public.orders o
      INNER JOIN public.order_items oi ON oi.order_id = o.id
      WHERE o.id = p_order_id
        AND oi.product_id = p_product_id
        AND (v_clean_email = '' OR lower(o.customer_email) = v_clean_email)
    ) INTO v_is_verified;
  END IF;

  -- 4. Insert into reviews as 'pending'
  INSERT INTO public.reviews (
    product_id,
    order_id,
    customer_name,
    customer_email,
    rating,
    title,
    comment,
    status,
    is_verified_buyer
  ) VALUES (
    p_product_id,
    p_order_id,
    v_clean_name,
    v_clean_email,
    p_rating,
    COALESCE(p_title, ''),
    v_clean_comment,
    'pending',
    v_is_verified
  ) RETURNING id INTO v_review_id;

  -- 5. Rate limit logging
  IF length(v_clean_email) > 0 THEN
    INSERT INTO public.submission_logs (submission_type, identifier)
    VALUES ('review', v_clean_email);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'review_id', v_review_id,
    'status', 'pending',
    'is_verified_buyer', v_is_verified,
    'message', 'Thank you! Your review has been submitted for atelier approval.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_review_secure TO anon, authenticated;



-- ============================================================================
-- SWAN STUDIO — Migration 004: Seed Real Catalog & Core Content
-- Brand: Swan Studio | Founder: Bhumika Nama
-- Real Categories: Tops (₹999–1500), Flowers (₹300–600), Hair Clips (₹100–300)
-- 8 Real Products with strict price rules and no demo fluff.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Insert Categories
-- ----------------------------------------------------------------------------
INSERT INTO public.categories (id, name, slug, description, icon_emoji, sort_order)
VALUES 
  ('11111111-1111-4111-8111-111111111111', 'Tops & Wearables', 'tops', 'Handmade artisan crochet halter tops, bralettes, and summer vests crafted from pure breathable cotton.', '🧶', 1),
  ('22222222-2222-4222-8222-222222222222', 'Floral Bouquets & Stems', 'flowers', 'Everlasting handmade crochet flowers, single stems, and bouquets that never wilt or droop.', '🌸', 2),
  ('33333333-3333-4333-8333-333333333333', 'Hair Clips & Accessories', 'hair-clips', 'Delicate floral hair pins, mini alligator clips, and handcrafted whimsical keepsakes.', '✨', 3)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon_emoji = EXCLUDED.icon_emoji,
  sort_order = EXCLUDED.sort_order;

-- ----------------------------------------------------------------------------
-- 2. Insert 8 Real Products (Strictly adhering to pricing rules)
-- ----------------------------------------------------------------------------

-- Top 1 (₹1,299)
INSERT INTO public.products (
  id, category_id, name, slug, price, sale_price, description, materials, dimensions, colors, is_featured, is_published, made_to_order, prep_time, stock_quantity, image_url, sort_order
) VALUES (
  'a1111111-1111-4111-8111-111111111111',
  '11111111-1111-4111-8111-111111111111',
  'Daisy Bloom Crochet Halter Top',
  'daisy-bloom-crochet-halter-top',
  1299.00,
  NULL,
  'Artisan halter neck top adorned with hand-crocheted daisy motifs along the neckline. Ties gracefully at the neck and back for an adjustable, flattering fit.',
  '100% Breathable Milk Cotton Yarn',
  'Custom fit with adjustable tie back (Bust 30-38")',
  '["Ivory & Sunflower Yellow", "Pastel Lilac", "Sage Meadow Green"]'::jsonb,
  true, true, true, '5–7 business days', 0,
  'assets/images/products/daisy-halter-top.webp',
  1
) ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price, name = EXCLUDED.name;

-- Top 2 (₹1,449 regular, ₹1,299 sale)
INSERT INTO public.products (
  id, category_id, name, slug, price, sale_price, description, materials, dimensions, colors, is_featured, is_published, made_to_order, prep_time, stock_quantity, image_url, sort_order
) VALUES (
  'a2222222-2222-4222-8222-222222222222',
  '11111111-1111-4111-8111-111111111111',
  'Vintage Granny Square Crop Top',
  'vintage-granny-square-crop-top',
  1449.00,
  1299.00,
  'Timeless bohemian crop top assembled from intricate granny square panels. Lightweight, breathable, and designed for warm afternoons and festivals.',
  'Pure Combed Cotton Yarn',
  'Standard relaxed fit (S/M/L adjustable corset tie)',
  '["Earthy Boho Tones", "Pastel Dream", "Warm Terracotta"]'::jsonb,
  true, true, true, '6–8 business days', 0,
  'assets/images/products/granny-square-top.webp',
  2
) ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price, sale_price = EXCLUDED.sale_price;

-- Top 3 (₹999)
INSERT INTO public.products (
  id, category_id, name, slug, price, sale_price, description, materials, dimensions, colors, is_featured, is_published, made_to_order, prep_time, stock_quantity, image_url, sort_order
) VALUES (
  'a3333333-3333-4333-8333-333333333333',
  '11111111-1111-4111-8111-111111111111',
  'Lace Petal Summer Bralette',
  'lace-petal-summer-bralette',
  999.00,
  NULL,
  'Delicate scalloped petal edging with secure ribbed underbust band. Soft against bare skin with comfortable stretch.',
  'Fine Cotton Thread with Elasticized Band',
  'Adjustable back ties (Cup size A–C)',
  '["Pure Ivory", "Rose Quartz", "Midnight Onyx"]'::jsonb,
  false, true, true, '4–6 business days', 0,
  'assets/images/products/petal-summer-bralette.webp',
  3
) ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price;

-- Flower 1 (₹349)
INSERT INTO public.products (
  id, category_id, name, slug, price, sale_price, description, materials, dimensions, colors, is_featured, is_published, made_to_order, prep_time, stock_quantity, image_url, sort_order
) VALUES (
  'b1111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  'Sunflower Radiance Single Stem',
  'sunflower-radiance-single-stem',
  349.00,
  NULL,
  'A single statement sunflower featuring a textured cocoa seed center, bright yellow petals, and two bendable green leaves on a flexible florist stem.',
  'Milk Cotton Yarn with Bendable Floral Craft Wire',
  'Total length: ~32 cm | Flower head: ~10 cm',
  '["Classic Golden Yellow", "Warm Honey Amber"]'::jsonb,
  true, true, false, 'In Stock (Ships in 24h)', 8,
  'assets/images/products/sunflower-single-stem.webp',
  4
) ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price;

-- Flower 2 (₹549)
INSERT INTO public.products (
  id, category_id, name, slug, price, sale_price, description, materials, dimensions, colors, is_featured, is_published, made_to_order, prep_time, stock_quantity, image_url, sort_order
) VALUES (
  'b2222222-2222-4222-8222-222222222222',
  '22222222-2222-4222-8222-222222222222',
  'Daisy Delight Everlasting Bouquet',
  'daisy-delight-everlasting-bouquet',
  549.00,
  NULL,
  'Hand-tied bunch featuring three cheerful white daisies, sprigs of lavender, and a eucalyptus branch wrapped in premium kraft tissue paper with satin ribbon.',
  'Organic Milk Cotton with Kraft Presentation Wrap',
  'Height: ~30 cm | Spread: ~18 cm',
  '["Pastel Harmony", "Sunflower & Daisy Duo"]'::jsonb,
  true, true, false, 'In Stock (Ships in 24h)', 6,
  'assets/images/hero-bouquet.webp',
  5
) ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price;

-- Flower 3 (₹449)
INSERT INTO public.products (
  id, category_id, name, slug, price, sale_price, description, materials, dimensions, colors, is_featured, is_published, made_to_order, prep_time, stock_quantity, image_url, sort_order
) VALUES (
  'b3333333-3333-4333-8333-333333333333',
  '22222222-2222-4222-8222-222222222222',
  'Lavender & Blossom Handcrafted Bunch',
  'lavender-blossom-handcrafted-bunch',
  449.00,
  NULL,
  'Calming purple French lavender stalks paired with two pastel pink cherry blossom stems. Adds quiet warmth to study desks or bedside tables.',
  'Soft Acrylic & Milk Cotton Blend on Florist Stems',
  'Height: ~28 cm',
  '["French Lavender & Blush", "Lilac & Cream"]'::jsonb,
  false, true, false, 'In Stock (Ships in 24h)', 7,
  'assets/images/products/lavender-blossom-bunch.webp',
  6
) ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price;

-- Hair Clip 1 (₹189)
INSERT INTO public.products (
  id, category_id, name, slug, price, sale_price, description, materials, dimensions, colors, is_featured, is_published, made_to_order, prep_time, stock_quantity, image_url, sort_order
) VALUES (
  'c1111111-1111-4111-8111-111111111111',
  '33333333-3333-4333-8333-333333333333',
  'Cherry Blossom Mini Hair Clip Pair',
  'cherry-blossom-mini-hair-clip-pair',
  189.00,
  NULL,
  'Pair of delicate 5-petal cherry blossom flowers securely mounted on gold-toned alligator hair clips. Gentle on fine hair with no snagging.',
  'Combed Cotton Yarn on Rust-Resistant Metal Clips',
  'Clip length: 4.5 cm | Flower diameter: ~3 cm',
  '["Blush Pink Pair", "Cream & Pink Mix"]'::jsonb,
  true, true, false, 'In Stock (Ships in 24h)', 15,
  'assets/images/products/cherry-blossom-hair-clips.webp',
  7
) ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price;

-- Hair Clip 2 (₹149)
INSERT INTO public.products (
  id, category_id, name, slug, price, sale_price, description, materials, dimensions, colors, is_featured, is_published, made_to_order, prep_time, stock_quantity, image_url, sort_order
) VALUES (
  'c2222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  'Sweet Strawberry Floral Hair Pin',
  'sweet-strawberry-floral-hair-pin',
  149.00,
  NULL,
  'Charming miniature amigurumi strawberry accented with a white blossom leaf. Backed with a secure snap clip for daily styling.',
  'Cotton Thread with Embroidered Seed Detailing',
  'Charm size: ~3 cm x 2.5 cm',
  '["Ruby Strawberry", "Blush Pink Strawberry"]'::jsonb,
  false, true, false, 'In Stock (Ships in 24h)', 12,
  'assets/images/products/strawberry-hair-pin.webp',
  8
) ON CONFLICT (slug) DO UPDATE SET price = EXCLUDED.price;

-- ----------------------------------------------------------------------------
-- 3. Core Storefront Site Content (Live source of truth)
-- ----------------------------------------------------------------------------
INSERT INTO public.site_content (key, data)
VALUES 
  ('hero', '{
    "eyebrow": "Artisanal Handmade Crochet Atelier",
    "title": "Every Stitch Tells a Story.",
    "subtitle": "Discover lovingly handcrafted crochet halter tops, everlasting floral bouquets, and bespoke accessories created one loop at a time in Jaipur, India.",
    "ctaText": "Explore Atelier Creations",
    "ctaUrl": "shop.html",
    "secondaryCtaText": "Commission Custom Piece",
    "secondaryCtaUrl": "custom-order.html"
  }'::jsonb),
  ('banner', '{
    "enabled": true,
    "message": "🌸 Welcome to Swan Studio — Free pan-India delivery on orders over ₹999 | Handcrafted with love in Jaipur",
    "linkText": "Shop Tops & Bouquets",
    "linkUrl": "shop.html"
  }'::jsonb),
  ('about', '{
    "founderName": "Bhumika Nama",
    "story": "Swan Studio was born out of a deep reverence for mindful handcraft and slow fashion. What started as an afternoon passion project with a simple wooden crochet hook and soft milk cotton yarn has grown into an atelier dedicated to everlasting floral art, tailored wearable tops, and meaningful keepsakes.",
    "quote": "In a world of mass factory production, handmade crochet carries warmth, tactile memories, and time. Each stitch is an intentional gift of care.",
    "city": "Jaipur, Rajasthan, India"
  }'::jsonb),
  ('contact', '{
    "whatsapp": "9509966512",
    "upiId": "9509966512@fam",
    "email": "swanstudio2604@gmail.com",
    "instagram": "@swanstudio.crochet",
    "hours": "Monday – Saturday: 10:00 AM – 7:00 PM IST"
  }'::jsonb),
  ('policies', '{
    "shipping": "Orders are handcrafted with immense care. In-stock bouquets and accessories ship within 24–48 hours. Made-to-order halter tops and bespoke gifts typically take 4–7 business days to craft prior to dispatch. Standard pan-India delivery takes 3–5 working days.",
    "returns": "Because our items are handmade with intimate hygiene considerations (wearables and custom pieces), we do not accept returns. However, if your creation arrives damaged during transit, please WhatsApp us within 24 hours of delivery with an unboxing photo, and we will replace it promptly.",
    "care": "Everlasting bouquets never require water! Gently dust petals with a soft brush every few weeks. For tops and hair accessories, spot-clean with lukewarm water and mild detergent; lay flat to dry in shade."
  }'::jsonb)
ON CONFLICT (key) DO UPDATE SET data = EXCLUDED.data;

-- ----------------------------------------------------------------------------
-- 4. Initial FAQs
-- ----------------------------------------------------------------------------
INSERT INTO public.faq_items (question, answer, category, sort_order)
VALUES 
  ('How long does a made-to-order top take to craft?', 'Our made-to-order tops take between 4 to 7 business days to crochet meticulously to your exact measurements, after which they are packed and shipped via tracked courier.', 'orders', 1),
  ('Do the crochet flowers really last forever?', 'Yes! Unlike real flowers that wither within a few days, our bouquets are handcrafted from high-quality milk cotton yarn and flexible wire stems. They never need watering and keep their vibrant color for years with simple dusting.', 'products', 2),
  ('How do I complete payment using UPI?', 'During checkout, you will see our verified UPI ID (9509966512@fam) and a dynamic QR code. Open any UPI app (Google Pay, PhonePe, Paytm, BHIM) and complete the transfer. Once submitted, Bhumika confirms the receipt in her bank account and transitions your order to Confirmed.', 'payments', 3),
  ('Can I request custom colors or personalized initial letters?', 'Absolutely! Visit our Custom Order page or reach out directly on WhatsApp with your favorite shades, size requirements, or gift themes. We will weave your vision to life.', 'custom', 4)
ON CONFLICT DO NOTHING;


