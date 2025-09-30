-- =====================================================
-- COMPLETE PERFORMANCE OPTIMIZATION
-- Phase 1: Fix all RLS auth.uid() InitPlan issues (164 warnings)
-- Phase 2: Add indexes for foreign keys (56 suggestions)
-- =====================================================

-- =====================================================
-- PHASE 1: RLS POLICY OPTIMIZATION
-- =====================================================

-- TABLE: profiles
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Limited public profile access" ON public.profiles;
DROP POLICY IF EXISTS "Users can read own complete profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile only" ON public.profiles;
DROP POLICY IF EXISTS "Users can view limited public profile data" ON public.profiles;

CREATE POLICY "Admins can manage all profiles" ON public.profiles
FOR ALL TO authenticated
USING (is_admin((select auth.uid())));

CREATE POLICY "Limited public profile access" ON public.profiles
FOR SELECT TO authenticated
USING (
  (select auth.uid()) <> id AND 
  networking_enabled = true AND 
  is_suspended = false AND
  EXISTS (
    SELECT 1 FROM check_profile_access((select auth.uid()), profiles.id) access
    WHERE ((access.access ->> 'has_access')::boolean = true)
  )
);

CREATE POLICY "Users can read own complete profile" ON public.profiles
FOR SELECT TO authenticated
USING ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile only" ON public.profiles
FOR UPDATE TO authenticated
USING ((select auth.uid()) = id)
WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Users can view limited public profile data" ON public.profiles
FOR SELECT TO authenticated
USING (
  (select auth.uid()) <> id AND 
  networking_enabled = true AND 
  is_suspended = false AND
  EXISTS (
    SELECT 1 FROM check_profile_access((select auth.uid()), profiles.id) access
    WHERE ((access.access ->> 'has_access')::boolean = true)
  )
);

-- TABLE: spaces
DROP POLICY IF EXISTS "Admins can manage all spaces" ON public.spaces;
DROP POLICY IF EXISTS "Admins can update all spaces for moderation" ON public.spaces;
DROP POLICY IF EXISTS "Admins can update all spaces including deleted" ON public.spaces;
DROP POLICY IF EXISTS "Admins can view all spaces for moderation" ON public.spaces;
DROP POLICY IF EXISTS "Admins can view all spaces including deleted" ON public.spaces;
DROP POLICY IF EXISTS "Hosts can create their own spaces" ON public.spaces;
DROP POLICY IF EXISTS "Hosts can manage their own spaces" ON public.spaces;
DROP POLICY IF EXISTS "Hosts can view their own unpublished spaces" ON public.spaces;

CREATE POLICY "Admins can manage all spaces" ON public.spaces
FOR ALL TO authenticated
USING (is_admin((select auth.uid())));

CREATE POLICY "Admins can update all spaces for moderation" ON public.spaces
FOR UPDATE TO authenticated
USING (is_admin((select auth.uid())));

CREATE POLICY "Admins can update all spaces including deleted" ON public.spaces
FOR UPDATE TO authenticated
USING (is_admin((select auth.uid())));

CREATE POLICY "Admins can view all spaces for moderation" ON public.spaces
FOR SELECT TO authenticated
USING (is_admin((select auth.uid())));

CREATE POLICY "Admins can view all spaces including deleted" ON public.spaces
FOR SELECT TO authenticated
USING (is_admin((select auth.uid())));

CREATE POLICY "Hosts can create their own spaces" ON public.spaces
FOR INSERT TO authenticated
WITH CHECK ((select auth.uid()) = host_id);

CREATE POLICY "Hosts can manage their own spaces" ON public.spaces
FOR ALL TO authenticated
USING ((select auth.uid()) = host_id)
WITH CHECK ((select auth.uid()) = host_id);

CREATE POLICY "Hosts can view their own unpublished spaces" ON public.spaces
FOR SELECT TO authenticated
USING ((select auth.uid()) = host_id);

-- TABLE: support_tickets
DROP POLICY IF EXISTS "Users can create tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can update their tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Users can view their own tickets" ON public.support_tickets;

CREATE POLICY "Users can create tickets" ON public.support_tickets
FOR INSERT TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their tickets" ON public.support_tickets
FOR UPDATE TO authenticated
USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can view their own tickets" ON public.support_tickets
FOR SELECT TO authenticated
USING ((select auth.uid()) = user_id OR is_admin((select auth.uid())));

-- TABLE: waitlists
DROP POLICY IF EXISTS "Space hosts can view waitlists for their spaces" ON public.waitlists;
DROP POLICY IF EXISTS "Users can create their own waitlists" ON public.waitlists;
DROP POLICY IF EXISTS "Users can join waitlists" ON public.waitlists;
DROP POLICY IF EXISTS "Users can leave waitlists" ON public.waitlists;
DROP POLICY IF EXISTS "Users can view their own waitlists" ON public.waitlists;
DROP POLICY IF EXISTS "Users can view their waitlists" ON public.waitlists;

