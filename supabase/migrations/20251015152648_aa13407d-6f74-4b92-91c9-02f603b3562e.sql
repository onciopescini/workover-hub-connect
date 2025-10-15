-- Fix A.3: Webhook retry logic infrastructure
-- Prevents lost Stripe events by tracking and retrying failed webhooks

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text UNIQUE NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  retry_count integer NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

-- Indices for performance
CREATE INDEX idx_webhook_events_status ON public.webhook_events(status, created_at);
CREATE INDEX idx_webhook_events_event_id ON public.webhook_events(event_id);
CREATE INDEX idx_webhook_events_retry ON public.webhook_events(status, retry_count) 
WHERE status = 'failed' AND retry_count < 3;

-- RLS policies
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage webhook events"
ON public.webhook_events FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_webhook_events_updated_at
BEFORE UPDATE ON public.webhook_events
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to increment retry count safely
CREATE OR REPLACE FUNCTION public.increment_webhook_retry(event_uuid uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.webhook_events
  SET retry_count = retry_count + 1,
      updated_at = NOW()
  WHERE id = event_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;