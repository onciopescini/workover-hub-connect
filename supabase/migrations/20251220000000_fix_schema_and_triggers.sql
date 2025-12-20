-- Fix Schema, Triggers, and Foreign Keys
-- Migration ID: 20251220000000_fix_schema_and_triggers

-- ============================================
-- 1. Fix Bookings Foreign Key (Task 1)
-- ============================================

-- Drop old constraint if it exists (generic name or specific)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'bookings_space_id_fkey') THEN
    ALTER TABLE public.bookings DROP CONSTRAINT bookings_space_id_fkey;
  END IF;
  -- Also check for any constraint pointing to 'spaces'
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'bookings_space_id_fkey1') THEN
     ALTER TABLE public.bookings DROP CONSTRAINT bookings_space_id_fkey1;
  END IF;
END $$;

-- Add correct FK to public.workspaces
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_space_id_fkey
  FOREIGN KEY (space_id)
  REFERENCES public.workspaces(id)
  ON DELETE SET NULL; -- Or CASCADE, depending on business rules. SET NULL is safer for history.


-- ============================================
-- 2. Fix Message Notification Trigger (Task 2)
-- ============================================

-- Drop the old trigger if it exists (it was causing the issue)
DROP TRIGGER IF EXISTS on_message_created ON public.messages;
DROP FUNCTION IF EXISTS public.handle_new_message();

-- Create a robust PL/PGSQL function to handle notifications internally
CREATE OR REPLACE FUNCTION public.handle_new_message_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_user_id UUID;
  v_host_id UUID;
  v_space_title TEXT;
  v_recipient_id UUID;
  v_sender_name TEXT;
  v_booking_record RECORD;
BEGIN
  -- 1. Fetch Booking and Workspace details
  SELECT b.user_id, w.host_id, w.name
  INTO v_booking_user_id, v_host_id, v_space_title
  FROM public.bookings b
  JOIN public.workspaces w ON w.id = b.space_id
  WHERE b.id = NEW.booking_id;

  IF NOT FOUND THEN
    -- Booking or Workspace not found, cannot notify
    RETURN NEW;
  END IF;

  -- 2. Determine Recipient
  IF NEW.sender_id = v_booking_user_id THEN
    v_recipient_id := v_host_id;
  ELSIF NEW.sender_id = v_host_id THEN
    v_recipient_id := v_booking_user_id;
  ELSE
    -- Sender is neither host nor guest (admin?), default to guest if admin, or ignore
    -- For now, ignore to prevent errors
    RETURN NEW;
  END IF;

  -- 3. Get Sender Name (for the notification body)
  SELECT CONCAT(first_name, ' ', last_name)
  INTO v_sender_name
  FROM public.profiles
  WHERE id = NEW.sender_id;

  -- 4. Insert Notification
  INSERT INTO public.user_notifications (
    user_id,
    type,
    title,
    content,
    metadata
  ) VALUES (
    v_recipient_id,
    'message',
    'Nuovo messaggio',
    COALESCE(v_sender_name, 'Un utente') || ' ti ha inviato un messaggio per ' || COALESCE(v_space_title, 'una prenotazione'),
    jsonb_build_object(
      'booking_id', NEW.booking_id,
      'sender_id', NEW.sender_id,
      'message_id', NEW.id
    )
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error safely without blocking the message insert
    RAISE WARNING 'Failed to create message notification: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create the new trigger
CREATE TRIGGER trg_notify_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_message_notification();
