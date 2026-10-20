-- ============================================================================
-- SWAN STUDIO — Rollback 002: Drop Storage Policies & Images Bucket
-- ============================================================================

DROP POLICY IF EXISTS "Admin can delete images in images bucket" ON storage.objects;
DROP POLICY IF EXISTS "Admin can update images in images bucket" ON storage.objects;
DROP POLICY IF EXISTS "Admin can upload images in images bucket" ON storage.objects;
DROP POLICY IF EXISTS "Public can view images in images bucket" ON storage.objects;

DELETE FROM storage.buckets WHERE id = 'images';
