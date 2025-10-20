# 📋 WorkOver Pre-Deploy Checklist

Stampa questa checklist e spunta ogni item prima del deployment production.

**Data prevista deploy:** _______________  
**Responsabile:** _______________

---

## 🔴 SECURITY (CRITICO - BLOCCA DEPLOY)

### Database Security
- [ ] ✅ Eseguito backup manuale database (Supabase Dashboard → Database → Backups)
- [ ] ✅ Fix SECURITY DEFINER views (vedi `docs/SQL_SECURITY_FIXES.md`)
- [ ] ✅ Fix search_path functions (tutte le 36 funzioni nel file SQL)
- [ ] ✅ Verificato query test: 0 funzioni vulnerabili restanti
- [ ] ✅ Test RLS: utente A non vede dati utente B

### Code Security Scan
- [ ] ✅ Run `npm run security:scan` - Nessun errore HIGH/CRITICAL
- [ ] ✅ Verificato nessun hardcoded API key nel codebase
- [ ] ✅ Verificato nessun `console.log()` con dati sensibili
- [ ] ✅ Environment variables configurate correttamente

### Manual Security Tests
- [ ] ✅ Test injection SQL su form pubblici
- [ ] ✅ Test XSS su campi di input (description, title, messages)
- [ ] ✅ Test CSRF su azioni critiche (delete, update)
- [ ] ✅ Test privilege escalation (coworker → host / admin)

**❌ SE ANCHE UN SOLO ITEM SECURITY FALLISCE, NON FARE DEPLOY**

---

## 💳 STRIPE (TEST MODE per Beta)

### Configuration
- [ ] ✅ `VITE_STRIPE_PUBLISHABLE_KEY` è **pk_test_XXX** (NON pk_live_)
- [ ] ✅ Stripe webhook configurato in Dashboard
  - URL: `https://[dominio]/functions/v1/stripe-webhooks`
  - Eventi: `checkout.session.completed`, `account.updated`, `payment_intent.*`
- [ ] ✅ `STRIPE_WEBHOOK_SECRET` (ws_test_XXX) in Supabase Secrets
- [ ] ✅ `STRIPE_SECRET_KEY` (sk_test_XXX) in Supabase Secrets

### Testing
- [ ] ✅ Test booking end-to-end con carta test (4242 4242 4242 4242)
- [ ] ✅ Test webhook ricevuto correttamente (check Supabase logs)
- [ ] ✅ Test onboarding host Stripe Connect (usa dati test)
- [ ] ✅ Verificato errore carte reali bloccate in test mode

---

## 💾 DATABASE

### Pre-Deploy
- [ ] ✅ Backup manuale creato (timestamp: ____________)
- [ ] ✅ Tutte le migrations applicate con successo
  ```bash
  npm run migrate:status
  ```
- [ ] ✅ Seed data caricati (2-3 spazi demo pubblici)
- [ ] ✅ Verificato indici database per performance

### Data Integrity
- [ ] ✅ Test RPC functions: `is_admin()`, `has_role()` funzionano
- [ ] ✅ Test triggers: validazioni email, Stripe, capacity
- [ ] ✅ Test constraints: UNIQUE, NOT NULL, FK corretti
- [ ] ✅ Nessuna tabella critica senza RLS

---

## 🌐 DOMAIN & SSL

