-- Fix security warning: set search_path for admin access logging function
CREATE OR REPLACE FUNCTION public.log_admin_access(
  p_table_name text,
  p_record_id uuid,
  p_action text,
  p_ip_address inet DEFAULT NULL,
  p_user_agent text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  log_id uuid;
BEGIN
  -- Only allow admins to call this function
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  -- Insert audit log
  INSERT INTO public.admin_access_logs (
    table_name,
    record_id,
    admin_id,
    action,
    ip_address,
    user_agent,
    metadata
  ) VALUES (
    p_table_name,
    p_record_id,
    auth.uid(),
    p_action,
    p_ip_address,
    p_user_agent,
    p_metadata
  ) RETURNING id INTO log_id;

  RETURN log_id;
END;
$$;