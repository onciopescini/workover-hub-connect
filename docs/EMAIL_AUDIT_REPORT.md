# Audit Sistema Notifiche Email - 2025

Analisi effettuata su `supabase/functions` e logica di business.

## 1. Mappa Eventi & Stato

| Evento di Business | Email Prevista | Template Esistente? | Stato Trigger | Note |
| :--- | :--- | :--- | :--- | :--- |
| **Registrazione Utente** | Benvenuto | ✅ `welcome` | ✅ Attivo | Gestito in `create-profile/index.ts`. Invia email di benvenuto all'iscrizione. |
| **Cancellazione** | Guest + Host Alerts | ✅ `booking_cancelled`<br>✅ `host_booking_cancelled` | ✅ Attivo | Gestito in `cancel-booking/index.ts`. Invia email a entrambe le parti. |
| **Nuova Prenotazione** (Checkout Success) | Conferma Guest | ✅ `booking_confirmation` | ❌ **MANCANTE** | `stripe-webhooks` crea solo notifiche in-app (`user_notifications`). **Nessuna email inviata.** |
| **Nuova Richiesta** (Host) | Avviso Host | ✅ `new_booking_request` | ❌ **MANCANTE** | Come sopra. L'host riceve solo notifica in dashboard. |
| **Setup Stripe** | Conferma Host | ✅ `stripe_setup_complete` | ✅ Attivo | Gestito in `stripe-webhooks/account-handlers.ts`. |
| **Recensione Ricevuta** | Avviso Host | ✅ `review_received` | ❌ **MANCANTE** | Il template esiste, ma non c'è nessun trigger (né in DB né in Edge Functions) che lo chiama. |
| **Ticket Supporto** | Conferma Utente | ✅ `support_ticket` | ✅ Attivo | Gestito in `support-tickets/index.ts`. |
| **Payout Host** | Avviso Bonifico | ✅ `host_payout_processed` | ❓ Da Verificare | Esiste il template, ma la logica di payout automatico non sembra chiamarlo esplicitamente. |

## 2. Dettaglio Criticità (GAP)

### 🔴 Flusso Prenotazione (Priorità Alta)
Attualmente, quando un utente paga (`stripe-webhooks/handlers/enhanced-checkout-handlers.ts`):
1. Il pagamento viene registrato.
2. La prenotazione viene confermata (o messa in pending).
3. Viene chiamata `NotificationService.sendBookingNotification`.
4. **PROBLEMA:** `NotificationService` scrive solo su DB (`user_notifications`). Non invoca `send-email`.

**Azione Consigliata:** Modificare `NotificationService` o `EnhancedCheckoutHandlers` per chiamare `send-email` con il template `booking_confirmation` (per il guest) e `new_booking_request` (per l'host).

### 🟡 Recensioni
Il sistema di recensioni sembra essere puramente passivo. Non vengono inviate email quando un host riceve una recensione.

### 🟢 Registrazione & Cancellazione
Questi flussi sono corretti e utilizzano i template appropriati.
