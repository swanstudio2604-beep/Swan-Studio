-- ============================================================================
-- SWAN STUDIO — Row Level Security (RLS) Policies
-- Brand: Swan Studio | Founder: Bhumika Nama
-- Tagline: Every Stitch Tells a Story.
--
-- Security Philosophy:
-- 1. Default Deny: RLS enabled on EVERY table.
-- 2. Public visitors can only view published creations, categories & public settings.
-- 3. Customers can ONLY read their own profile, orders, and payment status.
-- 4. Admin operations require is_admin() verification against the database role.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Helper Function: is_admin()
-- Checks whether the currently authenticated user has role = 'admin' in profiles.
-- Marked SECURITY DEFINER with a fixed search_path to prevent hijacking.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ----------------------------------------------------------------------------
-- 2. Enable RLS on All Tables (Default Deny)
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.custom_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 3. Policies: profiles
-- ----------------------------------------------------------------------------
-- Customer can read their own profile
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Customer can insert their own profile
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Customer can update their own profile name & phone
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admin can view all profiles
CREATE POLICY "Admin can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

-- Admin can update profiles (e.g. promote admin)
CREATE POLICY "Admin can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- 4. Policies: categories
-- ----------------------------------------------------------------------------
-- Public can view only active, non-hidden, non-deleted categories
CREATE POLICY "Public can view active categories"
  ON public.categories FOR SELECT
  USING (deleted_at IS NULL AND is_hidden = false);

-- Admin can view all categories (including drafts, hidden and soft-deleted/trash)
CREATE POLICY "Admin can view all categories"
  ON public.categories FOR SELECT
  USING (public.is_admin());

-- Admin can insert, update, and delete categories
CREATE POLICY "Admin can insert categories"
  ON public.categories FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update categories"
  ON public.categories FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin can delete categories"
  ON public.categories FOR DELETE
  USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- 5. Policies: products & product_images
-- ----------------------------------------------------------------------------
-- Public can view only published, non-hidden, non-deleted, non-archived products
CREATE POLICY "Public can view active products"
  ON public.products FOR SELECT
  USING (is_published = true AND is_hidden = false AND deleted_at IS NULL AND archived_at IS NULL);

-- Admin can view all products (including drafts, hidden, and trash)
CREATE POLICY "Admin can view all products"
  ON public.products FOR SELECT
  USING (public.is_admin());

-- Admin has full product management
CREATE POLICY "Admin can insert products"
  ON public.products FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin can update products"
  ON public.products FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admin can delete products"
  ON public.products FOR DELETE
  USING (public.is_admin());

-- Public can view images of published, active products
CREATE POLICY "Public can view product images"
  ON public.product_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id 
        AND p.is_published = true 
        AND p.is_hidden = false 
        AND p.deleted_at IS NULL 
        AND p.archived_at IS NULL
    )
  );

-- Admin can manage product images
CREATE POLICY "Admin can manage product images"
  ON public.product_images FOR ALL
  USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- 6. Policies: orders & order_items
-- Customers cannot insert directly to prevent tampering; orders are created via place_order() RPC
-- ----------------------------------------------------------------------------
-- Customers can view only their own orders
CREATE POLICY "Customers can view their own orders"
  ON public.orders FOR SELECT
  USING (auth.uid() = user_id);

-- Customers can view items in their own orders
CREATE POLICY "Customers can view their own order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.user_id = auth.uid()
    )
  );

-- Admin can view and manage all orders
CREATE POLICY "Admin can view all orders"
  ON public.orders FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admin can update orders"
  ON public.orders FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admin can view all order items"
  ON public.order_items FOR SELECT
  USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- 7. Policies: payments & payment_audit_log
-- ----------------------------------------------------------------------------
-- Customers can view payments for their own orders
CREATE POLICY "Customers can view their own payments"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id AND o.user_id = auth.uid()
    )
  );

-- Admin can view and manage all payments
CREATE POLICY "Admin can view all payments"
  ON public.payments FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admin can update payments"
  ON public.payments FOR UPDATE
  USING (public.is_admin());

-- Payment audit log is visible only to Admin
CREATE POLICY "Admin can view payment audit log"
  ON public.payment_audit_log FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Admin can insert payment audit log"
  ON public.payment_audit_log FOR INSERT
  WITH CHECK (public.is_admin());

-- ----------------------------------------------------------------------------
-- 8. Policies: coupons & coupon_usage
-- ----------------------------------------------------------------------------
-- Public can check coupon details (only active, unexpired coupons)
CREATE POLICY "Public can view active coupons"
  ON public.coupons FOR SELECT
  USING (is_active = true AND (expiry_date IS NULL OR expiry_date > NOW()));

-- Admin has full coupon management
CREATE POLICY "Admin can manage coupons"
  ON public.coupons FOR ALL
  USING (public.is_admin());

-- Customers can view their own coupon redemptions
CREATE POLICY "Customers can view their coupon usage"
  ON public.coupon_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Admin can view all coupon usage
CREATE POLICY "Admin can view all coupon usage"
  ON public.coupon_usage FOR SELECT
  USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- 9. Policies: custom_orders
-- ----------------------------------------------------------------------------
-- Anyone (guest or registered) can submit a custom order request
CREATE POLICY "Anyone can submit a custom order"
  ON public.custom_orders FOR INSERT
  WITH CHECK (true);

-- Registered customers can view their own custom orders
CREATE POLICY "Customers can view their own custom orders"
  ON public.custom_orders FOR SELECT
  USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Admin has full access to all custom orders
CREATE POLICY "Admin can manage all custom orders"
  ON public.custom_orders FOR ALL
  USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- 10. Policies: site_content & site_settings
-- ----------------------------------------------------------------------------
-- Public can view site content & store settings
CREATE POLICY "Public can view site content"
  ON public.site_content FOR SELECT
  USING (true);

CREATE POLICY "Public can view site settings"
  ON public.site_settings FOR SELECT
  USING (true);

-- Admin can edit site content & store settings
CREATE POLICY "Admin can update site content"
  ON public.site_content FOR ALL
  USING (public.is_admin());

CREATE POLICY "Admin can update site settings"
  ON public.site_settings FOR ALL
  USING (public.is_admin());

-- ----------------------------------------------------------------------------
-- 11. Policies: reviews
-- Public can view only approved reviews.
-- Customers can submit reviews (defaulting to PENDING).
-- Admin has full moderation rights (approve, hide, delete).
-- ----------------------------------------------------------------------------
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view approved reviews"
  ON public.reviews FOR SELECT
  USING (status = 'APPROVED');

CREATE POLICY "Customers can submit reviews"
  ON public.reviews FOR INSERT
  WITH CHECK (status = 'PENDING');

CREATE POLICY "Admin can manage reviews"
  ON public.reviews FOR ALL
  USING (public.is_admin());

