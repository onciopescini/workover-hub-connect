-- ============================================
-- APPLICATION LOGS TABLE FOR SRE LOGGER
-- Purpose: Store frontend application logs and metrics
-- ============================================

CREATE TABLE IF NOT EXISTS application_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  session_id TEXT,
  log_level TEXT NOT NULL CHECK (log_level IN ('DEBUG', 'INFO', 'WARN', 'ERROR', 'SUCCESS')),
  component TEXT NOT NULL,
  message TEXT NOT NULL,
  context JSONB DEFAULT '{}',
  metrics JSONB DEFAULT '{}',
  user_agent TEXT,
  url TEXT,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast querying
CREATE INDEX IF NOT EXISTS idx_application_logs_created ON application_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_application_logs_level ON application_logs(log_level);
CREATE INDEX IF NOT EXISTS idx_application_logs_component ON application_logs(component);
CREATE INDEX IF NOT EXISTS idx_application_logs_user ON application_logs(user_id);

-- Enable RLS
ALTER TABLE application_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins view all logs"
  ON application_logs FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "System can insert logs"
  ON application_logs FOR INSERT
  WITH CHECK (true);

-- Auto-cleanup old logs (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_application_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM application_logs
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup (if pg_cron is available)
-- SELECT cron.schedule('cleanup-app-logs', '0 3 * * *', 'SELECT cleanup_old_application_logs()');

COMMENT ON TABLE application_logs IS 'Frontend application logs and metrics from SRE logger';
COMMENT ON COLUMN application_logs.log_level IS 'Log severity: DEBUG, INFO, WARN, ERROR, SUCCESS';
COMMENT ON COLUMN application_logs.context IS 'Additional context data as JSON';
COMMENT ON COLUMN application_logs.metrics IS 'Performance metrics as JSON';