-- Fix Functions Without Fixed search_path (Security Issue)
-- This migration adds SET search_path to all SECURITY DEFINER functions
-- to prevent function hijacking attacks

-- Functions that need search_path fixes
ALTER FUNCTION public.update_tax_details_updated_at() SET search_path = 'public';
ALTER FUNCTION public.update_kyc_documents_updated_at() SET search_path = 'public';
ALTER FUNCTION public.sync_space_location() SET search_path = 'public';
ALTER FUNCTION public.check_mutual_review_visibility() SET search_path = 'public';
ALTER FUNCTION public.create_connection_notification() SET search_path = 'public';
ALTER FUNCTION public.create_message_notification() SET search_path = 'public';
ALTER FUNCTION public.create_review_notification() SET search_path = 'public';
ALTER FUNCTION public.create_ticket_notification() SET search_path = 'public';
ALTER FUNCTION public.enforce_booking_review_edit_window() SET search_path = 'public';

-- Verify all critical SECURITY DEFINER functions have proper search_path
-- (Most already have it, but this ensures consistency)
ALTER FUNCTION public.cleanup_old_audit_logs() SET search_path = 'public';
ALTER FUNCTION public.cleanup_expired_sessions() SET search_path = 'public';
ALTER FUNCTION public.validate_space_publish_stripe() SET search_path = 'public';
ALTER FUNCTION public.validate_booking_host_stripe() SET search_path = 'public';
ALTER FUNCTION public.validate_space_email_verified() SET search_path = 'public', 'auth';
ALTER FUNCTION public.validate_booking_email_verified() SET search_path = 'public', 'auth';
ALTER FUNCTION public.check_dac7_threshold() SET search_path = 'public';
ALTER FUNCTION public.validate_booking_payment() SET search_path = 'public';

-- Edge Functions and RPC endpoints
ALTER FUNCTION public.get_hosts_for_dac7_report(integer, uuid[]) SET search_path = 'public';
ALTER FUNCTION public.get_public_profile_safe(uuid) SET search_path = 'public';
ALTER FUNCTION public.get_space_availability_optimized(uuid, text, text) SET search_path = 'public';
ALTER FUNCTION public.log_admin_access(text, uuid, text, inet, text, jsonb) SET search_path = 'public';
ALTER FUNCTION public.review_space_revision(uuid, uuid, boolean, text) SET search_path = 'public';
ALTER FUNCTION public.approve_tag(uuid, uuid) SET search_path = 'public';
ALTER FUNCTION public.create_image_processing_job(uuid, text, integer) SET search_path = 'public';
ALTER FUNCTION public.assign_moderator_role(uuid, uuid) SET search_path = 'public';
ALTER FUNCTION public.calculate_cancellation_fee(date, numeric, text, text) SET search_path = 'public';
ALTER FUNCTION public.calculate_dac7_thresholds(uuid, integer) SET search_path = 'public';
ALTER FUNCTION public.calculate_weighted_space_rating(uuid) SET search_path = 'public';
ALTER FUNCTION public.check_payment_integrity() SET search_path = 'public';
ALTER FUNCTION public.cancel_booking(uuid, boolean, text) SET search_path = 'public';
ALTER FUNCTION public.check_profile_access(uuid, uuid) SET search_path = 'public';
ALTER FUNCTION public.check_rate_limit(text, text) SET search_path = 'public';
ALTER FUNCTION public.cleanup_expired_cache() SET search_path = 'public';
ALTER FUNCTION public.cleanup_expired_slots() SET search_path = 'public';
ALTER FUNCTION public.cleanup_inactive_data() SET search_path = 'public';
ALTER FUNCTION public.detect_data_breach(text, integer, text[], text, boolean) SET search_path = 'public';
ALTER FUNCTION public.export_user_data(uuid) SET search_path = 'public';
ALTER FUNCTION public.generate_connection_suggestions() SET search_path = 'public';
ALTER FUNCTION public.get_aggregated_metrics(text, integer) SET search_path = 'public';
ALTER FUNCTION public.cleanup_expired_gdpr_exports() SET search_path = 'public';
ALTER FUNCTION public.expire_pending_connections() SET search_path = 'public';

-- Stable functions (read-only) also need search_path for security
ALTER FUNCTION public.can_moderate_content(uuid) SET search_path = 'public';