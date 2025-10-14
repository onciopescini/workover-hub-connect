-- =====================================================
-- FASE 2.1: DAC7 Report Generation - Database Schema
-- =====================================================

-- 1. Tabella tax_details per gestione dati fiscali multi-giurisdizione
CREATE TABLE IF NOT EXISTS public.tax_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Dati giurisdizione
  country_code TEXT NOT NULL, -- ISO 3166-1 alpha-2 (IT, DE, FR...)
  entity_type TEXT NOT NULL CHECK (entity_type IN ('individual', 'business')),
  
  -- Identificativi fiscali
  tax_id TEXT NOT NULL, -- CF (individual) o P.IVA (business)
  vat_number TEXT, -- Solo se diverso da tax_id
  
  -- Indirizzo fiscale (obbligatorio DAC7)
  address_line1 TEXT NOT NULL,
  address_line2 TEXT,
  city TEXT NOT NULL,
  province TEXT, -- Stato/Provincia/Regione
  postal_code TEXT NOT NULL,
  
  -- Dati bancari
  iban TEXT NOT NULL, -- IBAN completo con checksum
  bic_swift TEXT, -- Opzionale
  
  -- Validità temporale
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_to TIMESTAMPTZ, -- NULL = attivo
  is_primary BOOLEAN NOT NULL DEFAULT TRUE,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  
  -- Constraint: un solo record primario attivo per profile/country/type
  CONSTRAINT unique_primary_tax_detail 
    UNIQUE (profile_id, country_code, entity_type, is_primary) 
    DEFERRABLE INITIALLY DEFERRED
);

-- Rimuovi constraint se esiste per evitare errori
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_primary_tax_detail'
  ) THEN
    ALTER TABLE public.tax_details DROP CONSTRAINT unique_primary_tax_detail;
  END IF;
END $$;

-- Aggiungi constraint con validazione temporale
ALTER TABLE public.tax_details
  ADD CONSTRAINT unique_primary_tax_detail 
    UNIQUE (profile_id, country_code, entity_type, is_primary);

-- Index per performance query DAC7
CREATE INDEX IF NOT EXISTS idx_tax_details_profile_country 
  ON public.tax_details(profile_id, country_code) 
  WHERE valid_to IS NULL;

CREATE INDEX IF NOT EXISTS idx_tax_details_valid 
  ON public.tax_details(profile_id, is_primary) 
  WHERE valid_to IS NULL AND is_primary = TRUE;

-- Trigger per aggiornamento updated_at
CREATE OR REPLACE FUNCTION public.update_tax_details_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_tax_details_updated_at ON public.tax_details;
CREATE TRIGGER update_tax_details_updated_at
  BEFORE UPDATE ON public.tax_details
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tax_details_updated_at();

-- RLS Policies
ALTER TABLE public.tax_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tax_details_select_own" ON public.tax_details;
CREATE POLICY "tax_details_select_own" ON public.tax_details
  FOR SELECT USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "tax_details_insert_own" ON public.tax_details;
CREATE POLICY "tax_details_insert_own" ON public.tax_details
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "tax_details_update_own" ON public.tax_details;
CREATE POLICY "tax_details_update_own" ON public.tax_details
  FOR UPDATE USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "tax_details_admin_all" ON public.tax_details;
CREATE POLICY "tax_details_admin_all" ON public.tax_details
  FOR ALL USING (public.is_admin(auth.uid()));

-- 2. Estensione dac7_reports con campi aggiuntivi
ALTER TABLE public.dac7_reports
  ADD COLUMN IF NOT EXISTS report_json_data JSONB,
  ADD COLUMN IF NOT EXISTS report_status TEXT DEFAULT 'draft' 
    CHECK (report_status IN ('draft', 'final', 'submitted', 'error')),
  ADD COLUMN IF NOT EXISTS submission_reference TEXT,
  ADD COLUMN IF NOT EXISTS error_details JSONB,
  ADD COLUMN IF NOT EXISTS generated_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS host_acknowledged_at TIMESTAMPTZ;

-- Index per query admin dashboard
CREATE INDEX IF NOT EXISTS idx_dac7_reports_year_status 
  ON public.dac7_reports(reporting_year, report_status);
  
CREATE INDEX IF NOT EXISTS idx_dac7_reports_threshold 
  ON public.dac7_reports(reporting_threshold_met, reporting_year) 
  WHERE reporting_threshold_met = TRUE;

