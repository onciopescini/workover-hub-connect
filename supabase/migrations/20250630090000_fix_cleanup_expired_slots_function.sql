
-- Fix the cleanup_expired_slots function to properly handle ROW_COUNT
CREATE OR REPLACE FUNCTION public.cleanup_expired_slots()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Cancella prenotazioni con slot scaduti che non sono state pagate
  DELETE FROM public.bookings 
  WHERE slot_reserved_until < NOW() 
  AND status = 'pending' 
  AND payment_required = true
  AND (
    SELECT payment_status 
    FROM public.payments 
    WHERE payments.booking_id = bookings.id 
    LIMIT 1
  ) != 'completed';
  
  -- Ottieni il numero di righe cancellate
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log della pulizia solo se ci sono state cancellazioni
  IF deleted_count > 0 THEN
    INSERT INTO public.admin_actions_log (
      admin_id, 
      action_type, 
      target_type, 
      target_id, 
      description
    ) VALUES (
      NULL, 
      'system_cleanup', 
      'booking', 
      NULL, 
      'Cleaned up ' || deleted_count || ' expired booking slots'
    );
  END IF;
END;
$function$;
