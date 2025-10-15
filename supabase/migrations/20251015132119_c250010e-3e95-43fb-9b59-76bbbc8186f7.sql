-- =====================================================
-- ONDATA 2: FIX 2.3 - BOOKING STATUS TRANSITION VALIDATION
-- =====================================================
-- Trigger to validate booking status transitions and prevent invalid state changes
-- Valid transitions:
-- pending -> pending_payment, confirmed, cancelled
-- pending_payment -> confirmed, cancelled
-- confirmed -> served, frozen, cancelled
-- served -> (no transitions)
-- frozen -> cancelled
-- cancelled -> (no transitions)

CREATE OR REPLACE FUNCTION public.validate_booking_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  valid_transition BOOLEAN := FALSE;
BEGIN
  -- Allow INSERT (new bookings always start as 'pending')
  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('pending', 'pending_approval') THEN
      RAISE EXCEPTION 'New bookings must have status "pending" or "pending_approval"';
    END IF;
    RETURN NEW;
  END IF;

  -- If status unchanged, allow
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Validate state transitions
  CASE OLD.status
    WHEN 'pending' THEN
      valid_transition := NEW.status IN ('pending_payment', 'pending_approval', 'confirmed', 'cancelled');
    WHEN 'pending_approval' THEN
      valid_transition := NEW.status IN ('pending_payment', 'confirmed', 'cancelled');
    WHEN 'pending_payment' THEN
      valid_transition := NEW.status IN ('confirmed', 'cancelled');
    WHEN 'confirmed' THEN
      valid_transition := NEW.status IN ('served', 'frozen', 'cancelled');
    WHEN 'served' THEN
      valid_transition := FALSE; -- Terminal state
    WHEN 'frozen' THEN
      valid_transition := NEW.status = 'cancelled';
    WHEN 'cancelled' THEN
      valid_transition := FALSE; -- Terminal state
    ELSE
      valid_transition := FALSE;
  END CASE;

  IF NOT valid_transition THEN
    RAISE EXCEPTION 'Invalid booking status transition from % to %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS booking_status_transition_check ON public.bookings;
CREATE TRIGGER booking_status_transition_check
  BEFORE INSERT OR UPDATE OF status
  ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_booking_status_transition();

-- =====================================================
-- ONDATA 2: FIX 2.6 - BASIC ALARM SYSTEM
-- =====================================================
-- Table to track system alarms (webhook failures, cron failures, etc.)

CREATE TABLE IF NOT EXISTS public.system_alarms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alarm_type TEXT NOT NULL, -- 'webhook_failure', 'cron_failure', 'edge_function_failure'
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  source TEXT, -- e.g., 'stripe-webhooks', 'schedule-host-payouts'
  error_details TEXT,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_system_alarms_type_severity ON public.system_alarms(alarm_type, severity) WHERE NOT resolved;
CREATE INDEX IF NOT EXISTS idx_system_alarms_created ON public.system_alarms(created_at DESC) WHERE NOT resolved;

-- RLS Policies (only admins can view/manage)
ALTER TABLE public.system_alarms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage alarms" ON public.system_alarms
FOR ALL USING (is_admin(auth.uid()));

-- Function to create system alarm
CREATE OR REPLACE FUNCTION public.create_system_alarm(
  p_alarm_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_severity TEXT DEFAULT 'medium',
  p_source TEXT DEFAULT NULL,
  p_error_details TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  alarm_id UUID;
BEGIN
  INSERT INTO public.system_alarms (
    alarm_type,
    severity,
    title,
    message,
    source,
    error_details,
    metadata
  ) VALUES (
    p_alarm_type,
    p_severity,
    p_title,
    p_message,
    p_source,
    p_error_details,
    p_metadata
  ) RETURNING id INTO alarm_id;

  RETURN alarm_id;
END;
$$;

COMMENT ON TABLE public.system_alarms IS 'System-wide alarms for monitoring webhook failures, cron job failures, and edge function errors';
COMMENT ON FUNCTION public.create_system_alarm IS 'Create a new system alarm (callable from edge functions)';