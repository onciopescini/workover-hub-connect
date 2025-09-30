-- Fase 3A: Tabelle per Scalability

-- 1. Tabella availability_cache per sostituire sessionStorage
CREATE TABLE IF NOT EXISTS public.availability_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id uuid REFERENCES public.spaces(id) ON DELETE CASCADE,
  cache_key text NOT NULL UNIQUE,
  data jsonb NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Indice per cleanup automatico cache scaduta
CREATE INDEX idx_availability_cache_expires ON public.availability_cache(expires_at);
CREATE INDEX idx_availability_cache_space ON public.availability_cache(space_id);

-- RLS per availability_cache
ALTER TABLE public.availability_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read cache"
ON public.availability_cache
FOR SELECT
TO public
USING (expires_at > now());

CREATE POLICY "System insert cache"
ON public.availability_cache
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "System update cache"
ON public.availability_cache
FOR UPDATE
TO authenticated
USING (true);

-- 2. Tabella performance_metrics per metriche centralizzate
CREATE TABLE IF NOT EXISTS public.performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  metric_type text NOT NULL,
  metric_value numeric NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now()
);

-- Indici per query performance
CREATE INDEX idx_performance_metrics_user ON public.performance_metrics(user_id);
CREATE INDEX idx_performance_metrics_type ON public.performance_metrics(metric_type);
CREATE INDEX idx_performance_metrics_created ON public.performance_metrics(created_at DESC);

-- RLS per performance_metrics
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own metrics"
ON public.performance_metrics
FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR is_admin(auth.uid()));

CREATE POLICY "Users insert own metrics"
ON public.performance_metrics
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins manage all metrics"
ON public.performance_metrics
FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

-- 3. Tabella user_session_state per sostituire localStorage
CREATE TABLE IF NOT EXISTS public.user_session_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_key text NOT NULL,
  session_data jsonb NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, session_key)
);

-- Indici per performance
CREATE INDEX idx_user_session_state_user ON public.user_session_state(user_id);
CREATE INDEX idx_user_session_state_expires ON public.user_session_state(expires_at);

-- Trigger per updated_at
CREATE TRIGGER update_user_session_state_updated_at
BEFORE UPDATE ON public.user_session_state
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- RLS per user_session_state
ALTER TABLE public.user_session_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own session"
ON public.user_session_state
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 4. Funzione per cleanup automatico cache scaduta
CREATE OR REPLACE FUNCTION public.cleanup_expired_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cleanup availability_cache
  DELETE FROM public.availability_cache
  WHERE expires_at < now();
  
  -- Cleanup user_session_state
  DELETE FROM public.user_session_state
  WHERE expires_at < now();
END;
$$;

-- 5. Funzione per aggregare metriche performance
CREATE OR REPLACE FUNCTION public.get_aggregated_metrics(
  metric_type_param text,
  time_window_hours integer DEFAULT 24
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'metric_type', metric_type_param,
    'avg_value', ROUND(AVG(metric_value), 2),
    'p50_value', PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY metric_value),
    'p95_value', PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY metric_value),
    'p99_value', PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY metric_value),
    'max_value', MAX(metric_value),
    'min_value', MIN(metric_value),
    'sample_count', COUNT(*),
    'time_window_hours', time_window_hours
  )
  INTO result
  FROM public.performance_metrics
  WHERE metric_type = metric_type_param
    AND created_at > now() - (time_window_hours || ' hours')::interval;
  
  RETURN result;
END;
$$;