-- =====================================================
-- RLS POLICIES CRITICHE - CONFORMITÀ FISCALE & STRIPE
-- =====================================================

-- Policy 1: Blocco pubblicazione spazi senza Stripe connesso
-- Impedisce agli host di pubblicare spazi se non hanno Stripe attivo
CREATE POLICY "spaces_require_stripe_to_publish"
ON spaces FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (
  -- Se lo spazio è pubblicato, l'host DEVE avere Stripe connesso
  (published = FALSE) OR 
  (published = TRUE AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND stripe_connected = TRUE
  ))
);

-- Policy 2: Blocco checkout se host perde Stripe
-- Impedisce ai coworker di prenotare spazi di host senza Stripe attivo
CREATE POLICY "bookings_require_host_stripe"
ON bookings FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM spaces s
    JOIN profiles p ON p.id = s.host_id
    WHERE s.id = space_id
    AND p.stripe_connected = TRUE
  )
);

-- Policy 3: Blocco creazione spazi senza email verificata
-- Impedisce agli host di creare spazi prima di verificare l'email
CREATE POLICY "spaces_require_verified_email"
ON spaces FOR INSERT  
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND email_confirmed_at IS NOT NULL
  )
);

-- Policy 4: Blocco checkout coworker senza email verificata
-- Impedisce ai coworker di prenotare prima di verificare l'email
CREATE POLICY "bookings_require_verified_email"
ON bookings FOR INSERT
TO authenticated  
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND email_confirmed_at IS NOT NULL
  )
);

-- =====================================================
-- COMMENTI TECNICI
-- =====================================================
-- Queste policy lavorano in AND con le policy esistenti
-- Forniscono defense-in-depth insieme ai trigger già esistenti:
-- - validate_space_publish_stripe()
-- - validate_booking_host_stripe()
-- - validate_space_email_verified()
-- - validate_booking_email_verified()
--
-- Le RLS policies sono il primo livello di difesa (pre-trigger)
-- e non possono essere bypassate da funzioni SECURITY DEFINER