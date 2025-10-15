-- =====================================================
-- CRON HEALTH MONITORING RPCs
-- =====================================================
-- Functions to query cron.job and cron.job_run_details
-- for admin dashboard monitoring
-- =====================================================

-- Function to get all cron jobs (requires admin)
CREATE OR REPLACE FUNCTION public.get_cron_jobs()
RETURNS TABLE (
  jobid bigint,
  schedule text,
  command text,
  nodename text,
  nodeport integer,
  database text,
  username text,
  active boolean,
  jobname text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
BEGIN
  -- Only admins can view cron jobs
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    j.jobid,
    j.schedule,
    j.command,
    j.nodename,
    j.nodeport,
    j.database,
    j.username,
    j.active,
    j.jobname
  FROM cron.job j
  ORDER BY j.jobname;
END;
$$;

-- Function to get recent cron job runs (requires admin)
CREATE OR REPLACE FUNCTION public.get_cron_job_runs(limit_count integer DEFAULT 50)
RETURNS TABLE (
  jobid bigint,
  runid bigint,
  job_pid integer,
  database text,
  username text,
  command text,
  status text,
  return_message text,
  start_time timestamptz,
  end_time timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
BEGIN
  -- Only admins can view cron job runs
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: Admin role required';
  END IF;

  RETURN QUERY
  SELECT 
    r.jobid,
    r.runid,
    r.job_pid,
    r.database,
    r.username,
    r.command,
    r.status,
    r.return_message,
    r.start_time,
    r.end_time
  FROM cron.job_run_details r
  ORDER BY r.start_time DESC
  LIMIT limit_count;
END;
$$;

-- Grant execute to authenticated users (RLS will check admin status)
GRANT EXECUTE ON FUNCTION public.get_cron_jobs() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_cron_job_runs(integer) TO authenticated;