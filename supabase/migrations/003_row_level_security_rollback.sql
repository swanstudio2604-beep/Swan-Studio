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
