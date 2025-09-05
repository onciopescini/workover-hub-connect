-- Fix remaining functions without proper search_path settings
-- Get list of functions that might need search_path fixes

-- Fix any remaining functions that don't have search_path set
CREATE OR REPLACE FUNCTION public.calculate_cancellation_fee(booking_date_param date, price_per_day_param numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  days_until_booking INTEGER;
  cancellation_fee NUMERIC := 0;
BEGIN
  -- Calculate days between today and booking date
  days_until_booking := booking_date_param - CURRENT_DATE;
  
  -- Apply cancellation fee based on timing
  IF days_until_booking < 1 THEN
    -- Same day or past: 100% fee
    cancellation_fee := price_per_day_param;
  ELSIF days_until_booking < 3 THEN
    -- Less than 3 days: 50% fee
    cancellation_fee := price_per_day_param * 0.5;
  ELSIF days_until_booking < 7 THEN
    -- Less than 7 days: 25% fee
    cancellation_fee := price_per_day_param * 0.25;
  ELSE
    -- 7+ days: No fee
    cancellation_fee := 0;
  END IF;
  
  RETURN cancellation_fee;
END;
$$;

-- Update other functions that might be missing search_path
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_identifier text, p_action text, p_max_attempts integer DEFAULT 5, p_window_minutes integer DEFAULT 60)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_attempts INTEGER := 0;
  window_start TIMESTAMP WITH TIME ZONE;
  is_blocked BOOLEAN := false;
BEGIN
  -- Calculate window start time
  window_start := NOW() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Count attempts in current window
  SELECT COUNT(*) INTO current_attempts
  FROM public.rate_limits
  WHERE identifier = p_identifier
    AND action = p_action
    AND window_start >= window_start;
  
  -- Check if blocked
  SELECT EXISTS(
    SELECT 1 FROM public.rate_limits
    WHERE identifier = p_identifier
      AND action = p_action
      AND blocked_until > NOW()
  ) INTO is_blocked;
  
  -- If already blocked, return blocked status
  IF is_blocked THEN
    RETURN json_build_object(
      'allowed', false,
      'remaining', 0,
      'resetTime', (SELECT blocked_until FROM public.rate_limits WHERE identifier = p_identifier AND action = p_action AND blocked_until > NOW() LIMIT 1),
      'message', 'Rate limit exceeded. Try again later.'
    );
  END IF;
  
  -- If under limit, increment counter
  IF current_attempts < p_max_attempts THEN
    INSERT INTO public.rate_limits (identifier, action, attempt_count, window_start)
    VALUES (p_identifier, p_action, 1, NOW())
    ON CONFLICT (identifier, action) 
    DO UPDATE SET 
      attempt_count = rate_limits.attempt_count + 1,
      window_start = CASE 
        WHEN rate_limits.window_start < window_start THEN NOW()
        ELSE rate_limits.window_start
      END;
    
    RETURN json_build_object(
      'allowed', true,
      'remaining', p_max_attempts - current_attempts - 1,
      'resetTime', window_start + (p_window_minutes || ' minutes')::INTERVAL
    );
  ELSE
    -- Block for window duration
    UPDATE public.rate_limits
    SET blocked_until = NOW() + (p_window_minutes || ' minutes')::INTERVAL
    WHERE identifier = p_identifier AND action = p_action;
    
    RETURN json_build_object(
      'allowed', false,
      'remaining', 0,
      'resetTime', NOW() + (p_window_minutes || ' minutes')::INTERVAL,
      'message', 'Rate limit exceeded. Try again later.'
    );
  END IF;
END;
$$;

-- Update log_sensitive_data_access function
CREATE OR REPLACE FUNCTION public.log_sensitive_data_access(
  p_accessed_user_id uuid,
  p_table_name text,
  p_column_names text[],
  p_access_type text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.data_access_logs (
    user_id,
    accessed_user_id,
    table_name,
    column_names,
    access_type,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    p_accessed_user_id,
    p_table_name,
    p_column_names,
    p_access_type,
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );
END;
$$;