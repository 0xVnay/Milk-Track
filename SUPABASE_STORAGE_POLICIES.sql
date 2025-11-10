-- ============================================
-- STORAGE POLICIES FOR RECEIPTS BUCKET
-- Run these in: Storage > receipts > Policies
-- ============================================

-- 1. SELECT: Everyone can view images (public bucket)
CREATE POLICY "Public can view images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'receipts');

-- 2. INSERT: Admin and Members can upload images
CREATE POLICY "Admin and Members can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'receipts'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('admin', 'member')
  )
);

-- 3. UPDATE: Only Admin can update images
CREATE POLICY "Admin can update images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'receipts'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- 4. DELETE: Only Admin can delete images
CREATE POLICY "Admin can delete images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'receipts'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
