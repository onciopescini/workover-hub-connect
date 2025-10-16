-- Phase 5: Storage Cleanup Migration
-- Adds scheduled job for automatic storage cleanup

-- Create cron job for daily storage cleanup (runs at 2 AM UTC)
SELECT cron.schedule(
  'storage-cleanup-daily',
  '0 2 * * *', -- Every day at 2 AM
  $$
  SELECT
    net.http_post(
      url := 'https://khtqwzvrxzsgfhsslwyz.supabase.co/functions/v1/storage-cleanup',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);

-- Create storage_cleanup_log table to track cleanup operations
CREATE TABLE IF NOT EXISTS public.storage_cleanup_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cleanup_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  bucket_name TEXT NOT NULL,
  files_deleted INTEGER NOT NULL DEFAULT 0,
  errors JSONB,
  execution_time_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_storage_cleanup_log_date ON public.storage_cleanup_log(cleanup_date DESC);
CREATE INDEX idx_storage_cleanup_log_bucket ON public.storage_cleanup_log(bucket_name);

-- Enable RLS
ALTER TABLE public.storage_cleanup_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view cleanup logs
CREATE POLICY "Admins can view storage cleanup logs"
  ON public.storage_cleanup_log
  FOR SELECT
  USING (public.is_admin(auth.uid()));

-- Create function to log cleanup results (called from edge function)
CREATE OR REPLACE FUNCTION public.log_storage_cleanup(
  p_bucket_name TEXT,
  p_files_deleted INTEGER,
  p_errors JSONB DEFAULT NULL,
  p_execution_time_ms INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.storage_cleanup_log (
    bucket_name,
    files_deleted,
    errors,
    execution_time_ms
  ) VALUES (
    p_bucket_name,
    p_files_deleted,
    p_errors,
    p_execution_time_ms
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Add cleanup trigger for kyc_documents when verification status changes to rejected
CREATE OR REPLACE FUNCTION public.schedule_kyc_cleanup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When KYC is rejected, schedule for cleanup after 90 days
  IF NEW.verification_status = 'rejected' AND OLD.verification_status != 'rejected' THEN
    -- Update expires_at to 90 days from now for rejected documents
    NEW.expires_at := NOW() + INTERVAL '90 days';
    
    RAISE NOTICE 'KYC document % marked for cleanup in 90 days', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on kyc_documents
DROP TRIGGER IF EXISTS trigger_schedule_kyc_cleanup ON public.kyc_documents;
CREATE TRIGGER trigger_schedule_kyc_cleanup
  BEFORE UPDATE ON public.kyc_documents
  FOR EACH ROW
  WHEN (NEW.verification_status = 'rejected')
  EXECUTE FUNCTION public.schedule_kyc_cleanup();

-- Add comment
COMMENT ON TABLE public.storage_cleanup_log IS 'Tracks automated storage cleanup operations for auditing and monitoring';
COMMENT ON FUNCTION public.log_storage_cleanup IS 'Logs storage cleanup results from edge function';
COMMENT ON FUNCTION public.schedule_kyc_cleanup IS 'Automatically schedules rejected KYC documents for cleanup after 90 days';
