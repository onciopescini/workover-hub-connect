-- FASE 3: Enhancements - Database Schema

-- 1. Add SLA tracking to support_tickets
ALTER TABLE public.support_tickets
ADD COLUMN response_deadline TIMESTAMPTZ,
ADD COLUMN resolution_deadline TIMESTAMPTZ,
ADD COLUMN first_response_at TIMESTAMPTZ,
ADD COLUMN sla_status TEXT DEFAULT 'on_track' CHECK (sla_status IN ('on_track', 'at_risk', 'breached'));

-- Create index for SLA monitoring
CREATE INDEX idx_support_tickets_sla ON public.support_tickets(sla_status, response_deadline) WHERE sla_status != 'on_track';

-- Function to calculate SLA deadlines based on priority
CREATE OR REPLACE FUNCTION public.calculate_ticket_sla_deadlines()
RETURNS TRIGGER AS $$
BEGIN
  -- Set response and resolution deadlines based on priority
  CASE NEW.priority
    WHEN 'critical' THEN
      NEW.response_deadline := NEW.created_at + INTERVAL '1 hour';
      NEW.resolution_deadline := NEW.created_at + INTERVAL '4 hours';
    WHEN 'high' THEN
      NEW.response_deadline := NEW.created_at + INTERVAL '4 hours';
      NEW.resolution_deadline := NEW.created_at + INTERVAL '24 hours';
    WHEN 'normal' THEN
      NEW.response_deadline := NEW.created_at + INTERVAL '24 hours';
      NEW.resolution_deadline := NEW.created_at + INTERVAL '72 hours';
    WHEN 'low' THEN
      NEW.response_deadline := NEW.created_at + INTERVAL '48 hours';
      NEW.resolution_deadline := NEW.created_at + INTERVAL '7 days';
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-calculate SLA deadlines on ticket creation
CREATE TRIGGER set_ticket_sla_deadlines
  BEFORE INSERT ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_ticket_sla_deadlines();

-- Function to update SLA status
CREATE OR REPLACE FUNCTION public.update_ticket_sla_status()
RETURNS void AS $$
BEGIN
  UPDATE public.support_tickets
  SET sla_status = CASE
    WHEN status IN ('resolved', 'closed') THEN 'on_track'
    WHEN NOW() > resolution_deadline THEN 'breached'
    WHEN NOW() > response_deadline AND first_response_at IS NULL THEN 'breached'
    WHEN NOW() > (response_deadline - INTERVAL '2 hours') THEN 'at_risk'
    ELSE 'on_track'
  END
  WHERE status NOT IN ('resolved', 'closed')
    AND sla_status != 'breached';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create notification_preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  channel TEXT NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app', 'email', 'both')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, notification_type)
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users manage their notification preferences"
  ON public.notification_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create index
CREATE INDEX idx_notification_preferences_user ON public.notification_preferences(user_id);

-- Function to check if notification should be sent
CREATE OR REPLACE FUNCTION public.should_send_notification(
  p_user_id UUID,
  p_notification_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  pref_enabled BOOLEAN;
BEGIN
  SELECT enabled INTO pref_enabled
  FROM public.notification_preferences
  WHERE user_id = p_user_id
    AND notification_type = p_notification_type;
  
  -- If no preference set, default to true
  RETURN COALESCE(pref_enabled, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Create RPC function for server-side message search
CREATE OR REPLACE FUNCTION public.search_messages(
  p_user_id UUID,
  p_search_query TEXT,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE(
  message_id UUID,
  conversation_id UUID,
  conversation_type TEXT,
  sender_id UUID,
  content TEXT,
  created_at TIMESTAMPTZ,
  space_title TEXT,
  other_user_name TEXT,
  relevance REAL
) AS $$
BEGIN
  RETURN QUERY
  -- Search in booking messages
  SELECT 
    m.id as message_id,
    m.booking_id as conversation_id,
    'booking'::TEXT as conversation_type,
    m.sender_id,
    m.content,
    m.created_at,
    s.title as space_title,
    CONCAT(p.first_name, ' ', p.last_name) as other_user_name,
    ts_rank(to_tsvector('italian', m.content), plainto_tsquery('italian', p_search_query)) as relevance
  FROM public.messages m
  JOIN public.bookings b ON b.id = m.booking_id
  JOIN public.spaces s ON s.id = b.space_id
  LEFT JOIN public.profiles p ON p.id = CASE 
    WHEN m.sender_id = p_user_id THEN 
      (SELECT user_id FROM bookings WHERE id = m.booking_id)
    ELSE m.sender_id
  END
  WHERE (b.user_id = p_user_id OR s.host_id = p_user_id)
    AND to_tsvector('italian', m.content) @@ plainto_tsquery('italian', p_search_query)
  
  UNION ALL
  
  -- Search in private messages
  SELECT 
    pm.id as message_id,
    pm.chat_id as conversation_id,
    'private'::TEXT as conversation_type,
    pm.sender_id,
    pm.content,
    pm.created_at,
    NULL::TEXT as space_title,
    CONCAT(p.first_name, ' ', p.last_name) as other_user_name,
    ts_rank(to_tsvector('italian', pm.content), plainto_tsquery('italian', p_search_query)) as relevance
  FROM public.private_messages pm
  JOIN public.private_chats pc ON pc.id = pm.chat_id
  LEFT JOIN public.profiles p ON p.id = CASE 
    WHEN pm.sender_id = p_user_id THEN 
      (CASE WHEN pc.participant_1_id = p_user_id THEN pc.participant_2_id ELSE pc.participant_1_id END)
    ELSE pm.sender_id
  END
  WHERE (pc.participant_1_id = p_user_id OR pc.participant_2_id = p_user_id)
    AND to_tsvector('italian', pm.content) @@ plainto_tsquery('italian', p_search_query)
  
  ORDER BY relevance DESC, created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON TABLE public.notification_preferences IS 'User preferences for notification delivery';
COMMENT ON FUNCTION public.search_messages IS 'Full-text search across all user messages with relevance ranking';
COMMENT ON FUNCTION public.should_send_notification IS 'Check if notification should be sent based on user preferences';