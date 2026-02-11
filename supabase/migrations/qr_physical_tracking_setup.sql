-- =====================================================
-- STEP 1: QR Physical Tracking + Liquid Availability
-- =====================================================

-- 1) Extend booking_status enum safely
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'checked_out'
      AND enumtypid = 'booking_status'::regtype
  ) THEN
    ALTER TYPE public.booking_status ADD VALUE 'checked_out';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'no_show'
      AND enumtypid = 'booking_status'::regtype
  ) THEN
    ALTER TYPE public.booking_status ADD VALUE 'no_show';
  END IF;
END;
$$;

-- 2) Add physical tracking + QR fields on bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS checked_out_at timestamptz,
  ADD COLUMN IF NOT EXISTS checked_out_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS no_show boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS qr_code_token uuid;

-- Unique QR token when present
CREATE UNIQUE INDEX IF NOT EXISTS bookings_qr_code_token_key
  ON public.bookings (qr_code_token)
  WHERE qr_code_token IS NOT NULL;

-- 3) Auto-generate QR token when booking becomes confirmed
CREATE OR REPLACE FUNCTION public.ensure_booking_qr_code_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'confirmed'
     AND NEW.qr_code_token IS NULL
     AND (TG_OP = 'INSERT' OR COALESCE(OLD.status::text, '') <> 'confirmed') THEN
    NEW.qr_code_token := gen_random_uuid();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bookings_ensure_qr_code_token ON public.bookings;
CREATE TRIGGER trg_bookings_ensure_qr_code_token
  BEFORE INSERT OR UPDATE OF status ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_booking_qr_code_token();

-- Backfill existing confirmed bookings without a token
UPDATE public.bookings
SET qr_code_token = gen_random_uuid()
WHERE status = 'confirmed'
  AND qr_code_token IS NULL;

-- 4) Update status transition guard to include physical flow states
CREATE OR REPLACE FUNCTION public.validate_booking_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  valid_transition BOOLEAN := FALSE;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('pending', 'pending_approval', 'confirmed') THEN
      RAISE EXCEPTION 'New bookings must have status "pending", "pending_approval" or "confirmed"';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  CASE OLD.status
    WHEN 'pending' THEN
      valid_transition := NEW.status IN ('pending_payment', 'pending_approval', 'confirmed', 'cancelled');
    WHEN 'pending_approval' THEN
      valid_transition := NEW.status IN ('pending_payment', 'confirmed', 'cancelled');
    WHEN 'pending_payment' THEN
      valid_transition := NEW.status IN ('confirmed', 'cancelled');
    WHEN 'confirmed' THEN
      valid_transition := NEW.status IN ('checked_in', 'no_show', 'served', 'frozen', 'cancelled');
    WHEN 'checked_in' THEN
      valid_transition := NEW.status IN ('checked_out', 'served', 'frozen', 'cancelled');
    WHEN 'checked_out' THEN
      valid_transition := FALSE;
    WHEN 'no_show' THEN
      valid_transition := FALSE;
    WHEN 'served' THEN
      valid_transition := FALSE;
    WHEN 'frozen' THEN
      valid_transition := NEW.status = 'cancelled';
    WHEN 'cancelled' THEN
      valid_transition := FALSE;
    ELSE
      valid_transition := FALSE;
  END CASE;

  IF NOT valid_transition THEN
    RAISE EXCEPTION 'Invalid booking status transition from % to %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$;

