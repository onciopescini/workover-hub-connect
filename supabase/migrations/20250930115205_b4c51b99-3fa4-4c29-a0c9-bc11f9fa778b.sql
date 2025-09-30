-- =====================================================
-- COMPREHENSIVE MIGRATION: FIX 93 WARNINGS - V2
-- More thorough policy cleanup before recreation
-- =====================================================

-- Drop ALL existing policies for reports table
DO $$ 
BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON public.reports;', E'\n')
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'reports'
  );
END $$;

CREATE POLICY "Admins manage reports" ON public.reports
  FOR ALL USING (is_admin((select auth.uid())));

CREATE POLICY "Users create own reports" ON public.reports
  FOR INSERT WITH CHECK ((select auth.uid()) = reporter_id);

CREATE POLICY "Users and admins view reports" ON public.reports
  FOR SELECT USING (
    (select auth.uid()) = reporter_id OR is_admin((select auth.uid()))
  );

-- Drop ALL existing policies for workspace_features
DO $$ 
BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON public.workspace_features;', E'\n')
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'workspace_features'
  );
END $$;

CREATE POLICY "Hosts manage features" ON public.workspace_features
  FOR ALL USING (
    (select auth.uid()) IN (
      SELECT host_id FROM spaces WHERE id = workspace_features.space_id
    )
  );

CREATE POLICY "Public view features" ON public.workspace_features
  FOR SELECT USING (true);

-- Drop ALL existing policies for space_tags
DO $$ 
BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON public.space_tags;', E'\n')
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'space_tags'
  );
END $$;

CREATE POLICY "Public view tags" ON public.space_tags
  FOR SELECT USING (true);

CREATE POLICY "Hosts manage space tags" ON public.space_tags
  FOR ALL USING (
    (select auth.uid()) IN (
      SELECT host_id FROM spaces WHERE id = space_tags.space_id
    )
  );

-- Drop ALL existing policies for static_content
DO $$ 
BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON public.static_content;', E'\n')
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'static_content'
  );
END $$;

CREATE POLICY "Admins manage static content" ON public.static_content
  FOR ALL USING (is_admin((select auth.uid())));

CREATE POLICY "Public view published content" ON public.static_content
  FOR SELECT USING (is_published = true);

-- Drop ALL existing policies for accessibility_audits
DO $$ 
BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON public.accessibility_audits;', E'\n')
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'accessibility_audits'
  );
END $$;

CREATE POLICY "Admins manage audits" ON public.accessibility_audits
  FOR ALL USING (is_admin((select auth.uid())));

-- Drop ALL existing policies for data_retention_log
DO $$ 
BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON public.data_retention_log;', E'\n')
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'data_retention_log'
  );
END $$;

CREATE POLICY "Admins view logs" ON public.data_retention_log
  FOR SELECT USING (is_admin((select auth.uid())));

-- Drop ALL existing policies for data_breach_log
DO $$ 
BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON public.data_breach_log;', E'\n')
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'data_breach_log'
  );
END $$;

CREATE POLICY "Admins manage breaches" ON public.data_breach_log
  FOR ALL USING (is_admin((select auth.uid())));

-- Drop ALL existing policies for cookie_consent_log
DO $$ 
BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON public.cookie_consent_log;', E'\n')
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'cookie_consent_log'
  );
END $$;

CREATE POLICY "Public insert consent" ON public.cookie_consent_log
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users view consent logs" ON public.cookie_consent_log
  FOR SELECT USING (
    (select auth.uid()) = user_id OR is_admin((select auth.uid()))
  );

-- Drop ALL existing policies for data_minimization_audit
DO $$ 
BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON public.data_minimization_audit;', E'\n')
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'data_minimization_audit'
  );
END $$;

CREATE POLICY "Admins manage audits" ON public.data_minimization_audit
  FOR ALL USING (is_admin((select auth.uid())));

-- Drop ALL existing policies for image_processing_jobs
DO $$ 
BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON public.image_processing_jobs;', E'\n')
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'image_processing_jobs'
  );
END $$;

CREATE POLICY "Users manage images" ON public.image_processing_jobs
  FOR ALL USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

-- Drop ALL existing policies for admin_access_logs
DO $$ 
BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON public.admin_access_logs;', E'\n')
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'admin_access_logs'
  );
END $$;