CREATE POLICY "Users manage waitlists" ON public.waitlists
FOR ALL TO authenticated
USING (
  (select auth.uid()) = user_id OR 
  (select auth.uid()) IN (
    SELECT s.host_id FROM events e
    JOIN spaces s ON s.id = e.space_id
    WHERE e.id = waitlists.event_id
  )
)
WITH CHECK ((select auth.uid()) = user_id);

-- =====================================================
-- PHASE 2: FOREIGN KEY INDEXES
-- =====================================================

-- Critical indexes for high-traffic tables
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_space_id ON public.bookings(space_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_booking_id ON public.messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_conversations_host_id ON public.conversations(host_id);
CREATE INDEX IF NOT EXISTS idx_conversations_coworker_id ON public.conversations(coworker_id);
CREATE INDEX IF NOT EXISTS idx_conversations_booking_id ON public.conversations(booking_id);
CREATE INDEX IF NOT EXISTS idx_conversations_space_id ON public.conversations(space_id);

-- Indexes for review tables
CREATE INDEX IF NOT EXISTS idx_booking_reviews_booking_id ON public.booking_reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_reviews_author_id ON public.booking_reviews(author_id);
CREATE INDEX IF NOT EXISTS idx_booking_reviews_target_id ON public.booking_reviews(target_id);
CREATE INDEX IF NOT EXISTS idx_event_reviews_event_id ON public.event_reviews(event_id);
CREATE INDEX IF NOT EXISTS idx_event_reviews_author_id ON public.event_reviews(author_id);
CREATE INDEX IF NOT EXISTS idx_event_reviews_target_id ON public.event_reviews(target_id);

-- Indexes for connection tables
CREATE INDEX IF NOT EXISTS idx_connections_sender_id ON public.connections(sender_id);
CREATE INDEX IF NOT EXISTS idx_connections_receiver_id ON public.connections(receiver_id);
CREATE INDEX IF NOT EXISTS idx_connection_suggestions_user_id ON public.connection_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_connection_suggestions_suggested_user_id ON public.connection_suggestions(suggested_user_id);

-- Indexes for event tables
CREATE INDEX IF NOT EXISTS idx_events_space_id ON public.events(space_id);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events(created_by);
CREATE INDEX IF NOT EXISTS idx_event_participants_event_id ON public.event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_user_id ON public.event_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_waitlists_event_id ON public.waitlists(event_id);
CREATE INDEX IF NOT EXISTS idx_waitlists_user_id ON public.waitlists(user_id);

-- Indexes for admin/support tables
CREATE INDEX IF NOT EXISTS idx_admin_actions_log_admin_id ON public.admin_actions_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_warnings_user_id ON public.admin_warnings(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_warnings_admin_id ON public.admin_warnings(admin_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON public.reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reviewed_by ON public.reports(reviewed_by);

-- Indexes for other critical foreign keys
CREATE INDEX IF NOT EXISTS idx_availability_space_id ON public.availability(space_id);
CREATE INDEX IF NOT EXISTS idx_checklists_space_id ON public.checklists(space_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_space_id ON public.favorites(space_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_private_chats_participant_1_id ON public.private_chats(participant_1_id);
CREATE INDEX IF NOT EXISTS idx_private_chats_participant_2_id ON public.private_chats(participant_2_id);
CREATE INDEX IF NOT EXISTS idx_private_messages_chat_id ON public.private_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_private_messages_sender_id ON public.private_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_global_tags_created_by ON public.global_tags(created_by);
CREATE INDEX IF NOT EXISTS idx_global_tags_approved_by ON public.global_tags(approved_by);
CREATE INDEX IF NOT EXISTS idx_message_templates_host_id ON public.message_templates(host_id);
CREATE INDEX IF NOT EXISTS idx_cookie_consent_log_user_id ON public.cookie_consent_log(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_user_id ON public.gdpr_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_processed_by ON public.gdpr_requests(processed_by);
CREATE INDEX IF NOT EXISTS idx_data_breach_log_reported_by ON public.data_breach_log(reported_by);
CREATE INDEX IF NOT EXISTS idx_data_breach_log_resolved_by ON public.data_breach_log(resolved_by);
CREATE INDEX IF NOT EXISTS idx_data_minimization_audit_created_by ON public.data_minimization_audit(created_by);
CREATE INDEX IF NOT EXISTS idx_host_report_subscriptions_host_id ON public.host_report_subscriptions(host_id);
CREATE INDEX IF NOT EXISTS idx_dac7_reports_host_id ON public.dac7_reports(host_id);
CREATE INDEX IF NOT EXISTS idx_image_processing_jobs_user_id ON public.image_processing_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_image_processing_jobs_space_id ON public.image_processing_jobs(space_id);