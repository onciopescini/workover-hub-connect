-- Enterprise notifications architecture
-- 1) Notifications table hardening/extension
-- 2) Event triggers for bookings/disputes/payments

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'notification_type'
  ) THEN
    CREATE TYPE public.notification_type AS ENUM (
      'booking_update',
      'payment_action',
      'dispute_alert',
      'system_alert'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'system_alert',
  title text,
  message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  email_sent_at timestamptz,
  push_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS message text,
  ADD COLUMN IF NOT EXISTS read_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS push_sent_at timestamptz;

ALTER TABLE public.notifications
  ALTER COLUMN metadata SET DEFAULT '{}'::jsonb;

UPDATE public.notifications
SET type = 'system_alert'
WHERE type NOT IN ('booking_update', 'payment_action', 'dispute_alert', 'system_alert');

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notifications'
      AND column_name = 'is_read'
  ) THEN
    UPDATE public.notifications
    SET read_at = COALESCE(read_at, created_at)
    WHERE is_read = true
      AND read_at IS NULL;
  END IF;
END
$$;

ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('booking_update', 'payment_action', 'dispute_alert', 'system_alert'));

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'notifications_user_id_fkey_profiles'
  ) THEN
    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_user_id_fkey_profiles
      FOREIGN KEY (user_id)
      REFERENCES public.profiles(id)
      ON DELETE CASCADE;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at
  ON public.notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_delivery_pending
  ON public.notifications(created_at)
  WHERE email_sent_at IS NULL OR push_sent_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can mark own notifications read" ON public.notifications;
