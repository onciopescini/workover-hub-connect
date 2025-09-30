
-- Fix security issues: remove SECURITY DEFINER from views and set search_path for functions

-- 1. Recreate user_conversations_view without SECURITY DEFINER
DROP VIEW IF EXISTS public.user_conversations_view CASCADE;
CREATE VIEW public.user_conversations_view
WITH (security_invoker = true)
AS
SELECT 
  c.id AS conversation_id,
  c.space_id,
  s.title AS space_title,
  c.booking_id,
  c.last_message,
  c.last_message_at,
  c.created_at,
  c.updated_at,
  c.host_id,
  c.coworker_id,
  auth.uid() AS me_id,
  auth.uid() = c.host_id AS me_is_host,
  CASE
    WHEN auth.uid() = c.host_id THEN c.coworker_id
    ELSE c.host_id
  END AS other_user_id,
  CASE
    WHEN auth.uid() = c.host_id THEN pc.first_name
    ELSE ph.first_name
  END AS other_first_name,
  CASE
    WHEN auth.uid() = c.host_id THEN pc.last_name
    ELSE ph.last_name
  END AS other_last_name,
  CASE
    WHEN auth.uid() = c.host_id THEN pc.profile_photo_url
    ELSE ph.profile_photo_url
  END AS other_profile_photo_url,
  CASE
    WHEN auth.uid() = c.host_id THEN pc.role
    ELSE ph.role
  END AS other_role,
  COALESCE(mcnt.message_count, 0::bigint) AS message_count,
  ml.sender_id AS last_sender_id,
  ml.sender_id = auth.uid() AS last_sender_is_me,
  ps.first_name AS last_sender_first_name,
  ps.last_name AS last_sender_last_name
FROM conversations c
JOIN profiles ph ON ph.id = c.host_id
JOIN profiles pc ON pc.id = c.coworker_id
LEFT JOIN spaces s ON s.id = c.space_id
LEFT JOIN LATERAL (
  SELECT count(*) AS message_count
  FROM messages m
  WHERE m.conversation_id = c.id
) mcnt ON true
LEFT JOIN LATERAL (
  SELECT m.sender_id, m.created_at
  FROM messages m
  WHERE m.conversation_id = c.id
  ORDER BY m.created_at DESC
  LIMIT 1
) ml ON true
LEFT JOIN profiles ps ON ps.id = ml.sender_id
WHERE auth.uid() = c.host_id OR auth.uid() = c.coworker_id;

-- 2. Recreate spaces_public_view without SECURITY DEFINER (will drop dependent function)
DROP VIEW IF EXISTS public.spaces_public_view CASCADE;
CREATE VIEW public.spaces_public_view
WITH (security_invoker = true)
AS
SELECT 
  s.id,
  s.title AS name,
  s.price_per_hour,
  s.price_per_day,
  COALESCE(p.stripe_account_id, NULL::text) AS host_stripe_account_id,
  s.category,
  s.work_environment,
  s.max_capacity,
  s.address,
  s.confirmation_type,
  s.created_at
FROM spaces s
LEFT JOIN profiles p ON p.id = s.host_id
WHERE COALESCE(s.published, true) = true 
  AND COALESCE(s.is_suspended, false) = false 
  AND s.deleted_at IS NULL;

-- 3. Recreate get_public_spaces_safe function (was dropped with CASCADE)
CREATE OR REPLACE FUNCTION public.get_public_spaces_safe()
RETURNS SETOF spaces_public_view
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
  SELECT *
  FROM public.spaces_public_view
  ORDER BY created_at DESC
  LIMIT 200;
$$;

-- 4. Fix update_conversation_last_message function with search_path
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.conversations
  SET last_message = NEW.content,
      last_message_at = COALESCE(NEW.created_at, NOW()),
      updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

-- 5. Fix validate_booking_review_insert function with search_path
CREATE OR REPLACE FUNCTION public.validate_booking_review_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  booking_record RECORD;
  review_period_days INTEGER := 14;
BEGIN
  -- Get booking details with space and host info
  SELECT b.*, s.host_id INTO booking_record
  FROM public.bookings b
  JOIN public.spaces s ON s.id = b.space_id
  WHERE b.id = NEW.booking_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Booking not found';
  END IF;

  -- Check if booking is completed and paid
  IF booking_record.status != 'confirmed' THEN
    RAISE EXCEPTION 'Can only review confirmed bookings';
  END IF;

  -- Check if booking date has passed
  IF booking_record.booking_date >= CURRENT_DATE THEN
    RAISE EXCEPTION 'Cannot review booking before completion date';
  END IF;

  -- Check if payment is completed
  IF NOT EXISTS (
    SELECT 1 FROM public.payments p
    WHERE p.booking_id = NEW.booking_id
    AND p.payment_status = 'completed'
  ) THEN
    RAISE EXCEPTION 'Cannot review booking without completed payment';
  END IF;

  -- Validate author is part of the booking
  IF NEW.author_id != booking_record.user_id AND NEW.author_id != booking_record.host_id THEN
    RAISE EXCEPTION 'Only booking participants can write reviews';
  END IF;

  -- Validate target is part of the booking and different from author
  IF NEW.target_id != booking_record.user_id AND NEW.target_id != booking_record.host_id THEN
    RAISE EXCEPTION 'Can only review booking participants';
  END IF;

  IF NEW.author_id = NEW.target_id THEN
    RAISE EXCEPTION 'Cannot review yourself';
  END IF;

  -- Set visibility based on review age (visible after 14 days)
  IF booking_record.booking_date >= CURRENT_DATE - INTERVAL '14 days' THEN
    NEW.is_visible := FALSE;
  ELSE
    NEW.is_visible := TRUE;
  END IF;

  RETURN NEW;
END;
$$;
