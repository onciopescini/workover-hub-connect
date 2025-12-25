-- Migration to disable blocking message triggers
-- We are transitioning to a frontend-driven notification system to avoid server-side failures.
-- This migration drops the triggers that were causing transaction rollbacks.

-- 1. Drop the main blocking trigger and its function
DROP TRIGGER IF EXISTS trg_notify_new_message ON public.messages;
DROP FUNCTION IF EXISTS public.handle_new_message_notification_v2();

-- 2. Drop the legacy trigger and its function (cleanup)
DROP TRIGGER IF EXISTS on_message_created ON public.messages;
DROP FUNCTION IF EXISTS public.handle_new_message();

-- 3. Ensure 'read' column exists (just in case, harmless idempotent check)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'messages' AND column_name = 'read') THEN
    ALTER TABLE public.messages ADD COLUMN "read" BOOLEAN DEFAULT false;
  END IF;
END $$;
