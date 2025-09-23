-- Fix cleanup_expired_slots to not log when not in admin context
CREATE OR REPLACE FUNCTION public.cleanup_expired_slots()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  deleted_count INTEGER := 0;
  v_admin uuid := auth.uid();
  v_is_admin boolean := false;
BEGIN
  -- Cancella prenotazioni con slot scaduti che non sono state pagate
  DELETE FROM public.bookings 
  WHERE slot_reserved_until < NOW() 
  AND status = 'pending' 
  AND payment_required = true
  AND NOT EXISTS (
    SELECT 1 
    FROM public.payments 
    WHERE payments.booking_id = bookings.id 
    AND payment_status = 'completed'
  );
  
  -- Ottieni il numero di righe cancellate usando GET DIAGNOSTICS
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log della pulizia SOLO se ci sono state cancellazioni E siamo in contesto admin
  IF deleted_count > 0 AND v_admin IS NOT NULL THEN
    -- Verifica se l'utente è effettivamente admin
    BEGIN
      SELECT (role = 'admin') INTO v_is_admin
      FROM public.profiles WHERE id = v_admin;
    EXCEPTION 
      WHEN OTHERS THEN
        v_is_admin := false;
    END;
    
    -- Log solo se è admin
    IF v_is_admin THEN
      INSERT INTO public.admin_actions_log (
        admin_id, 
        action_type, 
        target_type, 
        target_id, 
        description
      ) VALUES (
        v_admin, 
        'system_cleanup', 
        'booking', 
        NULL, 
        'Cleaned up ' || deleted_count || ' expired booking slots'
      );
    END IF;
  END IF;
END;
$function$;