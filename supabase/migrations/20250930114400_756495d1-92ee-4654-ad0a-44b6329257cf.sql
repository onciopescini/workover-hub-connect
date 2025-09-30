-- =====================================================
-- PERFORMANCE OPTIMIZATION - PART 2: FOREIGN KEY INDEXES
-- Add indexes for 56 unindexed foreign keys
-- =====================================================

-- Critical indexes for high-traffic tables (bookings, payments, messages)
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_space_id ON public.bookings(space_id);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON public.payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_booking_id ON public.messages(booking_id);

-- Conversation indexes
CREATE INDEX IF NOT EXISTS idx_conversations_host_id ON public.conversations(host_id);
CREATE INDEX IF NOT EXISTS idx_conversations_coworker_id ON public.conversations(coworker_id);
CREATE INDEX IF NOT EXISTS idx_conversations_booking_id ON public.conversations(booking_id);
CREATE INDEX IF NOT EXISTS idx_conversations_space_id ON public.conversations(space_id);

-- Review table indexes
CREATE INDEX IF NOT EXISTS idx_booking_reviews_booking_id ON public.booking_reviews(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_reviews_author_id ON public.booking_reviews(author_id);
CREATE INDEX IF NOT EXISTS idx_booking_reviews_target_id ON public.booking_reviews(target_id);
CREATE INDEX IF NOT EXISTS idx_event_reviews_event_id ON public.event_reviews(event_id);
CREATE INDEX IF NOT EXISTS idx_event_reviews_author_id ON public.event_reviews(author_id);
CREATE INDEX IF NOT EXISTS idx_event_reviews_target_id ON public.event_reviews(target_id);

-- Connection table indexes
CREATE INDEX IF NOT EXISTS idx_connections_sender_id ON public.connections(sender_id);
CREATE INDEX IF NOT EXISTS idx_connections_receiver_id ON public.connections(receiver_id);
CREATE INDEX IF NOT EXISTS idx_connection_suggestions_user_id ON public.connection_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_connection_suggestions_suggested_user_id ON public.connection_suggestions(suggested_user_id);

-- Event table indexes
CREATE INDEX IF NOT EXISTS idx_events_space_id ON public.events(space_id);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events(created_by);
CREATE INDEX IF NOT EXISTS idx_event_participants_event_id ON public.event_participants(event_id);
CREATE INDEX IF NOT EXISTS idx_event_participants_user_id ON public.event_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_waitlists_event_id ON public.waitlists(event_id);
CREATE INDEX IF NOT EXISTS idx_waitlists_user_id ON public.waitlists(user_id);

-- Admin and support table indexes
CREATE INDEX IF NOT EXISTS idx_admin_actions_log_admin_id ON public.admin_actions_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_warnings_user_id ON public.admin_warnings(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_warnings_admin_id ON public.admin_warnings(admin_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON public.reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reviewed_by ON public.reports(reviewed_by);

-- Space-related table indexes
CREATE INDEX IF NOT EXISTS idx_availability_space_id ON public.availability(space_id);
CREATE INDEX IF NOT EXISTS idx_checklists_space_id ON public.checklists(space_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_space_id ON public.favorites(space_id);

-- Notification indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON public.user_notifications(user_id);

-- Private messaging indexes
CREATE INDEX IF NOT EXISTS idx_private_chats_participant_1_id ON public.private_chats(participant_1_id);
CREATE INDEX IF NOT EXISTS idx_private_chats_participant_2_id ON public.private_chats(participant_2_id);
CREATE INDEX IF NOT EXISTS idx_private_messages_chat_id ON public.private_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_private_messages_sender_id ON public.private_messages(sender_id);

-- Tag and template indexes
CREATE INDEX IF NOT EXISTS idx_global_tags_created_by ON public.global_tags(created_by);
CREATE INDEX IF NOT EXISTS idx_global_tags_approved_by ON public.global_tags(approved_by);
CREATE INDEX IF NOT EXISTS idx_message_templates_host_id ON public.message_templates(host_id);

-- GDPR and compliance indexes
CREATE INDEX IF NOT EXISTS idx_cookie_consent_log_user_id ON public.cookie_consent_log(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_user_id ON public.gdpr_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_processed_by ON public.gdpr_requests(processed_by);
CREATE INDEX IF NOT EXISTS idx_data_breach_log_reported_by ON public.data_breach_log(reported_by);
CREATE INDEX IF NOT EXISTS idx_data_breach_log_resolved_by ON public.data_breach_log(resolved_by);
CREATE INDEX IF NOT EXISTS idx_data_minimization_audit_created_by ON public.data_minimization_audit(created_by);

-- Host and financial indexes
CREATE INDEX IF NOT EXISTS idx_host_report_subscriptions_host_id ON public.host_report_subscriptions(host_id);
CREATE INDEX IF NOT EXISTS idx_dac7_reports_host_id ON public.dac7_reports(host_id);

-- Image processing indexes
CREATE INDEX IF NOT EXISTS idx_image_processing_jobs_user_id ON public.image_processing_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_image_processing_jobs_space_id ON public.image_processing_jobs(space_id);