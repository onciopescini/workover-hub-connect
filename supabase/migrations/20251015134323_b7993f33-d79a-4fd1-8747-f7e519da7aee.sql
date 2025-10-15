-- Fix 3.3: Rate Limiting Avanzato (Multi-Endpoint)
-- Migliora la funzione check_rate_limit esistente per supportare configurazioni avanzate

CREATE OR REPLACE FUNCTION public.check_rate_limit_advanced(
  p_identifier text,
  p_action text,
  p_max_requests integer,
  p_window_ms bigint
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_count integer := 0;
  window_start timestamptz;
  reset_time timestamptz;
  result json;
BEGIN
  -- Calculate window start time
  window_start := NOW() - (p_window_ms || ' milliseconds')::interval;
  
  -- Count requests in current window
  SELECT COUNT(*) INTO current_count
  FROM public.rate_limit_log
  WHERE identifier = p_identifier
    AND action = p_action
    AND created_at > window_start;
  
  -- Calculate reset time (end of current window)
  reset_time := window_start + (p_window_ms || ' milliseconds')::interval;
  
  -- Insert new log entry if allowed
  IF current_count < p_max_requests THEN
    INSERT INTO public.rate_limit_log (identifier, action, metadata)
    VALUES (p_identifier, p_action, jsonb_build_object(
      'max_requests', p_max_requests,
      'window_ms', p_window_ms
    ));
    
    result := json_build_object(
      'allowed', true,
      'remaining', p_max_requests - current_count - 1,
      'reset_ms', EXTRACT(EPOCH FROM (reset_time - NOW())) * 1000,
      'message', 'Request allowed'
    );
  ELSE
    result := json_build_object(
      'allowed', false,
      'remaining', 0,
      'reset_ms', EXTRACT(EPOCH FROM (reset_time - NOW())) * 1000,
      'message', 'Rate limit exceeded'
    );
  END IF;
  
  RETURN result;
END;
$$;

-- Fix 3.4: Database Connection Pooling Monitoring

CREATE TABLE IF NOT EXISTS public.db_connection_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  total_connections INTEGER NOT NULL,
  active_connections INTEGER NOT NULL,
  idle_connections INTEGER NOT NULL,
  waiting_connections INTEGER NOT NULL,
  max_connections INTEGER NOT NULL,
  usage_percentage NUMERIC(5,2) GENERATED ALWAYS AS (
    ROUND((total_connections::numeric / NULLIF(max_connections, 0)::numeric * 100), 2)
  ) STORED,
  sampled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_connection_stats_sampled ON public.db_connection_stats(sampled_at DESC);

ALTER TABLE public.db_connection_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view connection stats"
ON public.db_connection_stats
FOR SELECT
USING (is_admin(auth.uid()));

-- Add migration to payments table for idempotency
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS stripe_idempotency_key TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_payments_idempotency 
ON public.payments(stripe_idempotency_key) 
WHERE stripe_idempotency_key IS NOT NULL;