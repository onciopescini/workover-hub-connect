-- ============================================================================
-- MIGRAZIONE FINALE: Consolidamento Policy RLS
-- Obiettivo: Eliminare tutti i 60 warnings rimanenti "Multiple Permissive Policies"
-- Strategia: Una policy unificata per ogni operazione invece di policy multiple
-- ============================================================================

-- ============================================================================
-- 1. DAC7_REPORTS (4 warnings → 1 policy)
-- ============================================================================
DROP POLICY IF EXISTS "Admins manage DAC7" ON public.dac7_reports;
DROP POLICY IF EXISTS "View DAC7" ON public.dac7_reports;

CREATE POLICY "dac7_unified_access"
ON public.dac7_reports
FOR ALL
USING (
  (SELECT auth.uid()) = host_id OR is_admin((SELECT auth.uid()))
)
WITH CHECK (
  is_admin((SELECT auth.uid()))
);

-- ============================================================================
-- 2. EVENTS (4 warnings → 2 policies unificate)
-- ============================================================================
DROP POLICY IF EXISTS "Creators manage events" ON public.events;
DROP POLICY IF EXISTS "View events" ON public.events;

CREATE POLICY "events_unified_select"
ON public.events
FOR SELECT
USING (
  status <> 'cancelled' OR (SELECT auth.uid()) = created_by
);

CREATE POLICY "events_unified_modify"
ON public.events
FOR ALL
USING ((SELECT auth.uid()) = created_by)
WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- ============================================================================
-- 3. GLOBAL_TAGS (8 warnings → 2 policies unificate)
-- ============================================================================
DROP POLICY IF EXISTS "Admins manage tags" ON public.global_tags;
DROP POLICY IF EXISTS "Create tags" ON public.global_tags;
DROP POLICY IF EXISTS "View tags" ON public.global_tags;

CREATE POLICY "tags_unified_select"
ON public.global_tags
FOR SELECT
USING (
  (is_approved = true AND is_active = true) OR is_admin((SELECT auth.uid()))
);

CREATE POLICY "tags_unified_modify"
ON public.global_tags
FOR ALL
USING (is_admin((SELECT auth.uid())))
WITH CHECK (
  is_admin((SELECT auth.uid())) OR (SELECT auth.uid()) = created_by
);

-- ============================================================================
-- 4. PROFILES (20 warnings → 2 policies unificate)
-- ============================================================================
DROP POLICY IF EXISTS "Admins manage all" ON public.profiles;
DROP POLICY IF EXISTS "Public view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users manage own" ON public.profiles;

CREATE POLICY "profiles_unified_select"
ON public.profiles
FOR SELECT
USING (
  (SELECT auth.uid()) = id 
  OR is_admin((SELECT auth.uid()))
  OR (
    networking_enabled = true 
    AND is_suspended = false
    AND EXISTS (
      SELECT 1 FROM check_profile_access((SELECT auth.uid()), profiles.id) access
      WHERE ((access.access->>'has_access')::boolean = true)
    )
  )
);

CREATE POLICY "profiles_unified_modify"
ON public.profiles
FOR ALL
USING (
  (SELECT auth.uid()) = id OR is_admin((SELECT auth.uid()))
)
WITH CHECK (
  (SELECT auth.uid()) = id OR is_admin((SELECT auth.uid()))
);

-- ============================================================================
-- 5. REPORTS (8 warnings → 2 policies unificate)
-- ============================================================================
DROP POLICY IF EXISTS "Admins manage reports" ON public.reports;
DROP POLICY IF EXISTS "Users and admins view reports" ON public.reports;
DROP POLICY IF EXISTS "Users create own reports" ON public.reports;

CREATE POLICY "reports_unified_select"
ON public.reports
FOR SELECT
USING (
  (SELECT auth.uid()) = reporter_id OR is_admin((SELECT auth.uid()))
);

