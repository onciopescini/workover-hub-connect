-- GDPR Soft Delete Guardrails
-- Objective:
-- 1) Prevent destructive cascades for accounting and booking history.
-- 2) Introduce soft-delete for profiles.
-- 3) Block hard/soft deletion of hosts with future active bookings.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_profiles_deleted_at ON public.profiles (deleted_at);
CREATE INDEX IF NOT EXISTS idx_bookings_future_active
  ON public.bookings (space_id, booking_date, start_time)
  WHERE deleted_at IS NULL AND status IN ('pending', 'confirmed');

-- Restrictive read policies: deleted rows are hidden by default.
-- These policies are additive and do not remove existing business policies.
DROP POLICY IF EXISTS profiles_hide_soft_deleted ON public.profiles;
CREATE POLICY profiles_hide_soft_deleted
  ON public.profiles
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS spaces_hide_soft_deleted ON public.spaces;
CREATE POLICY spaces_hide_soft_deleted
  ON public.spaces
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

DROP POLICY IF EXISTS bookings_hide_soft_deleted ON public.bookings;
CREATE POLICY bookings_hide_soft_deleted
  ON public.bookings
  AS RESTRICTIVE
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE OR REPLACE FUNCTION public.enforce_host_deletion_guardrail()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  has_future_active_bookings BOOLEAN;
BEGIN
  -- Trigger is used for both hard delete and soft delete.
  SELECT EXISTS (
    SELECT 1
    FROM public.spaces s
    JOIN public.bookings b ON b.space_id = s.id
    WHERE s.host_id = COALESCE(OLD.id, NEW.id)
      AND s.deleted_at IS NULL
      AND b.deleted_at IS NULL
      AND b.status IN ('pending', 'confirmed')
      AND (b.booking_date + COALESCE(b.start_time, TIME '00:00')) > NOW()
  ) INTO has_future_active_bookings;

  IF has_future_active_bookings THEN
    RAISE EXCEPTION USING
      ERRCODE = 'check_violation',
      MESSAGE = 'Host deletion blocked: there are future pending/confirmed bookings.';
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_host_hard_delete ON public.profiles;
CREATE TRIGGER trg_block_host_hard_delete
  BEFORE DELETE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_host_deletion_guardrail();

DROP TRIGGER IF EXISTS trg_block_host_soft_delete ON public.profiles;
CREATE TRIGGER trg_block_host_soft_delete
  BEFORE UPDATE OF deleted_at ON public.profiles
  FOR EACH ROW
  WHEN (OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL)
  EXECUTE FUNCTION public.enforce_host_deletion_guardrail();

COMMIT;

