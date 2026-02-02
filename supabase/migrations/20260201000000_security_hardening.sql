-- ==============================================================================
-- SECURITY HARDENING MIGRATION - 2026-02-01
-- Objective: Fix Security Definer Views, missing search_paths, unsecured tables,
--            and missing performance indexes using dynamic discovery.
-- ==============================================================================

-- ==============================================================================
-- SECTION 1: FIX SECURITY DEFINER VIEWS
-- Recreating Views with (security_invoker = true) to respect RLS
-- ==============================================================================

DROP VIEW IF EXISTS public.compliance_monitoring_metrics;

CREATE VIEW public.compliance_monitoring_metrics WITH (security_invoker = true) AS
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


DROP VIEW IF EXISTS public.profiles_with_role;

CREATE VIEW public.profiles_with_role WITH (security_invoker = true) AS
SELECT
  p.*,
  ur.role
FROM profiles p
LEFT JOIN user_roles ur ON ur.user_id = p.id
  AND ur.role IN ('host', 'admin'); -- Prioritize host/admin roles

GRANT SELECT ON public.profiles_with_role TO authenticated;


-- ==============================================================================
-- SECTION 2: DYNAMICALLY HARDEN FUNCTIONS (SET search_path = public)
-- Target: All SECURITY DEFINER functions in public schema
-- ==============================================================================

DO $$
DECLARE
    func_record record;
BEGIN
    FOR func_record IN
        SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.prokind = 'f' -- functions only
        AND p.prosecdef = true -- SECURITY DEFINER only (Highest Risk)
        -- AND NOT (COALESCE(p.proconfig, '{}') @> ARRAY['search_path=public']) -- Optional: skip if already set, but safe to re-apply
    LOOP
        RAISE NOTICE 'Securing function: %.%(%)', func_record.nspname, func_record.proname, func_record.args;
        EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public', func_record.nspname, func_record.proname, func_record.args);
    END LOOP;
END $$;


-- ==============================================================================
-- SECTION 3: DYNAMICALLY SECURE EXPOSED TABLES
-- Target: Tables with RLS enabled but NO policies
-- Action: Create "Admin only" policy
-- ==============================================================================

DO $$
DECLARE
    tbl_record record;
BEGIN
    FOR tbl_record IN
        SELECT n.nspname, c.relname
        FROM pg_class c
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public'
        AND c.relkind = 'r' -- regular tables
        AND c.relrowsecurity = true -- RLS enabled
        AND NOT EXISTS (
            SELECT 1 FROM pg_policy pol
            WHERE pol.polrelid = c.oid
        )
    LOOP
        RAISE NOTICE 'Securing table (Admin Only): %.%', tbl_record.nspname, tbl_record.relname;
        -- Create default admin policy
        -- Note: We use IF NOT EXISTS logic via exception handling or check because CREATE POLICY IF NOT EXISTS is not available in all PG versions supported by Supabase (pg15 has it, earlier don't).
        -- We'll assume if it was selected above, it has NO policies, so name collision is unlikely unless "Admin only" exists but is somehow detached? Unlikely.
        EXECUTE format('CREATE POLICY "Admin only" ON %I.%I FOR ALL USING (public.is_admin(auth.uid()))', tbl_record.nspname, tbl_record.relname);
    END LOOP;
END $$;


-- ==============================================================================
-- SECTION 4: PERFORMANCE INDEXES
-- ==============================================================================

-- 1. GIN Indexes for Search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

CREATE INDEX IF NOT EXISTS idx_spaces_title_gin ON public.spaces USING GIN (title gin_trgm_ops);
-- Add description index if column exists (using DO block to avoid error if missing)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'spaces' AND column_name = 'description') THEN
    CREATE INDEX IF NOT EXISTS idx_spaces_description_gin ON public.spaces USING GIN (description gin_trgm_ops);
  END IF;
END $$;

-- 2. Foreign Key Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_space_id ON public.bookings(space_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);

-- Check if conversation_participants table exists before indexing
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversation_participants') THEN
    CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON public.conversation_participants(user_id);
    CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON public.conversation_participants(conversation_id);
  END IF;
END $$;
