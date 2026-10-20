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
