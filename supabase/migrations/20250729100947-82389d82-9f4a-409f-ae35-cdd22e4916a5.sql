-- Add new fields to gdpr_requests table for instant export
ALTER TABLE public.gdpr_requests 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS download_token TEXT,
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending';

-- Create storage bucket for temporary GDPR exports
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('gdpr-exports', 'gdpr-exports', false, 524288000, ARRAY['application/zip'])
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for GDPR exports
CREATE POLICY "Users can download their own GDPR exports"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'gdpr-exports' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "System can upload GDPR exports"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'gdpr-exports');

CREATE POLICY "System can update GDPR exports"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'gdpr-exports');

CREATE POLICY "System can delete GDPR exports"
ON storage.objects
FOR DELETE
USING (bucket_id = 'gdpr-exports');

-- Function to cleanup expired GDPR requests and files
CREATE OR REPLACE FUNCTION cleanup_expired_gdpr_exports()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  expired_request RECORD;
BEGIN
  -- Get expired requests
  FOR expired_request IN
    SELECT id, download_token
    FROM public.gdpr_requests
    WHERE expires_at < now() AND expires_at IS NOT NULL
  LOOP
    -- Delete file from storage if exists
    IF expired_request.download_token IS NOT NULL THEN
      DELETE FROM storage.objects
      WHERE bucket_id = 'gdpr-exports' 
      AND name LIKE '%' || expired_request.download_token || '%';
    END IF;
    
    -- Delete the request record
    DELETE FROM public.gdpr_requests
    WHERE id = expired_request.id;
  END LOOP;
END;
$$;

-- Create index for better performance on cleanup
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_expires_at ON public.gdpr_requests(expires_at);

-- Update existing GDPR requests to have processing_status
UPDATE public.gdpr_requests 
SET processing_status = 
  CASE 
    WHEN status = 'pending' THEN 'pending'
    WHEN status = 'completed' THEN 'completed'
    WHEN status = 'rejected' THEN 'failed'
    ELSE 'pending'
  END
WHERE processing_status IS NULL;