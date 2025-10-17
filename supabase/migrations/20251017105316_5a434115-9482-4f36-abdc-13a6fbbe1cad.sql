-- =====================================================
-- COMPLIANCE & ADMIN SECURITY - COMPLETE MIGRATION
-- =====================================================
-- FASE 1: Admin CSV Exports Audit Table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.admin_csv_exports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  export_type TEXT NOT NULL CHECK (export_type IN ('payments', 'bookings', 'dac7', 'users')),
  filters JSONB DEFAULT '{}'::jsonb,
  row_count INTEGER NOT NULL DEFAULT 0,
  file_size_bytes BIGINT,
  file_url TEXT,
  exported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  CONSTRAINT valid_row_count CHECK (row_count >= 0)
);

CREATE INDEX idx_admin_csv_exports_admin ON public.admin_csv_exports(admin_id, exported_at DESC);
CREATE INDEX idx_admin_csv_exports_type ON public.admin_csv_exports(export_type, exported_at DESC);

ALTER TABLE public.admin_csv_exports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_csv_exports_admin_only"
ON public.admin_csv_exports
FOR ALL
USING (is_admin(auth.uid()));

COMMENT ON TABLE public.admin_csv_exports IS 'Audit log for all CSV exports by admins (GDPR compliance)';

-- =====================================================
-- FASE 2: KYC Document Validation Enhancement
-- =====================================================

ALTER TABLE public.kyc_documents 
ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT,
ADD COLUMN IF NOT EXISTS mime_type TEXT,
ADD COLUMN IF NOT EXISTS file_hash TEXT,
ADD CONSTRAINT kyc_file_size_range CHECK (file_size_bytes BETWEEN 10000 AND 10485760);

CREATE INDEX IF NOT EXISTS idx_kyc_documents_verification ON public.kyc_documents(verification_status, created_at DESC);

-- Trigger per validazione KYC upload
CREATE OR REPLACE FUNCTION public.validate_kyc_upload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate MIME type
  IF NEW.mime_type IS NOT NULL AND NEW.mime_type NOT IN ('image/jpeg', 'image/png', 'application/pdf') THEN
    RAISE EXCEPTION 'Invalid file type. Only JPEG, PNG, PDF are allowed';
  END IF;

  -- Validate file size (min 10KB, max 10MB)
  IF NEW.file_size_bytes IS NOT NULL AND (NEW.file_size_bytes < 10000 OR NEW.file_size_bytes > 10485760) THEN
    RAISE EXCEPTION 'File size must be between 10KB and 10MB';
  END IF;

  -- Prevent duplicate uploads (same hash)
  IF NEW.file_hash IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.kyc_documents 
      WHERE file_hash = NEW.file_hash 
        AND profile_id = NEW.profile_id 
        AND id != NEW.id
        AND created_at > NOW() - INTERVAL '24 hours'
    ) THEN
      RAISE EXCEPTION 'Duplicate file detected. Please upload a different document';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_validate_kyc_upload ON public.kyc_documents;
CREATE TRIGGER trigger_validate_kyc_upload
BEFORE INSERT OR UPDATE ON public.kyc_documents
FOR EACH ROW
EXECUTE FUNCTION public.validate_kyc_upload();

-- =====================================================
-- FASE 3: DAC7 Generation Queue & Retry Logic
-- =====================================================

CREATE TABLE IF NOT EXISTS public.dac7_generation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporting_year INTEGER NOT NULL,
  host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  max_retries INTEGER NOT NULL DEFAULT 3,
  error_message TEXT,
  error_details JSONB,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  next_retry_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT valid_retry_count CHECK (retry_count <= max_retries)
);

CREATE INDEX idx_dac7_queue_status ON public.dac7_generation_queue(status, next_retry_at);
CREATE INDEX idx_dac7_queue_year_host ON public.dac7_generation_queue(reporting_year, host_id);

ALTER TABLE public.dac7_generation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dac7_queue_admin_only"
ON public.dac7_generation_queue
FOR ALL
USING (is_admin(auth.uid()));

