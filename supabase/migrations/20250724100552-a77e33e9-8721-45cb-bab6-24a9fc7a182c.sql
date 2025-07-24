-- Aggiornare tabelle recensioni per visibilità automatica e miglioramenti
-- 1. Rendere le recensioni visibili di default
ALTER TABLE public.booking_reviews ALTER COLUMN is_visible SET DEFAULT true;
ALTER TABLE public.event_reviews ALTER COLUMN is_visible SET DEFAULT true;

-- 2. Aggiornare tutte le recensioni esistenti per renderle visibili
UPDATE public.booking_reviews SET is_visible = true WHERE is_visible = false;
UPDATE public.event_reviews SET is_visible = true WHERE is_visible = false;

-- 3. Creare funzione per calcolare rating medio con peso temporale
CREATE OR REPLACE FUNCTION public.calculate_weighted_space_rating(space_id_param uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  weighted_sum numeric := 0;
  total_weight numeric := 0;
  review_record RECORD;
  days_old integer;
  weight_factor numeric;
BEGIN
  -- Scorri tutte le recensioni per lo spazio
  FOR review_record IN 
    SELECT br.rating, br.created_at
    FROM public.booking_reviews br
    JOIN public.bookings b ON b.id = br.booking_id
    WHERE b.space_id = space_id_param
    AND br.is_visible = true
  LOOP
    -- Calcola età della recensione in giorni
    days_old := EXTRACT(DAYS FROM (NOW() - review_record.created_at));
    
    -- Calcola peso: più recente = più peso
    -- Peso massimo per recensioni sotto i 30 giorni, diminuisce gradualmente
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
  
  -- Restituisci media ponderata o 0 se nessuna recensione
  IF total_weight > 0 THEN
    RETURN ROUND(weighted_sum / total_weight, 2);
  ELSE
    RETURN 0;
  END IF;
END;
$$;

-- 4. Creare funzione per ottenere recensioni spazio con dettagli
CREATE OR REPLACE FUNCTION public.get_space_reviews_with_details(space_id_param uuid)
RETURNS TABLE(
  id uuid,
  rating integer,
  content text,
  created_at timestamp with time zone,
  author_id uuid,
  author_first_name text,
  author_last_name text,
  author_profile_photo_url text,
  booking_date date,
  is_visible boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    br.id,
    br.rating,
    br.content,
    br.created_at,
    br.author_id,
    p.first_name as author_first_name,
    p.last_name as author_last_name,
    p.profile_photo_url as author_profile_photo_url,
    b.booking_date,
    br.is_visible
  FROM public.booking_reviews br
  JOIN public.bookings b ON b.id = br.booking_id
  JOIN public.profiles p ON p.id = br.author_id
  WHERE b.space_id = space_id_param
  AND br.is_visible = true
  ORDER BY br.created_at DESC;
END;
$$;

-- 5. Aggiornare funzione di visibilità recensioni per renderle sempre visibili
DROP FUNCTION IF EXISTS public.update_review_visibility();

-- 6. Creare trigger per notifiche host quando ricevono una recensione
CREATE OR REPLACE FUNCTION public.notify_host_new_review()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
  host_id UUID;
  space_title TEXT;
  author_name TEXT;
BEGIN
  -- Ottieni info host e spazio
  SELECT s.host_id, s.title INTO host_id, space_title
  FROM spaces s 
  JOIN bookings b ON b.space_id = s.id
  WHERE b.id = NEW.booking_id;
  
  -- Ottieni nome autore recensione
  SELECT first_name || ' ' || last_name INTO author_name
  FROM profiles WHERE id = NEW.author_id;
  
  -- Inserisci notifica per l'host
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
      'space_title', space_title,
      'author_name', author_name,
      'rating', NEW.rating
    )
  );
  
  RETURN NEW;
END;
$$;

-- Creare trigger per notifiche recensioni
CREATE TRIGGER notify_host_review_trigger
  AFTER INSERT ON public.booking_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_host_new_review();