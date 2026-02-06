CREATE TABLE IF NOT EXISTS public.stripe_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text UNIQUE NOT NULL,
  event_type text,
  payload jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stripe_webhooks ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.stripe_webhooks FROM PUBLIC;
REVOKE ALL ON TABLE public.stripe_webhooks FROM anon;
REVOKE ALL ON TABLE public.stripe_webhooks FROM authenticated;

GRANT SELECT, INSERT, UPDATE ON TABLE public.stripe_webhooks TO service_role;

CREATE POLICY "service_role_can_insert_stripe_webhooks"
ON public.stripe_webhooks
FOR INSERT
TO service_role
WITH CHECK (true);

CREATE POLICY "service_role_can_update_stripe_webhooks"
ON public.stripe_webhooks
FOR UPDATE
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "service_role_can_select_stripe_webhooks"
ON public.stripe_webhooks
FOR SELECT
TO service_role
USING (true);
