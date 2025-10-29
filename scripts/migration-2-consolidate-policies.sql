-- ================================================================
-- MIGRATION 2 v2: CONSOLIDAMENTO POLICIES DUPLICATE
-- ================================================================
-- Obiettivo: Ridurre il numero di policies consolidando quelle duplicate
-- Mantenendo la stessa sicurezza ma migliorando le performance
-- 
-- Versione: 2.0 - Rimossa sezione PAYMENT_INTENTS (tabella non esistente)
-- IMPORTANTE: Eseguire questo script nel SQL Editor di Supabase
-- Progetto: https://supabase.com/dashboard/project/khtqwzvrxzsgfhsslwyz/sql/new
-- ================================================================

BEGIN;

-- ================================================================
-- 1. PRIVATE_CHATS - Consolida 3 policies in 1
-- ================================================================
DROP POLICY IF EXISTS "Users can view their private chats" ON public.private_chats;
DROP POLICY IF EXISTS "Users can update their private chats" ON public.private_chats;
DROP POLICY IF EXISTS "Users can delete their private chats" ON public.private_chats;

CREATE POLICY "Users manage their private chats"
ON public.private_chats
FOR ALL
USING (((( SELECT auth.uid() AS uid) = participant_1_id) OR (( SELECT auth.uid() AS uid) = participant_2_id)));

-- ================================================================
-- 2. SPACES - Consolida policies per hosts
-- ================================================================
DROP POLICY IF EXISTS "Hosts can view their own spaces" ON public.spaces;
DROP POLICY IF EXISTS "Hosts can update their own spaces" ON public.spaces;
DROP POLICY IF EXISTS "Hosts can delete their own spaces" ON public.spaces;

CREATE POLICY "Hosts manage their own spaces"
ON public.spaces
FOR ALL
USING ((( SELECT auth.uid() AS uid) = host_id))
WITH CHECK ((( SELECT auth.uid() AS uid) = host_id));

-- Consolida policies duplicate per public view
DROP POLICY IF EXISTS "Public view published spaces" ON public.spaces;
DROP POLICY IF EXISTS "Published spaces are viewable by everyone" ON public.spaces;

CREATE POLICY "Public view published spaces unified"
ON public.spaces
FOR SELECT
USING (((published = true) AND (is_suspended = false)));

-- Consolida policies duplicate per spaces without host info
DROP POLICY IF EXISTS "Anyone can view spaces without host info" ON public.spaces;
DROP POLICY IF EXISTS "Public spaces without host info" ON public.spaces;

CREATE POLICY "Public view spaces without host info unified"
ON public.spaces
FOR SELECT
USING (((published = true) AND (is_suspended = false) AND (NOT pending_approval)));

-- ================================================================
-- 3. USER_ROLES - Consolida 3 policies admin in 1
-- ================================================================
DROP POLICY IF EXISTS "admins_view_all_roles" ON public.user_roles;
DROP POLICY IF EXISTS "admins_update_roles" ON public.user_roles;
DROP POLICY IF EXISTS "admins_delete_roles" ON public.user_roles;

CREATE POLICY "admins_manage_all_roles"
ON public.user_roles
FOR ALL
USING (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role))
WITH CHECK (has_role(( SELECT auth.uid() AS uid), 'admin'::app_role));

-- ================================================================
-- 4. BOOKINGS - Consolida SELECT e UPDATE
-- ================================================================
DROP POLICY IF EXISTS "Users and hosts can view bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users and hosts can update bookings" ON public.bookings;

CREATE POLICY "Users and hosts view and update bookings"
ON public.bookings
FOR ALL
USING (((( SELECT auth.uid() AS uid) = user_id) OR (( SELECT auth.uid() AS uid) IN ( SELECT spaces.host_id FROM spaces WHERE (spaces.id = bookings.space_id)))))
WITH CHECK (((( SELECT auth.uid() AS uid) = user_id) OR (( SELECT auth.uid() AS uid) IN ( SELECT spaces.host_id FROM spaces WHERE (spaces.id = bookings.space_id)))));

