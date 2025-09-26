-- Drop and recreate the review notification trigger to fix the "record b is not assigned yet" error
DROP TRIGGER IF EXISTS create_booking_review_notification ON public.booking_reviews;

-- Recreate the trigger function with proper variable assignment
CREATE OR REPLACE FUNCTION public.create_review_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  author_name TEXT := '';
  notification_title TEXT := '';
  notification_content TEXT := '';
BEGIN
  -- Get author name safely
  SELECT COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') 
  INTO author_name
  FROM public.profiles 
  WHERE id = NEW.author_id;
  
  -- Set notification content based on table
  IF TG_TABLE_NAME = 'booking_reviews' THEN
    notification_title := 'Nuova recensione ricevuta';
    notification_content := COALESCE(author_name, 'Un utente') || ' ha lasciato una recensione per la tua prenotazione';
  ELSE
    notification_title := 'Nuova recensione ricevuta';
    notification_content := COALESCE(author_name, 'Un utente') || ' ha lasciato una recensione per il tuo evento';
  END IF;
  
  -- Insert notification safely
  INSERT INTO public.user_notifications (
    user_id,
    type,
    title,
    content,
    metadata
  ) VALUES (
    NEW.target_id,
    'review',
    notification_title,
    notification_content,
    jsonb_build_object(
      'review_id', NEW.id,
      'author_id', NEW.author_id,
      'author_name', COALESCE(author_name, 'Unknown'),
      'review_type', TG_TABLE_NAME
    )
  );
  
  RETURN NEW;
EXCEPTION 
  WHEN OTHERS THEN
    -- Log error but don't fail the main operation
    RAISE WARNING 'Failed to create review notification: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER create_booking_review_notification
  AFTER INSERT ON public.booking_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.create_review_notification();