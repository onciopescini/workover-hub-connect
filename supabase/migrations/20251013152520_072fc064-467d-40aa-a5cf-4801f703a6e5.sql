-- Step 6.2: Create rate_limit_log table for advanced server-side rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  action TEXT NOT NULL,
  attempt_count INTEGER DEFAULT 1,
  blocked_until TIMESTAMPTZ,
  window_start TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_rate_limit_identifier ON public.rate_limit_log(identifier, action);
CREATE INDEX IF NOT EXISTS idx_rate_limit_window ON public.rate_limit_log(window_start);

-- Enable RLS
ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all rate limit logs
CREATE POLICY "Admins view rate limits"
ON public.rate_limit_log
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Policy: System can insert rate limit logs
CREATE POLICY "System insert rate limits"
ON public.rate_limit_log
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Step 6.3: Enhance audit logging with additional fields
ALTER TABLE public.admin_actions_log 
ADD COLUMN IF NOT EXISTS ip_address INET,
ADD COLUMN IF NOT EXISTS user_agent TEXT,
ADD COLUMN IF NOT EXISTS session_id TEXT,
ADD COLUMN IF NOT EXISTS geo_location JSONB;

-- Create failed_login_attempts table
CREATE TABLE IF NOT EXISTS public.failed_login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  attempt_time TIMESTAMPTZ DEFAULT now(),
  reason TEXT,
  session_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_failed_login_email ON public.failed_login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_failed_login_time ON public.failed_login_attempts(attempt_time);

-- Enable RLS
ALTER TABLE public.failed_login_attempts ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view failed login attempts
CREATE POLICY "Admins view failed logins"
ON public.failed_login_attempts
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Policy: System can insert failed login attempts
CREATE POLICY "System insert failed logins"
ON public.failed_login_attempts
FOR INSERT
WITH CHECK (true);

-- Automatic cleanup function (90 days for audit logs, 30 days for failed logins)
CREATE OR REPLACE FUNCTION public.cleanup_old_audit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.admin_actions_log WHERE created_at < now() - interval '90 days';
  DELETE FROM public.failed_login_attempts WHERE attempt_time < now() - interval '30 days';
  DELETE FROM public.rate_limit_log WHERE created_at < now() - interval '7 days';
END;
$$;

-- Create active_sessions table for monitoring
CREATE TABLE IF NOT EXISTS public.active_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_token TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  last_activity TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_active_sessions_user ON public.active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_token ON public.active_sessions(session_token);

-- Enable RLS
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own sessions
CREATE POLICY "Users view own sessions"
ON public.active_sessions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Admins can view all sessions
CREATE POLICY "Admins view all sessions"
ON public.active_sessions
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Policy: System can manage sessions
CREATE POLICY "System manage sessions"
ON public.active_sessions
FOR ALL
TO authenticated
WITH CHECK (true);

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.active_sessions WHERE expires_at < now();
END;
$$;