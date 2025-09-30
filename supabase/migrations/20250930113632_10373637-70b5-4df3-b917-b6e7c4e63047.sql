-- =====================================================
-- PERFORMANCE OPTIMIZATION: Fix Auth RLS InitPlan Issues
-- Replace auth.uid() with (select auth.uid()) to evaluate once per query
-- Consolidate multiple permissive policies
-- =====================================================

-- =====================================================
-- TABLE: spaces
-- =====================================================
DROP POLICY IF EXISTS "Hosts can create spaces" ON public.spaces;
DROP POLICY IF EXISTS "Hosts can delete their own spaces" ON public.spaces;
DROP POLICY IF EXISTS "Hosts can update their own spaces" ON public.spaces;
DROP POLICY IF EXISTS "Hosts can view their own spaces" ON public.spaces;
DROP POLICY IF EXISTS "Published spaces are viewable by everyone" ON public.spaces;

CREATE POLICY "Hosts can create spaces" ON public.spaces
FOR INSERT TO authenticated
WITH CHECK ((select auth.uid()) IN (SELECT profiles.id FROM profiles WHERE profiles.role = 'host'::user_role));

CREATE POLICY "Hosts can delete their own spaces" ON public.spaces
FOR DELETE TO authenticated
USING ((select auth.uid()) = host_id);

CREATE POLICY "Hosts can update their own spaces" ON public.spaces
FOR UPDATE TO authenticated
USING ((select auth.uid()) = host_id);

CREATE POLICY "Hosts can view their own spaces" ON public.spaces
FOR SELECT TO authenticated
USING ((select auth.uid()) = host_id);

CREATE POLICY "Published spaces are viewable by everyone" ON public.spaces
FOR SELECT TO authenticated
USING ((published = true) AND (is_suspended = false));

-- =====================================================
-- TABLE: bookings
-- =====================================================
DROP POLICY IF EXISTS "Coworkers can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Coworkers can delete their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Coworkers can update their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Coworkers can view their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Hosts can update booking status" ON public.bookings;
DROP POLICY IF EXISTS "Hosts can view bookings for their spaces" ON public.bookings;
DROP POLICY IF EXISTS "Users can cancel their own bookings" ON public.bookings;

CREATE POLICY "Coworkers can create bookings" ON public.bookings
FOR INSERT TO authenticated
WITH CHECK (
  (select auth.uid()) = user_id AND 
  EXISTS (SELECT 1 FROM profiles WHERE id = (select auth.uid()) AND role = 'coworker'::user_role)
);

CREATE POLICY "Coworkers can delete their own bookings" ON public.bookings
FOR DELETE TO authenticated
USING ((select auth.uid()) = user_id);

CREATE POLICY "Coworkers and hosts can update bookings" ON public.bookings
FOR UPDATE TO authenticated
USING (
  (select auth.uid()) = user_id OR 
  (select auth.uid()) IN (SELECT host_id FROM spaces WHERE id = space_id)
);

CREATE POLICY "Coworkers and hosts can view bookings" ON public.bookings
FOR SELECT TO authenticated
USING (
  (select auth.uid()) = user_id OR 
  (select auth.uid()) IN (SELECT host_id FROM spaces WHERE id = space_id)
);

-- =====================================================
-- TABLE: profiles
-- =====================================================
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can manage own profile" ON public.profiles
FOR ALL TO authenticated
USING ((select auth.uid()) = id)
WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "Admins and networked profiles viewable" ON public.profiles
FOR SELECT TO authenticated
USING (
  is_admin((select auth.uid())) OR
  (networking_enabled = true AND (
    EXISTS (
      SELECT 1 FROM connections 
      WHERE status = 'accepted' AND 
      ((sender_id = (select auth.uid()) AND receiver_id = id) OR 
       (sender_id = id AND receiver_id = (select auth.uid())))
    ) OR
    EXISTS (
      SELECT 1 FROM connection_suggestions 
      WHERE user_id = (select auth.uid()) AND suggested_user_id = id
    )
  ))
);

-- =====================================================
-- TABLE: payments
-- =====================================================
DROP POLICY IF EXISTS "Hosts can view payments for their spaces" ON public.payments;
DROP POLICY IF EXISTS "Restricted payment access" ON public.payments;
DROP POLICY IF EXISTS "Users can insert payment" ON public.payments;