-- ================================================================
-- 5. RATE_LIMITS - Consolida admin policies
-- ================================================================
DROP POLICY IF EXISTS "rate_limits_admin_select" ON public.rate_limits;
DROP POLICY IF EXISTS "rate_limits_admin_update" ON public.rate_limits;

CREATE POLICY "rate_limits_admin_manage"
ON public.rate_limits
FOR ALL
USING (is_admin(( SELECT auth.uid() AS uid)))
WITH CHECK (is_admin(( SELECT auth.uid() AS uid)));

-- ================================================================
-- 6. REPORTS - Consolida moderator policies
-- ================================================================
DROP POLICY IF EXISTS "moderators_view_reports" ON public.reports;
DROP POLICY IF EXISTS "moderators_update_reports" ON public.reports;

CREATE POLICY "moderators_manage_reports"
ON public.reports
FOR ALL
USING (can_moderate_content(( SELECT auth.uid() AS uid)))
WITH CHECK (can_moderate_content(( SELECT auth.uid() AS uid)));

-- ================================================================
-- 7. TAX_DETAILS - Consolida own policies
-- ================================================================
DROP POLICY IF EXISTS "tax_details_select_own" ON public.tax_details;
DROP POLICY IF EXISTS "tax_details_update_own" ON public.tax_details;

CREATE POLICY "tax_details_manage_own"
ON public.tax_details
FOR ALL
USING ((( SELECT auth.uid() AS uid) = profile_id))
WITH CHECK ((( SELECT auth.uid() AS uid) = profile_id));

-- ================================================================
-- 8. USER_NOTIFICATIONS - Remove duplicate policy
-- ================================================================
DROP POLICY IF EXISTS "Users manage their notifications" ON public.user_notifications;
-- Keep: notifications_unified_access (already optimal)

-- ================================================================
-- 9. WORKSPACE_FEATURES - Remove duplicate public view
-- ================================================================
DROP POLICY IF EXISTS "Public view features" ON public.workspace_features;
-- Keep: workspace_features_unified_select

-- ================================================================
-- 10. PROFILES - Consolida admin policies
-- ================================================================
DROP POLICY IF EXISTS "profiles_admin_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;

CREATE POLICY "profiles_admin_manage"
ON public.profiles
FOR ALL
USING (is_admin(( SELECT auth.uid() AS uid)))
WITH CHECK (is_admin(( SELECT auth.uid() AS uid)));

-- ================================================================
-- 11. MESSAGES - Consolida participant policies
-- ================================================================
DROP POLICY IF EXISTS "participants_view_messages" ON public.messages;
DROP POLICY IF EXISTS "participants_insert_messages" ON public.messages;

CREATE POLICY "participants_manage_messages"
ON public.messages
FOR ALL
USING ((( SELECT auth.uid() AS uid) IN ( SELECT conversations.host_id FROM conversations WHERE (conversations.id = messages.conversation_id)
   UNION
  SELECT conversations.coworker_id FROM conversations WHERE (conversations.id = messages.conversation_id))))
WITH CHECK ((( SELECT auth.uid() AS uid) IN ( SELECT conversations.host_id FROM conversations WHERE (conversations.id = messages.conversation_id)
   UNION
  SELECT conversations.coworker_id FROM conversations WHERE (conversations.id = messages.conversation_id))));

-- ================================================================
-- SEZIONE PAYMENT_INTENTS RIMOSSA
-- ================================================================
-- La tabella public.payment_intents non esiste nel database
-- La tabella corretta è public.payments che ha già policies ottimali

-- ================================================================
-- VERIFICA FINALE
-- ================================================================

-- Query per contare le policies prima e dopo
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE schemaname = 'public';
  
  RAISE NOTICE 'Policies totali dopo consolidamento: %', policy_count;
END $$;

COMMIT;

-- ================================================================
-- FINE MIGRATION 2 v2
-- ================================================================
-- Eseguire questa query per verificare il risultato:
/*
SELECT 
  COUNT(*) as total_policies,
  COUNT(DISTINCT tablename) as tables_with_policies
FROM pg_policies
WHERE schemaname = 'public';
*/
