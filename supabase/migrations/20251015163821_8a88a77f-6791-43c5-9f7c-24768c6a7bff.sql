-- ============================================================================
-- FIX B.3: Performance Indices
-- ============================================================================
-- Indici ottimizzati per migliorare le performance delle query principali

-- 1. BOOKING QUERIES PERFORMANCE
-- Indice per query host bookings filtrate per status
CREATE INDEX IF NOT EXISTS idx_bookings_space_status_date 
ON public.bookings(space_id, status, booking_date DESC);

-- Indice per query coworker bookings
CREATE INDEX IF NOT EXISTS idx_bookings_user_status_date 
ON public.bookings(user_id, status, booking_date DESC);

-- Indice per slot reservation queries (cron job booking-expiry-check)
CREATE INDEX IF NOT EXISTS idx_bookings_slot_reserved 
ON public.bookings(slot_reserved_until, status) 
WHERE payment_required = true;

-- 2. PAYMENT QUERIES PERFORMANCE
-- Indice per host payment history
CREATE INDEX IF NOT EXISTS idx_payments_booking_status_date 
ON public.payments(booking_id, payment_status, created_at DESC);

-- Indice per payment stats aggregation
CREATE INDEX IF NOT EXISTS idx_payments_status_created 
ON public.payments(payment_status, created_at) 
WHERE payment_status = 'completed';

-- 3. ADMIN QUERIES PERFORMANCE
-- Indice per admin stats counts
CREATE INDEX IF NOT EXISTS idx_profiles_role_suspended 
ON public.profiles(role, is_suspended);

-- Indice per pending spaces approval
CREATE INDEX IF NOT EXISTS idx_spaces_pending_published 
ON public.spaces(pending_approval, published) 
WHERE is_suspended = false;

-- 4. NOTIFICATION QUERIES PERFORMANCE
-- Indice per unread notifications count
CREATE INDEX IF NOT EXISTS idx_notifications_user_read 
ON public.user_notifications(user_id, is_read, created_at DESC);

-- ============================================================================
-- FIX B.6: Host Dashboard N+1 - Optimized RPC Function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_host_transactions_optimized(
  host_id_param UUID,
  limit_param INTEGER DEFAULT 20
)
RETURNS TABLE(
  id UUID,
  amount NUMERIC,
  host_amount NUMERIC,
  created_at TIMESTAMPTZ,
  payment_status TEXT,
  booking_id UUID,
  space_title TEXT,
  customer_name TEXT
) 
LANGUAGE plpgsql 
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.amount,
    p.host_amount,
    p.created_at,
    p.payment_status,
    p.booking_id,
    s.title AS space_title,
    CONCAT(pr.first_name, ' ', pr.last_name) AS customer_name
  FROM public.payments p
  INNER JOIN public.bookings b ON b.id = p.booking_id
  INNER JOIN public.spaces s ON s.id = b.space_id
  LEFT JOIN public.profiles pr ON pr.id = b.user_id
  WHERE s.host_id = host_id_param
    AND p.payment_status = 'completed'
    AND p.created_at IS NOT NULL
  ORDER BY p.created_at DESC
  LIMIT limit_param;
END;
$$;

-- ============================================================================
-- FIX B.5: Payout Monitoring - System Alarm Trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION public.monitor_payout_failures()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_host_id UUID;
  v_space_title TEXT;
BEGIN
  -- Ottieni host_id e space title
  SELECT s.host_id, s.title INTO v_host_id, v_space_title
  FROM public.spaces s
  WHERE s.id = NEW.space_id;
  
  -- Se payout schedulato ma non completato dopo 24 ore, crea alarm
  IF NEW.payout_scheduled_at IS NOT NULL 
     AND NEW.payout_completed_at IS NULL 
     AND NEW.payout_scheduled_at < NOW() - INTERVAL '24 hours' 
     AND NEW.status = 'served' THEN
    
    -- Inserisci system alarm solo se non esiste già
    INSERT INTO public.system_alarms (
      alarm_type,
      severity,
      title,
      message,
      source,
      metadata
    )
    SELECT 
      'payout_failed',
      'high',
      'Payout Fallito - Booking #' || NEW.id,
      'Payout non completato dopo 24 ore dalla schedulazione per lo spazio "' || v_space_title || '"',
      'booking_payout_monitor',
      jsonb_build_object(
        'booking_id', NEW.id,
        'space_id', NEW.space_id,
        'host_id', v_host_id,
        'scheduled_at', NEW.payout_scheduled_at,
        'stripe_transfer_id', NEW.payout_stripe_transfer_id
      )
    WHERE NOT EXISTS (
      SELECT 1 FROM public.system_alarms
      WHERE alarm_type = 'payout_failed'
        AND metadata->>'booking_id' = NEW.id::TEXT
        AND resolved = false
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crea trigger per monitorare payout failures
DROP TRIGGER IF EXISTS trigger_monitor_payout_failures ON public.bookings;

CREATE TRIGGER trigger_monitor_payout_failures
AFTER UPDATE ON public.bookings
FOR EACH ROW
WHEN (
  OLD.payout_scheduled_at IS DISTINCT FROM NEW.payout_scheduled_at
  OR OLD.payout_completed_at IS DISTINCT FROM NEW.payout_completed_at
)
EXECUTE FUNCTION public.monitor_payout_failures();