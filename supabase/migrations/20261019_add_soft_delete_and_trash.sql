-- ============================================================================
-- SWAN STUDIO — Database Migration: Soft Delete, Trash & Visibility Controls
-- Brand: Swan Studio | Founder: Bhumika Nama
-- Date: 2026-10-19
-- ============================================================================

-- 1. Add deleted_at and is_hidden columns to categories table
ALTER TABLE public.categories 
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_categories_deleted_at ON public.categories(deleted_at);
CREATE INDEX IF NOT EXISTS idx_categories_is_hidden ON public.categories(is_hidden);

-- 2. Add deleted_at and is_hidden columns to products table
ALTER TABLE public.products 
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_products_deleted_at ON public.products(deleted_at);
CREATE INDEX IF NOT EXISTS idx_products_is_hidden ON public.products(is_hidden);

-- 3. Update Categories RLS Policies
DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
DROP POLICY IF EXISTS "Public can view active categories" ON public.categories;
DROP POLICY IF EXISTS "Admin can manage categories" ON public.categories;

-- Public can view only active, non-hidden, non-deleted categories
CREATE POLICY "Public can view active categories"
  ON public.categories FOR SELECT
  USING (deleted_at IS NULL AND is_hidden = false);

-- Admin has full category management (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "Admin can view all categories"
  ON public.categories FOR SELECT
  USING (public.is_admin());

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

-- 4. Update Products RLS Policies
DROP POLICY IF EXISTS "Public can view active products" ON public.products;
DROP POLICY IF EXISTS "Admin can view all products" ON public.products;
DROP POLICY IF EXISTS "Admin can manage products" ON public.products;

-- Public can view only published, non-hidden, non-deleted products
CREATE POLICY "Public can view active products"
  ON public.products FOR SELECT
  USING (is_published = true AND is_hidden = false AND deleted_at IS NULL AND archived_at IS NULL);

-- Admin has full product management
CREATE POLICY "Admin can view all products"
  ON public.products FOR SELECT
  USING (public.is_admin());

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

-- 5. Helper View: active_categories (only categories that have at least 1 active product)
CREATE OR REPLACE VIEW public.active_categories AS
SELECT 
  c.id,
  c.name,
  c.slug,
  c.description,
  c.icon_emoji,
  c.sort_order,
  c.created_at,
  COUNT(p.id) AS product_count
FROM public.categories c
INNER JOIN public.products p ON p.category_id = c.id
WHERE c.deleted_at IS NULL
  AND c.is_hidden = false
  AND p.is_published = true
  AND p.is_hidden = false
  AND p.deleted_at IS NULL
  AND p.archived_at IS NULL
GROUP BY c.id;

GRANT SELECT ON public.active_categories TO anon, authenticated;