CREATE POLICY "Users can mark own notifications read"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Helper function for consistent notification inserts
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id uuid,
  p_type public.notification_type,
  p_title text,
  p_message text,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    metadata
  ) VALUES (
    p_user_id,
    p_type::text,
    p_title,
    p_message,
    COALESCE(p_metadata, '{}'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_notification(uuid, public.notification_type, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_notification(uuid, public.notification_type, text, text, jsonb) TO service_role;

-- Booking notifications trigger
CREATE OR REPLACE FUNCTION public.handle_booking_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_host_id uuid;
  v_space_title text;
BEGIN
  IF TG_OP <> 'UPDATE' OR NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT s.host_id, s.title
  INTO v_host_id, v_space_title
  FROM public.spaces s
  WHERE s.id = NEW.space_id;

  IF NEW.status = 'confirmed' THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'booking_update',
      'Prenotazione Confermata',
      'La tua prenotazione è stata confermata con successo.',
      jsonb_build_object('booking_id', NEW.id, 'space_id', NEW.space_id, 'space_title', v_space_title, 'status', NEW.status)
    );

    IF v_host_id IS NOT NULL THEN
      PERFORM public.create_notification(
        v_host_id,
        'booking_update',
        'Nuova Prenotazione',
        'Hai ricevuto una nuova prenotazione confermata.',
        jsonb_build_object('booking_id', NEW.id, 'space_id', NEW.space_id, 'space_title', v_space_title, 'status', NEW.status)
      );
    END IF;
  ELSIF NEW.status = 'cancelled' THEN
    IF COALESCE(NEW.cancelled_by_host, false) THEN
      PERFORM public.create_notification(
        NEW.user_id,
        'booking_update',
        'Prenotazione Cancellata',
        'La tua prenotazione è stata cancellata dall\'host.',
        jsonb_build_object('booking_id', NEW.id, 'space_id', NEW.space_id, 'space_title', v_space_title, 'status', NEW.status)
      );
    ELSE
      IF v_host_id IS NOT NULL THEN
        PERFORM public.create_notification(
          v_host_id,
          'booking_update',
          'Prenotazione Cancellata',
          'Il guest ha cancellato la prenotazione.',
          jsonb_build_object('booking_id', NEW.id, 'space_id', NEW.space_id, 'space_title', v_space_title, 'status', NEW.status)
        );
      END IF;
    END IF;
  ELSIF NEW.status = 'refunded' THEN
    PERFORM public.create_notification(
      NEW.user_id,
      'payment_action',
      'Rimborso emesso',
      'Il rimborso relativo alla prenotazione è stato emesso.',
      jsonb_build_object('booking_id', NEW.id, 'space_id', NEW.space_id, 'space_title', v_space_title, 'status', NEW.status)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_booking_notifications ON public.bookings;
CREATE TRIGGER trg_handle_booking_notifications
AFTER UPDATE OF status ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.handle_booking_notifications();

-- Dispute notifications trigger
CREATE OR REPLACE FUNCTION public.handle_dispute_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_host_id uuid;
  v_space_id uuid;
BEGIN
  IF TG_OP <> 'UPDATE' OR NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT b.space_id, s.host_id
  INTO v_space_id, v_host_id
  FROM public.bookings b
  LEFT JOIN public.spaces s ON s.id = b.space_id
  WHERE b.id = NEW.booking_id;

  IF NEW.status = 'open' THEN
    PERFORM public.create_notification(
      NEW.guest_id,
      'dispute_alert',
      'Controversia aperta',
      'La controversia è stata aperta e sarà presa in carico dal team.',
      jsonb_build_object('dispute_id', NEW.id, 'booking_id', NEW.booking_id, 'space_id', v_space_id, 'status', NEW.status)
    );

    IF v_host_id IS NOT NULL THEN
      PERFORM public.create_notification(
        v_host_id,
        'dispute_alert',
        'Controversia aperta',
        'È stata aperta una controversia su una prenotazione del tuo spazio.',
        jsonb_build_object('dispute_id', NEW.id, 'booking_id', NEW.booking_id, 'space_id', v_space_id, 'status', NEW.status)
      );
    END IF;
  ELSIF NEW.status = 'resolved' THEN
    PERFORM public.create_notification(
      NEW.guest_id,
      'dispute_alert',
      'Controversia risolta',
      'La controversia è stata risolta.',
      jsonb_build_object('dispute_id', NEW.id, 'booking_id', NEW.booking_id, 'space_id', v_space_id, 'status', NEW.status)
    );

    IF v_host_id IS NOT NULL THEN
      PERFORM public.create_notification(
        v_host_id,
        'dispute_alert',
        'Controversia risolta',
        'La controversia associata a una tua prenotazione è stata risolta.',
        jsonb_build_object('dispute_id', NEW.id, 'booking_id', NEW.booking_id, 'space_id', v_space_id, 'status', NEW.status)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_dispute_notifications ON public.disputes;
CREATE TRIGGER trg_handle_dispute_notifications
AFTER UPDATE OF status ON public.disputes
FOR EACH ROW
EXECUTE FUNCTION public.handle_dispute_notifications();

-- Payment notifications trigger
CREATE OR REPLACE FUNCTION public.handle_payment_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_host_id uuid;
  v_space_id uuid;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.payment_status, '') = COALESCE(OLD.payment_status, '')
     AND COALESCE(NEW.status, '') = COALESCE(OLD.status, '') THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.payment_status, NEW.status, '') <> 'failed' THEN
    RETURN NEW;
  END IF;

  SELECT b.space_id, s.host_id
  INTO v_space_id, v_host_id
  FROM public.bookings b
  LEFT JOIN public.spaces s ON s.id = b.space_id
  WHERE b.id = NEW.booking_id;

  PERFORM public.create_notification(
    NEW.user_id,
    'payment_action',
    'Pagamento non riuscito',
    'Il pagamento della prenotazione non è andato a buon fine. Riprova per completare la prenotazione.',
    jsonb_build_object('payment_id', NEW.id, 'booking_id', NEW.booking_id, 'space_id', v_space_id, 'status', COALESCE(NEW.payment_status, NEW.status))
  );

  IF v_host_id IS NOT NULL THEN
    PERFORM public.create_notification(
      v_host_id,
      'payment_action',
      'Pagamento fallito su prenotazione',
      'Il pagamento di una prenotazione del tuo spazio è fallito.',
      jsonb_build_object('payment_id', NEW.id, 'booking_id', NEW.booking_id, 'space_id', v_space_id, 'status', COALESCE(NEW.payment_status, NEW.status))
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_handle_payment_notifications ON public.payments;
CREATE TRIGGER trg_handle_payment_notifications
AFTER UPDATE OF payment_status, status ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.handle_payment_notifications();
