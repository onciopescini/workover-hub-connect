-- =====================================================
-- NETWORKING STATS RPC
-- Purpose: Efficient aggregated stats for dashboard
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_networking_stats(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  messages_count INTEGER;
  profile_views_count INTEGER;
  connection_rate DECIMAL(5,2);
  total_requests INTEGER;
  accepted_requests INTEGER;
BEGIN
  -- 1. Count messages sent/received in last 7 days
  SELECT COUNT(*) INTO messages_count
  FROM messages m
  JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
  WHERE cp.user_id = p_user_id
    AND m.created_at > NOW() - INTERVAL '7 days';

  -- 2. Get profile views (last 30 days, distinct viewers)
  SELECT COUNT(DISTINCT viewer_id) INTO profile_views_count
  FROM profile_views
  WHERE profile_id = p_user_id
    AND viewed_at > NOW() - INTERVAL '30 days'
    AND viewer_id IS NOT NULL;

  -- 3. Calculate connection acceptance rate
  -- Requests sent by user
  SELECT COUNT(*) INTO total_requests
  FROM connections
  WHERE sender_id = p_user_id;

  SELECT COUNT(*) INTO accepted_requests
  FROM connections
  WHERE sender_id = p_user_id AND status = 'accepted';

  IF total_requests > 0 THEN
    connection_rate := (accepted_requests::DECIMAL / total_requests) * 100;
  ELSE
    connection_rate := 0;
  END IF;

  result := jsonb_build_object(
    'messagesThisWeek', COALESCE(messages_count, 0),
    'profileViews', COALESCE(profile_views_count, 0),
    'connectionRate', ROUND(COALESCE(connection_rate, 0))
  );

  RETURN result;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_networking_stats(UUID) TO authenticated;