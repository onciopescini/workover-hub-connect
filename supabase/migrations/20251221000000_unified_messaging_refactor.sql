-- Migration: Unified Messaging Refactor
-- Description: Updates conversations schema (FK to workspaces), enables Realtime, and fixes notification triggers.

-- 0. Ensure 'read' column exists on messages
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'read') THEN
    ALTER TABLE public.messages ADD COLUMN "read" BOOLEAN DEFAULT false;
  END IF;
END $$;

-- 1. Fix Conversations Foreign Key (spaces -> workspaces)
DO $$
BEGIN
  -- Cleanup: Remove invalid space_id references before enforcing FK
  -- This ensures the ALTER TABLE command won't fail due to existing bad data
  UPDATE public.conversations
  SET space_id = NULL
  WHERE space_id IS NOT NULL
    AND space_id NOT IN (SELECT id FROM public.workspaces);

  -- Drop constraint if it exists (pointing to spaces)
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'conversations_space_id_fkey') THEN
    ALTER TABLE public.conversations DROP CONSTRAINT conversations_space_id_fkey;
  END IF;

  -- Add new constraint pointing to workspaces
  -- We assume 'space_id' column stores the Workspace ID.
  ALTER TABLE public.conversations
    ADD CONSTRAINT conversations_space_id_fkey
    FOREIGN KEY (space_id)
    REFERENCES public.workspaces(id)
    ON DELETE SET NULL;
END $$;

-- 2. Enable Realtime for critical messaging tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations, public.messages, public.bookings, public.user_notifications;

-- 3. Refactor Notification Trigger
-- Drop old trigger/function to ensure clean slate
DROP TRIGGER IF EXISTS trg_notify_new_message ON public.messages;
DROP FUNCTION IF EXISTS public.handle_new_message_notification();

CREATE OR REPLACE FUNCTION public.handle_new_message_notification_v2()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_host_id UUID;
  v_coworker_id UUID;
  v_recipient_id UUID;
  v_sender_name TEXT;
BEGIN
  -- 1. Identify Conversation Participants
  IF NEW.conversation_id IS NOT NULL THEN
    SELECT host_id, coworker_id
    INTO v_host_id, v_coworker_id
    FROM public.conversations
    WHERE id = NEW.conversation_id;
  ELSE
    -- Fallback: If conversation_id is missing (should not happen with new logic), try to find via booking
    IF NEW.booking_id IS NOT NULL THEN
       SELECT c.host_id, c.coworker_id
       INTO v_host_id, v_coworker_id
       FROM public.bookings b
       JOIN public.conversations c ON c.booking_id = b.id
       WHERE b.id = NEW.booking_id
       LIMIT 1;
    END IF;
  END IF;

  -- If still not found, we cannot notify safely
  IF v_host_id IS NULL OR v_coworker_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- 2. Determine Recipient
  -- Send to the participant who is NOT the sender
  IF NEW.sender_id = v_host_id THEN
    v_recipient_id := v_coworker_id;
  ELSIF NEW.sender_id = v_coworker_id THEN
    v_recipient_id := v_host_id;
  ELSE
    -- Sender is external, default to Host
    v_recipient_id := v_host_id;
  END IF;

  -- Sanity check: Don't notify self
  IF v_recipient_id = NEW.sender_id THEN
    RETURN NEW;
  END IF;

  -- 3. Get Sender Name
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
    COALESCE(v_sender_name, 'Un utente') || ' ti ha inviato un messaggio.',
    jsonb_build_object(
      'conversation_id', NEW.conversation_id,
      'booking_id', NEW.booking_id,
      'message_id', NEW.id,
      'sender_id', NEW.sender_id
    )
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create message notification: %', SQLERRM;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_new_message
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_message_notification_v2();

-- 4. Update get_or_create_conversation for Networking (Bidirectional check)
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
  p_host_id uuid,
  p_coworker_id uuid,
  p_space_id uuid,
  p_booking_id uuid
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  -- 1. Check direct match
  select id into v_id
  from public.conversations
  where host_id = p_host_id
    and coworker_id = p_coworker_id
    and coalesce(booking_id, '00000000-0000-0000-0000-000000000000'::uuid) = coalesce(p_booking_id, '00000000-0000-0000-0000-000000000000'::uuid)
    and coalesce(space_id,   '00000000-0000-0000-0000-000000000000'::uuid) = coalesce(p_space_id,   '00000000-0000-0000-0000-000000000000'::uuid)
  limit 1;

  if v_id is not null then return v_id; end if;

  -- 2. If Networking (No Space/Booking), check reverse match
  if p_booking_id is null and p_space_id is null then
    select id into v_id
    from public.conversations
    where host_id = p_coworker_id
      and coworker_id = p_host_id
      and booking_id is null
      and space_id is null
    limit 1;

    if v_id is not null then return v_id; end if;
  end if;

  -- 3. Create new conversation (using provided order)
  insert into public.conversations(host_id, coworker_id, space_id, booking_id)
  values (p_host_id, p_coworker_id, p_space_id, p_booking_id)
  returning id into v_id;

  return v_id;
end $$;