CREATE POLICY "Admins manage logs" ON public.admin_access_logs
  FOR ALL USING (is_admin((select auth.uid())))
  WITH CHECK (is_admin((select auth.uid())));

-- Drop ALL existing policies for message_templates
DO $$ 
BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON public.message_templates;', E'\n')
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'message_templates'
  );
END $$;

CREATE POLICY "Hosts manage templates" ON public.message_templates
  FOR ALL USING ((select auth.uid()) = host_id)
  WITH CHECK ((select auth.uid()) = host_id);

-- Drop ALL existing policies for host_report_subscriptions
DO $$ 
BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON public.host_report_subscriptions;', E'\n')
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'host_report_subscriptions'
  );
END $$;

CREATE POLICY "Hosts manage reports" ON public.host_report_subscriptions
  FOR ALL USING ((select auth.uid()) = host_id)
  WITH CHECK ((select auth.uid()) = host_id);

-- Drop ALL existing policies for data_access_logs
DO $$ 
BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON public.data_access_logs;', E'\n')
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'data_access_logs'
  );
END $$;

CREATE POLICY "Admins view logs" ON public.data_access_logs
  FOR SELECT USING (is_admin((select auth.uid())));

CREATE POLICY "Users log access" ON public.data_access_logs
  FOR INSERT WITH CHECK ((select auth.uid()) IS NOT NULL);

-- Drop ALL existing policies for rate_limits
DO $$ 
BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON public.rate_limits;', E'\n')
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'rate_limits'
  );
END $$;

CREATE POLICY "System manages rate limits" ON public.rate_limits
  FOR ALL USING (is_admin((select auth.uid())) OR true);

-- Drop ALL existing policies for profiles
DO $$ 
BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON public.profiles;', E'\n')
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'profiles'
  );
END $$;

CREATE POLICY "Users manage own" ON public.profiles
  FOR ALL USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Admins manage all" ON public.profiles
  FOR ALL USING (is_admin((select auth.uid())));

CREATE POLICY "Public view profiles" ON public.profiles
  FOR SELECT USING (
    (select auth.uid()) = id OR
    is_admin((select auth.uid())) OR
    (
      networking_enabled = true AND 
      is_suspended = false AND
      EXISTS (
        SELECT 1 FROM check_profile_access((select auth.uid()), profiles.id) access
        WHERE ((access.access->>'has_access')::boolean = true)
      )
    )
  );

-- Drop ALL existing policies for dac7_reports
DO $$ 
BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON public.dac7_reports;', E'\n')
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'dac7_reports'
  );
END $$;

CREATE POLICY "View DAC7" ON public.dac7_reports
  FOR SELECT USING (
    (select auth.uid()) = host_id OR is_admin((select auth.uid()))
  );

CREATE POLICY "Admins manage DAC7" ON public.dac7_reports
  FOR ALL USING (is_admin((select auth.uid())));

-- Drop ALL existing policies for events
DO $$ 
BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON public.events;', E'\n')
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'events'
  );
END $$;

CREATE POLICY "View events" ON public.events
  FOR SELECT USING (status <> 'cancelled');

CREATE POLICY "Creators manage events" ON public.events
  FOR ALL USING ((select auth.uid()) = created_by)
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- Drop ALL existing policies for gdpr_requests
DO $$ 
BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON public.gdpr_requests;', E'\n')
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'gdpr_requests'
  );
END $$;

CREATE POLICY "View GDPR" ON public.gdpr_requests
  FOR SELECT USING (
    (select auth.uid()) = user_id OR is_admin((select auth.uid()))
  );

CREATE POLICY "Create GDPR" ON public.gdpr_requests
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Update GDPR" ON public.gdpr_requests
  FOR UPDATE USING (is_admin((select auth.uid())));

-- Drop ALL existing policies for global_tags
DO $$ 
BEGIN
  EXECUTE (
    SELECT string_agg('DROP POLICY IF EXISTS ' || quote_ident(policyname) || ' ON public.global_tags;', E'\n')
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'global_tags'
  );
END $$;

CREATE POLICY "View tags" ON public.global_tags
  FOR SELECT USING (
    (is_approved = true AND is_active = true) OR 
    is_admin((select auth.uid()))
  );

CREATE POLICY "Create tags" ON public.global_tags
  FOR INSERT WITH CHECK ((select auth.uid()) = created_by);

CREATE POLICY "Admins manage tags" ON public.global_tags
  FOR ALL USING (is_admin((select auth.uid())));