CREATE POLICY "reports_unified_modify"
ON public.reports
FOR ALL
USING (is_admin((SELECT auth.uid())))
WITH CHECK (
  (SELECT auth.uid()) = reporter_id OR is_admin((SELECT auth.uid()))
);

-- ============================================================================
-- 6. SPACE_TAGS (4 warnings → 2 policies unificate)
-- ============================================================================
DROP POLICY IF EXISTS "Hosts manage space tags" ON public.space_tags;
DROP POLICY IF EXISTS "Public view tags" ON public.space_tags;

CREATE POLICY "space_tags_unified_select"
ON public.space_tags
FOR SELECT
USING (true);

CREATE POLICY "space_tags_unified_modify"
ON public.space_tags
FOR ALL
USING (
  (SELECT auth.uid()) IN (
    SELECT host_id FROM spaces WHERE id = space_tags.space_id
  )
)
WITH CHECK (
  (SELECT auth.uid()) IN (
    SELECT host_id FROM spaces WHERE id = space_tags.space_id
  )
);

-- ============================================================================
-- 7. SPACES (7 warnings → 3 policies unificate)
-- ============================================================================
DROP POLICY IF EXISTS "Admins full access" ON public.spaces;
DROP POLICY IF EXISTS "Anyone can view published space basics" ON public.spaces;
DROP POLICY IF EXISTS "Hosts manage own spaces" ON public.spaces;

CREATE POLICY "spaces_unified_select"
ON public.spaces
FOR SELECT
USING (
  (published = true AND is_suspended = false AND pending_approval = false)
  OR (SELECT auth.uid()) = host_id
  OR is_admin((SELECT auth.uid()))
);

CREATE POLICY "spaces_unified_insert"
ON public.spaces
FOR INSERT
WITH CHECK (
  (SELECT auth.uid()) = host_id
  AND NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = (SELECT auth.uid()) 
    AND space_creation_restricted = true
  )
);

CREATE POLICY "spaces_unified_update_delete"
ON public.spaces
FOR ALL
USING (
  (SELECT auth.uid()) = host_id OR is_admin((SELECT auth.uid()))
)
WITH CHECK (
  (SELECT auth.uid()) = host_id OR is_admin((SELECT auth.uid()))
);

-- ============================================================================
-- 8. STATIC_CONTENT (4 warnings → 2 policies unificate)
-- ============================================================================
DROP POLICY IF EXISTS "Admins manage static content" ON public.static_content;
DROP POLICY IF EXISTS "Public view static content" ON public.static_content;

CREATE POLICY "static_content_unified_select"
ON public.static_content
FOR SELECT
USING (is_published = true OR is_admin((SELECT auth.uid())));

CREATE POLICY "static_content_unified_modify"
ON public.static_content
FOR ALL
USING (is_admin((SELECT auth.uid())))
WITH CHECK (is_admin((SELECT auth.uid())));

-- ============================================================================
-- 9. USER_NOTIFICATIONS (1 warning → 1 policy unificata)
-- ============================================================================
DROP POLICY IF EXISTS "Users manage notifications" ON public.user_notifications;

CREATE POLICY "notifications_unified_access"
ON public.user_notifications
FOR ALL
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- 10. WORKSPACE_FEATURES (4 warnings → 2 policies unificate)
-- ============================================================================
DROP POLICY IF EXISTS "Hosts manage workspace features" ON public.workspace_features;
DROP POLICY IF EXISTS "Public view workspace features" ON public.workspace_features;

CREATE POLICY "workspace_features_unified_select"
ON public.workspace_features
FOR SELECT
USING (true);

CREATE POLICY "workspace_features_unified_modify"
ON public.workspace_features
FOR ALL
USING (
  (SELECT auth.uid()) IN (
    SELECT host_id FROM spaces WHERE id = workspace_features.space_id
  )
)
WITH CHECK (
  (SELECT auth.uid()) IN (
    SELECT host_id FROM spaces WHERE id = workspace_features.space_id
  )
);