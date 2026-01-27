-- =====================================================
-- DATABASE PERFECTION: RLS Performance + Table Lockdown
-- =====================================================

-- =====================================================
-- 1. RLS PERFORMANCE BOOST - Use (SELECT auth.uid()) pattern
-- =====================================================

-- BOOKINGS TABLE - High traffic
DROP POLICY IF EXISTS "bookings_select_booker_or_workspace_host" ON bookings;
CREATE POLICY "bookings_select_booker_or_workspace_host" ON bookings
FOR SELECT USING (
  (SELECT auth.uid()) = user_id 
  OR EXISTS (
    SELECT 1 FROM spaces s 
    WHERE s.id = bookings.space_id 
    AND s.host_id = (SELECT auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can update their own bookings" ON bookings;
CREATE POLICY "Users can update their own bookings" ON bookings
FOR UPDATE USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own bookings" ON bookings;
CREATE POLICY "Users can delete their own bookings" ON bookings
FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- PAYMENTS TABLE
DROP POLICY IF EXISTS "Users can view their own payments" ON payments;
CREATE POLICY "Users can view their own payments" ON payments
FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own payments" ON payments;
CREATE POLICY "Users can insert their own payments" ON payments
FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

-- USER_NOTIFICATIONS TABLE
DROP POLICY IF EXISTS "Users can view their own notifications" ON user_notifications;
CREATE POLICY "Users can view their own notifications" ON user_notifications
FOR SELECT USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON user_notifications;
CREATE POLICY "Users can update their own notifications" ON user_notifications
FOR UPDATE USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own notifications" ON user_notifications;
CREATE POLICY "Users can delete their own notifications" ON user_notifications
FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- PROFILES TABLE
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view own full profile" ON profiles
FOR SELECT USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles
FOR UPDATE USING ((SELECT auth.uid()) = id);

-- PAYOUTS TABLE
DROP POLICY IF EXISTS "Hosts can view their own payouts" ON payouts;
CREATE POLICY "Hosts can view their own payouts" ON payouts
FOR SELECT USING ((SELECT auth.uid()) = host_id);

-- SPACE_REVIEWS TABLE
DROP POLICY IF EXISTS "Authors can view their own reviews" ON space_reviews;
CREATE POLICY "Authors can view their own reviews" ON space_reviews
FOR SELECT USING ((SELECT auth.uid()) = author_id OR is_visible = true);

DROP POLICY IF EXISTS "Authors can update their own reviews" ON space_reviews;
CREATE POLICY "Authors can update their own reviews" ON space_reviews
FOR UPDATE USING ((SELECT auth.uid()) = author_id);

-- =====================================================
-- 2. LOCK DOWN PERMISSIVE TABLES
-- =====================================================

-- ACTIVE_SESSIONS: Only service_role should access
DROP POLICY IF EXISTS "System can manage sessions" ON active_sessions;
DROP POLICY IF EXISTS "System manage sessions" ON active_sessions;
DROP POLICY IF EXISTS "active_sessions_service_only" ON active_sessions;

-- Revoke all from anon and authenticated
REVOKE ALL ON active_sessions FROM anon, authenticated;

-- Only service role can access (via GRANT, not RLS - RLS only affects anon/authenticated)
CREATE POLICY "Service role manages sessions" ON active_sessions
FOR ALL USING (false); -- Block all direct access, only service_role bypasses RLS

-- STRIPE_ACCOUNTS: Users see only their own account
DROP POLICY IF EXISTS "System can manage Stripe accounts" ON stripe_accounts;
DROP POLICY IF EXISTS "Users view own stripe account" ON stripe_accounts;

CREATE POLICY "Users can view own stripe account" ON stripe_accounts
FOR SELECT USING ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update own stripe account" ON stripe_accounts
FOR UPDATE USING ((SELECT auth.uid()) = id);

-- =====================================================
-- 3. FIX REMAINING SECURITY DEFINER FUNCTIONS
-- =====================================================

-- get_space_review_status
CREATE OR REPLACE FUNCTION public.get_space_review_status(
  booking_id_param uuid,
  user_id_param uuid
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  review_record record;
  result json;
  days_until_visible integer;
BEGIN
  SELECT id, is_visible, created_at
  INTO review_record
  FROM space_reviews
  WHERE booking_id = booking_id_param
    AND author_id = user_id_param;

  IF NOT FOUND THEN
    result := json_build_object(
      'canWriteReview', true,
      'hasWrittenReview', false,
      'isVisible', false,
      'daysUntilVisible', 0
    );
  ELSE
    days_until_visible := GREATEST(
      0,
      14 - EXTRACT(DAY FROM (now() - review_record.created_at))::integer
    );

    result := json_build_object(
      'canWriteReview', false,
      'hasWrittenReview', true,
      'isVisible', review_record.is_visible,
      'daysUntilVisible', days_until_visible
    );
  END IF;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_space_review_status(uuid, uuid) TO anon, authenticated;

-- check_rate_limit_advanced
CREATE OR REPLACE FUNCTION public.check_rate_limit_advanced(
  p_identifier text,
  p_action text,
  p_max_requests integer,
  p_window_ms bigint
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
  v_window_start timestamptz;
BEGIN
  v_window_start := now() - (p_window_ms / 1000.0) * interval '1 second';
  
  SELECT COUNT(*) INTO v_count
  FROM rate_limit_log
  WHERE identifier = p_identifier
    AND action = p_action
    AND created_at > v_window_start;
  
  IF v_count >= p_max_requests THEN
    RETURN json_build_object('allowed', false, 'remaining', 0);
  END IF;
  
  INSERT INTO rate_limit_log (identifier, action, created_at)
  VALUES (p_identifier, p_action, now());
  
  RETURN json_build_object('allowed', true, 'remaining', p_max_requests - v_count - 1);
EXCEPTION WHEN undefined_table THEN
  -- rate_limit_log table doesn't exist, allow request
  RETURN json_build_object('allowed', true, 'remaining', p_max_requests);
END;
$$;

-- update_updated_at_column (commonly used trigger)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;