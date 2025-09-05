-- Fix security linter warnings - set proper search paths

-- Fix search path for functions
ALTER FUNCTION public.can_access_profile_field(uuid, text) 
SET search_path = public;

ALTER FUNCTION public.log_sensitive_data_access(uuid, text, text[], text) 
SET search_path = public;

ALTER FUNCTION public.check_rate_limit(text, text, integer, integer) 
SET search_path = public;