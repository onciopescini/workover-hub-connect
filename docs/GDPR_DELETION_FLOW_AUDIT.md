# Audit tecnico GDPR — Flusso cancellazione utente

## Scope
- `public.profiles`
- relazioni con `public.spaces`, `public.bookings`, `public.payments`, `public.invoices`
- Edge Functions `confirm-account-deletion` e `process-account-deletion`

## 1) Analisi cascata (rischio contabile)

### Evidenze trovate
- `process-account-deletion` eseguiva `auth.admin.deleteUser(...)` con commento esplicito su cascata dei dati correlati.
- Esistono FK con `ON DELETE CASCADE` in area fiscale:
  - `invoices.booking_id -> bookings.id ON DELETE CASCADE`
  - `invoices.payment_id -> payments.id ON DELETE CASCADE`
- `payments` mantiene FK verso `bookings` con semantica di cascata documentata.

### Impatto
Se un utente viene hard-delete e la catena FK arriva fino a `bookings`, si rischia di cancellare anche record finanziari/fiscali (`payments`, `invoices`, eventuali reminder e audit agganciati), con impatto **non conforme** per obblighi di conservazione contabile.

## 2) Strategia soft-delete proposta

### Misure implementate in questa patch
1. Aggiunta colonna `profiles.deleted_at`.
2. Policy RLS restrittive (`AS RESTRICTIVE`) per nascondere record soft-delete su:
   - `profiles`
   - `spaces`
   - `bookings`
3. Indicizzazione per query operative su record attivi/futuri.

### Principio operativo
- I record non vengono eliminati fisicamente per default.
- `deleted_at IS NOT NULL` = record non visibile in query standard utente.
- Storico economico/prenotazioni resta disponibile per audit, fiscalità e riconciliazione.

## 3) Blocco logico cancellazione Host con prenotazioni future

### Regola
Impedire hard-delete e soft-delete di un host se esistono prenotazioni future con stato `pending` o `confirmed`.

### Misure implementate
- Trigger DB `BEFORE DELETE` su `profiles`.
- Trigger DB `BEFORE UPDATE OF deleted_at` su `profiles` (solo transizione `NULL -> NOT NULL`).
- Funzione `enforce_host_deletion_guardrail()` che verifica:
  - `spaces.host_id = profilo`
  - `spaces.deleted_at IS NULL`
  - `bookings.deleted_at IS NULL`
  - `bookings.status IN ('pending','confirmed')`
  - inizio prenotazione nel futuro

## 4) Aggiornamento Edge Function

### Cambiamento critico
`process-account-deletion` passa da hard delete auth a **deactivation flow**:
- anonimizzazione + soft-delete profilo
- blocco applicativo su prenotazioni future host
- disabilitazione login utente (`ban_duration` lunga) al posto della cancellazione fisica

## 5) Raccomandazioni successive (hardening)
1. Riesaminare tutte le FK fiscali e portare quelle critiche a `RESTRICT`/`SET NULL` dove applicabile.
2. Introdurre job di hard-delete differito solo per tabelle non fiscali e fuori retention.
3. Formalizzare data-retention matrix (fiscale, antifrode, legale, marketing).
4. Aggiungere test automatici SQL:
   - host con booking futura => delete bloccato
   - profilo soft-deleted non visibile a utenti standard
   - storico invoice/payments invariato dopo richiesta cancellazione account
