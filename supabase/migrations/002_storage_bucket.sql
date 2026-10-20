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
