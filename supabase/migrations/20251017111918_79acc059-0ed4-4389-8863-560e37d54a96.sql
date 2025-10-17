-- Enable admin full control on support_tickets
CREATE POLICY "Admins manage all tickets" ON public.support_tickets
FOR ALL TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Enable moderators to view tickets
CREATE POLICY "Moderators view tickets" ON public.support_tickets
FOR SELECT TO authenticated
USING (public.can_moderate_content(auth.uid()));

-- Add admin audit log for ticket updates
CREATE OR REPLACE FUNCTION public.log_ticket_admin_action()
RETURNS TRIGGER AS $$
BEGIN
  IF public.is_admin(auth.uid()) AND OLD.status != NEW.status THEN
    INSERT INTO public.admin_actions_log (
      admin_id, action_type, target_type, target_id,
      description, metadata
    ) VALUES (
      auth.uid(),
      'update',
      'support_ticket',
      NEW.id,
      'Ticket status changed from ' || OLD.status || ' to ' || NEW.status,
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'subject', NEW.subject
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER audit_ticket_updates
AFTER UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.log_ticket_admin_action();

-- Add assigned_to column
ALTER TABLE public.support_tickets
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

-- Create index for assigned tickets
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned 
  ON public.support_tickets(assigned_to, status) 
  WHERE assigned_to IS NOT NULL;

-- Function to auto-assign ticket when status changes to in_progress
CREATE OR REPLACE FUNCTION public.auto_assign_ticket()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'in_progress' AND OLD.status != 'in_progress' AND NEW.assigned_to IS NULL THEN
    NEW.assigned_to := auth.uid();
    NEW.assigned_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER auto_assign_on_progress
BEFORE UPDATE ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.auto_assign_ticket();

CREATE OR REPLACE FUNCTION public.get_support_metrics(days_back INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  WITH metrics AS (
    SELECT 
      COUNT(*) as total_tickets,
      COUNT(*) FILTER (WHERE status IN ('open', 'in_progress')) as open_tickets,
      AVG(EXTRACT(EPOCH FROM (first_response_at - created_at)) / 3600) as avg_response_time_hours,
      COUNT(*) FILTER (WHERE sla_status = 'breached') * 100.0 / NULLIF(COUNT(*), 0) as sla_breach_rate
    FROM public.support_tickets
    WHERE created_at > NOW() - (days_back || ' days')::INTERVAL
  ),
  category_stats AS (
    SELECT 
      category,
      COUNT(*) as count
    FROM public.support_tickets
    WHERE created_at > NOW() - (days_back || ' days')::INTERVAL
    GROUP BY category
  )
  SELECT JSONB_BUILD_OBJECT(
    'total_tickets', m.total_tickets,
    'open_tickets', m.open_tickets,
    'avg_response_time_hours', ROUND(COALESCE(m.avg_response_time_hours, 0)::numeric, 1),
    'sla_breach_rate', ROUND(COALESCE(m.sla_breach_rate, 0)::numeric, 1),
    'sla_target_hours', 24,
    'tickets_by_category', (
      SELECT JSONB_AGG(
        JSONB_BUILD_OBJECT('category', category, 'count', count)
      )
      FROM category_stats
    )
  )
  INTO result
  FROM metrics m;
  
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_support_metrics TO authenticated;

-- Schedule cron job to check SLA violations every 15 minutes
SELECT cron.schedule(
  'check-ticket-sla-violations',
  '*/15 * * * *',
  $$
  SELECT public.update_ticket_sla_status();
  $$
);

-- Create function to send SLA alerts
CREATE OR REPLACE FUNCTION public.send_sla_alerts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_record RECORD;
  ticket_record RECORD;
BEGIN
  FOR ticket_record IN
    SELECT id, subject, priority, sla_status, response_deadline, resolution_deadline
    FROM public.support_tickets
    WHERE sla_status IN ('at_risk', 'breached')
      AND status NOT IN ('resolved', 'closed')
  LOOP
    FOR admin_record IN
      SELECT id FROM public.profiles WHERE role = 'admin'
    LOOP
      INSERT INTO public.user_notifications (
        user_id, type, priority, title, content, metadata
      ) VALUES (
        admin_record.id,
        'sla_alert',
        'high',
        CASE 
          WHEN ticket_record.sla_status = 'breached' THEN '🚨 SLA VIOLATO'
          ELSE '⚠️ SLA A RISCHIO'
        END,
        'Ticket #' || ticket_record.id || ': ' || ticket_record.subject,
        jsonb_build_object(
          'ticket_id', ticket_record.id,
          'sla_status', ticket_record.sla_status,
          'deadline', COALESCE(ticket_record.response_deadline, ticket_record.resolution_deadline)
        )
      );
    END LOOP;
  END LOOP;
END;
$$;

SELECT cron.schedule(
  'send-sla-alerts',
  '0 */4 * * *',
  $$
  SELECT public.send_sla_alerts();
  $$
);

-- Add spam detection function
CREATE OR REPLACE FUNCTION public.check_ticket_spam(
  p_user_id UUID,
  p_message TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count INTEGER;
  duplicate_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM public.support_tickets
  WHERE user_id = p_user_id
    AND created_at > NOW() - INTERVAL '1 hour';
  
  IF recent_count >= 5 THEN
    RETURN TRUE;
  END IF;
  
  SELECT COUNT(*) INTO duplicate_count
  FROM public.support_tickets
  WHERE user_id = p_user_id
    AND message = p_message
    AND created_at > NOW() - INTERVAL '24 hours';
  
  IF duplicate_count > 0 THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.flag_spam_tickets()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.check_ticket_spam(NEW.user_id, NEW.message) THEN
    NEW.status := 'closed';
    
    INSERT INTO public.user_notifications (
      user_id, type, priority, title, content, metadata
    )
    SELECT id, 'spam_ticket', 'low', '⚠️ Ticket spam rilevato',
           'User ' || NEW.user_id || ' ha inviato un ticket spam',
           jsonb_build_object('ticket_id', NEW.id)
    FROM public.profiles WHERE role = 'admin';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER detect_spam_on_insert
BEFORE INSERT ON public.support_tickets
FOR EACH ROW
EXECUTE FUNCTION public.flag_spam_tickets();