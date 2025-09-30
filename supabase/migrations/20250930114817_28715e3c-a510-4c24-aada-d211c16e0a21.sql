-- =====================================================
-- COMPLETE PERFORMANCE FIX - Phase 3: Final 120 Warnings
-- Fix all remaining RLS policies, duplicate policies, and duplicate indexes
-- =====================================================

-- =====================================================
-- PHASE 1: FIX REMAINING AUTH.UID() ISSUES (~52 warnings)
-- =====================================================

-- TABLE: reports
DROP POLICY IF EXISTS "Anyone can create reports" ON public.reports;
DROP POLICY IF EXISTS "Reporters and admins can view reports" ON public.reports;
DROP POLICY IF EXISTS "Reporters can update their own reports" ON public.reports;

CREATE POLICY "Anyone can create reports" ON public.reports
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = reporter_id);

CREATE POLICY "Reporters and admins can view reports" ON public.reports
FOR SELECT TO authenticated
USING ((select auth.uid()) = reporter_id OR is_admin((select auth.uid())));

CREATE POLICY "Reporters can update their own reports" ON public.reports
FOR UPDATE TO authenticated
USING ((select auth.uid()) = reporter_id);

-- TABLE: workspace_features
DROP POLICY IF EXISTS "Users can view their workspace features" ON public.workspace_features;

CREATE POLICY "Users can view their workspace features" ON public.workspace_features
FOR SELECT TO authenticated
USING ((select auth.uid()) IN (
  SELECT spaces.host_id FROM spaces WHERE spaces.id = workspace_features.space_id
));

-- TABLE: space_tags
DROP POLICY IF EXISTS "Everyone can view space tags" ON public.space_tags;
DROP POLICY IF EXISTS "Space owners manage tags" ON public.space_tags;

CREATE POLICY "Everyone can view space tags" ON public.space_tags
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Space owners manage tags" ON public.space_tags
FOR ALL TO authenticated
USING ((select auth.uid()) IN (
  SELECT spaces.host_id FROM spaces WHERE spaces.id = space_tags.space_id
))
WITH CHECK ((select auth.uid()) IN (
  SELECT spaces.host_id FROM spaces WHERE spaces.id = space_tags.space_id
));

-- TABLE: user_notifications
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.user_notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.user_notifications;

CREATE POLICY "Users manage their notifications" ON public.user_notifications
FOR ALL TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- TABLE: static_content
DROP POLICY IF EXISTS "Admins can manage static content" ON public.static_content;
DROP POLICY IF EXISTS "Everyone can view published static content" ON public.static_content;

CREATE POLICY "Admins can manage static content" ON public.static_content
FOR ALL TO authenticated
USING (is_admin((select auth.uid())));

CREATE POLICY "Everyone can view published static content" ON public.static_content
FOR SELECT TO authenticated
USING (is_published = true);

-- =====================================================
-- PHASE 2: CONSOLIDATE DUPLICATE POLICIES (~67 warnings)
-- =====================================================

-- TABLE: spaces - Consolidate 10+ duplicate policies
DROP POLICY IF EXISTS "Admins can manage all spaces" ON public.spaces;
DROP POLICY IF EXISTS "Admins can update all spaces for moderation" ON public.spaces;
DROP POLICY IF EXISTS "Admins can update all spaces including deleted" ON public.spaces;
DROP POLICY IF EXISTS "Admins can view all spaces for moderation" ON public.spaces;
DROP POLICY IF EXISTS "Admins can view all spaces including deleted" ON public.spaces;
DROP POLICY IF EXISTS "Hosts can create their own spaces" ON public.spaces;
DROP POLICY IF EXISTS "Hosts can manage their own spaces" ON public.spaces;
DROP POLICY IF EXISTS "Hosts can view their own unpublished spaces" ON public.spaces;
DROP POLICY IF EXISTS "Public can view published spaces" ON public.spaces;
DROP POLICY IF EXISTS "Users can view published spaces" ON public.spaces;

-- Consolidated admin policy
CREATE POLICY "Admins full access" ON public.spaces
FOR ALL TO authenticated
USING (is_admin((select auth.uid())))
WITH CHECK (is_admin((select auth.uid())));

