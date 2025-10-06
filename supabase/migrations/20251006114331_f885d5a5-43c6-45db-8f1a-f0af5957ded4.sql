-- Fix refresh_user_suggestions with proper CTEs and no DISTINCT in window functions
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
  
  -- Regenerate suggestions based on shared spaces (last 90 days)
  WITH base AS (
    SELECT 
      p_user_id as user_id,
      b2.user_id as suggested_user_id,
      b1.space_id,
      s.title as space_title,
      b2.id as booking_id
    FROM bookings b1
    JOIN bookings b2 ON b1.space_id = b2.space_id AND b1.user_id != b2.user_id
    JOIN spaces s ON s.id = b1.space_id
    JOIN profiles p ON p.id = b2.user_id
    WHERE b1.user_id = p_user_id
      AND b2.user_id != p_user_id
      AND p.networking_enabled = true
      AND p.is_suspended = false
      AND b1.created_at > now() - interval '90 days'
      -- Exclude existing connections
      AND NOT EXISTS (
        SELECT 1 FROM connections 
        WHERE (sender_id = p_user_id AND receiver_id = b2.user_id)
           OR (sender_id = b2.user_id AND receiver_id = p_user_id)
      )
  ),
  counts AS (
    SELECT 
      user_id,
      suggested_user_id,
      COUNT(DISTINCT booking_id) as shared_bookings
    FROM base
    GROUP BY user_id, suggested_user_id
  ),
  reps AS (
    SELECT DISTINCT ON (suggested_user_id)
      suggested_user_id,
      space_id,
      space_title
    FROM base
  ),
  new_suggestions AS (
    INSERT INTO connection_suggestions (user_id, suggested_user_id, reason, score, shared_context)
    SELECT 
      c.user_id,
      c.suggested_user_id,
      'shared_space' as reason,
      LEAST(50 + (c.shared_bookings * 10), 100) as score,
      jsonb_build_object(
        'space_id', r.space_id,
        'space_title', r.space_title,
        'shared_bookings', c.shared_bookings
      ) as shared_context
    FROM counts c
    JOIN reps r ON r.suggested_user_id = c.suggested_user_id
    ORDER BY c.shared_bookings DESC
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