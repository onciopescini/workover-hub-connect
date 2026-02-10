# Audit Specifico Support Ticket System (Dashboard Solopreneur)

Data audit: 2026-02-10

## Scope
Analisi completa di:
- Database (`public.support_tickets`, vincoli, policy RLS)
- Backend (Edge Functions / RPC ticket)
- Frontend (UI apertura ticket + area admin)
- Prontezza integrazione con widget **Action Required**

---

## 1) Database Audit

### 1.1 Struttura tabella `public.support_tickets`
Dalla tipizzazione Supabase, la tabella espone queste colonne principali:
- Core: `id`, `user_id`, `subject`, `message`, `status`, `response`, `created_at`, `updated_at`
- Prioritizzazione/classificazione: `priority`, `category`
- SLA/operatività: `response_deadline`, `resolution_deadline`, `first_response_at`, `sla_status`
- Presa in carico admin: `assigned_to`, `assigned_at`

Valutazione: **più che adatta** per un sistema semplice (open/closed + priority + category), perché include anche campi avanzati SLA e assegnazione.

### 1.2 Vincoli e integrità dati
- `priority` ha check constraint: `low | normal | high | critical`.
- `category` ha check constraint: `technical | booking | payment | account | space | feedback | other`.
- `sla_status` ha check constraint: `on_track | at_risk | breached`.
- `assigned_to` è FK verso `auth.users(id)`.

⚠️ Punto critico:
- Non emerge (nei migration disponibili) un check constraint esplicito sui valori di `status` della tabella ticket.
- Nella tipizzazione `support_tickets.Relationships` non risultano relazioni (FK) dichiarate per `user_id`; potrebbe essere assente o non riflessa correttamente nel dump corrente.

### 1.3 RLS e ruoli
Policy presenti:
- User authenticated può creare ticket solo per sé (`auth.uid() = user_id`).
- User authenticated può aggiornare i propri ticket.
- User authenticated può leggere i propri ticket (oppure admin).
- Admin ha policy `FOR ALL` su tutti i ticket.
- Moderator ha policy di sola lettura.

Valutazione RLS:
- **Creazione utente:** ✅ sì.
- **Admin vede tutto:** ✅ sì.
- **Admin aggiorna status:** ✅ sì (coperto da `FOR ALL` admin).

⚠️ Punto attenzione sicurezza:
- La policy “Users can update their tickets” è ampia (`FOR UPDATE`) e non limita le colonne aggiornabili. Un utente potrebbe tentare update su campi sensibili (`status`, `priority`, `assigned_to`, `response`, ecc.) se non bloccato da logica applicativa.

---

## 2) Backend Audit

### 2.1 Edge Function esistente
Esiste `supabase/functions/support-tickets/index.ts` che:
- valida/sanifica category/priority,
- crea ticket in `support_tickets`,
- invia notifiche utente/admin,
- invia email conferma,
- segnala alta priorità agli admin.

Questa funzione copre il caso **create ticket**.

### 2.2 RPC / funzioni DB disponibili
Trovate funzioni orientate a monitoraggio:
- `update_ticket_sla_status()`
- `get_support_metrics(days_back)`
- trigger/funzioni anti-spam (`check_ticket_spam`, `flag_spam_tickets`)
- trigger auto-assegnazione (`auto_assign_ticket`) e audit update (`log_ticket_admin_action`)

### 2.3 Gap backend rispetto richiesta
Non risultano endpoint dedicati espliciti tipo:
- `create_ticket` RPC (con contratto stretto e validazione centralizzata)
- `update_ticket_status` RPC/Edge per workflow admin

Oggi l’update ticket nel frontend passa anche via update diretto tabella (RLS-based), non via endpoint dedicato di dominio.

---

## 3) Frontend Audit

### 3.1 UI invio ticket
Esiste una UX completa lato utente:
- pagina `Support` (`/support`)
- `SupportTicketForm` per invio
- `SupportTicketList` per storico ticket utente
- helper `support-utils` con validazione Zod + chiamata Edge Function `support-tickets`

Quindi il canale utente per creare ticket è presente e funzionante architetturalmente.

### 3.2 UI Admin ticket
Stato attuale:
- `AdminMissionControlDashboard` legge `support_tickets` e mostra ticket aperti nel blocco **Action Required**.
- Non emerge una pagina admin dedicata tipo `/admin/tickets` con lista dettagliata, filtri, risposta/assegnazione/cambio stato.

Nota: nelle email admin viene referenziato URL `/admin/tickets`, ma nel routing attuale non risulta registrata una route corrispondente.

---

## 4) Report decisionale

## Cosa tenere ✅
- Struttura tabella `support_tickets` (colonne core + SLA + assegnazione).
- Check constraints su `priority`, `category`, `sla_status`.
- Policy RLS admin/moderator/user già impostate.
- Edge Function `support-tickets` per creazione ticket.
- Widget admin “Action Required” che già include ticket aperti.

## Cosa buttare / rifattorizzare ♻️
- Aggiornamento ticket diretto da client (`updateSupportTicket`) senza endpoint di dominio dedicato.
- Policy update utente troppo permissiva (aggiornamento non limitato per colonna).
- Incongruenza prodotto: link/email verso `/admin/tickets` senza pagina/route effettiva.

## Cosa manca ❌
- Endpoint backend dedicato per update status admin (RPC/Edge con controlli granulari).
- Admin Ticket Management Page (lista completa, filtri, assign, risposta, close/reopen).
- Hardening su stato ticket:
  - check constraint su `status` (se non già presente fuori da migration tracciate),
  - policy update separate per utente vs admin,
  - eventuale trigger per impedire update campi sensibili lato utente.
- Verifica/allineamento FK `user_id` (se assente nel DB reale, va aggiunta).

---

## 5) Prontezza per integrazione “Action Required”

**Risposta breve:**
- **Sì, parzialmente pronta**.

Motivazione:
- Per sola visualizzazione conteggio/lista ticket aperti nel widget, la tabella è adeguata e già utilizzata.
- Per un flusso completo operativo (presa in carico, update status sicuro, audit forte, pagina admin dedicata), servono hardening e componenti mancanti.

Livello di prontezza:
- **Widget read-only / alerting:** ✅ pronto
- **Ticket ops end-to-end (admin handling):** ⚠️ incompleto

---

## 6) Raccomandazione implementativa (next sprint)

1. **DB hardening**
   - aggiungere/validare constraint `status` (`open`, `in_progress`, `resolved`, `closed`)
   - verificare FK `user_id -> profiles(id)` o `auth.users(id)` in modo coerente
   - restringere policy update utente (solo campi consentiti)

2. **Backend hardening**
   - introdurre endpoint `admin-update-ticket` (Edge o RPC) con role check server-side
   - tracciare audit evento per ogni transizione di stato/assegnazione/risposta

3. **Frontend admin**
   - creare `/admin/tickets` con tabella, filtri per `status/priority/category`, pannello dettaglio, azioni
   - collegare click su Action Required all’item ticket corrispondente

4. **Coerenza prodotto**
   - allineare route reali con link email (`/admin/tickets`)
   - rimuovere dead-link o aggiungere fallback temporaneo
