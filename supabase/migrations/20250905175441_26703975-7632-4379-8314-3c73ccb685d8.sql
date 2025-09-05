-- Fix remaining functions by dropping and recreating them properly

-- Drop and recreate calculate_cancellation_fee with proper search_path
DROP FUNCTION IF EXISTS public.calculate_cancellation_fee(date, numeric);

CREATE OR REPLACE FUNCTION public.calculate_cancellation_fee(booking_date_param date, price_per_day_param numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  days_until_booking INTEGER;
  cancellation_fee NUMERIC := 0;
BEGIN
  -- Calculate days between today and booking date
  days_until_booking := booking_date_param - CURRENT_DATE;
  
  -- Apply cancellation fee based on timing
  IF days_until_booking < 1 THEN
    -- Same day or past: 100% fee
    cancellation_fee := price_per_day_param;
  ELSIF days_until_booking < 3 THEN
    -- Less than 3 days: 50% fee
    cancellation_fee := price_per_day_param * 0.5;
  ELSIF days_until_booking < 7 THEN
    -- Less than 7 days: 25% fee
    cancellation_fee := price_per_day_param * 0.25;
  ELSE
    -- 7+ days: No fee
    cancellation_fee := 0;
  END IF;
  
  RETURN cancellation_fee;
END;
$$;