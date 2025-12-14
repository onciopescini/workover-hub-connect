-- Migration to add trigger for message broadcast
-- This trigger invokes the message-broadcast Edge Function on INSERT into public.messages

CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";

CREATE OR REPLACE FUNCTION "public"."handle_new_message"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- We invoke the Edge Function using pg_net.
  -- Note: The function 'message-broadcast' is configured with verify_jwt=false
  -- so we do not need to sign the request with a JWT.
  -- This simplifies the trigger logic significantly.
  PERFORM
    net.http_post(
      url := 'https://khtqwzvrxzsgfhsslwyz.supabase.co/functions/v1/message-broadcast',
      headers := jsonb_build_object('Content-Type', 'application/json'),
      body := jsonb_build_object('record', to_jsonb(NEW))
    );

  RETURN NEW;
END;
$$;

CREATE TRIGGER "on_message_created"
  AFTER INSERT ON "public"."messages"
  FOR EACH ROW
  EXECUTE FUNCTION "public"."handle_new_message"();
