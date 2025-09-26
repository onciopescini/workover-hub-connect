-- Fix weighted rating calculation to include ALL reviews with time-based weighting
CREATE OR REPLACE FUNCTION public.calculate_weighted_space_rating(space_id_param uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  weighted_sum numeric := 0;
  total_weight numeric := 0;
  review_record RECORD;
  days_old integer;
  weight_factor numeric;
BEGIN
  -- Include ALL reviews for the space (removed is_visible filter)
  FOR review_record IN 
    SELECT br.rating, br.created_at
    FROM public.booking_reviews br
    JOIN public.bookings b ON b.id = br.booking_id
    WHERE b.space_id = space_id_param
  LOOP
    days_old := EXTRACT(DAYS FROM (NOW() - review_record.created_at));
    
    -- Time-based weighting: recent reviews get higher weight
    CASE 
      WHEN days_old <= 30 THEN weight_factor := 1.0;
      WHEN days_old <= 90 THEN weight_factor := 0.8;
      WHEN days_old <= 180 THEN weight_factor := 0.6;
      WHEN days_old <= 365 THEN weight_factor := 0.4;
      ELSE weight_factor := 0.2;
    END CASE;
    
    weighted_sum := weighted_sum + (review_record.rating * weight_factor);
    total_weight := total_weight + weight_factor;
  END LOOP;
  
  IF total_weight > 0 THEN
    RETURN ROUND(weighted_sum / total_weight, 2);
  ELSE
    RETURN 0;
  END IF;
END;
$function$