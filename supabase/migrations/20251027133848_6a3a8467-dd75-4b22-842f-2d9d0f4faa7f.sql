-- Fix log_ticket_admin_action function to use correct action_type and target_type values
CREATE OR REPLACE FUNCTION public.log_ticket_admin_action()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF public.is_admin(auth.uid()) THEN
    -- Log status changes
    IF OLD.status != NEW.status THEN
      INSERT INTO public.admin_actions_log (
        admin_id, 
        action_type, 
        target_type, 
        target_id,
        description, 
        metadata
      ) VALUES (
        auth.uid(),
        'ticket_update',  -- Fixed: was 'update'
        'ticket',          -- Fixed: was 'support_ticket'
        NEW.id,
        'Ticket status changed from ' || OLD.status || ' to ' || NEW.status,
        jsonb_build_object(
          'old_status', OLD.status,
          'new_status', NEW.status,
          'subject', NEW.subject,
          'action', 'status_change'
        )
      );
    END IF;
    
    -- Log responses (when response is added or updated)
    IF (OLD.response IS NULL OR OLD.response = '') AND 
       (NEW.response IS NOT NULL AND NEW.response != '') THEN
      INSERT INTO public.admin_actions_log (
        admin_id, 
        action_type, 
        target_type, 
        target_id,
        description, 
        metadata
      ) VALUES (
        auth.uid(),
        'ticket_update',
        'ticket',
        NEW.id,
        'Admin responded to ticket: ' || NEW.subject,
        jsonb_build_object(
          'subject', NEW.subject,
          'action', 'response_added',
          'response_length', length(NEW.response)
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;