CREATE POLICY "Users can insert own payments" ON public.payments
FOR INSERT TO authenticated
WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users and hosts can view payments" ON public.payments
FOR SELECT TO authenticated
USING (
  (select auth.uid()) = user_id OR 
  (select auth.uid()) IN (
    SELECT s.host_id FROM bookings b 
    JOIN spaces s ON s.id = b.space_id 
    WHERE b.id = booking_id
  )
);

-- =====================================================
-- TABLE: messages
-- =====================================================
DROP POLICY IF EXISTS "Hosts can view messages for their spaces" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages for their bookings" ON public.messages;
DROP POLICY IF EXISTS "Users can mark messages as read" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to their bookings" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages for their bookings" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages from their bookings" ON public.messages;
DROP POLICY IF EXISTS "messages_insert" ON public.messages;
DROP POLICY IF EXISTS "messages_select" ON public.messages;

CREATE POLICY "Users can manage messages in conversations" ON public.messages
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversations c 
    WHERE c.id = conversation_id AND 
    ((select auth.uid()) = c.host_id OR (select auth.uid()) = c.coworker_id)
  )
)
WITH CHECK (
  (select auth.uid()) = sender_id AND
  EXISTS (
    SELECT 1 FROM conversations c 
    WHERE c.id = conversation_id AND 
    ((select auth.uid()) = c.host_id OR (select auth.uid()) = c.coworker_id)
  )
);

-- =====================================================
-- TABLE: booking_reviews
-- =====================================================
DROP POLICY IF EXISTS "Users can create their own booking reviews" ON public.booking_reviews;
DROP POLICY IF EXISTS "Users can delete their own booking reviews" ON public.booking_reviews;
DROP POLICY IF EXISTS "Users can update their own booking reviews" ON public.booking_reviews;
DROP POLICY IF EXISTS "Users can view their own booking reviews" ON public.booking_reviews;

CREATE POLICY "Users manage own booking reviews" ON public.booking_reviews
FOR ALL TO authenticated
USING (
  (select auth.uid()) = author_id OR 
  (select auth.uid()) = target_id OR 
  (is_visible = true AND EXISTS (
    SELECT 1 FROM bookings b 
    JOIN spaces s ON s.id = b.space_id 
    WHERE b.id = booking_id AND s.host_id = (select auth.uid())
  ))
)
WITH CHECK (
  (select auth.uid()) = author_id AND
  EXISTS (
    SELECT 1 FROM bookings b 
    WHERE b.id = booking_id AND 
    ((select auth.uid()) = b.user_id OR (select auth.uid()) IN (
      SELECT host_id FROM spaces WHERE id = b.space_id
    ))
  )
);

-- =====================================================
-- TABLE: connections
-- =====================================================
DROP POLICY IF EXISTS "Users can create connection requests" ON public.connections;
DROP POLICY IF EXISTS "Users can update their received connections" ON public.connections;
DROP POLICY IF EXISTS "Users can view their own connections" ON public.connections;

CREATE POLICY "Users manage connections" ON public.connections
FOR ALL TO authenticated
USING (
  (select auth.uid()) = sender_id OR (select auth.uid()) = receiver_id
)
WITH CHECK (
  (select auth.uid()) = sender_id
);

-- =====================================================
-- TABLE: favorites
-- =====================================================
DROP POLICY IF EXISTS "Users can add their own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can delete their own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can view their own favorites" ON public.favorites;

CREATE POLICY "Users manage favorites" ON public.favorites
FOR ALL TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- =====================================================
-- TABLE: event_participants
-- =====================================================
DROP POLICY IF EXISTS "Limited event participant viewing" ON public.event_participants;
DROP POLICY IF EXISTS "Protected event participants" ON public.event_participants;
DROP POLICY IF EXISTS "Users can join events" ON public.event_participants;
DROP POLICY IF EXISTS "Users can leave events" ON public.event_participants;

CREATE POLICY "Users manage event participation" ON public.event_participants
FOR ALL TO authenticated
USING (
  (select auth.uid()) = user_id OR 
  (select auth.uid()) IN (SELECT created_by FROM events WHERE id = event_id)
)
WITH CHECK ((select auth.uid()) = user_id);

-- =====================================================
-- TABLE: events
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view active events" ON public.events;
DROP POLICY IF EXISTS "Anyone can view events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can create events" ON public.events;
DROP POLICY IF EXISTS "Creators can delete events" ON public.events;
DROP POLICY IF EXISTS "Creators can update events" ON public.events;
DROP POLICY IF EXISTS "Event creators can update their events" ON public.events;

CREATE POLICY "Anyone can view events" ON public.events
FOR SELECT TO authenticated
USING (status <> 'cancelled');

