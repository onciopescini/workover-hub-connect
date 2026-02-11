# Audit Tecnico & UX — Host Dashboard (pre-disputes UI)

Data: 2026-02-11
Scope: `src/components/host/dashboard`, `src/hooks/queries/*`, `src/hooks/bookings/*`, componenti dashboard prenotazioni collegati.

## 1) Copertura degli Stati (State Coverage Gap)

### Criticità principali

- **[Alta] Filtri e stats bloccati su 3 stati legacy (`pending`, `confirmed`, `cancelled`)**.
  - Il filtro tipizzato (`BookingFilter`) accetta solo quei tre valori.
  - Le query applicano `.eq('status', ...)` solo se lo stato è in quella whitelist.
  - Le card statistiche del dashboard prenotazioni contano solo pending/confirmed/cancelled.
  - Impatto: `disputed`, `refunded`, `checked_in`, `checked_out`, `no_show`, etc. appaiono in lista ma non sono filtrabili né contabilizzati correttamente.

- **[Alta] `disputed` viene visualizzata “genericamente” ma non con semantica di contestazione**.
  - Le card usano `BOOKING_STATUS_COLORS/BOOKING_STATUS_LABELS` e quindi *renderizzano* il badge `disputed` senza rompere il layout.
  - Tuttavia mancano blocchi UI dedicati (reason, opened_by, timeline dispute, CTA refund/resolve), quindi oggi la prenotazione contestata è solo una card con badge.

- **[Alta] Nessun recupero dati dalla tabella `disputes` nelle query host/coworker dashboard**.
  - `fetchHostBookings` e `fetchCoworkerBookings` non fanno join su `disputes`.
  - Di conseguenza campi critici (`reason`, `opened_by`, eventuale stato disputa) sono assenti nell'UI.

- **[Media] Azioni amministrative non includono gli stati nuovi orientati a post-servizio**.
  - Le costanti azioni includono `cancelled`, `checked_out`, `no_show`, ma non `disputed`/`refunded`.
  - Impatto UX: una prenotazione disputata non espone automaticamente un set di azioni coerente con un flusso di rimborso.

## 2) Efficienza del Data Fetching

### Criticità principali

- **[Alta] Waterfall in `fetchHostRecentActivity` (3 query seriali)**.
  - 1) spazi host
  - 2) bookings per spazi
  - 3) messaggi per spazi
  - Le query sono in sequenza, con array intermedi e mappe locali; si può ridurre latenza con RPC/view o query aggregate server-side.

- **[Media] Hook dashboard “legacy” con N query separate e join manuali (`useHostDashboardQuery`)**.
  - Anche se sembra non primario nel rendering corrente, contiene pattern costosi: fetch spaces -> fetch bookings -> fetch spaces details -> fetch profiles.
  - Rischio di divergenza e regressioni se riutilizzato.

- **[Media] Doppio sourcing dashboard (`useHostDashboardMetrics` + `useHostRecentActivity` + query space count separata)**.
  - L’occupancy dipende da una terza query (`spaces` count) scollegata dai dati metrici.
  - Possibile incoerenza temporale tra metriche e conteggio spazi.

- **[Media] Query `useHostBookings` ottima sul join profilo/pagamenti, ma non estesa alle nuove relazioni dispute**.
  - Struttura join già buona per evitare N+1 su profili/pagamenti.
  - Manca il join `disputes` e quindi resta incompleta rispetto al nuovo dominio.

## 3) Type Safety & Schema Alignment

### Criticità principali

- **[Alta] Violazioni esplicite della type safety (`any`, `@ts-ignore`) in area dashboard**.
  - `hostActivityFetcher` usa `(s: any)`, `(booking: any)`, `(message: any)` e `// @ts-ignore` su join annidato.
  - `useBookingTransforms` usa `@ts-ignore` nel mapping finale.
  - Impatto: riduce affidabilità in un flusso finanziario/stati critici.

- **[Alta] Tipi filtro obsoleti rispetto enum DB**.
  - `BookingFilter.status` è ristretto a 3 stati legacy invece di usare `BookingStatus` dal DB.
  - Questo crea drift fra schema e frontend.

- **[Media] Tipi raw legacy incoerenti (`RawBookingData`)**.
  - In `src/types/booking.ts` `RawBookingData.status` è solo `'pending' | 'confirmed' | 'cancelled'` mentre l’enum reale è molto più ampio.

