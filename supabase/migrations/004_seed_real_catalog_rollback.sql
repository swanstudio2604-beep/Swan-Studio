-- ============================================================================
-- SWAN STUDIO — Rollback 004: Remove Seeded Real Catalog & Core Content
-- ============================================================================

DELETE FROM public.products WHERE category_id IN (
  SELECT id FROM public.categories WHERE slug IN ('tops', 'flowers', 'hair-clips')
);

DELETE FROM public.categories WHERE slug IN ('tops', 'flowers', 'hair-clips');

DELETE FROM public.site_content WHERE key IN ('hero', 'banner', 'about', 'contact', 'policies');

DELETE FROM public.faq_items WHERE category IN ('orders', 'products', 'payments', 'custom');
