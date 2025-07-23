-- Create admin access logs table for GDPR compliance
CREATE TABLE public.admin_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  admin_id uuid NOT NULL,
  accessed_at timestamptz DEFAULT now(),
  action text NOT NULL,
  ip_address inet,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS on admin access logs
ALTER TABLE public.admin_access_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for admin access logs
CREATE POLICY "Only admins can view admin access logs" ON public.admin_access_logs
FOR SELECT USING (is_admin(auth.uid()));

CREATE POLICY "Only admins can insert admin access logs" ON public.admin_access_logs
FOR INSERT WITH CHECK (is_admin(auth.uid()));

-- Create index for performance
CREATE INDEX idx_admin_access_logs_table_record ON public.admin_access_logs(table_name, record_id);
CREATE INDEX idx_admin_access_logs_admin_accessed ON public.admin_access_logs(admin_id, accessed_at);

-- Create function to log admin access (to be called from edge functions)
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