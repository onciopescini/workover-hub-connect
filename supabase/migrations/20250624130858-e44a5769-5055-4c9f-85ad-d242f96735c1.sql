
-- Aggiunge colonne per la gestione del blocco temporaneo degli slot e stati pagamento
ALTER TABLE public.bookings 
ADD COLUMN slot_reserved_until TIMESTAMPTZ,
ADD COLUMN payment_required BOOLEAN DEFAULT true,
ADD COLUMN payment_session_id TEXT,
ADD COLUMN reservation_token UUID DEFAULT gen_random_uuid();

-- Aggiunge indice per performance su cleanup slot scaduti
CREATE INDEX idx_bookings_slot_reserved_until ON public.bookings(slot_reserved_until) 
WHERE slot_reserved_until IS NOT NULL;

-- Aggiunge indice per ricerca per token di prenotazione
CREATE INDEX idx_bookings_reservation_token ON public.bookings(reservation_token);

-- Funzione per pulire automaticamente gli slot scaduti
CREATE OR REPLACE FUNCTION public.cleanup_expired_slots()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  
  -- Log della pulizia
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
    'Cleaned up ' || ROW_COUNT || ' expired booking slots'
  );
END;
$function$;

-- Funzione per validare disponibilità slot con lock
CREATE OR REPLACE FUNCTION public.validate_and_reserve_slot(
  space_id_param UUID,
  date_param DATE,
  start_time_param TIME,
  end_time_param TIME,
  user_id_param UUID,
  confirmation_type_param TEXT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  conflict_count INTEGER := 0;
  reservation_time TIMESTAMPTZ := NOW() + INTERVAL '5 minutes';
  new_booking_id UUID;
  space_host_id UUID;
  space_title TEXT;
  result JSON;
BEGIN
  -- Lock per prevenire race conditions
  LOCK TABLE bookings IN SHARE ROW EXCLUSIVE MODE;
  
  -- Pulisci slot scaduti prima della validazione
  PERFORM cleanup_expired_slots();
  
  -- Verifica che lo spazio sia disponibile e l'host abbia Stripe collegato
  SELECT s.host_id, s.title INTO space_host_id, space_title
  FROM spaces s
  JOIN profiles p ON p.id = s.host_id
  WHERE s.id = space_id_param 
  AND s.published = true 
  AND s.is_suspended = false
  AND p.stripe_connected = true;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Space not available or host not connected to Stripe'
    );
  END IF;
  
  -- Controlla conflitti esistenti (inclusi slot riservati)
  SELECT COUNT(*) INTO conflict_count
  FROM bookings
  WHERE space_id = space_id_param
    AND booking_date = date_param
    AND status IN ('pending', 'confirmed')
    AND (
      (start_time < end_time_param AND end_time > start_time_param) OR
      (slot_reserved_until > NOW() AND start_time < end_time_param AND end_time > start_time_param)
    );
  
  IF conflict_count > 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Time slot is not available'
    );
  END IF;
  
  -- Crea prenotazione con slot riservato
  INSERT INTO bookings (
    space_id,
    user_id,
    booking_date,
    start_time,
    end_time,
    status,
    slot_reserved_until,
    payment_required
  ) VALUES (
    space_id_param,
    user_id_param,
    date_param,
    start_time_param,
    end_time_param,
    'pending',
    reservation_time,
    true
  ) RETURNING id, reservation_token INTO new_booking_id, result;
  
  RETURN json_build_object(
    'success', true,
    'booking_id', new_booking_id,
    'reservation_token', (SELECT reservation_token FROM bookings WHERE id = new_booking_id),
    'reserved_until', reservation_time,
    'space_title', space_title,
    'confirmation_type', confirmation_type_param
  );
END;
$function$;

-- Trigger per notificare host di nuove prenotazioni
CREATE OR REPLACE FUNCTION public.notify_host_new_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  host_id UUID;
  space_title TEXT;
  user_name TEXT;
BEGIN
  -- Ottieni info host e spazio
  SELECT s.host_id, s.title INTO host_id, space_title
  FROM spaces s WHERE s.id = NEW.space_id;
  
  -- Ottieni nome utente
  SELECT first_name || ' ' || last_name INTO user_name
  FROM profiles WHERE id = NEW.user_id;
  
  -- Notifica host solo se la prenotazione è valida
  IF NEW.status = 'pending' AND NEW.payment_required = true THEN
    INSERT INTO user_notifications (
      user_id,
      type,
      title,
      content,
      metadata
    ) VALUES (
      host_id,
      'booking',
      CASE 
        WHEN (SELECT confirmation_type FROM spaces WHERE id = NEW.space_id) = 'instant' 
        THEN 'Nuova prenotazione ricevuta'
        ELSE 'Nuova richiesta di prenotazione'
      END,
      user_name || ' ha ' || 
      CASE 
        WHEN (SELECT confirmation_type FROM spaces WHERE id = NEW.space_id) = 'instant' 
        THEN 'prenotato'
        ELSE 'richiesto di prenotare'
      END || ' "' || space_title || '" per il ' || NEW.booking_date,
      jsonb_build_object(
        'booking_id', NEW.id,
        'space_title', space_title,
        'booking_date', NEW.booking_date,
        'user_name', user_name
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Crea trigger per notifiche host
DROP TRIGGER IF EXISTS trigger_notify_host_new_booking ON bookings;
CREATE TRIGGER trigger_notify_host_new_booking
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_host_new_booking();
