-- Fix remaining function search path warnings

-- Find functions without proper search_path and fix them
DROP FUNCTION IF EXISTS public.expire_pending_connections();
CREATE OR REPLACE FUNCTION public.expire_pending_connections()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE connections 
  SET status = 'rejected'
  WHERE status = 'pending' 
  AND expires_at < NOW();
END;
$$;

DROP FUNCTION IF EXISTS public.generate_connection_suggestions();
CREATE OR REPLACE FUNCTION public.generate_connection_suggestions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Elimina suggerimenti vecchi (più di 30 giorni)
  DELETE FROM connection_suggestions WHERE created_at < NOW() - INTERVAL '30 days';
  
  -- Suggerimenti basati su spazi condivisi negli ultimi 3 mesi
  -- FILTRO AGGIUNTO: Solo utenti con networking_enabled = true
  INSERT INTO connection_suggestions (user_id, suggested_user_id, reason, shared_context, score)
  SELECT DISTINCT 
    b1.user_id,
    b2.user_id,
    'shared_space',
    jsonb_build_object('space_id', b1.space_id, 'space_title', s.title),
    10
  FROM bookings b1
  JOIN bookings b2 ON b1.space_id = b2.space_id 
  JOIN spaces s ON s.id = b1.space_id
  JOIN profiles p1 ON p1.id = b1.user_id
  JOIN profiles p2 ON p2.id = b2.user_id
  WHERE b1.user_id != b2.user_id
  AND b1.created_at > NOW() - INTERVAL '3 months'
  AND b2.created_at > NOW() - INTERVAL '3 months'
  AND p1.networking_enabled = true  -- Filtro per user richiedente
  AND p2.networking_enabled = true  -- Filtro per user suggerito
  AND NOT EXISTS (
    SELECT 1 FROM connections 
    WHERE (sender_id = b1.user_id AND receiver_id = b2.user_id)
       OR (sender_id = b2.user_id AND receiver_id = b1.user_id)
  )
  AND NOT EXISTS (
    SELECT 1 FROM connection_suggestions 
    WHERE user_id = b1.user_id AND suggested_user_id = b2.user_id
  )
  ON CONFLICT (user_id, suggested_user_id) DO NOTHING;
  
  -- Suggerimenti basati su eventi condivisi
  -- FILTRO AGGIUNTO: Solo utenti con networking_enabled = true
  INSERT INTO connection_suggestions (user_id, suggested_user_id, reason, shared_context, score)
  SELECT DISTINCT 
    ep1.user_id,
    ep2.user_id,
    'shared_event',
    jsonb_build_object('event_id', ep1.event_id, 'event_title', e.title),
    15
  FROM event_participants ep1
  JOIN event_participants ep2 ON ep1.event_id = ep2.event_id
  JOIN events e ON e.id = ep1.event_id
  JOIN profiles p1 ON p1.id = ep1.user_id
  JOIN profiles p2 ON p2.id = ep2.user_id
  WHERE ep1.user_id != ep2.user_id
  AND ep1.joined_at > NOW() - INTERVAL '3 months'
  AND p1.networking_enabled = true  -- Filtro per user richiedente
  AND p2.networking_enabled = true  -- Filtro per user suggerito
  AND NOT EXISTS (
    SELECT 1 FROM connections 
    WHERE (sender_id = ep1.user_id AND receiver_id = ep2.user_id)
       OR (sender_id = ep2.user_id AND receiver_id = ep1.user_id)
  )
  AND NOT EXISTS (
    SELECT 1 FROM connection_suggestions 
    WHERE user_id = ep1.user_id AND suggested_user_id = ep2.user_id
  )
  ON CONFLICT (user_id, suggested_user_id) DO NOTHING;
END;
$$;