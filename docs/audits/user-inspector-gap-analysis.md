# Gap Analysis — Modulo 2 Dashboard Solopreneur: User Inspector ("God Mode")

## 1) Frontend Audit: stato `/admin/users`

### Cosa esiste oggi
- Esiste una pagina `AdminUsers` su route `/admin/users`.
- La route admin attuale espone solo `users`, `bookings`, `revenue`, `kyc`, `tickets`, `dashboard`.
- Non esiste una route di dettaglio utente tipo `/admin/users/:id` o `/admin/users/[id]`.
- La UI corrente mostra una **tabella** con ricerca e azioni quick (Suspend/Activate), ma non una vista 360°.

### Evidenze tecniche
- Routing admin senza route di dettaglio utente: solo `path="users"` → `AdminUsers`. 
- `AdminUsers.tsx` carica lista da `admin_users_view` e renderizza tabella (User, Status, Joined, Bookings, Spaces, Actions).

### Gap Frontend
- Manca una pagina dettaglio utente dedicata (User Inspector).
- Manca navigazione row → dettaglio (`onClick`/`Link` su user id).
- Manca orchestrazione dati aggregati (profilo, spazi host, prenotazioni recenti, stripe status, audit logs).
- Manca sezione "Azioni di Emergenza" contestuale per il singolo utente dentro una vista unica.

---

## 2) Backend/DB Audit: dati aggregati (profilo + spazi + booking + stripe)

### Stato query aggregata
- Non risulta una RPC/view unica già pronta per "User Inspector" che ritorni in un colpo solo:
  1. Profilo completo
  2. Spazi del host (se presenti)
  3. Prenotazioni recenti (guest/host scope)
  4. Stripe Connect status
- `admin_users_view` è una vista **lista** sintetica (id, nome/cognome, status, count booking/spazi), non dettaglio esteso.

### Dati disponibili e relazioni da usare
Per costruire il dettaglio user servono almeno queste fonti:
- `profiles` (anagrafica, stato sospensione/ban, campi Stripe `stripe_account_id`, `stripe_connected`, onboarding status).
- `user_roles` (ruoli sistema: admin/moderator/host/coworker).
- `spaces` (`host_id` = user.id) per inventario spazi host.
- `bookings`:
  - lato guest: `bookings.user_id = user.id`
  - lato host: join su `spaces.id = bookings.space_id` con `spaces.host_id = user.id`
- `payments` (via `booking_id`) per contesto economico/rimborsi.
- `admin_actions_log` per audit trail azioni admin targettizzate su user/booking/space.

### Gap Backend/DB
- Manca una RPC ottimizzata e type-safe per User Inspector (es. `admin_get_user_inspector_detail(target_user_id uuid)`).
- Manca un contratto unico FE/BE (schema Zod + tipo TS dedicato) per evitare fetch multipli e cast fragili.
- Manca normalizzazione email nel dataset admin: la `admin_users_view` tipizzata non include `email`, mentre alcune UI lo assumono.
- Manca endpoint/query specifica per audit user-centric (es. ultimi N eventi per `target_id = user_id` con fallback su entità correlate).

---

## 3) Azioni di Emergenza (Edge Functions)

## 3.1 `handle-user-suspension`
### Stato
- Funzione presente e deployabile.
- Protegge accesso con `Authorization` + check ruolo admin via RPC `has_role`.
- Payload effettivamente usato:
  - `user_id` (required)
  - `action` (supporto esplicito al branch `"suspend"`)
- Effetto: invalida sessioni globali (`auth.admin.signOut(..., 'global')`) + cleanup `active_sessions`.

### Prontezza per bottone dettaglio utente
- **Parzialmente pronta**: ottima per invalidazione sessioni post-sospensione.
- Richiede che la sospensione DB sia fatta da altra logica (RPC `suspend_user` / `admin_toggle_user_status`).
- Non gestisce un vero workflow "ban" completo (reason, audit write forte, opzionale revoke token/API keys) in un’unica transazione.

## 3.2 `handle-booking-cancellation`
### Stato
- Funzione presente e robusta lato Stripe (idempotenza, release auth, refund policy-aware, finalize RPC).
- Payload:
  - `booking_id` (required)
  - `reason` (optional)
  - `idempotency_key` (optional)
- Vincolo autorizzativo corrente: può cancellare solo **guest o host della booking**.

### Prontezza per bottone admin in User Inspector
- **Non pronta per uso admin diretto**: un admin che non è guest/host riceve `403 Forbidden`.
- Per casi emergenza admin oggi esiste una funzione separata (`admin-process-refund`) usata dalla UI Admin Action Center, ma con contratto e controlli diversi.

### Gap Emergency Actions
- Manca una strategia unificata admin per "cancel + refund" da User Inspector.
- Manca convergenza contratti payload tra `handle-booking-cancellation` e `admin-process-refund`.
- Manca una edge function unica admin-first (o estensione sicura della funzione attuale) con audit obbligatorio e reason code standardizzato.

---

## 4) Cosa manca per la Vista Dettaglio Utente Definitiva

## Blocco A — Data Aggregation (core)
1. Nuova RPC `admin_get_user_inspector_detail(target_user_id uuid, p_limit_bookings int default 20, p_limit_logs int default 50)` con output JSON strutturato:
   - `profile`
   - `roles`
   - `host_spaces[]`
   - `recent_bookings_as_guest[]`
   - `recent_bookings_as_host[]`
   - `stripe_status`
   - `audit_logs[]`
   - `risk_flags` (es. disputed_bookings_count, failed_payments_count)
2. Indici/query plan per evitare N+1 e full scan (bookings by user_id, spaces by host_id, admin_actions_log by target).

## Blocco B — Frontend UX
1. Route nuova: `/admin/users/:id`.
2. Pagina `AdminUserInspectorPage` con tabs/sezioni:
   - Profilo + ruoli + stato account
   - Spazi host
   - Prenotazioni recenti
   - Stripe Connect & payout readiness
   - Audit logs
   - Emergency actions
3. CTA da lista utenti: "View details".

## Blocco C — Emergency Controls
1. Workflow sospensione/ban unificato server-side (RPC+Edge):
   - update stato profilo
   - invalidazione sessioni
   - audit log strutturato
2. Workflow admin cancellation/refund dedicato:
   - autorizzazione admin coerente con `user_roles`
   - reason code obbligatorio
   - idempotency end-to-end
   - scrittura audit obbligatoria

## Blocco D — Type Safety & Governance
1. Tipo TS dedicato `AdminUserInspectorDetail` in `src/types/admin-user-inspector.ts`.
2. Validazione runtime (`unknown` + Zod) sulla risposta RPC/Edge.
3. Centralizzazione query keys/endpoints in `src/constants/admin.ts` e `src/constants/index.ts`.
4. Rimozione cast fragili (`as unknown as`) nelle fetch admin critiche.

---

## 5) Valutazione finale (stato readiness)
- **Frontend readiness**: Basso-Medio (lista utenti presente, dettaglio assente).
- **Backend aggregation readiness**: Basso (manca RPC 360° unica).
- **Emergency actions readiness**: Medio (sospensione sessioni ok, cancellazione/rimborso admin non unificata per User Inspector).
- **Rischio implementativo Modulo 2**: Medio, riducibile velocemente con 1 RPC aggregata + 1 pagina dettaglio + 1 policy unificata emergency.
