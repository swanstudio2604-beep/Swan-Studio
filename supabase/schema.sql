-- ============================================================================
-- SWAN STUDIO — Database Schema (PostgreSQL for Supabase)
-- Brand: Swan Studio | Founder: Bhumika Nama
-- Tagline: Every Stitch Tells a Story.
-- Currency: INR (₹) represented with numeric(10,2) — NEVER floating point
-- ============================================================================

-- Enable pgcrypto for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Helper Function: Automatic updated_at timestamp
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ----------------------------------------------------------------------------
-- 2. Table: profiles
-- Plain language: Stores customer & admin profile details linked to Supabase Auth.
-- Security: Every new signup gets role = 'customer' ONLY. Role cannot be set from browser.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.profiles IS 'Stores user profile information, contact number, and access role (customer or admin).';

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Security trigger: Prevent customers from altering their own role column directly
CREATE OR REPLACE FUNCTION prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  -- If role is changing, check if the current user is an existing admin
  IF OLD.role IS DISTINCT FROM NEW.role THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Access Denied: You cannot modify your own or another user account role.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_protect_role_escalation
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION prevent_role_escalation();

-- Trigger: Automatically create a customer profile on Supabase Auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'customer' -- STRICT SECURITY: Never accept role from user_metadata!
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists to prevent duplicates
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 3. Table: categories
-- Plain language: Product groupings like Floral Bouquets, Bags & Totes, Cute Plushies.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT '',
  icon_emoji TEXT DEFAULT '🧶',
  sort_order INT NOT NULL DEFAULT 0,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.categories IS 'Categories for grouping crochet creations (e.g. bouquets, plushies, bags).';
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_visibility ON public.categories(is_hidden, deleted_at);

-- ----------------------------------------------------------------------------
-- 4. Table: products
-- Plain language: The complete handcrafted catalog. Supports ready-to-ship & made-to-order.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  sale_price NUMERIC(10,2) CHECK (sale_price IS NULL OR (sale_price >= 0 AND sale_price < price)),
  materials TEXT NOT NULL DEFAULT '100% Milk Cotton Yarn',
  dimensions TEXT DEFAULT '',
  colors TEXT[] DEFAULT '{}',
  stock_quantity INT NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  made_to_order BOOLEAN NOT NULL DEFAULT true,
  prep_time TEXT NOT NULL DEFAULT '3-5 business days',
  badge TEXT DEFAULT '',
  icon_type TEXT DEFAULT 'flower', -- 'flower', 'bag', 'plushie', 'accessory'
  image_url TEXT DEFAULT NULL,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT true,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ DEFAULT NULL, -- Soft delete: items move to Trash
  archived_at TIMESTAMPTZ DEFAULT NULL, -- Legacy archive
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.products IS 'Handmade crochet catalog with inventory count, prices in INR, and made-to-order flags.';
CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_published ON public.products(is_published, is_hidden, deleted_at, archived_at);

CREATE TRIGGER trg_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 5. Table: product_images
-- Plain language: High-resolution photos of each handmade item.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT NOT NULL DEFAULT 'Handmade crochet product photograph',
  sort_order INT NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.product_images IS 'Product photo gallery images and alt descriptions.';
CREATE INDEX IF NOT EXISTS idx_product_images_product_id ON public.product_images(product_id);

-- ----------------------------------------------------------------------------
-- 6. Table: orders
-- Plain language: Customer order records. Total calculations are computed on server.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  shipping_address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
    'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'
  )),
  subtotal NUMERIC(10,2) NOT NULL CHECK (subtotal >= 0),
  discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
  coupon_code TEXT DEFAULT NULL,
  shipping_fee NUMERIC(10,2) NOT NULL DEFAULT 0.00 CHECK (shipping_fee >= 0),
  total_amount NUMERIC(10,2) NOT NULL CHECK (total_amount >= 0),
  idempotency_key TEXT UNIQUE, -- Prevents accidental duplicate order submission
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.orders IS 'Master order header with shipping details, recalculation totals, and fulfillment status.';
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 7. Table: order_items
-- Plain language: Immutable item snapshots at the exact time of order.
-- Preserves historic name and price even if product is later edited or archived.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL, -- Preserved snapshot
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  quantity INT NOT NULL CHECK (quantity > 0),
  line_total NUMERIC(10,2) NOT NULL CHECK (line_total >= 0)
);

COMMENT ON TABLE public.order_items IS 'Immutable order line items preserving prices and product names at time of purchase.';
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);