- **[Media] Nessun tipo normalizzato per `disputes` aggregato a booking**.
  - Non esiste un `BookingWithDisputeDetails` o equivalente allineato al nuovo schema (`reason`, `opened_by`, `guest_id` vs `user_id`).

- **[Media] Potenziale mismatch naming dominio (`guest_id` vs `user_id`) non risolto a livello DTO/UI**.
  - Le query dashboard usano `bookings.user_id` come coworker/guest.
  - Senza layer di mapping esplicito, l’introduzione di `guest_id` o `opened_by` può creare ambiguità semantica lato UI.

## 4) Resilienza (Error Handling)

### Criticità principali

- **[Alta] Errori parziali dashboard non gestiti a livello UI finale**.
  - `useEnhancedHostDashboard` espone `error`, ma `useHostDashboardState` non lo propaga.
  - `HostDashboard` renderizza `LoadingSkeleton` quando `!metrics`, anche se il loading è terminato per errore.
  - Risultato: possibile “loading infinito”/schermata vuota senza messaggio actionable.

- **[Media] `useHostBookings` sopprime errori ritornando `[]`**.
  - Evita crash (bene), ma nasconde failure reali all’utente; UX indistinguibile da “nessuna prenotazione”.

- **[Media] `fetchHostRecentActivity` swalla eccezioni e ritorna array vuoto**.
  - Stesso problema: degrado silenzioso, nessun partial-error indicator nel feed.

- **[Bassa] Logging non uniformato (`console.log/error` dentro `useHostDashboardMetrics`)**.
  - Rumore in produzione e perdita di osservabilità strutturata rispetto al logger centralizzato.

---

## Proposta di refactoring (foundation per rimborsi/disputes)

### Fase 1 — Domain contract unico (alta priorità)
1. Introdurre tipo unificato `BookingStatus = Database['public']['Enums']['booking_status']` ovunque (filtri, stats, UI).
2. Eliminare whitelist hardcoded a 3 stati in filtri/query.
3. Creare `HostBookingListItem` (DTO) con:
   - booking base
   - space essenziale
   - guest essenziale
   - payments sintetici
   - dispute opzionale (`id`, `reason`, `opened_by`, `created_at`, `status` se disponibile)
4. Aggiornare `BookingFilter` a discriminated union o set multi-stato (`BookingStatus[]`).

### Fase 2 — Data fetching server-first (alta priorità)
1. Creare RPC/view (es. `get_host_bookings_dashboard`) che restituisce payload già joinato (bookings + profiles + payments + disputes).
2. Creare RPC/view per recent activity host per eliminare waterfall a 3 query.
3. Mantenere una sola fonte metriche (summary + activity + occupancy inputs) per ridurre inconsistenze temporali.

### Fase 3 — UX per stati estesi (alta priorità)
1. Aggiornare filtri dashboard con stati nuovi (`disputed`, `refunded`, `checked_in`, `checked_out`, `no_show`, ...).
2. Aggiungere sezione “Contestazioni” nelle booking card:
   - badge dedicato
   - reason sintetica
   - who opened (`opened_by`)
   - CTA contestuale (es. “Valuta rimborso”, “Apri dettaglio contestazione”).
3. Aggiornare stats con breakdown completo (non solo pending/confirmed/cancelled).

### Fase 4 — Resilienza e osservabilità (media priorità)
1. Implementare rendering a errori parziali:
   - metriche KO ma lista prenotazioni OK → mostra dashboard parziale + alert.
   - activity KO → card feed con fallback dedicato.
2. Evitare `return []` silenzioso senza surface UI; propagare uno stato `isPartialError`.
3. Rimuovere `console.*` e usare logger strutturato.

### Fase 5 — Type safety hardening (media priorità)
1. Rimuovere `any` e `@ts-ignore` in `hostActivityFetcher` e `useBookingTransforms`.
2. Tipizzare join Supabase in `src/types/supabase-joins.ts` includendo `disputes`.
3. Aggiungere test unitari su mapping stati + test integrazione query hooks (mock Supabase).

---

## Esito sintetico

- **Lo stato `disputed` oggi non rompe il layout**, ma è trattato come stato “piatto” senza dati disputa né workflow dedicato.
- **Il gap principale non è il rendering del badge, ma il contratto dati**: manca il join `disputes` e manca una UX che renda azionabile la contestazione.
- **Per preparare i rimborsi**, priorità assoluta a: `DTO typed + query server-side aggregate + partial error UX`.
