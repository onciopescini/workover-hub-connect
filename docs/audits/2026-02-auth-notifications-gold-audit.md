# Audit Tecnico Gold Standard — Auth & Transactional Notifications

Data audit: 2026-02-13
Ambito: Register/Auth callback, trigger profilo, Stripe webhooks, notifications pipeline, process-notifications (Resend)

## Executive Summary

### Criticità P0 (bloccanti)
1. **Trigger `handle_new_user` non allineato allo schema attuale**: inserisce `email` in `public.profiles`, ma `profiles` non include più la colonna `email` nel contratto tipizzato corrente. Rischio: errore in fase di signup trigger-based e profili mancanti.
2. **Perdita contesto post-verifica email**: signup usa `emailRedirectTo=/auth/callback` fisso e il callback non legge/propaga `returnUrl`; l’utente viene sempre instradato a onboarding/dashboard/host/admin senza preservare prenotazione in corso.
3. **Mismatch CTA dispute**: `process-notifications` genera link `\`/disputes/:id\`` ma il router applicativo non espone tale route utente.

### Criticità P1 (alte)
1. **Contratto notifications non uniforme** tra vecchio (`is_read`/`content`) e nuovo (`read_at`/`message` + `email_sent_at`) con derive su hook/component tipizzati.
2. **Assenza retry strutturato Resend**: in caso errore email, il record resta con `email_sent_at = null` (retry implicito da cron), ma senza `attempt_count`, `last_error`, DLQ o circuit-breaker.
3. **`action_url` non governato come source of truth**: pipeline costruisce CTA da metadata in funzione edge; non esiste colonna/campo standardizzato `action_url` già validato a livello DB/webhook.

---

## 1) Auth Flow End-to-End

### Catena attesa
`Register.tsx` → `supabase.auth.signUp` → trigger `on_auth_user_created`/`handle_new_user` → `public.profiles`

### Evidenze
- Signup frontend invia `emailRedirectTo` statico a `/auth/callback`.  
- Trigger SQL attuale `handle_new_user` fa `INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email)`.  
- Tipi DB generati mostrano `profiles` senza campo `email`.

### Valutazione
- **Rischio alto di regressione schema**: il trigger dipende da colonna deprecata/non presente nel contratto tipizzato. 
- La funzione edge `create-profile` è presente come fallback, ma non sostituisce in modo rigoroso il trigger automatico in ogni percorso.

### Correzione proposta (SQL)
```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, onboarding_completed, networking_enabled, stripe_connected)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'first_name', ''), split_part(COALESCE(NEW.email, ''), '@', 1)),
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'last_name', ''), ''),
    false,
    true,
    false
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;
```

> Nota: email va letta da `auth.users` quando serve, non duplicata in `profiles`.

---

## 2) Email Verification & Return URL

### Evidenze
- Signup: redirect email hardcoded a `/auth/callback`.
- Callback: non legge query param `returnUrl`/`redirectTo` e applica solo routing role/onboarding.
- Login supporta `returnUrl`/`redirectTo`, ma una parte UI usa `redirect` (nome parametro differente), con perdita contesto.

### Valutazione
- **Contesto prenotazione non garantito** dopo conferma email.

### Correzioni proposte
1. In signup, propagare contesto:
   - `emailRedirectTo = /auth/callback?returnUrl=<encodedPath>`.
2. In `AuthCallback`, priorità redirect:
   - `returnUrl` valido interno (`startsWith('/')`) > onboarding/role fallback.
3. Uniformare naming query param a `returnUrl` in tutta la codebase (rimuovere alias `redirect`).

---

## 3) Stripe Webhook → Notifications

### Evidenze
- `EnhancedCheckoutHandlers` inserisce in `public.notifications` con metadata booking/date/location.
- `process-notifications` genera CTA dinamica da `booking_id`/`dispute_id`.
- Nessun campo `action_url` persistito nella notifica.

### Valutazione
- Pipeline funziona per booking path (`/bookings/:id` esiste), ma non è pienamente enterprise:
  - nessun `action_url` canonicalizzato a monte,
  - dipendenza da logica di rendering email a runtime,
  - rischio drift con router (es. dispute).

### Correzioni proposte
- Estendere `public.notifications` con:
  - `action_url text null`,
  - `delivery_attempts int not null default 0`,
  - `last_delivery_error text null`,
  - `next_retry_at timestamptz null`.
- Popolare `action_url` in webhook/trigger usando route constants server-side validate.
- In `process-notifications`, usare prima `action_url`, fallback su metadata solo legacy.

---

## 4) Transactional Email (`process-notifications` + Resend)

### Evidenze
- ICS: generato con `DTSTART/DTEND` da metadata e allegato su tipi booking.
- In caso errore Resend: log + incremento contatore locale `errors`; record non marcato `email_sent_at`.
- Nessuna persistenza errore tentativo su tabella.

### Valutazione
- **Retry presente solo implicitamente** (cron riprocessa `email_sent_at is null`), ma manca governance enterprise (tentativi massimi, jitter/backoff, DLQ).
- ICS è formalmente corretto nel formato base; manca `TZID`/gestione timezone locale esplicita (usa UTC via `toISOString`).

### Correzioni proposte
- Retry policy persistita su DB (`delivery_attempts`, `next_retry_at`, `last_delivery_error`).
- Strategia backoff esponenziale con cap + dead-letter (`status='failed_permanent'`).
- Logging strutturato con correlation ID per notifica.
- ICS: opzionale miglioramento con timezone business locale o esplicitazione UTC in copy email.

---

## 5) Sicurezza (RLS)

### `public.profiles`
- Policy recente limita SELECT a owner/admin + vista pubblica separata (`profiles_public_view`): **impostazione corretta by design**.
- Attenzione a query frontend che leggono direttamente `profiles` per dati pubblici: dovrebbero usare la vista safe.

### `public.notifications`
- RLS presente con `SELECT`/`UPDATE` solo owner: **corretto** lato utente.
- Inserimento affidato a service role/triggers: coerente con modello event-driven.

---

## 6) Allineamento route/action URL

### Stato attuale
- Booking CTA: `\`/bookings/:id\`` ✅ (route presente).
- Dispute CTA: `\`/disputes/:id\`` ❌ (route mancante lato utente).

### Correzione minima
- O creare route utente reale per dispute,
- O reindirizzare CTA dispute a route esistente (`/support` o `/admin/disputes` se ruolo admin).

---

## Piano Remediation (Gold Standard)

1. **P0 immediato**
   - Migrazione SQL fix `handle_new_user` (rimozione dipendenza `profiles.email`).
   - Propagazione `returnUrl` su signup + callback.
   - Correzione parametro `redirect` → `returnUrl` ovunque.

2. **P1 entro sprint**
   - Contratto unico notifications (`read_at/message/action_url/email_sent_at/...`) e rigenerazione `src/integrations/supabase/types.ts`.
   - Retry strutturato process-notifications con audit trail.
   - Route dispute o mapping CTA coerente.

3. **P2 hardening**
   - Centralizzazione route constants condivise FE/BE.
   - Test integrazione e2e: signup+verify+returnUrl, webhook→notification→email.

