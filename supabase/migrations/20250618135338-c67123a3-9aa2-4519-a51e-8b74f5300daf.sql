
-- RPC function per query ottimizzata di disponibilità
CREATE OR REPLACE FUNCTION get_space_availability_optimized(
  space_id_param UUID,
  start_date_param DATE,
  end_date_param DATE
) 
RETURNS TABLE (
  booking_date DATE,
  start_time TIME,
  end_time TIME,
  status TEXT,
  user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.booking_date,
    b.start_time,
    b.end_time,
    b.status,
    b.user_id
  FROM bookings b
  WHERE b.space_id = space_id_param
    AND b.booking_date BETWEEN start_date_param AND end_date_param
    AND b.status IN ('pending', 'confirmed')
  ORDER BY b.booking_date, b.start_time;
END;
$$;

-- RPC function per validazione slot con lock temporaneo
CREATE OR REPLACE FUNCTION validate_booking_slot_with_lock(
  space_id_param UUID,
  date_param DATE,
  start_time_param TIME,
  end_time_param TIME,
  user_id_param UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  conflicts RECORD;
  conflict_count INTEGER := 0;
  result JSON;
BEGIN
  -- Lock per prevenire race conditions
  LOCK TABLE bookings IN SHARE ROW EXCLUSIVE MODE;
  
  -- Controlla conflitti esistenti
  SELECT COUNT(*) INTO conflict_count
  FROM bookings
  WHERE space_id = space_id_param
    AND booking_date = date_param
    AND status IN ('pending', 'confirmed')
    AND (
      (start_time < end_time_param AND end_time > start_time_param)
    );
  
  -- Se ci sono conflitti, restituisci dettagli
  IF conflict_count > 0 THEN
    SELECT json_agg(
      json_build_object(
        'id', id,
        'start_time', start_time,
        'end_time', end_time,
        'status', status,
        'user_id', user_id
      )
    ) INTO result
    FROM bookings
    WHERE space_id = space_id_param
      AND booking_date = date_param
      AND status IN ('pending', 'confirmed')
      AND (start_time < end_time_param AND end_time > start_time_param);
    
    RETURN json_build_object(
      'valid', false,
      'conflicts', result,
      'message', 'Time slot conflicts with existing bookings'
    );
  END IF;
  
  -- Validazione aggiuntiva: controlla availability del space
  -- Questa parte richiederebbe l'integrazione con la tabella spaces.availability
  
  RETURN json_build_object(
    'valid', true,
    'conflicts', '[]'::json,
    'message', 'Time slot is available',
    'validated_at', now()
  );
END;
$$;

-- RPC function per suggerimenti slot alternativi
CREATE OR REPLACE FUNCTION get_alternative_time_slots(
  space_id_param UUID,
  date_param DATE,
  duration_hours_param DECIMAL
)
RETURNS TEXT[]
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  alternatives TEXT[] := ARRAY[]::TEXT[];
  slot_start TIME;
  slot_end TIME;
  interval_minutes INTEGER := 30; -- Intervalli di 30 minuti
  start_hour INTEGER := 9;
  end_hour INTEGER := 18;
  slot_time TIME; -- Cambiato da current_time per evitare conflitti con parola riservata
  check_end_time TIME;
  has_conflict BOOLEAN;
BEGIN
  -- Genera possibili slot di inizio ogni 30 minuti
  FOR i IN 0..(((end_hour - start_hour) * 60) / interval_minutes - 1) LOOP
    slot_time := (start_hour || ':00:00')::TIME + (i * interval_minutes || ' minutes')::INTERVAL;
    check_end_time := slot_time + (duration_hours_param || ' hours')::INTERVAL;
    
    -- Non superare l'orario di chiusura
    IF check_end_time > (end_hour || ':00:00')::TIME THEN
      CONTINUE;
    END IF;
    
    -- Controlla se c'è conflitto
    SELECT EXISTS(
      SELECT 1 FROM bookings
      WHERE space_id = space_id_param
        AND booking_date = date_param
        AND status IN ('pending', 'confirmed')
        AND (start_time < check_end_time AND end_time > slot_time)
    ) INTO has_conflict;
    
    -- Se non c'è conflitto, aggiungi all'array
    IF NOT has_conflict THEN
      alternatives := array_append(alternatives, slot_time::TEXT || ' - ' || check_end_time::TEXT);
    END IF;
    
    -- Limita a massimo 6 suggerimenti
    IF array_length(alternatives, 1) >= 6 THEN
      EXIT;
    END IF;
  END LOOP;
  
  RETURN alternatives;
END;
$$;

-- Indici ottimizzati per performance
CREATE INDEX IF NOT EXISTS idx_bookings_space_date_time 
ON bookings (space_id, booking_date, start_time, end_time) 
WHERE status IN ('pending', 'confirmed');

CREATE INDEX IF NOT EXISTS idx_bookings_date_range_space 
ON bookings (booking_date, space_id) 
WHERE status IN ('pending', 'confirmed');
