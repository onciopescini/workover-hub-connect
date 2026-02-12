-- Weekly host reports: stats RPC + cron schedule
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION public.get_weekly_host_stats()
RETURNS TABLE (
  host_id uuid,
  host_email text,
  total_bookings bigint,
  total_revenue numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    s.host_id AS host_id,
    au.email::text AS host_email,
    COUNT(b.id)::bigint AS total_bookings,
    COALESCE(SUM(b.total_price), 0)::numeric AS total_revenue
  FROM public.bookings AS b
  INNER JOIN public.spaces AS s
    ON s.id = b.space_id
  INNER JOIN auth.users AS au
    ON au.id = s.host_id
  WHERE b.created_at >= NOW() - INTERVAL '7 days'
    AND b.deleted_at IS NULL
  GROUP BY s.host_id, au.email
  ORDER BY total_revenue DESC, total_bookings DESC;
$$;

REVOKE ALL ON FUNCTION public.get_weekly_host_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_weekly_host_stats() TO service_role;

SELECT cron.schedule(
  'send-weekly-reports-job',
  '0 9 * * 1',
  $$
  SELECT
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/send-weekly-reports',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
