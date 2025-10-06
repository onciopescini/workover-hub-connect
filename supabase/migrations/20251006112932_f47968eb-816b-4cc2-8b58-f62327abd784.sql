-- Fix ORDER BY issue in refresh_user_suggestions function
CREATE OR REPLACE FUNCTION refresh_user_suggestions(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  suggestions_count INTEGER := 0;
BEGIN
  -- Delete existing suggestions for user
  DELETE FROM connection_suggestions WHERE user_id = p_user_id;
  
  -- Regenerate suggestions based on shared spaces
  WITH aggregated_suggestions AS (
    SELECT DISTINCT ON (b2.user_id)
      p_user_id as user_id,
      b2.user_id as suggested_user_id,
      'shared_space' as reason,
      50 as score,
      jsonb_build_object(
        'space_id', b1.space_id, 
        'space_title', s.title,
        'shared_bookings', COUNT(DISTINCT b2.id) OVER (PARTITION BY b2.user_id)
      ) as shared_context,
      COUNT(DISTINCT b2.id) OVER (PARTITION BY b2.user_id) as booking_count
    FROM bookings b1
    JOIN bookings b2 ON b1.space_id = b2.space_id AND b1.user_id != b2.user_id
    JOIN spaces s ON s.id = b1.space_id
    JOIN profiles p ON p.id = b2.user_id
    WHERE b1.user_id = p_user_id
      AND b2.user_id != p_user_id
      AND p.networking_enabled = true
      AND p.is_suspended = false
      -- Exclude existing connections
      AND NOT EXISTS (
        SELECT 1 FROM connections 
        WHERE (sender_id = p_user_id AND receiver_id = b2.user_id)
           OR (sender_id = b2.user_id AND receiver_id = p_user_id)
      )
    ORDER BY b2.user_id, booking_count DESC
  ),
  new_suggestions AS (
    INSERT INTO connection_suggestions (user_id, suggested_user_id, reason, score, shared_context)
    SELECT 
      user_id,
      suggested_user_id,
      reason,
      score,
      shared_context
    FROM aggregated_suggestions
    ORDER BY booking_count DESC
    LIMIT 20
    RETURNING 1
  )
  SELECT COUNT(*) INTO suggestions_count FROM new_suggestions;
  
  -- Return result
  RETURN jsonb_build_object(
    'success', true,
    'count', suggestions_count,
    'user_id', p_user_id,
    'timestamp', now()
  );
END;
$$;