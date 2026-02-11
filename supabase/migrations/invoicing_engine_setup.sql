-- Modulo 3: Invoicing Engine (Automazione Fiscale)
-- Outbox queue + trigger idempotente su incasso Platform Fee

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typname = 'invoice_queue_status_enum'
      AND n.nspname = 'public'
  ) THEN
    CREATE TYPE public.invoice_queue_status_enum AS ENUM (
      'pending',
      'processing',
      'completed',
      'failed'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.platform_fee_invoices_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL UNIQUE REFERENCES public.payments(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  platform_fee_amount NUMERIC(12, 2) NOT NULL CHECK (platform_fee_amount > 0),
  currency TEXT NOT NULL,
  status public.invoice_queue_status_enum NOT NULL DEFAULT 'pending',
  error_log TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_fee_invoices_queue_status_created_at
  ON public.platform_fee_invoices_queue (status, created_at DESC);

ALTER TABLE public.platform_fee_invoices_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_fee_invoices_queue_admin_all ON public.platform_fee_invoices_queue;
CREATE POLICY platform_fee_invoices_queue_admin_all
ON public.platform_fee_invoices_queue
FOR ALL
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.enqueue_platform_fee_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_host_id UUID;
BEGIN
  IF NEW.payment_status_enum = 'succeeded'
     AND OLD.payment_status_enum IS DISTINCT FROM 'succeeded'
     AND COALESCE(NEW.platform_fee, 0) > 0 THEN
    SELECT s.host_id
      INTO v_host_id
    FROM public.bookings b
    JOIN public.spaces s ON s.id = b.space_id
    WHERE b.id = NEW.booking_id;

    IF v_host_id IS NOT NULL THEN
      INSERT INTO public.platform_fee_invoices_queue (
        payment_id,
        booking_id,
        host_id,
        platform_fee_amount,
        currency,
        status
      )
      VALUES (
        NEW.id,
        NEW.booking_id,
        v_host_id,
        NEW.platform_fee,
        NEW.currency,
        'pending'
      )
      ON CONFLICT (payment_id) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_platform_fee_invoice ON public.payments;
CREATE TRIGGER trg_enqueue_platform_fee_invoice
AFTER UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.enqueue_platform_fee_invoice();

CREATE OR REPLACE FUNCTION public.admin_process_invoice_queue(queue_id UUID)
RETURNS public.platform_fee_invoices_queue
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_queue_row public.platform_fee_invoices_queue;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied: admin privileges required';
  END IF;

  UPDATE public.platform_fee_invoices_queue
  SET status = 'completed',
      error_log = NULL
  WHERE id = queue_id
    AND status <> 'completed'
  RETURNING * INTO v_queue_row;

  IF v_queue_row.id IS NULL THEN
    SELECT *
      INTO v_queue_row
    FROM public.platform_fee_invoices_queue
    WHERE id = queue_id;
  END IF;

  RETURN v_queue_row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_process_invoice_queue(UUID) TO authenticated;

CREATE OR REPLACE VIEW public.admin_platform_fee_invoices_queue_view AS
SELECT
  q.id,
  q.payment_id,
  q.booking_id,
  q.host_id,
  q.platform_fee_amount,
  q.currency,
  q.status,
  q.error_log,
  q.created_at,
  p.first_name,
  p.last_name,
  p.vat_number,
  public.get_email_by_id(q.host_id) AS email
FROM public.platform_fee_invoices_queue q
JOIN public.profiles p ON p.id = q.host_id;

GRANT SELECT ON public.admin_platform_fee_invoices_queue_view TO authenticated;
