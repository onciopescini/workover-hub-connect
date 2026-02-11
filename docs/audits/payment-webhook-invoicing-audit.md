# Audit Modulo 3 — Payment Flow & Webhook Triggering (Invoicing Engine)

## Scope
Audit del ciclo pagamenti Stripe + persistenza DB per identificare il momento in cui la **Platform Fee è definitivamente maturata** e può innescare la fatturazione WorkOver verso Host.

## 1) Payment Flow attuale (end-to-end)

### 1.1 Checkout creation (pre-incasso)
- `create-checkout-v3` crea una Checkout Session Stripe con:
  - metadata: `booking_id`, `user_id`, `base_amount`, `host_net_payout`, `total_platform_fee`, `confirmation_type`
  - routing Connect: `payment_intent_data[application_fee_amount]` + `transfer_data[destination]` quando host ha account Stripe.
- Il capture method è **dinamico**:
  - `instant` → `automatic`
  - `host_approval` → `manual`
- Subito dopo la creazione sessione, viene fatto upsert su `payments` in stato iniziale `pending`.

### 1.2 Webhook Stripe (post-checkout)
- L’Edge Function `stripe-webhooks` processa principalmente:
  - `checkout.session.completed`
  - `checkout.session.expired`
  - `account.updated`
- Nel ramo `checkout.session.completed` (`EnhancedCheckoutHandlers`):
  - idempotenza su `stripe_event_id`
  - distingue **manual capture** vs **automatic capture** usando metadata + `spaces.confirmation_type`
  - scrive su `payments`:
    - `payment_status_enum = 'succeeded'` e `payment_status = 'completed'` per flusso instant
    - `payment_status_enum = 'pending'` e `payment_status = 'pending'` per flusso host approval
  - salva `stripe_payment_intent_id`, `host_amount`, `platform_fee`

### 1.3 Capture manuale (request-to-book)
- In `host-approve-booking`:
  - recupera PaymentIntent
  - se `requires_capture`, esegue `stripe.paymentIntents.capture(...)`
  - se capture avvenuta o PI già `succeeded`, aggiorna DB:
    - `payments.payment_status = 'completed'`
    - `payments.payment_status_enum = 'succeeded'`
    - `payments.capture_status = 'captured'`

### 1.4 Post-servizio (served) e documenti fiscali
- `mark-bookings-served` porta la prenotazione a `served` e invoca:
  - `generate-workover-invoice`
  - `notify-host-invoice-required`
- Quindi oggi la generazione documentale è legata al **servizio erogato** (`served`), non al momento tecnico di incasso/capture.

## 2) Stato e struttura `public.payments`

Dalla tipizzazione Supabase (`src/integrations/supabase/types.ts`) la tabella `payments` include i campi richiesti:
- importi: `amount`, `currency`, `platform_fee`, `host_amount`
- stato legacy/string: `payment_status`
- stato canonico enum: `payment_status_enum` (`pending`, `requires_action`, `succeeded`, `failed`, `refunded`, `canceled`)
- capture lifecycle: `capture_status` (`uncaptured`, `authorized`, `captured`, `canceled`)
- tracciamento Stripe: `stripe_session_id`, `stripe_payment_intent_id`, `stripe_transfer_id`, `stripe_event_id`

### Stato finale pagamento “successo”
Nel codice applicativo il successo definitivo viene rappresentato con la coppia:
- `payment_status_enum = 'succeeded'`
- `payment_status = 'completed'`

Nei flussi manual capture, la definitivezza è ulteriormente esplicitata da:
- `capture_status = 'captured'`

## 3) Quale evento Stripe oggi segna il “successo definitivo”?

### Osservazione chiave
L’handler webhook attuale **non** usa `payment_intent.succeeded` o `charge.succeeded` per finalizzare pagamenti. La finalizzazione avviene su:
- `checkout.session.completed` (instant flow)
- oppure via `host-approve-booking` dopo `paymentIntents.capture()` (manual flow)

