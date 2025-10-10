-- Migration: Fix Function Search Path Security
-- Add SET search_path = public to all functions to prevent SQL injection via schema manipulation

-- Core role and permission functions
ALTER FUNCTION public.has_role(_user_id uuid, _role app_role) SET search_path = public;
ALTER FUNCTION public.is_admin(user_id uuid) SET search_path = public;
ALTER FUNCTION public.is_moderator(user_id uuid) SET search_path = public;
ALTER FUNCTION public.can_moderate_content(user_id uuid) SET search_path = public;

-- Admin action functions
ALTER FUNCTION public.approve_tag(tag_id uuid, approver_id uuid) SET search_path = public;
ALTER FUNCTION public.suspend_user(target_user_id uuid, reason text, suspended_by_admin uuid) SET search_path = public;
ALTER FUNCTION public.reactivate_user(target_user_id uuid, reactivated_by_admin uuid) SET search_path = public;
ALTER FUNCTION public.moderate_space(space_id uuid, approve boolean, moderator_id uuid, rejection_reason text) SET search_path = public;
ALTER FUNCTION public.suspend_space_with_bookings(space_id uuid, admin_id uuid, suspension_reason text) SET search_path = public;
ALTER FUNCTION public.review_report(report_id uuid, new_status text, admin_notes text) SET search_path = public;
ALTER FUNCTION public.request_space_revision(space_id uuid, host_id uuid, revision_notes text) SET search_path = public;
ALTER FUNCTION public.review_space_revision(space_id uuid, admin_id uuid, approved boolean, admin_notes text) SET search_path = public;

-- GDPR and data management functions
ALTER FUNCTION public.export_user_data(target_user_id uuid) SET search_path = public;
ALTER FUNCTION public.request_data_deletion(target_user_id uuid, deletion_reason text) SET search_path = public;
ALTER FUNCTION public.process_data_rectification(request_id uuid, approved boolean, admin_notes text, corrections_applied jsonb) SET search_path = public;
ALTER FUNCTION public.detect_data_breach(breach_nature text, affected_count integer, affected_data_types text[], breach_severity text, manual_report boolean) SET search_path = public;
ALTER FUNCTION public.cleanup_inactive_data() SET search_path = public;
ALTER FUNCTION public.run_data_minimization_audit() SET search_path = public;
ALTER FUNCTION public.cleanup_expired_gdpr_exports() SET search_path = public;
ALTER FUNCTION public.log_sensitive_data_access(p_accessed_user_id uuid, p_table_name text, p_column_names text[], p_access_type text) SET search_path = public;

-- Business logic functions
ALTER FUNCTION public.calculate_dac7_thresholds(host_id_param uuid, year_param integer) SET search_path = public;
ALTER FUNCTION public.validate_and_reserve_slot(space_id_param uuid, date_param date, start_time_param time, end_time_param time, user_id_param uuid, guests_count_param integer, confirmation_type_param text) SET search_path = public;
ALTER FUNCTION public.check_profile_access(viewer_id uuid, profile_id uuid) SET search_path = public;
ALTER FUNCTION public.refresh_user_suggestions(p_user_id uuid) SET search_path = public;
ALTER FUNCTION public.get_space_availability_optimized(space_id_param uuid, start_date_param text, end_date_param text) SET search_path = public;
ALTER FUNCTION public.check_rate_limit(p_identifier text, p_action text) SET search_path = public;

-- Cache and cleanup functions
ALTER FUNCTION public.cleanup_expired_cache() SET search_path = public;
ALTER FUNCTION public.get_aggregated_metrics(metric_type_param text, time_window_hours integer) SET search_path = public;

-- Trigger functions
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.create_connection_notification() SET search_path = public;
ALTER FUNCTION public.update_modified_column() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.validate_booking_review_insert() SET search_path = public;
ALTER FUNCTION public.update_checklist_updated_at() SET search_path = public;
ALTER FUNCTION public.notify_host_new_booking() SET search_path = public;