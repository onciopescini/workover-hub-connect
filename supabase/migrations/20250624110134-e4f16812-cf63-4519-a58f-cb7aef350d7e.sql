
-- Funzione per verificare se un utente può accedere al profilo di un altro utente
CREATE OR REPLACE FUNCTION public.check_profile_access(viewer_id uuid, profile_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  target_user RECORD;
  access_reason TEXT := NULL;
  has_access BOOLEAN := false;
BEGIN
  -- Se è lo stesso utente, ha sempre accesso
  IF viewer_id = profile_id THEN
    RETURN json_build_object(
      'has_access', true,
      'access_reason', 'own_profile',
      'message', 'Accesso al proprio profilo'
    );
  END IF;
  
  -- Verifica che l'utente target abbia networking abilitato
  SELECT networking_enabled INTO target_user
  FROM public.profiles 
  WHERE id = profile_id;
  
  IF NOT FOUND THEN
    RETURN json_build_object(
      'has_access', false,
      'access_reason', 'user_not_found',
      'message', 'Utente non trovato'
    );
  END IF;
  
  IF NOT target_user.networking_enabled THEN
    RETURN json_build_object(
      'has_access', false,
      'access_reason', 'networking_disabled',
      'message', 'L''utente ha disabilitato il networking'
    );
  END IF;
  
  -- Verifica connessione accettata esistente
  IF EXISTS (
    SELECT 1 FROM public.connections 
    WHERE ((sender_id = viewer_id AND receiver_id = profile_id) OR 
           (sender_id = profile_id AND receiver_id = viewer_id))
    AND status = 'accepted'
  ) THEN
    RETURN json_build_object(
      'has_access', true,
      'access_reason', 'accepted_connection',
      'message', 'Connessione accettata esistente'
    );
  END IF;
  
  -- Verifica suggestion reciproca (spazi condivisi)
  IF EXISTS (
    SELECT 1 FROM public.connection_suggestions cs1
    WHERE cs1.user_id = viewer_id 
    AND cs1.suggested_user_id = profile_id
    AND cs1.reason IN ('shared_space', 'shared_event')
  ) AND EXISTS (
    SELECT 1 FROM public.connection_suggestions cs2
    WHERE cs2.user_id = profile_id 
    AND cs2.suggested_user_id = viewer_id
    AND cs2.reason IN ('shared_space', 'shared_event')
  ) THEN
    RETURN json_build_object(
      'has_access', true,
      'access_reason', 'mutual_suggestion',
      'message', 'Accesso tramite spazi/eventi condivisi'
    );
  END IF;
  
  -- Verifica suggestion unidirezionale (accesso limitato)
  IF EXISTS (
    SELECT 1 FROM public.connection_suggestions
    WHERE user_id = viewer_id 
    AND suggested_user_id = profile_id
    AND reason IN ('shared_space', 'shared_event')
  ) THEN
    RETURN json_build_object(
      'has_access', true,
      'access_reason', 'suggestion_exists',
      'message', 'Accesso tramite suggerimento di connessione'
    );
  END IF;
  
  -- Nessun accesso consentito
  RETURN json_build_object(
    'has_access', false,
    'access_reason', 'no_shared_context',
    'message', 'Nessuna connessione o contesto condiviso trovato'
  );
END;
$function$