-- 5) Liquid availability: checked_out/no_show no longer block slots
CREATE OR REPLACE FUNCTION public.validate_and_reserve_slot(
  space_id_param UUID,
  date_param DATE,
  start_time_param TIME,
  end_time_param TIME,
  user_id_param UUID,
  confirmation_type_param TEXT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  conflict_count INTEGER := 0;
  reservation_time TIMESTAMPTZ := NOW() + INTERVAL '5 minutes';
  new_booking_id UUID;
  space_host_id UUID;
  space_title TEXT;
  space_confirmation_type TEXT;
BEGIN
  IF space_id_param IS NULL OR date_param IS NULL OR start_time_param IS NULL
     OR end_time_param IS NULL OR user_id_param IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'missing_required_params'
    );
  END IF;

  IF start_time_param >= end_time_param THEN
    RETURN json_build_object(
      'success', false,
      'error', 'invalid_time_range'
    );
  END IF;

  IF public.check_self_booking(space_id_param, user_id_param) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'cannot_book_own_space'
    );
  END IF;

  SELECT host_id, title, confirmation_type
  INTO space_host_id, space_title, space_confirmation_type
  FROM spaces
  WHERE id = space_id_param
    AND deleted_at IS NULL
    AND published = true;

  IF space_host_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'space_not_found'
    );
  END IF;

  PERFORM pg_advisory_xact_lock(
    hashtext(space_id_param::text || date_param::text)
  );

  PERFORM cleanup_expired_slots();

  SELECT COUNT(*) INTO conflict_count
  FROM bookings
  WHERE space_id = space_id_param
    AND booking_date = date_param
    AND deleted_at IS NULL
    AND status IN ('pending', 'pending_approval', 'pending_payment', 'confirmed', 'checked_in', 'served', 'frozen')
    AND (
      (start_time < end_time_param AND end_time > start_time_param)
      OR
      (slot_reserved_until > NOW() AND start_time < end_time_param AND end_time > start_time_param)
    );

  IF conflict_count > 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'slot_unavailable'
    );
  END IF;

  INSERT INTO bookings (
    space_id,
    user_id,
    booking_date,
    start_time,
    end_time,
    status,
    slot_reserved_until,
    created_at,
    updated_at
  ) VALUES (
    space_id_param,
    user_id_param,
    date_param,
    start_time_param,
    end_time_param,
    'pending'::booking_status,
    reservation_time,
    NOW(),
    NOW()
  )
  RETURNING id INTO new_booking_id;

  RETURN json_build_object(
    'success', true,
    'booking_id', new_booking_id,
    'slot_reserved_until', reservation_time,
    'host_id', space_host_id,
    'space_title', space_title,
    'confirmation_type', COALESCE(confirmation_type_param, space_confirmation_type)
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'error', 'internal_error',
    'message', SQLERRM
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.validate_and_reserve_slot(uuid, date, time, time, uuid, text) TO authenticated;

-- 6) Host scan check-in RPC
CREATE OR REPLACE FUNCTION public.host_scan_checkin(
  p_qr_token uuid,
  p_host_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_now timestamptz := now();
  v_start_ts timestamptz;
BEGIN
  IF p_qr_token IS NULL OR p_host_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'missing_required_params');
  END IF;

  SELECT b.*
  INTO v_booking
  FROM public.bookings b
  INNER JOIN public.spaces s ON s.id = b.space_id
  WHERE b.qr_code_token = p_qr_token
    AND s.host_id = p_host_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'booking_not_found_or_forbidden');
  END IF;

  IF v_booking.status <> 'confirmed' THEN
    RETURN json_build_object('success', false, 'error', 'invalid_booking_status', 'status', v_booking.status);
  END IF;

  v_start_ts := (v_booking.booking_date::text || ' ' || v_booking.start_time::text)::timestamptz;

  IF v_now < (v_start_ts - interval '15 minutes') THEN
    RETURN json_build_object('success', false, 'error', 'too_early_for_checkin');
  END IF;

  UPDATE public.bookings
  SET status = 'checked_in',
      checked_in_at = v_now,
      checked_in_by = p_host_id,
      updated_at = v_now
  WHERE id = v_booking.id;

  RETURN json_build_object(
    'success', true,
    'booking_id', v_booking.id,
    'status', 'checked_in',
    'checked_in_at', v_now
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.host_scan_checkin(uuid, uuid) TO authenticated;

-- 7) Host scan check-out RPC (liquid availability unlock)
CREATE OR REPLACE FUNCTION public.host_scan_checkout(
  p_qr_token uuid,
  p_host_id uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking public.bookings%ROWTYPE;
  v_now timestamptz := now();
BEGIN
  IF p_qr_token IS NULL OR p_host_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'missing_required_params');
  END IF;

  SELECT b.*
  INTO v_booking
  FROM public.bookings b
  INNER JOIN public.spaces s ON s.id = b.space_id
  WHERE b.qr_code_token = p_qr_token
    AND s.host_id = p_host_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'booking_not_found_or_forbidden');
  END IF;

  IF v_booking.status <> 'checked_in' THEN
    RETURN json_build_object('success', false, 'error', 'invalid_booking_status', 'status', v_booking.status);
  END IF;

  UPDATE public.bookings
  SET status = 'checked_out',
      checked_out_at = v_now,
      checked_out_by = p_host_id,
      updated_at = v_now
  WHERE id = v_booking.id;

  RETURN json_build_object(
    'success', true,
    'booking_id', v_booking.id,
    'status', 'checked_out',
    'checked_out_at', v_now
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.host_scan_checkout(uuid, uuid) TO authenticated;
