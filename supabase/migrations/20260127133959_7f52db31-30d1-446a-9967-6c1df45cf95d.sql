-- =====================================================
-- FINAL SWEEP: All remaining functions and views
-- =====================================================

-- Fix remaining SECURITY DEFINER functions (excluding PostGIS st_estimatedextent)
DROP FUNCTION IF EXISTS public.is_admin(uuid) CASCADE;
CREATE FUNCTION public.is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM admins a WHERE a.user_id = p_user_id);
$$;

CREATE OR REPLACE FUNCTION public.availability_owner_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM spaces WHERE id = NEW.space_id AND host_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.checklists_owner_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM spaces WHERE id = NEW.space_id AND host_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.space_tags_owner_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM spaces WHERE id = NEW.space_id AND host_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.workspace_features_owner_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM spaces WHERE id = NEW.space_id AND host_id = auth.uid()) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.conversations_bump_on_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE conversations SET last_message = NEW.content, last_message_at = NOW(), updated_at = NOW() WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_old_application_logs()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM application_logs WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$;

CREATE OR REPLACE FUNCTION public.run_booking_lifecycle_maintenance()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM cleanup_expired_slots();
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_booking_status_from_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.payment_status = 'completed' AND OLD.payment_status != 'completed' THEN
    UPDATE bookings SET status = 'confirmed', updated_at = NOW() WHERE id = NEW.booking_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_profile_rating()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  target_user_id uuid;
  avg_rating numeric;
  review_count integer;
BEGIN
  IF TG_OP = 'DELETE' THEN target_user_id := OLD.target_id;
  ELSE target_user_id := NEW.target_id;
  END IF;
  SELECT AVG(rating), COUNT(*) INTO avg_rating, review_count FROM booking_reviews WHERE target_id = target_user_id AND is_visible = true;
  UPDATE profiles SET cached_avg_rating = COALESCE(avg_rating, 0), cached_review_count = COALESCE(review_count, 0), updated_at = NOW() WHERE id = target_user_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Fix the 2 validate_and_reserve_slot functions (one 5-param, one 6-param)
DROP FUNCTION IF EXISTS public.validate_and_reserve_slot(uuid, date, time, time, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.validate_and_reserve_slot(uuid, date, time, time, uuid, text) CASCADE;

CREATE FUNCTION public.validate_and_reserve_slot(
  space_id_param UUID, date_param DATE, start_time_param TIME, end_time_param TIME, user_id_param UUID, confirmation_type_param TEXT DEFAULT NULL
) RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE
  conflict_count INTEGER := 0;
  reservation_time TIMESTAMPTZ := NOW() + INTERVAL '5 minutes';
  new_booking_id UUID;
  space_host_id UUID;
  space_title TEXT;
  space_confirmation_type TEXT;
BEGIN
  IF space_id_param IS NULL OR date_param IS NULL OR start_time_param IS NULL OR end_time_param IS NULL OR user_id_param IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'missing_required_params');
  END IF;
  IF start_time_param >= end_time_param THEN
    RETURN json_build_object('success', false, 'error', 'invalid_time_range');
  END IF;
  IF public.check_self_booking(space_id_param, user_id_param) THEN
    RETURN json_build_object('success', false, 'error', 'cannot_book_own_space');
  END IF;
  SELECT host_id, title, confirmation_type INTO space_host_id, space_title, space_confirmation_type FROM spaces WHERE id = space_id_param AND deleted_at IS NULL AND published = true;
  IF space_host_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'space_not_found');
  END IF;
  PERFORM pg_advisory_xact_lock(hashtext(space_id_param::text || date_param::text));
  PERFORM cleanup_expired_slots();
  SELECT COUNT(*) INTO conflict_count FROM bookings WHERE space_id = space_id_param AND booking_date = date_param AND deleted_at IS NULL AND status IN ('pending', 'confirmed') AND ((start_time < end_time_param AND end_time > start_time_param) OR (slot_reserved_until > NOW() AND start_time < end_time_param AND end_time > start_time_param));
  IF conflict_count > 0 THEN
    RETURN json_build_object('success', false, 'error', 'slot_unavailable');
  END IF;
  INSERT INTO bookings (space_id, user_id, booking_date, start_time, end_time, status, slot_reserved_until, created_at, updated_at) VALUES (space_id_param, user_id_param, date_param, start_time_param, end_time_param, 'pending'::booking_status, reservation_time, NOW(), NOW()) RETURNING id INTO new_booking_id;
  RETURN json_build_object('success', true, 'booking_id', new_booking_id, 'slot_reserved_until', reservation_time, 'host_id', space_host_id, 'space_title', space_title, 'confirmation_type', COALESCE(confirmation_type_param, space_confirmation_type));
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'error', 'internal_error', 'message', SQLERRM);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.validate_and_reserve_slot(uuid, date, time, time, uuid, text) TO authenticated;

-- Fix Views with security_invoker
DROP VIEW IF EXISTS public.admin_bookings_view CASCADE;
CREATE VIEW public.admin_bookings_view WITH (security_invoker = true) AS
SELECT id, space_id, user_id, booking_date, start_time, end_time, status, created_at, updated_at, guests_count, payment_required, payment_session_id FROM bookings;

DROP VIEW IF EXISTS public.admin_users_view CASCADE;
CREATE VIEW public.admin_users_view WITH (security_invoker = true) AS
SELECT p.id, p.first_name, p.last_name, p.created_at, p.is_suspended, p.status,
       COALESCE((SELECT count(*) FROM bookings b WHERE b.user_id = p.id), 0)::bigint AS booking_count,
       COALESCE((SELECT count(*) FROM spaces s WHERE s.host_id = p.id), 0)::bigint AS space_count
FROM profiles p;