### Domain Setup
- [ ] ✅ Custom domain collegato in Lovable (`[scrivi dominio]`)
- [ ] ✅ DNS record configurato (Type A, Value: 185.158.133.1)
- [ ] ✅ DNS propagato (check con [dnschecker.org](https://dnschecker.org))
- [ ] ✅ SSL certificate attivo (https:// funziona)

### Redirects
- [ ] ✅ www → non-www redirect configurato (o viceversa)
- [ ] ✅ http → https redirect automatico
- [ ] ✅ Old routes → new routes (se applicabile)

---

## 📊 MONITORING & ERROR TRACKING

### Sentry Setup
- [ ] ✅ Progetto production creato in Sentry (`WorkOver-Production`)
- [ ] ✅ `VITE_SENTRY_DSN` production configurato
- [ ] ✅ Email alerts configurate per errori critici
- [ ] ✅ Slack integration (opzionale): webhook configurato
- [ ] ✅ Test error capture: errore manuale appare in Sentry

### Analytics
- [ ] ✅ PostHog analytics attivo (`VITE_POSTHOG_KEY` configurato)
- [ ] ✅ PostHog event tracking testato (pageview registrato)
- [ ] ✅ Event tracking critico implementato:
  - [ ] `booking_created`
  - [ ] `space_published`
  - [ ] `payment_completed`
  - [ ] `user_registered`

### Supabase Monitoring
- [ ] ✅ Edge Functions logs accessibili
- [ ] ✅ Database query logs attivi
- [ ] ✅ Auth logs abilitati
- [ ] ✅ Alert email configurate per storage/DB limiti

---

## 📄 LEGAL & COMPLIANCE (GDPR)

### Documents Published
- [ ] ✅ Privacy Policy pubblicata e accessibile (`/privacy-policy`)
- [ ] ✅ Terms of Service aggiornati con sezione Beta (`/terms`)
- [ ] ✅ Cookie banner implementato e funzionante
- [ ] ✅ Centro Privacy GDPR testato:
  - [ ] Export dati personali
  - [ ] Delete account (soft delete)
  - [ ] Rettifica dati

### Cookie Consent
- [ ] ✅ Banner mostrato al primo accesso
- [ ] ✅ Consenso salvato in localStorage
- [ ] ✅ PostHog/Sentry disabilitati se consenso negato
- [ ] ✅ Link Privacy Policy nel banner

### Footer Links
- [ ] ✅ Footer contiene link "Privacy Policy"
- [ ] ✅ Footer contiene link "Centro Privacy"
- [ ] ✅ Footer contiene link "Termini di Servizio"
- [ ] ✅ Footer contiene link "Contatti"

---

## 🧪 UI/UX BETA MODE

### Beta Notices
- [ ] ✅ `BetaNotice` banner visibile in homepage
- [ ] ✅ `BetaNotice` banner visibile in ricerca spazi
- [ ] ✅ Alert "Test Mode" presente in checkout
- [ ] ✅ Istruzioni carta test chiare:
  ```
  Carta: 4242 4242 4242 4242
  CVV: 123 | Scadenza: 12/25 | CAP: qualsiasi
  ```
- [ ] ✅ Link "Segnala Bug" in footer o modal

### Visual Testing
- [ ] ✅ Test responsive mobile (Chrome DevTools iPhone 14)
- [ ] ✅ Test responsive tablet (iPad Pro)
- [ ] ✅ Test dark mode (se implementato)
- [ ] ✅ Test con screen reader (accessibility)

---

## 🔧 ENVIRONMENT VARIABLES

### Frontend (.env.production)
```bash
# Supabase
VITE_SUPABASE_URL=https://khtqwzvrxzsgfhsslwyz.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stripe (TEST MODE)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY  # ⚠️ DEVE essere pk_test_

# Monitoring
VITE_SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
VITE_POSTHOG_KEY=phc_xxx

# Maps
VITE_MAPBOX_ACCESS_TOKEN=pk.xxx

# Feature Flags
VITE_ENABLE_BETA_NOTICE=true
```

- [ ] ✅ Tutti i campi sopra compilati
- [ ] ✅ Nessun `VITE_*_SECRET_KEY` (secrets vanno in Supabase)
- [ ] ✅ Verificato nessun placeholder `YOUR_KEY`

### Supabase Secrets
Vai su: Supabase Dashboard → Settings → Edge Function Secrets

- [ ] ✅ `STRIPE_SECRET_KEY` = sk_test_XXX
- [ ] ✅ `STRIPE_WEBHOOK_SECRET` = whsec_XXX
- [ ] ✅ (Opzionale) `SENDGRID_API_KEY` per email transazionali

---

## ✅ TESTING FINALE (STAGING)

### User Flows
- [ ] ✅ **Registrazione nuovo utente**
  - Email verification ricevuta
  - Onboarding completato
  - Profilo creato correttamente

- [ ] ✅ **Ricerca spazi**
  - Filtri funzionano (città, prezzo, capacità)
  - Mappa visualizza markers corretti
  - Dettaglio spazio mostra tutte le info

- [ ] ✅ **Booking completo (Coworker)**
  - Selezione data/ora funziona
  - Calcolo prezzo corretto (server-side validation)
  - Checkout Stripe test mode
  - Conferma prenotazione + email
  - Prenotazione appare in "Le mie prenotazioni"

- [ ] ✅ **Pubblicazione spazio (Host)**
  - Upload almeno 3 foto
  - GPS coordinates obbligatori
  - Stripe onboarding completato
  - KYC documents upload (admin approval)
  - Fiscal data completi
  - Spazio pubblicato visibile in ricerca

- [ ] ✅ **Messaggi**
  - Messaggio tra host e coworker
  - Notifica ricevuta
  - Chat thread caricato correttamente

- [ ] ✅ **Recensioni**
  - Lascia recensione dopo booking
  - Rating medio aggiornato
  - Mutual review visibility

### Edge Cases
- [ ] ✅ Booking slot già occupato → errore gestito
- [ ] ✅ Capacity overflow → errore gestito
- [ ] ✅ Pagamento fallito → status "cancelled"
- [ ] ✅ Upload foto > 10MB → errore chiaramente comunicato
- [ ] ✅ Session expired → redirect a login

### Browser Compatibility
- [ ] ✅ Chrome (latest)
- [ ] ✅ Safari (latest)
- [ ] ✅ Firefox (latest)
- [ ] ✅ Edge (latest)
- [ ] ✅ Mobile Safari (iOS)
- [ ] ✅ Chrome Mobile (Android)

---

## 📧 COMMUNICATION

### Beta Testers Email List
- [ ] ✅ Lista 20-50 email raccolta
- [ ] ✅ Email template preparata (`docs/BETA_INVITE_EMAIL.md`)
- [ ] ✅ Google Form feedback creato:
  - [ ] Link aggiunto in footer
  - [ ] Link in email template
  - [ ] Campi: Titolo bug, Descrizione, Gravità, Screenshot

### Support Channel
- [ ] ✅ Email supporto attiva: beta@workover.it (o altra)
- [ ] ✅ Auto-reply configurata (opzionale)
- [ ] ✅ Telegram/Discord gruppo beta testers (opzionale)

### Documentation
- [ ] ✅ FAQ aggiornate con info beta mode
- [ ] ✅ Link Stripe test cards in FAQ
- [ ] ✅ "Segnala Bug" page/modal creato

---

## 🚀 POST-DEPLOY MONITORING (Prime 72 ore)

### Immediate (Prime 4 ore)
- [ ] Test registrazione nuovo utente LIVE
- [ ] Test booking con carta test LIVE
- [ ] Verificato webhook Stripe ricevuto
- [ ] Check Sentry: nessun errore critico

### Daily (Primi 3 giorni)
- [ ] **Mattina (9:00)**
  - [ ] Check Sentry errors (target: < 5 errori/ora)
  - [ ] Check Supabase logs (Auth, DB, Edge Functions)
  - [ ] Check PostHog events (almeno 10 utenti attivi)
  
- [ ] **Sera (18:00)**
  - [ ] Rispondi feedback utenti (Google Form + email)
  - [ ] Fix bug critici se presenti
  - [ ] Update "Known Issues" doc

### Weekly (Settimane 1-4)
- [ ] **Ogni Lunedì**
  - [ ] Review Sentry error trends
  - [ ] Analizza PostHog funnel conversione:
    - Homepage → Ricerca: ____%
    - Ricerca → Dettaglio: ____%
    - Dettaglio → Checkout: ____%
    - Checkout → Conferma: ____%
  - [ ] Call/Meeting beta testers (opzionale)

---

## 🎯 SUCCESS METRICS (Obiettivi Beta)

### Target Settimana 2
- [ ] Almeno 10 utenti registrati
- [ ] Almeno 5 booking test completati
- [ ] Zero bug critici aperti

### Target Settimana 4
- [ ] 20-30 utenti registrati
- [ ] 20 booking test completati
- [ ] Almeno 3 host con spazi pubblicati

### Target Fine Beta (Settimana 6-8)
- [ ] **50 booking test completati** ✅ TRIGGER LIVE MODE
- [ ] Funnel booking > 60% completion rate
- [ ] Almeno 5 host con KYC verified
- [ ] Meno di 3 bug critici in backlog

---

## 📋 DEPLOYMENT APPROVAL

### Final Sign-Off

**Ho verificato che:**
- [ ] Tutti i 120 item sopra sono ✅
- [ ] Ho eseguito backup database (timestamp: ___________)
- [ ] Ho testato personalmente flusso booking completo
- [ ] Team è pronto per monitoring post-deploy
- [ ] Email invito beta pronta per invio

**Autorizzazione Deploy:**

- **Nome:** ___________________________
- **Ruolo:** ___________________________
- **Data:** ___________________________
- **Firma:** ___________________________

---

## 🆘 EMERGENCY ROLLBACK PLAN

Se qualcosa va male dopo deploy:

### Rollback Immediato (< 5 minuti)
1. Lovable: Revert all'ultima versione stabile
2. Supabase: Restore backup database
3. Comunicare agli utenti via email

### Contact List
- **Supabase Support:** support@supabase.com
- **Lovable Discord:** #help channel
- **Stripe Support:** https://support.stripe.com

### Known Issues Log
Mantieni un doc condiviso con bug noti:
```
| Severity | Issue | Workaround | ETA Fix |
|----------|-------|------------|---------|
| High     | ...   | ...        | ...     |
```

---

**⏱️ Tempo stimato deploy completo:** 2-3 ore  
**👥 Team necessario:** 1 dev + 1 QA (opzionale)  
**📅 Best time:** Lunedì mattina 9:00-12:00 (evita venerdì sera!)

---

🎉 **Buon Deploy!** 🚀
