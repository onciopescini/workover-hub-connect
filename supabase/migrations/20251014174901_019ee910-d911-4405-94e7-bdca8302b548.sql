-- ============================================
-- FASE 4 STEP 2: Fiscal Documents Storage Bucket
-- ============================================

-- Create fiscal-documents storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'fiscal-documents',
  'fiscal-documents',
  false,
  10485760, -- 10MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies for fiscal-documents bucket
CREATE POLICY "Users can view their own fiscal documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'fiscal-documents' AND
  (
    auth.uid()::text = (storage.foldername(name))[1] OR
    is_admin(auth.uid())
  )
);

CREATE POLICY "System can insert fiscal documents"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'fiscal-documents');

CREATE POLICY "Admins can delete fiscal documents"
ON storage.objects FOR DELETE
USING (bucket_id = 'fiscal-documents' AND is_admin(auth.uid()));