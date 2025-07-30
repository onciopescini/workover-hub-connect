-- Remove all event-related tables and dependencies
-- Step 1: Drop dependent tables first
DROP TABLE IF EXISTS public.event_participants CASCADE;
DROP TABLE IF EXISTS public.event_reviews CASCADE;
DROP TABLE IF EXISTS public.event_waitlist CASCADE;

-- Step 2: Drop main events table
DROP TABLE IF EXISTS public.events CASCADE;

-- Step 3: Remove any event-related functions that might still exist
DROP FUNCTION IF EXISTS public.get_event_participants(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_event_waitlist(uuid) CASCADE;

-- Step 4: Clean up any event-related triggers
-- Note: Most triggers should be auto-dropped with CASCADE, but being explicit
DROP TRIGGER IF EXISTS update_events_updated_at ON public.events;

-- Step 5: Update connection_suggestions function to remove event-related suggestions
CREATE OR REPLACE FUNCTION public.generate_connection_suggestions()
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  -- Elimina suggerimenti vecchi (più di 30 giorni)
  DELETE FROM public.connection_suggestions WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Suggerimenti basati solo su spazi condivisi negli ultimi 3 mesi
  -- FILTRO: Solo utenti con networking_enabled = true
  INSERT INTO public.connection_suggestions (user_id, suggested_user_id, reason, shared_context, score)
  SELECT DISTINCT 
    b1.user_id,
    b2.user_id,
    'shared_space',
    jsonb_build_object('space_id', b1.space_id, 'space_title', s.title),
    10
  FROM public.bookings b1
  JOIN public.bookings b2 ON b1.space_id = b2.space_id 
  JOIN public.spaces s ON s.id = b1.space_id
  JOIN public.profiles p1 ON p1.id = b1.user_id
  JOIN public.profiles p2 ON p2.id = b2.user_id
  WHERE b1.user_id != b2.user_id
  AND b1.created_at > NOW() - INTERVAL '3 months'
  AND b2.created_at > NOW() - INTERVAL '3 months'
  AND p1.networking_enabled = true  -- Filtro per user richiedente
  AND p2.networking_enabled = true  -- Filtro per user suggerito
  AND NOT EXISTS (
    SELECT 1 FROM public.connections 
    WHERE (sender_id = b1.user_id AND receiver_id = b2.user_id)
       OR (sender_id = b2.user_id AND receiver_id = b1.user_id)
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.connection_suggestions 
    WHERE user_id = b1.user_id AND suggested_user_id = b2.user_id
  )
  ON CONFLICT (user_id, suggested_user_id) DO NOTHING;
END;
$function$;