### Implicazione architetturale
- Per `instant` può bastare `checkout.session.completed` (dato che capture è automatic).
- Per `host_approval` **non basta** `checkout.session.completed` perché i fondi possono essere solo autorizzati.
- Il segnale unificato più robusto, cross-flow, è lo stato DB:
  - `payment_status_enum = 'succeeded'` **e** `payment_status = 'completed'`
  - opzionale hardening: `capture_status = 'captured'` quando disponibile.

## 4) Stato fatturazione attuale

### Tabelle esistenti
- Esiste `public.invoices` (con FK a `payments` e `bookings`, numerazione, importi, campi XML/PDF, stato consegna XML).
- Esiste anche tracciamento su `payments` (`workover_invoice_id`, `workover_invoice_pdf_url`, `workover_invoice_xml_url`, `host_invoice_required`, deadline/reminder).

### Integrazioni provider esterni
- **Stripe Invoicing**: non emerge uso di API `stripe.invoices.*` per emissione fatture fiscali.
- **FattureInCloud**: non emergono riferimenti/SDK/endpoint dedicati.
- Presente generazione interna FatturaPA XML (`generate-host-invoice`) e upload su Supabase Storage.

## 5) Raccomandazione trigger per Worker di Fatturazione (Platform Fees → Host)

## Raccomandazione primaria (robusta)
Usare un **DB Trigger su `payments`** (AFTER INSERT/UPDATE) che invii un job/evento quando una riga entra nello stato di successo economico definitivo:
- condizione minima:
  - `NEW.payment_status_enum = 'succeeded'`
- condizione transizione:
  - `OLD.payment_status_enum IS DISTINCT FROM 'succeeded'`
- guard rail opzionali:
  - `NEW.platform_fee IS NOT NULL AND NEW.platform_fee > 0`
  - `NEW.workover_invoice_id IS NULL` (idempotenza funzionale)

Per compatibilità con legacy field:
- includere anche `NEW.payment_status = 'completed'` finché doppio campo resta in uso.

### Perché DB Trigger e non solo Webhook
- Copre sia instant sia manual capture senza duplicare logica Stripe-specifica.
- Copre finalizzazioni effettuate da funzioni server-side (`host-approve-booking`) anche se un webhook Stripe aggiuntivo non è gestito.
- Riduce coupling con singolo evento Stripe e abbassa rischio race condition/event loss.

## Raccomandazione secondaria (event-driven ibrida)
In parallelo, estendere `stripe-webhooks` per gestire `payment_intent.succeeded` solo come **segnale di reconciliaton** (non come unica source of truth), mantenendo il DB come trigger canonico.

## 6) Gap da chiudere prima del go-live Modulo 3
1. Canonizzare uno stato unico (preferire `payment_status_enum`) e deprecare progressivamente il dualismo con `payment_status`.
2. Uniformare `capture_status` nei flussi instant/manual (instant dovrebbe valorizzarlo coerentemente).
3. Aggiungere tabella/event log per emissione fatture piattaforma (es. `platform_fee_invoicing_jobs`) con unique key su `payment_id` per idempotenza forte.
4. Allineare pipeline “served-based” vs “capture-based” in base al requisito fiscale desiderato:
   - fattura fee all’incasso → trigger su pagamento succeeded
   - fattura fee a servizio reso → trigger su booking served (attuale)

## Decisione architetturale proposta
Per l’obiettivo esplicito del task (“punto esatto in cui i fondi diventano definitivamente della piattaforma”), il trigger corretto è:
- **`payments` transition to `payment_status_enum = 'succeeded'` (con compatibilità `payment_status = 'completed'`)**
- con ulteriore check `capture_status = 'captured'` dove disponibile.

Questo rappresenta il punto tecnico-finanziario in cui la Platform Fee è economicamente maturata e quindi fatturabile.
