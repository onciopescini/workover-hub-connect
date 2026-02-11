-- Elimina le versioni precedenti (uuid, uuid) per evitare overload e conflitti RPC
DROP FUNCTION IF EXISTS public.host_scan_checkin(uuid, uuid);
DROP FUNCTION IF EXISTS public.host_scan_checkout(uuid, uuid);

-- Host scan check-in con p_qr_token come testo (cast sicuro a uuid)
CREATE OR REPLACE FUNCTION public.host_scan_checkin(
  p_qr_token text,
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
  v_qr_uuid uuid;
BEGIN
  -- 1) Validazione input
  IF p_qr_token IS NULL OR trim(p_qr_token) = '' OR p_host_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'missing_required_params');
  END IF;

  -- 2) Cast sicuro: evita crash in caso di token non UUID
  BEGIN
    v_qr_uuid := p_qr_token::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN json_build_object('success', false, 'error', 'invalid_qr_format');
  END;

  -- 3) Ricerca booking con lock
  SELECT b.*
  INTO v_booking
  FROM public.bookings b
  INNER JOIN public.spaces s ON s.id = b.space_id
  WHERE b.qr_code_token = v_qr_uuid
    AND s.host_id = p_host_id
  FOR UPDATE;

  -- 4) Controlli di business
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'booking_not_found_or_forbidden');
  END IF;

  IF v_booking.status <> 'confirmed' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'invalid_booking_status',
      'status', v_booking.status
    );
  END IF;

  v_start_ts := (v_booking.booking_date::text || ' ' || v_booking.start_time::text)::timestamptz;

  IF v_now < (v_start_ts - interval '15 minutes') THEN
    RETURN json_build_object('success', false, 'error', 'too_early_for_checkin');
  END IF;

  -- 5) Check-in
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

-- Host scan check-out con p_qr_token come testo (cast sicuro a uuid)
CREATE OR REPLACE FUNCTION public.host_scan_checkout(
  p_qr_token text,
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
  v_qr_uuid uuid;
BEGIN
  -- 1) Validazione input
  IF p_qr_token IS NULL OR trim(p_qr_token) = '' OR p_host_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'missing_required_params');
  END IF;

  -- 2) Cast sicuro: evita crash in caso di token non UUID
  BEGIN
    v_qr_uuid := p_qr_token::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN json_build_object('success', false, 'error', 'invalid_qr_format');
  END;

  -- 3) Ricerca booking con lock
  SELECT b.*
  INTO v_booking
  FROM public.bookings b
  INNER JOIN public.spaces s ON s.id = b.space_id
  WHERE b.qr_code_token = v_qr_uuid
    AND s.host_id = p_host_id
  FOR UPDATE;

  -- 4) Controlli di business
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'booking_not_found_or_forbidden');
  END IF;

  IF v_booking.status <> 'checked_in' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'invalid_booking_status',
      'status', v_booking.status
    );
  END IF;

  -- 5) Check-out
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

-- Permessi RPC per client autenticati
GRANT EXECUTE ON FUNCTION public.host_scan_checkin(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.host_scan_checkout(text, uuid) TO authenticated;

-- Forza PostgREST a ricaricare lo schema
NOTIFY pgrst, 'reload schema';
