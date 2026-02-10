-- Admin normalization + Solopreneur dashboard support

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'app_role'
      AND e.enumlabel = 'admin'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'admin';
  END IF;
END;
$$;

INSERT INTO public.user_roles (user_id, role, assigned_at)
SELECT a.user_id, 'admin'::public.app_role, NOW()
FROM public.admins a
ON CONFLICT (user_id, role) DO NOTHING;

CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION auth.is_admin(p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles ur
    WHERE ur.user_id = p_user_id
      AND ur.role = 'admin'::public.app_role
  );
$$;

REVOKE ALL ON FUNCTION auth.is_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION auth.is_admin(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Admin global read bookings" ON public.bookings;
CREATE POLICY "Admin global read bookings"
ON public.bookings
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admin global read payments" ON public.payments;
CREATE POLICY "Admin global read payments"
ON public.payments
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admin global read disputes" ON public.disputes;
CREATE POLICY "Admin global read disputes"
ON public.disputes
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE VIEW public.admin_audit_logs AS
SELECT
  aal.id,
  aal.admin_id,
  aal.action_type AS event_type,
  aal.description AS event_message,
  aal.target_type,
  aal.target_id,
  aal.metadata,
  aal.created_at
FROM public.admin_access_logs aal;

CREATE OR REPLACE FUNCTION public.get_admin_stats()
RETURNS TABLE (
  gmv_month numeric,
  net_revenue numeric,
  pending_payouts numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(SUM(p.amount) FILTER (
      WHERE p.created_at >= date_trunc('month', now())
        AND p.payment_status NOT IN ('failed', 'cancelled')
    ), 0)::numeric AS gmv_month,
    COALESCE(SUM(p.platform_fee) FILTER (
      WHERE p.created_at >= date_trunc('month', now())
        AND p.payment_status NOT IN ('failed', 'cancelled')
    ), 0)::numeric AS net_revenue,
    COALESCE(SUM(p.host_amount) FILTER (
      WHERE p.capture_status = 'captured'
        AND p.stripe_transfer_id IS NULL
    ), 0)::numeric AS pending_payouts
  FROM public.payments p;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_stats() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_recent_admin_audit_logs(p_limit integer DEFAULT 5)
RETURNS TABLE (
  id uuid,
  event_type text,
  event_message text,
  created_at timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    aal.id,
    aal.event_type,
    aal.event_message,
    aal.created_at
  FROM public.admin_audit_logs aal
  ORDER BY aal.created_at DESC
  LIMIT GREATEST(p_limit, 1);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_recent_admin_audit_logs(integer) TO authenticated, service_role;
