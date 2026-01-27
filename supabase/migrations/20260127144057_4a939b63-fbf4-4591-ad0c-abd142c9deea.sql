-- FINAL SECURITY SWEEP: Force SET search_path on all remaining SECURITY DEFINER functions
-- This migration ensures 100% coverage of the search_path hardening

-- =====================================================
-- 1. MESSAGE TRIGGER FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Invoke the Edge Function for message broadcast
  PERFORM
    net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/message-broadcast',
      body := jsonb_build_object(
        'message_id', NEW.id,
        'conversation_id', NEW.conversation_id,
        'sender_id', NEW.sender_id,
        'content', NEW.content
      )::text,
      headers := jsonb_build_object('Content-Type', 'application/json')
    );
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.handle_new_message() IS 
'Trigger function for new message notifications. SECURITY DEFINER with fixed search_path for injection protection.';

-- =====================================================
-- 2. BOOKING CANCELLATION POLICY COPY
-- =====================================================
CREATE OR REPLACE FUNCTION public.copy_booking_cancellation_policy()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    workspace_policy text;
BEGIN
    SELECT cancellation_policy INTO workspace_policy
    FROM public.workspaces
    WHERE id = NEW.space_id;

    IF workspace_policy IS NULL THEN
        workspace_policy := 'moderate';
    END IF;

    NEW.cancellation_policy := workspace_policy;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.copy_booking_cancellation_policy() IS 
'Copies workspace cancellation policy to booking. SECURITY DEFINER with fixed search_path.';

-- =====================================================
-- 3. PROFILE RATING UPDATE
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_profile_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _target_id UUID;
    _new_rating NUMERIC(3,2);
BEGIN
    IF (TG_OP = 'DELETE') THEN
        _target_id := OLD.target_id;
    ELSE
        _target_id := NEW.target_id;
    END IF;

    SELECT COALESCE(AVG(rating), 0) INTO _new_rating
    FROM public.booking_reviews
    WHERE target_id = _target_id;

    UPDATE public.profiles
    SET cached_avg_rating = _new_rating,
        updated_at = NOW()
    WHERE id = _target_id;

    RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION public.update_profile_rating() IS 
'Updates cached profile rating on review changes. SECURITY DEFINER with fixed search_path.';

-- =====================================================
-- 4. CONVERSATION LAST MESSAGE UPDATE
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message    = NEW.content,
      last_message_at = COALESCE(NEW.created_at, NOW()),
      updated_at      = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_conversation_last_message() IS 
'Updates conversation metadata on new message. SECURITY DEFINER with fixed search_path.';

-- =====================================================
-- 5. BOOKING REVIEW VALIDATION
-- =====================================================
CREATE OR REPLACE FUNCTION public.validate_booking_review_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  booking_record RECORD;
  review_period_days INTEGER := 14;
BEGIN
  SELECT b.*, s.host_id INTO booking_record
  FROM public.bookings b
  JOIN public.spaces s ON b.space_id = s.id
  WHERE b.id = NEW.booking_id;

  IF booking_record IS NULL THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  IF booking_record.status != 'confirmed' THEN
    RAISE EXCEPTION 'Can only review confirmed bookings';
  END IF;

  IF booking_record.booking_date + review_period_days < CURRENT_DATE THEN
    RAISE EXCEPTION 'Review period has expired';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.validate_booking_review_insert() IS 
'Validates booking review submissions. SECURITY DEFINER with fixed search_path.';

-- =====================================================
-- TABLE COMMENTS (RLS Strategy Documentation)
-- =====================================================
COMMENT ON TABLE public.profiles IS 
'User profiles. RLS: Users can read/update own profile. Admins can read all. Public fields exposed via profiles_public_safe view.';

COMMENT ON TABLE public.bookings IS 
'Booking records. RLS: Coworkers see own bookings. Hosts see bookings for their spaces. Admins see all.';

COMMENT ON TABLE public.spaces IS 
'Workspace listings. RLS: Hosts manage own spaces. Published spaces are publicly readable. Admins/Moderators can moderate.';

COMMENT ON TABLE public.payments IS 
'Payment records. RLS: Users see own payments. Hosts see payments for their spaces. Admins see all.';

COMMENT ON TABLE public.messages IS 
'Chat messages. RLS: Participants can read/write within their conversations. Admins can read for moderation.';

COMMENT ON TABLE public.user_notifications IS 
'User notifications. RLS: Users can only read/update their own notifications.';

COMMENT ON TABLE public.reports IS 
'Content reports/flags. RLS: Users can create reports. Only admins/moderators can view all reports.';

COMMENT ON TABLE public.user_roles IS 
'Role assignments. RLS: Only admins can read/write. Used for admin/moderator privilege checks.';

COMMENT ON TABLE public.admin_actions_log IS 
'Admin audit log. RLS: Admins can read all, moderators can read (no write). Required for compliance.';