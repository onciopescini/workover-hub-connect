-- Fix policy conflicts and continue security hardening

-- Drop conflicting policies first
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create the corrected policy
CREATE POLICY "Users can update own profile only" ON public.profiles  
FOR UPDATE USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Create audit logging table for sensitive data access
CREATE TABLE IF NOT EXISTS public.data_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  accessed_user_id uuid,
  table_name text NOT NULL,
  column_names text[],
  access_type text NOT NULL, -- 'read', 'write', 'delete'
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on audit logs
ALTER TABLE public.data_access_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view data access logs" ON public.data_access_logs
FOR SELECT USING (is_admin(auth.uid()));

-- Auto-insert logs for sensitive data access
CREATE POLICY "Auto-log data access" ON public.data_access_logs
FOR INSERT WITH CHECK (true);

-- Create function to log sensitive data access
CREATE OR REPLACE FUNCTION public.log_sensitive_data_access(
  p_accessed_user_id uuid,
  p_table_name text,
  p_column_names text[],
  p_access_type text
) RETURNS void AS $$
BEGIN
  INSERT INTO public.data_access_logs (
    user_id, accessed_user_id, table_name, column_names, access_type
  ) VALUES (
    auth.uid(), p_accessed_user_id, p_table_name, p_column_names, p_access_type
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create database-backed rate limiting table
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier text NOT NULL, -- IP or email
  action text NOT NULL,
  attempt_count integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  blocked_until timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(identifier, action)
);

-- Enable RLS on rate limits
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow system to manage rate limits
CREATE POLICY "System can manage rate limits" ON public.rate_limits
FOR ALL USING (true);

-- Create function for persistent rate limiting
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier text,
  p_action text,
  p_max_attempts integer DEFAULT 5,
  p_window_minutes integer DEFAULT 15
) RETURNS json AS $$
DECLARE
  current_limit record;
  window_start_threshold timestamp with time zone;
  is_blocked boolean := false;
  attempts_remaining integer;
BEGIN
  window_start_threshold := now() - interval '1 minute' * p_window_minutes;
  
  -- Get or create rate limit record
  SELECT * INTO current_limit 
  FROM public.rate_limits 
  WHERE identifier = p_identifier AND action = p_action;
  
  IF current_limit IS NULL THEN
    -- First attempt
    INSERT INTO public.rate_limits (identifier, action, attempt_count, window_start)
    VALUES (p_identifier, p_action, 1, now());
    
    RETURN json_build_object(
      'allowed', true,
      'attempts_remaining', p_max_attempts - 1,
      'reset_time', now() + interval '1 minute' * p_window_minutes
    );
  END IF;
  
  -- Check if we're still in a block period
  IF current_limit.blocked_until IS NOT NULL AND current_limit.blocked_until > now() THEN
    RETURN json_build_object(
      'allowed', false,
      'attempts_remaining', 0,
      'reset_time', current_limit.blocked_until,
      'message', 'Rate limit exceeded. Try again later.'
    );
  END IF;
  
  -- Check if window has expired
  IF current_limit.window_start < window_start_threshold THEN
    -- Reset window
    UPDATE public.rate_limits 
    SET attempt_count = 1, window_start = now(), blocked_until = NULL
    WHERE identifier = p_identifier AND action = p_action;
    
    RETURN json_build_object(
      'allowed', true,
      'attempts_remaining', p_max_attempts - 1,
      'reset_time', now() + interval '1 minute' * p_window_minutes
    );
  END IF;
  
  -- Increment attempt count
  UPDATE public.rate_limits 
  SET attempt_count = attempt_count + 1, updated_at = now()
  WHERE identifier = p_identifier AND action = p_action;
  
  attempts_remaining := p_max_attempts - (current_limit.attempt_count + 1);
  
  -- Check if limit exceeded
  IF (current_limit.attempt_count + 1) >= p_max_attempts THEN
    -- Block for escalating time based on attempts
    UPDATE public.rate_limits 
    SET blocked_until = now() + interval '1 minute' * (p_window_minutes * 2)
    WHERE identifier = p_identifier AND action = p_action;
    
    RETURN json_build_object(
      'allowed', false,
      'attempts_remaining', 0,
      'reset_time', now() + interval '1 minute' * (p_window_minutes * 2),
      'message', 'Rate limit exceeded. Account temporarily blocked.'
    );
  END IF;
  
  RETURN json_build_object(
    'allowed', true,
    'attempts_remaining', attempts_remaining,
    'reset_time', current_limit.window_start + interval '1 minute' * p_window_minutes
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;