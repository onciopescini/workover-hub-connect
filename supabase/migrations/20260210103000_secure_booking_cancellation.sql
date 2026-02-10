CREATE OR REPLACE FUNCTION public.finalize_booking_cancellation_secure(
  booking_id_param uuid,
  cancelled_by_host_param boolean,
  reason_param text,
  action_param text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.bookings
  SET
    status = 'cancelled',
    cancelled_at = now(),
    cancelled_by_host = cancelled_by_host_param,
    cancellation_reason = reason_param,
    updated_at = now()
  WHERE id = booking_id_param
    AND status <> 'cancelled';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'BOOKING_ALREADY_CANCELLED_OR_NOT_FOUND';
  END IF;

  IF action_param = 'refunded' THEN
    UPDATE public.payments
    SET payment_status = 'refunded',
        updated_at = now()
    WHERE booking_id = booking_id_param
      AND payment_status = 'completed';
  ELSIF action_param = 'auth_released' THEN
    UPDATE public.payments
    SET payment_status = 'cancelled',
        updated_at = now()
    WHERE booking_id = booking_id_param
      AND payment_status IN ('authorized', 'pending', 'completed');
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_booking(
  booking_id uuid,
  cancelled_by_host boolean DEFAULT false,
  reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- DEPRECATED: Use handle-booking-cancellation Edge Function
  IF coalesce(auth.jwt() ->> 'role', '') <> 'service_role' THEN
    RAISE EXCEPTION 'cancel_booking RPC is deprecated. Use handle-booking-cancellation Edge Function.'
      USING ERRCODE = '42501';
  END IF;

  RETURN json_build_object(
    'success', false,
    'error', 'DEPRECATED_RPC_USE_EDGE_FUNCTION',
    'booking_id', booking_id,
    'cancelled_by_host', cancelled_by_host,
    'reason', reason
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.finalize_booking_cancellation_secure(uuid, boolean, text, text) TO service_role;
REVOKE ALL ON FUNCTION public.finalize_booking_cancellation_secure(uuid, boolean, text, text) FROM anon, authenticated;
