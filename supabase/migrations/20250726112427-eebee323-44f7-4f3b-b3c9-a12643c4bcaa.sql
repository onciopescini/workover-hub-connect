-- Funzione per ottenere metriche di un singolo spazio
CREATE OR REPLACE FUNCTION public.get_single_space_metrics(space_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_month date := date_trunc('month', CURRENT_DATE);
  last_month date := date_trunc('month', CURRENT_DATE - interval '1 month');
  
  total_bookings integer := 0;
  monthly_bookings integer := 0;
  last_month_bookings integer := 0;
  confirmed_bookings integer := 0;
  cancelled_bookings integer := 0;
  pending_bookings integer := 0;
  
  total_revenue numeric := 0;
  monthly_revenue numeric := 0;
  last_month_revenue numeric := 0;
  
  total_reviews integer := 0;
  average_rating numeric := 0;
  
  occupancy_rate numeric := 0;
  available_days integer := 0;
  booked_days integer := 0;
  
  space_title text := '';
  result json;
BEGIN
  -- Verifica che lo spazio esista
  SELECT title INTO space_title FROM spaces WHERE id = space_id_param;
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Space not found');
  END IF;

  -- Calcola prenotazioni totali
  SELECT COUNT(*) INTO total_bookings
  FROM bookings 
  WHERE space_id = space_id_param;

  -- Calcola prenotazioni per stato
  SELECT 
    COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
    COUNT(*) FILTER (WHERE status = 'pending') as pending
  INTO confirmed_bookings, cancelled_bookings, pending_bookings
  FROM bookings 
  WHERE space_id = space_id_param;

  -- Calcola prenotazioni mensili (questo mese)
  SELECT COUNT(*) INTO monthly_bookings
  FROM bookings 
  WHERE space_id = space_id_param 
  AND booking_date >= current_month
  AND booking_date < current_month + interval '1 month';

  -- Calcola prenotazioni mese scorso
  SELECT COUNT(*) INTO last_month_bookings
  FROM bookings 
  WHERE space_id = space_id_param 
  AND booking_date >= last_month
  AND booking_date < current_month;

  -- Calcola revenue totale
  SELECT COALESCE(SUM(p.host_amount), 0) INTO total_revenue
  FROM payments p
  JOIN bookings b ON b.id = p.booking_id
  WHERE b.space_id = space_id_param
  AND p.payment_status = 'completed';

  -- Calcola revenue mensile (questo mese)
  SELECT COALESCE(SUM(p.host_amount), 0) INTO monthly_revenue
  FROM payments p
  JOIN bookings b ON b.id = p.booking_id
  WHERE b.space_id = space_id_param
  AND p.payment_status = 'completed'
  AND b.booking_date >= current_month
  AND b.booking_date < current_month + interval '1 month';

  -- Calcola revenue mese scorso
  SELECT COALESCE(SUM(p.host_amount), 0) INTO last_month_revenue
  FROM payments p
  JOIN bookings b ON b.id = p.booking_id
  WHERE b.space_id = space_id_param
  AND p.payment_status = 'completed'
  AND b.booking_date >= last_month
  AND b.booking_date < current_month;

  -- Calcola recensioni e rating
  SELECT 
    COUNT(*) as review_count,
    COALESCE(AVG(rating), 0) as avg_rating
  INTO total_reviews, average_rating
  FROM booking_reviews br
  JOIN bookings b ON b.id = br.booking_id
  WHERE b.space_id = space_id_param
  AND br.is_visible = true;

  -- Calcola tasso di occupazione (ultimi 30 giorni)
  SELECT COUNT(DISTINCT booking_date) INTO booked_days
  FROM bookings 
  WHERE space_id = space_id_param 
  AND status = 'confirmed'
  AND booking_date >= CURRENT_DATE - interval '30 days'
  AND booking_date <= CURRENT_DATE;
  
  -- Giorni disponibili negli ultimi 30 giorni
  available_days := 30;
  occupancy_rate := CASE 
    WHEN available_days > 0 THEN (booked_days::numeric / available_days::numeric) * 100
    ELSE 0 
  END;

  -- Costruisci il risultato
  SELECT json_build_object(
    'space_title', space_title,
    'total_bookings', total_bookings,
    'monthly_bookings', monthly_bookings,
    'confirmed_bookings', confirmed_bookings,
    'cancelled_bookings', cancelled_bookings,
    'pending_bookings', pending_bookings,
    'total_revenue', total_revenue,
    'monthly_revenue', monthly_revenue,
    'last_month_revenue', last_month_revenue,
    'revenue_growth', CASE 
      WHEN last_month_revenue > 0 THEN 
        ROUND(((monthly_revenue - last_month_revenue) / last_month_revenue * 100)::numeric, 2)
      ELSE 0 
    END,
    'booking_growth', CASE 
      WHEN last_month_bookings > 0 THEN 
        ROUND(((monthly_bookings - last_month_bookings) / last_month_bookings::numeric * 100)::numeric, 2)
      ELSE 0 
    END,
    'total_reviews', total_reviews,
    'average_rating', ROUND(average_rating, 2),
    'occupancy_rate', ROUND(occupancy_rate, 2),
    'booked_days_last_30', booked_days
  ) INTO result;

  RETURN result;
END;
$function$;

-- Aggiorna la funzione di notifica per includere space_id
CREATE OR REPLACE FUNCTION public.notify_host_new_review()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  host_id UUID;
  space_title TEXT;
  space_id_val UUID;
  author_name TEXT;
BEGIN
  -- Ottieni info host, spazio e space_id
  SELECT s.host_id, s.title, s.id INTO host_id, space_title, space_id_val
  FROM spaces s 
  JOIN bookings b ON b.space_id = s.id
  WHERE b.id = NEW.booking_id;
  
  -- Ottieni nome autore recensione
  SELECT first_name || ' ' || last_name INTO author_name
  FROM profiles WHERE id = NEW.author_id;
  
  -- Inserisci notifica per l'host con space_id nel metadata
  INSERT INTO public.user_notifications (
    user_id,
    type,
    title,
    content,
    metadata
  ) VALUES (
    host_id,
    'review',
    'Nuova recensione ricevuta',
    author_name || ' ha lasciato una recensione per "' || space_title || '"',
    jsonb_build_object(
      'review_id', NEW.id,
      'space_id', space_id_val,
      'space_title', space_title,
      'author_name', author_name,
      'rating', NEW.rating
    )
  );
  
  RETURN NEW;
END;
$function$;