CREATE POLICY "Creators manage events" ON public.events
FOR ALL TO authenticated
USING ((select auth.uid()) = created_by)
WITH CHECK ((select auth.uid()) IS NOT NULL);

-- =====================================================
-- TABLE: conversations
-- =====================================================
DROP POLICY IF EXISTS "conversations_insert" ON public.conversations;
DROP POLICY IF EXISTS "conversations_select" ON public.conversations;
DROP POLICY IF EXISTS "conversations_update" ON public.conversations;

CREATE POLICY "Users manage conversations" ON public.conversations
FOR ALL TO authenticated
USING (
  (select auth.uid()) = host_id OR (select auth.uid()) = coworker_id
)
WITH CHECK (
  (select auth.uid()) = host_id OR (select auth.uid()) = coworker_id
);

-- =====================================================
-- TABLE: notifications
-- =====================================================
DROP POLICY IF EXISTS "Users can mark their notifications as read" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;

CREATE POLICY "Users view and update notifications" ON public.notifications
FOR ALL TO authenticated
USING ((select auth.uid()) = user_id);

-- =====================================================
-- TABLE: availability
-- =====================================================
DROP POLICY IF EXISTS "Anyone can view availability" ON public.availability;
DROP POLICY IF EXISTS "Space owners can manage availability" ON public.availability;

CREATE POLICY "View and manage availability" ON public.availability
FOR ALL TO authenticated
USING (
  true -- Anyone can view
)
WITH CHECK (
  (select auth.uid()) IN (SELECT host_id FROM spaces WHERE id = space_id)
);

-- =====================================================
-- TABLE: private_chats
-- =====================================================
DROP POLICY IF EXISTS "Connected users can create chats" ON public.private_chats;
DROP POLICY IF EXISTS "Users can view their chats" ON public.private_chats;

CREATE POLICY "Users manage private chats" ON public.private_chats
FOR ALL TO authenticated
USING (
  (select auth.uid()) = participant_1_id OR (select auth.uid()) = participant_2_id
)
WITH CHECK (
  (select auth.uid()) = participant_1_id AND
  EXISTS (
    SELECT 1 FROM connections 
    WHERE status = 'accepted' AND 
    ((sender_id = participant_1_id AND receiver_id = participant_2_id) OR 
     (sender_id = participant_2_id AND receiver_id = participant_1_id))
  )
);

-- =====================================================
-- TABLE: private_messages
-- =====================================================
DROP POLICY IF EXISTS "Users can send messages in their chats" ON public.private_messages;
DROP POLICY IF EXISTS "Users can view messages in their chats" ON public.private_messages;

CREATE POLICY "Users manage private messages" ON public.private_messages
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM private_chats 
    WHERE id = chat_id AND 
    ((select auth.uid()) = participant_1_id OR (select auth.uid()) = participant_2_id)
  )
)
WITH CHECK (
  (select auth.uid()) = sender_id AND
  EXISTS (
    SELECT 1 FROM private_chats 
    WHERE id = chat_id AND 
    ((select auth.uid()) = participant_1_id OR (select auth.uid()) = participant_2_id)
  )
);

-- =====================================================
-- TABLE: event_reviews
-- =====================================================
DROP POLICY IF EXISTS "Users can create their own event reviews" ON public.event_reviews;
DROP POLICY IF EXISTS "Users can update their own event reviews" ON public.event_reviews;
DROP POLICY IF EXISTS "Users can view their own event reviews" ON public.event_reviews;

CREATE POLICY "Users manage event reviews" ON public.event_reviews
FOR ALL TO authenticated
USING (
  (select auth.uid()) = author_id OR 
  (select auth.uid()) = target_id OR 
  is_visible = true
)
WITH CHECK ((select auth.uid()) = author_id);

-- =====================================================
-- TABLE: checklists
-- =====================================================
DROP POLICY IF EXISTS "Space owners can update checklist" ON public.checklists;

CREATE POLICY "Space owners manage checklists" ON public.checklists
FOR ALL TO authenticated
USING (
  (select auth.uid()) IN (SELECT host_id FROM spaces WHERE id = space_id)
);

-- =====================================================
-- TABLE: connection_suggestions
-- =====================================================
DROP POLICY IF EXISTS "Users can view their suggestions" ON public.connection_suggestions;

CREATE POLICY "Users view suggestions" ON public.connection_suggestions
FOR SELECT TO authenticated
USING ((select auth.uid()) = user_id);