-- Consolidated host policy
CREATE POLICY "Hosts manage own spaces" ON public.spaces
FOR ALL TO authenticated
USING ((select auth.uid()) = host_id)
WITH CHECK ((select auth.uid()) = host_id);

-- Public viewing policy
CREATE POLICY "Public view published spaces" ON public.spaces
FOR SELECT TO authenticated
USING (published = true AND is_suspended = false);

-- TABLE: admin_actions_log - Remove duplicate SELECT policies
DROP POLICY IF EXISTS "Admins can create admin action logs" ON public.admin_actions_log;
DROP POLICY IF EXISTS "Admins can view all admin actions" ON public.admin_actions_log;
DROP POLICY IF EXISTS "Only admins can insert action logs" ON public.admin_actions_log;
DROP POLICY IF EXISTS "Only admins can view action logs" ON public.admin_actions_log;

CREATE POLICY "Admins manage action logs" ON public.admin_actions_log
FOR ALL TO authenticated
USING (is_admin((select auth.uid())))
WITH CHECK (is_admin((select auth.uid())));

-- TABLE: dac7_reports - Consolidate policies
DROP POLICY IF EXISTS "Admins can view all DAC7 reports" ON public.dac7_reports;
DROP POLICY IF EXISTS "Hosts can view their own DAC7 reports" ON public.dac7_reports;

CREATE POLICY "DAC7 reports access" ON public.dac7_reports
FOR SELECT TO authenticated
USING ((select auth.uid()) = host_id OR is_admin((select auth.uid())));

CREATE POLICY "Admins manage DAC7 reports" ON public.dac7_reports
FOR ALL TO authenticated
USING (is_admin((select auth.uid())));

-- TABLE: gdpr_requests - Consolidate policies
DROP POLICY IF EXISTS "Admins can view all GDPR requests" ON public.gdpr_requests;
DROP POLICY IF EXISTS "Users can create their own GDPR requests" ON public.gdpr_requests;
DROP POLICY IF EXISTS "Users can view their own GDPR requests" ON public.gdpr_requests;

CREATE POLICY "GDPR requests access" ON public.gdpr_requests
FOR SELECT TO authenticated
USING ((select auth.uid()) = user_id OR is_admin((select auth.uid())));

CREATE POLICY "Users create GDPR requests" ON public.gdpr_requests
FOR INSERT TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Admins manage GDPR requests" ON public.gdpr_requests
FOR ALL TO authenticated
USING (is_admin((select auth.uid())));

-- TABLE: global_tags - Consolidate duplicate policies
DROP POLICY IF EXISTS "Admins can view all tags" ON public.global_tags;
DROP POLICY IF EXISTS "Everyone can view approved tags" ON public.global_tags;
DROP POLICY IF EXISTS "Only admins can update tags" ON public.global_tags;
DROP POLICY IF EXISTS "Users can create tags" ON public.global_tags;

CREATE POLICY "View approved tags" ON public.global_tags
FOR SELECT TO authenticated
USING (is_approved = true AND is_active = true OR is_admin((select auth.uid())));

CREATE POLICY "Users create tags" ON public.global_tags
FOR INSERT TO authenticated
WITH CHECK ((select auth.uid()) = created_by);

CREATE POLICY "Admins manage tags" ON public.global_tags
FOR ALL TO authenticated
USING (is_admin((select auth.uid())));

-- TABLE: admin_warnings - Consolidate policies
DROP POLICY IF EXISTS "Only admins can insert warnings" ON public.admin_warnings;
DROP POLICY IF EXISTS "Only admins can update warnings" ON public.admin_warnings;
DROP POLICY IF EXISTS "Only admins can view warnings" ON public.admin_warnings;

CREATE POLICY "Admins manage warnings" ON public.admin_warnings
FOR ALL TO authenticated
USING (is_admin((select auth.uid())))
WITH CHECK (is_admin((select auth.uid())));

-- =====================================================
-- PHASE 3: REMOVE DUPLICATE INDEXES (1 warning)
-- =====================================================

-- Remove duplicate index on messages.conversation_id
DROP INDEX IF EXISTS public.idx_messages_conversation;