-- 3. Storage bucket dac7-reports
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dac7-reports',
  'dac7-reports',
  FALSE, -- Privato
  10485760, -- 10MB max
  ARRAY['application/json', 'application/pdf', 'text/csv', 'application/xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/json', 'application/pdf', 'text/csv', 'application/xml'];

-- RLS Policy storage: Solo admin e host owner
DROP POLICY IF EXISTS "dac7_reports_access" ON storage.objects;
CREATE POLICY "dac7_reports_access" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'dac7-reports' AND (
      public.is_admin(auth.uid()) OR
      (storage.foldername(name))[1] = auth.uid()::TEXT
    )
  );

DROP POLICY IF EXISTS "dac7_reports_upload" ON storage.objects;
CREATE POLICY "dac7_reports_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'dac7-reports' AND
    public.is_admin(auth.uid())
  );

-- 4. Database Function: get_hosts_for_dac7_report
CREATE OR REPLACE FUNCTION public.get_hosts_for_dac7_report(
  report_year INTEGER,
  host_ids_filter UUID[] DEFAULT NULL
)
RETURNS TABLE (
  host_id UUID,
  first_name TEXT,
  last_name TEXT,
  email TEXT,
  total_income NUMERIC,
  total_transactions INTEGER,
  total_hours NUMERIC,
  total_days NUMERIC,
  monthly_data JSONB,
  tax_details JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH host_payments AS (
    SELECT 
      s.host_id,
      DATE_TRUNC('month', p.created_at) AS month,
      SUM(p.host_amount) AS income,
      COUNT(b.id) AS transactions,
      SUM(EXTRACT(EPOCH FROM (b.end_time - b.start_time)) / 3600) AS hours,
      COUNT(DISTINCT b.booking_date) AS days
    FROM bookings b
    JOIN spaces s ON s.id = b.space_id
    JOIN payments p ON p.booking_id = b.id
    WHERE b.status IN ('confirmed', 'served')
      AND p.payment_status = 'completed'
      AND EXTRACT(YEAR FROM p.created_at) = report_year
      AND (host_ids_filter IS NULL OR s.host_id = ANY(host_ids_filter))
    GROUP BY s.host_id, DATE_TRUNC('month', p.created_at)
  ),
  aggregated_metrics AS (
    SELECT 
      host_id,
      SUM(income) AS total_income,
      SUM(transactions)::INTEGER AS total_transactions,
      SUM(hours) AS total_hours,
      SUM(days)::INTEGER AS total_days,
      JSONB_AGG(
        JSONB_BUILD_OBJECT(
          'month', TO_CHAR(month, 'YYYY-MM'),
          'income', income,
          'transactions', transactions,
          'hours', hours,
          'days', days
        ) ORDER BY month
      ) AS monthly_data
    FROM host_payments
    GROUP BY host_id
  )
  SELECT 
    p.id AS host_id,
    p.first_name,
    p.last_name,
    p.email,
    am.total_income,
    am.total_transactions,
    am.total_hours,
    am.total_days,
    am.monthly_data,
    (
      SELECT JSONB_BUILD_OBJECT(
        'tax_id', td.tax_id,
        'vat_number', td.vat_number,
        'entity_type', td.entity_type,
        'address_line1', td.address_line1,
        'address_line2', td.address_line2,
        'city', td.city,
        'province', td.province,
        'postal_code', td.postal_code,
        'country_code', td.country_code,
        'iban', td.iban,
        'bic_swift', td.bic_swift
      )
      FROM tax_details td
      WHERE td.profile_id = p.id
        AND td.valid_to IS NULL
        AND td.is_primary = TRUE
      LIMIT 1
    ) AS tax_details
  FROM profiles p
  JOIN aggregated_metrics am ON am.host_id = p.id
  WHERE p.role = 'host'
  ORDER BY am.total_income DESC;
END;
$$;

-- 5. Cron Job Annuale (15 gennaio ore 09:00 CET)
SELECT cron.schedule(
  'generate-dac7-reports-annual',
  '0 9 15 1 *',
  $$
  SELECT net.http_post(
    url := 'https://khtqwzvrxzsgfhsslwyz.supabase.co/functions/v1/generate-dac7-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
    ),
    body := jsonb_build_object(
      'year', EXTRACT(YEAR FROM CURRENT_DATE) - 1,
      'dryRun', false
    )
  ) AS request_id;
  $$
);