-- ----------------------------------------------------------------------------
-- 8. Table: payments
-- Plain language: Tracks manual UPI transfers and submitted transaction IDs.
-- Security: Status can ONLY be changed to PAID by Bhumika verifying her bank account.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  payment_method TEXT NOT NULL DEFAULT 'UPI',
  upi_id TEXT NOT NULL DEFAULT '9509966512@fam',
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  status TEXT NOT NULL DEFAULT 'PENDING_VERIFICATION' CHECK (status IN (
    'PENDING_VERIFICATION', 'PAID', 'REJECTED', 'REFUNDED'
  )),
  transaction_ref_id TEXT DEFAULT NULL, -- Customer-submitted UTR / Transaction ID
  screenshot_path TEXT DEFAULT NULL,
  verified_by UUID REFERENCES auth.users(id),
  verified_at TIMESTAMPTZ DEFAULT NULL,
  admin_notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.payments IS 'Manual UPI payment records. Never auto-confirmed; requires manual owner verification.';
CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 9. Table: payment_audit_log
-- Plain language: Immutable audit trail of who changed payment status, when, and why.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES auth.users(id),
  old_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.payment_audit_log IS 'Immutable audit trail of all payment status modifications made by the administrator.';
CREATE INDEX IF NOT EXISTS idx_payment_audit_payment_id ON public.payment_audit_log(payment_id);

-- ----------------------------------------------------------------------------
-- 10. Table: coupons & coupon_usage
-- Plain language: Discount codes managed by Bhumika. Server validates limits and dates.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('PERCENTAGE', 'FIXED')),
  discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  min_order_amount NUMERIC(10,2) DEFAULT 0.00 CHECK (min_order_amount >= 0),
  max_discount_cap NUMERIC(10,2) DEFAULT NULL, -- For percentage discounts cap maximum ₹
  total_usage_limit INT DEFAULT NULL, -- Total times coupon can be used across all users
  per_customer_limit INT DEFAULT 1,
  times_used INT NOT NULL DEFAULT 0,
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expiry_date TIMESTAMPTZ DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.coupons IS 'Admin-managed coupon discount rules and usage limitations.';
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);

CREATE TABLE IF NOT EXISTS public.coupon_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(coupon_id, order_id)
);

COMMENT ON TABLE public.coupon_usage IS 'Tracks redemptions per coupon, order, and customer.';

-- ----------------------------------------------------------------------------
-- 11. Table: custom_orders
-- Plain language: Bespoke customer commissions with review stages.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.custom_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  creation_type TEXT NOT NULL,
  occasion TEXT DEFAULT '',
  preferred_colors TEXT DEFAULT '',
  idea_description TEXT NOT NULL,
  budget_range TEXT DEFAULT '',
  desired_date DATE DEFAULT NULL,
  status TEXT NOT NULL DEFAULT 'NEW' CHECK (status IN (
    'NEW', 'UNDER_REVIEW', 'NEED_MORE_DETAILS', 'QUOTATION_SENT', 'ACCEPTED', 'DECLINED', 'COMPLETED'
  )),
  reference_image_url TEXT DEFAULT NULL,
  admin_notes TEXT DEFAULT '',
  quotation_amount NUMERIC(10,2) DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.custom_orders IS 'Customer commission requests, ideas, and review statuses.';
CREATE INDEX IF NOT EXISTS idx_custom_orders_status ON public.custom_orders(status);

CREATE TRIGGER trg_custom_orders_updated_at
  BEFORE UPDATE ON public.custom_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ----------------------------------------------------------------------------
-- 12. Table: site_content & site_settings
-- Plain language: Dynamic website content editable from the admin panel (Phase 9).
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.site_content (
  key TEXT PRIMARY KEY,
  content_value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.site_content IS 'Editable website text sections (announcement bar, hero headlines, story).';

CREATE TABLE IF NOT EXISTS public.site_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1), -- Single row configuration
  upi_id TEXT NOT NULL DEFAULT '9509966512@fam',
  whatsapp_number TEXT NOT NULL DEFAULT '9509966512',
  free_shipping_threshold NUMERIC(10,2) NOT NULL DEFAULT 1499.00,
  standard_shipping_fee NUMERIC(10,2) NOT NULL DEFAULT 99.00,
  low_stock_threshold INT NOT NULL DEFAULT 2,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.site_settings IS 'Single-row global store configuration for UPI ID, WhatsApp, and shipping rules.';

-- ----------------------------------------------------------------------------
-- 13. Table: reviews
-- Customer product reviews and handmade creation testimonials
-- Moderation stages: PENDING, APPROVED, HIDDEN
-- Only approved reviews show publicly on the store. No fake reviews creatable from admin.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  author_city TEXT DEFAULT 'India',
  rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT DEFAULT '',
  comment TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'HIDDEN')),
  verified_purchase BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.reviews IS 'Real customer reviews requiring admin approval before displaying on the public store.';
CREATE INDEX IF NOT EXISTS idx_reviews_status ON public.reviews(status);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON public.reviews(product_id);

CREATE TRIGGER trg_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

