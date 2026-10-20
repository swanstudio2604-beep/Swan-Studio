-- ============================================================================
-- MIGRATION: 20261019_add_blog_and_content_policies.sql
-- Swan Studio Atelier Content & Blog Pipeline
-- ============================================================================

-- 1. Create Blog Posts Table
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled')),
  published_at TIMESTAMPTZ,
  excerpt TEXT,
  tags TEXT[] DEFAULT '{}',
  body TEXT NOT NULL,
  author TEXT DEFAULT 'Bhumika Nama',
  cover_image TEXT,
  cover_image_alt TEXT,
  seo_title TEXT,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Performance & Filter Indexes
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON public.blog_posts (slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_status ON public.blog_posts (status);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published_at ON public.blog_posts (published_at);
CREATE INDEX IF NOT EXISTS idx_blog_posts_deleted_at ON public.blog_posts (deleted_at);

-- 3. Row Level Security for blog_posts
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Public can ONLY view active, published stories whose published_at date has arrived
DROP POLICY IF EXISTS "Public can view published blog posts" ON public.blog_posts;
CREATE POLICY "Public can view published blog posts"
  ON public.blog_posts FOR SELECT
  USING (
    deleted_at IS NULL
    AND status = 'published'
    AND (published_at IS NULL OR published_at <= now())
  );

-- Admins have full access to manage blog posts
DROP POLICY IF EXISTS "Admins have full access to blog posts" ON public.blog_posts;
CREATE POLICY "Admins have full access to blog posts"
  ON public.blog_posts FOR ALL
  USING (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'email' = 'swanstudio2604@gmail.com' OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  )
  WITH CHECK (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'email' = 'swanstudio2604@gmail.com' OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  );

-- 4. Site Content & Site Settings RLS Enforcement
ALTER TABLE IF EXISTS public.site_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view site content" ON public.site_content;
CREATE POLICY "Public can view site content"
  ON public.site_content FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage site content" ON public.site_content;
CREATE POLICY "Admins can manage site content"
  ON public.site_content FOR ALL
  USING (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'email' = 'swanstudio2604@gmail.com' OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  );

DROP POLICY IF EXISTS "Public can view site settings" ON public.site_settings;
CREATE POLICY "Public can view site settings"
  ON public.site_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage site settings" ON public.site_settings;
CREATE POLICY "Admins can manage site settings"
  ON public.site_settings FOR ALL
  USING (
    auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'email' = 'swanstudio2604@gmail.com' OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  );

-- 5. Public Storage Bucket for Images (hero, products, portraits, blog covers)
INSERT INTO storage.buckets (id, name, public)
VALUES ('site-assets', 'site-assets', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage RLS: Public read, admin write/delete
DROP POLICY IF EXISTS "Public Read on site-assets" ON storage.objects;
CREATE POLICY "Public Read on site-assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'site-assets');

DROP POLICY IF EXISTS "Admin Insert on site-assets" ON storage.objects;
CREATE POLICY "Admin Insert on site-assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'site-assets'
    AND auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'email' = 'swanstudio2604@gmail.com' OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  );

DROP POLICY IF EXISTS "Admin Update on site-assets" ON storage.objects;
CREATE POLICY "Admin Update on site-assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'site-assets'
    AND auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'email' = 'swanstudio2604@gmail.com' OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  );

DROP POLICY IF EXISTS "Admin Delete on site-assets" ON storage.objects;
CREATE POLICY "Admin Delete on site-assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'site-assets'
    AND auth.role() = 'authenticated'
    AND (auth.jwt() ->> 'email' = 'swanstudio2604@gmail.com' OR (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  );
