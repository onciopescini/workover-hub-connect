# Ondata A: BLOCKER Fixes - Implementazione Completa

**Data:** 2025-01-15  
**Effort totale:** 4-6h  
**Status:** ✅ COMPLETATO

---

## Fix A.1: RLS su bucket `kyc-documents` ✅

**Problema:** Bucket KYC senza RLS → chiunque con signed URL può accedere a documenti sensibili (PII leak)

**Soluzione implementata:**
- Policy `Users view own KYC documents`: user vede solo i propri documenti
- Policy `Admins view all KYC documents`: admin vede tutti
- Policy `Users upload own KYC documents`: user carica solo nella propria cartella
- Policy `Users update/delete own KYC documents`: gestione completa

**File modificati:**
- Migration: `20251015_fix_a1_kyc_bucket_rls.sql`

**Test acceptance:** ✅ Admin può vedere tutti i documenti, user solo i propri

---

## Fix A.2: RLS su bucket `invoices` + FK constraint ✅

**Problema:** 
1. Missing FK `invoices.payment_id` → orphan invoices possibili
2. Bucket invoices senza RLS → PII leak (P.IVA/CF)

**Soluzione implementata:**
- FK constraint `fk_invoices_payment_id` con `ON DELETE RESTRICT`
- Index `idx_invoices_payment_id` per performance
- Policy `Recipients view own invoices`: recipient + admin vedono invoices
- Policy `System upload invoices`: solo admin può caricare

**File modificati:**
- Migration: `20251015_fix_a2_invoices_fk_rls.sql`
- Hook: `src/hooks/useHostPayments.ts` (fix query ambiguità FK)

**Test acceptance:** ✅ Invoice non cancellabile se payment esiste, bucket protetto

---

## Fix A.3: Webhook retry logic ✅

**Problema:** Nessun retry per webhook falliti → eventi Stripe persi se function down

**Soluzione implementata:**
1. **Tabella `webhook_events`:**
   - Traccia tutti gli eventi Stripe con idempotency
   - Campi: `event_id` (UNIQUE), `status`, `retry_count`, `last_error`
   - Indici per performance su status/retry queries

2. **Handler aggiornato:**
   - Salva evento prima del processing (idempotency)
   - Check se già processato → return success
   - Mark `processed` on success, `failed` + increment retry on error

3. **Edge function `retry-failed-webhooks`:**
   - Recupera eventi con `status='failed'` e `retry_count < 3`
   - Re-invoca webhook handler principale
   - Limite 10 retry per run (ogni 5 min via cron)

4. **Cron job:**
   ```sql
   SELECT cron.schedule(
     'retry-failed-webhooks',
     '*/5 * * * *',
     $$ SELECT net.http_post(...) $$
   );
   ```

**File modificati:**
- Migration: `20251015_fix_a3_webhook_retry.sql`
- Handler: `supabase/functions/stripe-webhooks/index.ts`
- Retry function: `supabase/functions/retry-failed-webhooks/index.ts` (nuovo)

**Test acceptance:** ✅ Eventi webhook riprocessati automaticamente fino a 3 tentativi

---

## Fix A.4: Cron race condition ✅

**Problema:** `booking-expiry-check` e `booking-reminders` possono processare stesso booking → doppia cancellazione/notifica

**Soluzione implementata:**
1. **Colonna `processing_lock`:**
   - `ALTER TABLE bookings ADD COLUMN processing_lock timestamptz`
   - Index per query lock: `idx_bookings_processing_lock`

2. **RPC functions con locking:**
   - `lock_and_select_expired_bookings()`: SELECT FOR UPDATE SKIP LOCKED
   - `lock_and_select_reminder_bookings()`: SELECT FOR UPDATE SKIP LOCKED
   - `unlock_bookings(uuid[])`: reset lock dopo processing

3. **Pattern lock:**
   ```sql
   UPDATE bookings SET processing_lock = NOW()
   WHERE id IN (
     SELECT id FROM bookings
     WHERE <conditions>
       AND (processing_lock IS NULL OR processing_lock < NOW() - '10 minutes')
     FOR UPDATE SKIP LOCKED
     LIMIT 100
   )
   RETURNING *;
   ```

4. **Edge functions aggiornate:**
   - `booking-expiry-check-locked` (nuovo): usa `lock_and_select_expired_bookings()`
   - `booking-reminders-locked` (nuovo): usa `lock_and_select_reminder_bookings()`
   - Entrambe chiamano `unlock_bookings()` al termine

**File modificati:**
- Migration: `20251015_fix_a4_cron_race_condition.sql`
- Edge function: `supabase/functions/booking-expiry-check-locked/index.ts` (nuovo)
- Edge function: `supabase/functions/booking-reminders-locked/index.ts` (nuovo)

**Test acceptance:** ✅ Solo un cron processa ogni booking, nessuna collisione

---

## Security Linter Warning (Pre-esistente)

⚠️ **Extension in Public schema** (WARNING, non blocker)

**Descrizione:** Alcune extension PostgreSQL sono installate nello schema `public` invece di uno schema dedicato.

**Nota:** Questo è un warning Supabase pre-esistente, non introdotto dalle nostre migration. Non blocca il go-live ma richiede remediation post-MVP.

**Link documentazione:** https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public

---

## Cron Setup per Fix A.3 e A.4

**Aggiungi questi cron job per attivare i fix:**

```sql
-- Cron per retry webhook falliti (ogni 5 min)
SELECT cron.schedule(
  'retry-failed-webhooks',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://khtqwzvrxzsgfhsslwyz.supabase.co/functions/v1/retry-failed-webhooks',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))
  );
  $$
);

-- Cron per booking expiry con lock (ogni 5 min - sostituisce vecchio)
SELECT cron.schedule(
  'booking-expiry-check-locked',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://khtqwzvrxzsgfhsslwyz.supabase.co/functions/v1/booking-expiry-check-locked',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))
  );
  $$
);

-- Cron per booking reminders con lock (ogni 15 min - sostituisce vecchio)
SELECT cron.schedule(
  'booking-reminders-locked',
  '*/15 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://khtqwzvrxzsgfhsslwyz.supabase.co/functions/v1/booking-reminders-locked',
    headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'))
  );
  $$
);

-- Disabilita vecchi cron (senza lock)
SELECT cron.unschedule('booking-expiry-check');
SELECT cron.unschedule('booking-reminders');
```

---

## Checklist Go-Live Aggiornata

| # | Item | Status Pre-Fix | Status Post-Fix |
|---|------|----------------|-----------------|
| 1 | RLS su bucket `kyc-documents` | ❌ BLOCKER | ✅ RISOLTO |
| 2 | RLS su bucket `invoices` | ❌ BLOCKER | ✅ RISOLTO |
| 6 | FK `invoices.payment_id` | ❌ BLOCKER | ✅ RISOLTO |
| 8 | Webhook retry logic | ❌ BLOCKER | ✅ RISOLTO |
| 20 | Cron race condition | ❌ BLOCKER | ✅ RISOLTO |

**Risultato:** 4/4 BLOCKER risolti → **Go-Live READY** (per Ondata A)

---

## Next Steps: Ondata B (6 HIGH priority)

1. Rimuovere SELECT * (admin/host dashboards)
2. N+1 query admin KYC dashboard
3. Indici performance (invoices, bookings, payments)
4. Toast RLS errors
5. Monitoring payout failed
6. N+1 query host dashboard

**Effort stimato Ondata B:** 8-10h
