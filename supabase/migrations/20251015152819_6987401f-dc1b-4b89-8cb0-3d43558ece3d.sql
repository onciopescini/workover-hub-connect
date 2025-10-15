-- Fix search_path for new functions (security linter warning)
ALTER FUNCTION public.increment_webhook_retry(uuid) SET search_path = public;
ALTER FUNCTION public.lock_and_select_expired_bookings(integer) SET search_path = public;
ALTER FUNCTION public.lock_and_select_reminder_bookings(integer) SET search_path = public;
ALTER FUNCTION public.unlock_bookings(uuid[]) SET search_path = public;