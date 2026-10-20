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
