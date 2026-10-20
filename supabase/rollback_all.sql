-- ============================================================================
-- SWAN STUDIO — Consolidated Rollback Script
-- Reverses all Swan Studio migrations in safe reverse dependency order.
-- ============================================================================

-- ============================================================================
-- SWAN STUDIO — Rollback 004: Remove Seeded Real Catalog & Core Content
-- ============================================================================

DELETE FROM public.products WHERE category_id IN (
  SELECT id FROM public.categories WHERE slug IN ('tops', 'flowers', 'hair-clips')
);

DELETE FROM public.categories WHERE slug IN ('tops', 'flowers', 'hair-clips');

DELETE FROM public.site_content WHERE key IN ('hero', 'banner', 'about', 'contact', 'policies');

DELETE FROM public.faq_items WHERE category IN ('orders', 'products', 'payments', 'custom');



-- ============================================================================
-- SWAN STUDIO — Rollback 003: Drop RLS Policies & Security Functions
-- ============================================================================

DROP FUNCTION IF EXISTS public.submit_review_secure(UUID, UUID, TEXT, TEXT, INT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.create_order_secure(TEXT, TEXT, TEXT, JSONB, TEXT, JSONB, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.is_admin();

DROP POLICY IF EXISTS "Admins have full access to submission logs" ON public.submission_logs;
DROP POLICY IF EXISTS "Admins have full access to gallery items" ON public.gallery_items;
DROP POLICY IF EXISTS "Public can view visible gallery items" ON public.gallery_items;
DROP POLICY IF EXISTS "Admins have full access to FAQs" ON public.faq_items;
DROP POLICY IF EXISTS "Public can view visible FAQs" ON public.faq_items;
DROP POLICY IF EXISTS "Admins can view site content history" ON public.site_content_history;
DROP POLICY IF EXISTS "Admins have full access to site content" ON public.site_content;
DROP POLICY IF EXISTS "Public can view site content" ON public.site_content;
DROP POLICY IF EXISTS "Admins have full access to blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Public can view published blog posts" ON public.blog_posts;
DROP POLICY IF EXISTS "Admins have full access to reviews" ON public.reviews;
DROP POLICY IF EXISTS "Public can view approved reviews" ON public.reviews;
DROP POLICY IF EXISTS "Admins have full access to customers" ON public.customers;
DROP POLICY IF EXISTS "Customers can update own profile" ON public.customers;
DROP POLICY IF EXISTS "Customers can view own profile" ON public.customers;
DROP POLICY IF EXISTS "Admins have full access to order status history" ON public.order_status_history;
DROP POLICY IF EXISTS "Customers can view their order status history" ON public.order_status_history;
DROP POLICY IF EXISTS "Admins have full access to order items" ON public.order_items;
DROP POLICY IF EXISTS "Customers can view their own order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins have full access to orders" ON public.orders;
DROP POLICY IF EXISTS "Customers can view their own orders" ON public.orders;
DROP POLICY IF EXISTS "Admins have full access to products" ON public.products;
DROP POLICY IF EXISTS "Public can view published products" ON public.products;
DROP POLICY IF EXISTS "Admins have full access to categories" ON public.categories;
DROP POLICY IF EXISTS "Public can view active categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can manage admin list" ON public.admins;
DROP POLICY IF EXISTS "Admins can view admin list" ON public.admins;



-- ============================================================================
-- SWAN STUDIO — Rollback 002: Drop Storage Policies & Images Bucket
-- ============================================================================

DROP POLICY IF EXISTS "Admin can delete images in images bucket" ON storage.objects;
DROP POLICY IF EXISTS "Admin can update images in images bucket" ON storage.objects;
DROP POLICY IF EXISTS "Admin can upload images in images bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public can view images in images bucket" ON storage.objects;

DELETE FROM storage.buckets WHERE id = 'images';



-- ============================================================================
-- SWAN STUDIO — Rollback 001: Drop Core Tables & Functions
-- Brand: Swan Studio | Founder: Bhumika Nama
-- ============================================================================

DROP TRIGGER IF EXISTS trg_gallery_items_updated_at ON public.gallery_items;
DROP TRIGGER IF EXISTS trg_faq_items_updated_at ON public.faq_items;
DROP TRIGGER IF EXISTS trg_site_content_versioning ON public.site_content;
DROP FUNCTION IF EXISTS public.archive_site_content_version();
DROP TRIGGER IF EXISTS trg_blog_posts_updated_at ON public.blog_posts;
DROP TRIGGER IF EXISTS trg_reviews_updated_at ON public.reviews;
DROP TRIGGER IF EXISTS trg_customers_updated_at ON public.customers;
DROP TRIGGER IF EXISTS trg_orders_updated_at ON public.orders;
DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
DROP TRIGGER IF EXISTS trg_categories_updated_at ON public.categories;
DROP FUNCTION IF EXISTS public.update_updated_at_column();

DROP TABLE IF EXISTS public.submission_logs CASCADE;
DROP TABLE IF EXISTS public.gallery_items CASCADE;
DROP TABLE IF EXISTS public.faq_items CASCADE;
DROP TABLE IF EXISTS public.site_content_history CASCADE;
DROP TABLE IF EXISTS public.site_content CASCADE;
DROP TABLE IF EXISTS public.blog_posts CASCADE;
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.order_status_history CASCADE;
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.admins CASCADE;