-- Function to schedule DAC7 retry
CREATE OR REPLACE FUNCTION public.schedule_dac7_retry(queue_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_retry INTEGER;
BEGIN
  SELECT retry_count INTO current_retry
  FROM public.dac7_generation_queue
  WHERE id = queue_id_param;

  IF current_retry < 3 THEN
    UPDATE public.dac7_generation_queue
    SET 
      status = 'pending',
      retry_count = retry_count + 1,
      next_retry_at = NOW() + (INTERVAL '1 hour' * (retry_count + 1)),
      updated_at = NOW()
    WHERE id = queue_id_param;
  ELSE
    UPDATE public.dac7_generation_queue
    SET status = 'failed', updated_at = NOW()
    WHERE id = queue_id_param;
  END IF;
END;
$$;

-- =====================================================
-- FASE 4: Optimized Fiscal Stats Function
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_fiscal_stats_optimized(year_param INTEGER DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_year INTEGER;
  result JSONB;
BEGIN
  target_year := COALESCE(year_param, EXTRACT(YEAR FROM NOW())::INTEGER);

  WITH fiscal_summary AS (
    SELECT 
      COUNT(DISTINCT dr.host_id) AS total_hosts,
      COUNT(*) AS total_reports,
      SUM(CASE WHEN dr.reporting_threshold_met THEN 1 ELSE 0 END) AS reports_above_threshold,
      SUM(dr.total_income) AS total_income_aggregated,
      AVG(dr.total_income) AS avg_income_per_host,
      SUM(dr.total_transactions) AS total_transactions_aggregated
    FROM public.dac7_reports dr
    WHERE dr.reporting_year = target_year
  ),
  payment_summary AS (
    SELECT 
      COUNT(DISTINCT p.user_id) AS paying_users,
      SUM(p.amount) AS total_payment_volume,
      AVG(p.amount) AS avg_payment_amount
    FROM public.payments p
    WHERE EXTRACT(YEAR FROM p.created_at) = target_year
      AND p.payment_status = 'completed'
  )
  SELECT jsonb_build_object(
    'reporting_year', target_year,
    'total_hosts', COALESCE(fs.total_hosts, 0),
    'total_reports', COALESCE(fs.total_reports, 0),
    'reports_above_threshold', COALESCE(fs.reports_above_threshold, 0),
    'total_income', COALESCE(fs.total_income_aggregated, 0),
    'avg_income_per_host', COALESCE(fs.avg_income_per_host, 0),
    'total_transactions', COALESCE(fs.total_transactions_aggregated, 0),
    'paying_users', COALESCE(ps.paying_users, 0),
    'total_payment_volume', COALESCE(ps.total_payment_volume, 0),
    'avg_payment_amount', COALESCE(ps.avg_payment_amount, 0),
    'generated_at', NOW()
  ) INTO result
  FROM fiscal_summary fs, payment_summary ps;

  RETURN result;
END;
$$;

-- =====================================================
-- FASE 5: Admin Rate Limiting Enhancement
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_rate_limit_log_admin_actions 
ON public.rate_limit_log(identifier, action, created_at DESC)
WHERE action IN ('csv_export', 'kyc_approval', 'dac7_generation', 'report_moderation');

-- =====================================================
-- FASE 6: Compliance Monitoring Metrics View
-- =====================================================

CREATE OR REPLACE VIEW public.compliance_monitoring_metrics AS
SELECT
  -- KYC Metrics
  (SELECT COUNT(*) FROM public.kyc_documents WHERE verification_status = 'pending') AS kyc_pending_count,
  (SELECT COUNT(*) FROM public.kyc_documents WHERE verification_status = 'pending' AND created_at < NOW() - INTERVAL '7 days') AS kyc_pending_overdue,
  
  -- DAC7 Metrics
  (SELECT COUNT(*) FROM public.dac7_generation_queue WHERE status = 'failed') AS dac7_failed_count,
  (SELECT COUNT(*) FROM public.dac7_generation_queue WHERE status = 'pending' AND next_retry_at < NOW()) AS dac7_retry_pending,
  
  -- CSV Export Metrics (last 24h)
  (SELECT COUNT(*) FROM public.admin_csv_exports WHERE exported_at > NOW() - INTERVAL '24 hours') AS csv_exports_24h,
  (SELECT SUM(row_count) FROM public.admin_csv_exports WHERE exported_at > NOW() - INTERVAL '24 hours') AS csv_rows_exported_24h,
  
  -- Admin Actions (last 7 days)
  (SELECT COUNT(*) FROM public.admin_actions_log WHERE created_at > NOW() - INTERVAL '7 days') AS admin_actions_7d,
  (SELECT COUNT(DISTINCT admin_id) FROM public.admin_actions_log WHERE created_at > NOW() - INTERVAL '7 days') AS active_admins_7d,
  
  -- Last refresh
  NOW() AS last_refresh;

GRANT SELECT ON public.compliance_monitoring_metrics TO authenticated;

-- =====================================================
-- FASE 7: Update kyc_documents table for new fields
-- =====================================================

COMMENT ON COLUMN public.kyc_documents.file_size_bytes IS 'File size in bytes (10KB - 10MB)';
COMMENT ON COLUMN public.kyc_documents.mime_type IS 'MIME type (image/jpeg, image/png, application/pdf)';
COMMENT ON COLUMN public.kyc_documents.file_hash IS 'SHA-256 hash for duplicate detection';

-- =====================================================
-- END OF MIGRATION
-- =====================================================