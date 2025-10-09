-- Update calculate_cancellation_fee to support instant booking and pending_payment
DROP FUNCTION IF EXISTS public.calculate_cancellation_fee(date, numeric);

CREATE OR REPLACE FUNCTION public.calculate_cancellation_fee(
  booking_date_param date, 
  price_per_day_param numeric,
  confirmation_type_param text DEFAULT 'instant',
  booking_status_param text DEFAULT 'confirmed'
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  days_until_booking INTEGER;
  cancellation_fee NUMERIC := 0;
  penalty_rate NUMERIC := 0;
BEGIN
  -- EXCEPTION: No penalty for pending_payment cancelled voluntarily
  IF booking_status_param = 'pending_payment' THEN
    RETURN 0;
  END IF;

  -- Calculate days until booking
  days_until_booking := booking_date_param - CURRENT_DATE;
  
  -- Determine penalty rate based on confirmation_type
  IF confirmation_type_param = 'instant' THEN
    -- Reduced penalties for instant booking
    IF days_until_booking < 1 THEN
      penalty_rate := 0.50; -- 50% (max cap)
    ELSIF days_until_booking < 3 THEN
      penalty_rate := 0.30; -- 30%
    ELSIF days_until_booking < 7 THEN
      penalty_rate := 0.15; -- 15%
    ELSE
      penalty_rate := 0; -- Free
    END IF;
  ELSE
    -- Standard penalties for host_approval (max 50%)
    IF days_until_booking < 1 THEN
      penalty_rate := 0.50; -- 50% (cap applied)
    ELSIF days_until_booking < 3 THEN
      penalty_rate := 0.50; -- 50% (cap applied)
    ELSIF days_until_booking < 7 THEN
      penalty_rate := 0.25; -- 25%
    ELSE
      penalty_rate := 0; -- Free
    END IF;
  END IF;
  
  cancellation_fee := price_per_day_param * penalty_rate;
  RETURN cancellation_fee;
END;
$$;

-- Create cancel_booking RPC function
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
DECLARE
  booking_record RECORD;
  fee NUMERIC;
  space_title TEXT;
  space_host_id UUID;
  price_per_day NUMERIC;
  confirmation_type TEXT;
  refund_amount NUMERIC := 0;
  penalty_amount NUMERIC;
  payment_amount NUMERIC;
BEGIN
  -- Fetch booking + space + confirmation type
  SELECT 
    b.*,
    s.price_per_day as space_price,
    s.title as space_name,
    s.host_id as space_host,
    s.confirmation_type as conf_type
  INTO booking_record
  FROM public.bookings b
  JOIN public.spaces s ON s.id = b.space_id
  WHERE b.id = cancel_booking.booking_id 
    AND b.status NOT IN ('cancelled');
  
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Prenotazione non trovata o già cancellata');
  END IF;
  
  space_title := booking_record.space_name;
  space_host_id := booking_record.space_host;
  price_per_day := booking_record.space_price;
  confirmation_type := booking_record.conf_type;
  
  -- Calculate penalty
  IF cancelled_by_host THEN
    -- HOST CANCELS: Fixed 12.2% penalty of base cost
    fee := ROUND(price_per_day * 0.122, 2);
    penalty_amount := fee;
    
    -- Get existing payment
    SELECT amount INTO payment_amount 
    FROM public.payments 
    WHERE booking_id = cancel_booking.booking_id 
      AND payment_status = 'completed'
    LIMIT 1;
    
    -- Full refund to coworker
    refund_amount := COALESCE(payment_amount, 0);
    
  ELSE
    -- COWORKER CANCELS
    fee := public.calculate_cancellation_fee(
      booking_record.booking_date, 
      price_per_day,
      confirmation_type,
      booking_record.status
    );
    penalty_amount := fee;
    
    -- Get payment to calculate refund
    SELECT amount INTO payment_amount 
    FROM public.payments 
    WHERE booking_id = cancel_booking.booking_id 
      AND payment_status = 'completed'
    LIMIT 1;
    
    payment_amount := COALESCE(payment_amount, 0);
    
    -- If there was a payment, calculate refund (total - penalty)
    IF payment_amount > 0 THEN
      refund_amount := payment_amount - fee;
    END IF;
  END IF;
  
  -- Update booking
  UPDATE public.bookings 
  SET 
    status = 'cancelled',
    cancelled_at = NOW(),
    cancellation_fee = fee,
    cancelled_by_host = cancel_booking.cancelled_by_host,
    cancellation_reason = reason,
    updated_at = NOW()
  WHERE id = cancel_booking.booking_id;
  
  -- If there's a payment, set refund status
  IF payment_amount > 0 THEN
    UPDATE public.payments 
    SET 
      payment_status = 'refund_pending',
      updated_at = NOW()
    WHERE booking_id = cancel_booking.booking_id
      AND payment_status = 'completed';
  END IF;
  
  -- Differentiated notifications
  IF cancelled_by_host THEN
    -- Notify coworker: full refund
    INSERT INTO public.notifications (user_id, type, metadata)
    VALUES (
      booking_record.user_id,
      'booking_cancelled',
      json_build_object(
        'booking_id', cancel_booking.booking_id,
        'space_title', space_title,
        'message', 'La tua prenotazione per "' || space_title || '" è stata cancellata dall''host. Riceverai un rimborso completo di €' || refund_amount || '.',
        'cancellation_fee', 0,
        'refund_amount', refund_amount,
        'cancelled_by_host', true
      )
    );
  ELSE
    -- Notify coworker: cancellation with possible penalty
    IF fee > 0 AND refund_amount > 0 THEN
      INSERT INTO public.notifications (user_id, type, metadata)
      VALUES (
        booking_record.user_id,
        'booking_cancelled',
        json_build_object(
          'booking_id', cancel_booking.booking_id,
          'space_title', space_title,
          'message', 'Hai cancellato la prenotazione per "' || space_title || '". Penale applicata: €' || fee || '. Rimborso: €' || refund_amount || '.',
          'cancellation_fee', fee,
          'refund_amount', refund_amount,
          'cancelled_by_host', false
        )
      );
    ELSIF fee = 0 THEN
      INSERT INTO public.notifications (user_id, type, metadata)
      VALUES (
        booking_record.user_id,
        'booking_cancelled',
        json_build_object(
          'booking_id', cancel_booking.booking_id,
          'space_title', space_title,
          'message', 'Hai cancellato la prenotazione per "' || space_title || '". Cancellazione gratuita.',
          'cancellation_fee', 0,
          'refund_amount', refund_amount,
          'cancelled_by_host', false
        )
      );
    END IF;
    
    -- Notify host
    INSERT INTO public.notifications (user_id, type, metadata)
    VALUES (
      space_host_id,
      'booking_cancelled',
      json_build_object(
        'booking_id', cancel_booking.booking_id,
        'space_title', space_title,
        'message', 'La prenotazione per "' || space_title || '" è stata cancellata dal coworker.',
        'cancellation_fee', fee,
        'cancelled_by_host', false
      )
    );
  END IF;
  
  RETURN json_build_object(
    'success', true, 
    'cancellation_fee', fee,
    'refund_amount', refund_amount,
    'booking_id', cancel_booking.booking_id
  );
END;
$$;