-- =====================================================
-- SECURITY HARDENING MIGRATION (CORRECTED)
-- Date: 2026-01-27
-- Purpose: Fix exposed views, secure functions, strict RLS, add VAT rates
-- =====================================================

-- =============================================================================
-- PART 1: SECURE ADMIN VIEWS
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'admin_bookings_view') THEN
    ALTER VIEW public.admin_bookings_view SET (security_invoker = on, security_barrier = on);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'admin_users_view') THEN
    ALTER VIEW public.admin_users_view SET (security_invoker = on, security_barrier = on);
  END IF;
END $$;

-- =============================================================================
-- PART 2: SECURE FUNCTIONS WITH search_path (CORRECTED SIGNATURES)
-- =============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'lock_and_select_expired_bookings') THEN
    ALTER FUNCTION public.lock_and_select_expired_bookings(integer) SET search_path = public;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'lock_and_select_reminder_bookings') THEN
    ALTER FUNCTION public.lock_and_select_reminder_bookings(integer) SET search_path = public;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'copy_booking_cancellation_policy') THEN
    ALTER FUNCTION public.copy_booking_cancellation_policy() SET search_path = public;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_message') THEN
    ALTER FUNCTION public.handle_new_message() SET search_path = public;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_conversation_last_message') THEN
    ALTER FUNCTION public.update_conversation_last_message() SET search_path = public;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
             WHERE proname = 'get_coworkers' AND n.nspname = 'public' AND pronargs = 2) THEN
    ALTER FUNCTION public.get_coworkers(uuid, uuid) SET search_path = public;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid 
             WHERE proname = 'get_coworkers' AND n.nspname = 'public' AND pronargs = 1) THEN
    ALTER FUNCTION public.get_coworkers(uuid) SET search_path = public;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_networking_suggestions') THEN
    ALTER FUNCTION public.get_networking_suggestions(uuid) SET search_path = public;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_sensitive_data_access') THEN
    ALTER FUNCTION public.log_sensitive_data_access(uuid, text, text[], text) SET search_path = public;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- check_rate_limit uses 2 parameters: (text, text)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_rate_limit') THEN
    ALTER FUNCTION public.check_rate_limit(text, text) SET search_path = public;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- log_admin_access - check for correct signature
DO $$
BEGIN
  ALTER FUNCTION public.log_admin_access(text, uuid, text, inet, text, jsonb) SET search_path = public;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =============================================================================
-- PART 3: FIX OVERLY PERMISSIVE RLS POLICIES
-- =============================================================================

DROP POLICY IF EXISTS "Public insert consent" ON public.cookie_consent_log;
DROP POLICY IF EXISTS "Users insert own consent" ON public.cookie_consent_log;
CREATE POLICY "Users insert own consent" ON public.cookie_consent_log
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Anonymous users can insert consent" ON public.cookie_consent_log;
CREATE POLICY "Anonymous users can insert consent" ON public.cookie_consent_log
  FOR INSERT 
  TO anon
  WITH CHECK (user_id IS NULL);

DROP POLICY IF EXISTS "Auto-log data access" ON public.data_access_logs;
DROP POLICY IF EXISTS "Authenticated users log own access" ON public.data_access_logs;
CREATE POLICY "Authenticated users log own access" ON public.data_access_logs
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can record profile views" ON public.profile_views;
DROP POLICY IF EXISTS "Authenticated users record profile views" ON public.profile_views;
CREATE POLICY "Authenticated users record profile views" ON public.profile_views
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = viewer_id OR viewer_id IS NULL);

DROP POLICY IF EXISTS "System can insert logs" ON public.application_logs;
DROP POLICY IF EXISTS "Service role inserts logs" ON public.application_logs;
DROP POLICY IF EXISTS "Authenticated users insert own logs" ON public.application_logs;
CREATE POLICY "Service role inserts logs" ON public.application_logs
  FOR INSERT 
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Authenticated users insert own logs" ON public.application_logs
  FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- =============================================================================
-- PART 4: EU VAT RATES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.vat_rates (
  country_code TEXT PRIMARY KEY,
  country_name TEXT NOT NULL,
  standard_rate DECIMAL(5,2) NOT NULL,
  reduced_rate DECIMAL(5,2),
  super_reduced_rate DECIMAL(5,2),
  is_eu_member BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vat_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view VAT rates" ON public.vat_rates;
CREATE POLICY "Anyone can view VAT rates" ON public.vat_rates
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Service role manages VAT rates" ON public.vat_rates;
CREATE POLICY "Service role manages VAT rates" ON public.vat_rates
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_vat_rates_eu ON public.vat_rates(is_eu_member) WHERE is_eu_member = true;

INSERT INTO public.vat_rates (country_code, country_name, standard_rate, reduced_rate, is_eu_member) VALUES
  ('AT', 'Austria', 20.00, 10.00, true),
  ('BE', 'Belgium', 21.00, 6.00, true),
  ('BG', 'Bulgaria', 20.00, 9.00, true),
  ('HR', 'Croatia', 25.00, 13.00, true),
  ('CY', 'Cyprus', 19.00, 5.00, true),
  ('CZ', 'Czechia', 21.00, 12.00, true),
  ('DK', 'Denmark', 25.00, NULL, true),
  ('EE', 'Estonia', 22.00, 9.00, true),
  ('FI', 'Finland', 24.00, 10.00, true),
  ('FR', 'France', 20.00, 5.50, true),
  ('DE', 'Germany', 19.00, 7.00, true),
  ('GR', 'Greece', 24.00, 6.00, true),
  ('HU', 'Hungary', 27.00, 5.00, true),
  ('IE', 'Ireland', 23.00, 9.00, true),
  ('IT', 'Italy', 22.00, 10.00, true),
  ('LV', 'Latvia', 21.00, 12.00, true),
  ('LT', 'Lithuania', 21.00, 9.00, true),
  ('LU', 'Luxembourg', 17.00, 8.00, true),
  ('MT', 'Malta', 18.00, 5.00, true),
  ('NL', 'Netherlands', 21.00, 9.00, true),
  ('PL', 'Poland', 23.00, 8.00, true),
  ('PT', 'Portugal', 23.00, 6.00, true),
  ('RO', 'Romania', 19.00, 5.00, true),
  ('SK', 'Slovakia', 20.00, 10.00, true),
  ('SI', 'Slovenia', 22.00, 9.50, true),
  ('ES', 'Spain', 21.00, 10.00, true),
  ('SE', 'Sweden', 25.00, 6.00, true),
  ('XX', 'Other/Default', 0.00, NULL, false)
ON CONFLICT (country_code) DO UPDATE SET
  standard_rate = EXCLUDED.standard_rate,
  reduced_rate = EXCLUDED.reduced_rate,
  updated_at = now();

CREATE OR REPLACE FUNCTION public.get_vat_rate(p_country_code TEXT)
RETURNS DECIMAL(5,2)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT standard_rate FROM public.vat_rates WHERE country_code = UPPER(p_country_code)),
    (SELECT standard_rate FROM public.vat_rates WHERE country_code = 'IT'),
    22.00
  );
$$;