-- Update storage bucket configuration for GDPR exports
UPDATE storage.buckets 
SET 
  allowed_mime_types = ARRAY['application/pdf', 'application/zip', 'text/plain', 'text/csv', 'application/json'],
  file_size_limit = 104857600  -- 100MB limit
WHERE id = 'gdpr-exports';

-- Create policy for GDPR exports bucket
CREATE POLICY "Users can upload their own GDPR exports" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'gdpr-exports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own GDPR exports" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'gdpr-exports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "System can manage GDPR exports" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'gdpr-exports' AND auth.uid() IS NOT NULL);