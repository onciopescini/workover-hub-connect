
-- Create storage bucket for space photos if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'space_photos',
  'space_photos',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Create storage policies for space_photos bucket
CREATE POLICY "Users can upload space photos" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'space_photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view space photos" ON storage.objects
FOR SELECT USING (bucket_id = 'space_photos');

CREATE POLICY "Users can update own space photos" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'space_photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own space photos" ON storage.objects
FOR DELETE USING (
  bucket_id = 'space_photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Create table to track image processing jobs
CREATE TABLE public.image_processing_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  space_id UUID REFERENCES public.spaces(id),
  original_path TEXT NOT NULL,
  optimized_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  original_size INTEGER,
  optimized_size INTEGER,
  compression_ratio DECIMAL(5,2),
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for image_processing_jobs
ALTER TABLE public.image_processing_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own image processing jobs" 
ON public.image_processing_jobs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own image processing jobs" 
ON public.image_processing_jobs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_image_processing_jobs_user_id ON public.image_processing_jobs (user_id);
CREATE INDEX idx_image_processing_jobs_space_id ON public.image_processing_jobs (space_id);
CREATE INDEX idx_image_processing_jobs_status ON public.image_processing_jobs (status);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_image_processing_jobs_updated_at
  BEFORE UPDATE ON public.image_processing_jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create image processing job
CREATE OR REPLACE FUNCTION public.create_image_processing_job(
  space_id_param UUID,
  original_path_param TEXT,
  original_size_param INTEGER DEFAULT NULL
) 
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  job_id UUID;
BEGIN
  INSERT INTO public.image_processing_jobs (
    user_id,
    space_id,
    original_path,
    original_size,
    status
  ) VALUES (
    auth.uid(),
    space_id_param,
    original_path_param,
    original_size_param,
    'pending'
  ) RETURNING id INTO job_id;
  
  RETURN job_id;
END;
$$;

-- Function to update image processing job status
CREATE OR REPLACE FUNCTION public.update_image_processing_job(
  job_id_param UUID,
  status_param TEXT,
  optimized_path_param TEXT DEFAULT NULL,
  optimized_size_param INTEGER DEFAULT NULL,
  compression_ratio_param DECIMAL DEFAULT NULL,
  error_message_param TEXT DEFAULT NULL
) 
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  UPDATE public.image_processing_jobs 
  SET 
    status = status_param,
    optimized_path = COALESCE(optimized_path_param, optimized_path),
    optimized_size = COALESCE(optimized_size_param, optimized_size),
    compression_ratio = COALESCE(compression_ratio_param, compression_ratio),
    error_message = error_message_param,
    completed_at = CASE WHEN status_param IN ('completed', 'failed') THEN now() ELSE completed_at END,
    updated_at = now()
  WHERE id = job_id_param AND user_id = auth.uid();
  
  RETURN FOUND;
END;
$$;
