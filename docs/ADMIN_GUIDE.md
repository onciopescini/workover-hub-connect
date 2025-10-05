# 🛡️ Guida Amministratore - SpaceShare

Guida completa per amministratori della piattaforma SpaceShare.

---

## 🎯 Panoramica Ruolo Admin

Gli amministratori hanno accesso completo alla piattaforma per:
- Monitorare attività utenti e spazi
- Moderare contenuti e recensioni
- Gestire segnalazioni e dispute
- Visualizzare analytics e report
- Gestire impostazioni di sistema

---

## 🔐 Accesso Admin

### Requisiti

- Account con ruolo `admin` nel database
- Email verificata
- Autenticazione a due fattori (consigliata)

### Accedere al Pannello Admin

1. Login normale su `/login`
2. Naviga verso `/admin`
3. Dashboard admin si apre automaticamente se hai i permessi

**URL**: `https://yourdomain.com/admin`

---

## 📊 Dashboard Admin

### Overview

La dashboard mostra:
- **Statistiche Globali**: Utenti, spazi, prenotazioni, revenue
- **Grafici Trend**: Crescita nel tempo
- **Attività Recenti**: Ultime azioni sulla piattaforma
- **Alerts**: Notifiche importanti e segnalazioni

### Metriche Chiave

- **Total Users**: Utenti registrati
- **Active Hosts**: Host con almeno uno spazio attivo
- **Total Spaces**: Spazi pubblicati
- **Total Bookings**: Prenotazioni totali
- **Revenue**: Guadagni totali (commissioni)
- **Avg Rating**: Rating medio piattaforma

---

## 👥 Gestione Utenti

### Visualizzare Utenti

**Sezione**: Admin > Users

**Filtri Disponibili**:
- Per ruolo (guest, host, admin)
- Per stato (active, suspended, banned)
- Per data registrazione
- Ricerca per nome/email

### Informazioni Utente

Per ogni utente puoi vedere:
- **Profilo Completo**: Dati personali, foto, bio
- **Statistiche**: Prenotazioni, spazi pubblicati, rating
- **Attività**: Log delle azioni recenti
- **Recensioni Ricevute/Lasciate**
- **Storico Pagamenti**
- **Segnalazioni Ricevute**

### Azioni Admin su Utenti

**Visualizza Dettagli**:
```
Click su utente → Mostra profilo completo
```

**Sospendere Account**:
1. Click su **"Suspend"**
2. Seleziona motivo
3. Imposta durata (giorni o permanente)
4. Conferma

**Bannare Utente**:
1. Click su **"Ban"**
2. Inserisci motivo dettagliato
3. Conferma (azione permanente)

**Riattivare Account**:
1. Filtra utenti sospesi/bannati
2. Click su **"Reactivate"**
3. Conferma

**Modificare Ruolo**:
1. Click su utente
2. Sezione **"Edit Role"**
3. Seleziona nuovo ruolo (guest/host/admin)
4. Salva

**Cancellare Account**:
⚠️ **Attenzione**: Azione irreversibile
1. Click su **"Delete Account"**
2. Conferma cancellazione
3. I dati vengono eliminati permanentemente

### Report Utenti Problematici

**Indicatori**:
- Multiple cancellazioni
- Rating basso costante (<3.0)
- Segnalazioni multiple
- Comportamento sospetto (account duplicati, frodi)

**Azione Consigliata**:
1. Revisiona storico utente
2. Contatta utente per chiarimenti
3. Se confermato problema: Sospendi o banna

---

## 🏢 Gestione Spazi

### Visualizzare Spazi

**Sezione**: Admin > Spaces

**Filtri**:
- Per tipo (office, meeting room, coworking, etc.)
- Per stato (active, inactive, pending review)
- Per rating
- Ricerca per titolo/indirizzo

### Moderazione Spazi

**Nuovi Spazi (Pending Review)**:
1. Vai su **"Pending Spaces"**
2. Revisiona:
   - Contenuto appropriato
   - Foto di qualità
   - Informazioni complete e accurate
   - Indirizzo valido
   - Prezzo ragionevole
3. **Approva** o **Rifiuta**

**Motivi Rifiuto Comuni**:
- Foto inappropriate o di bassa qualità
- Descrizione inadeguata
- Prezzo fuori mercato
- Indirizzo non verificabile
- Contenuti spam o fake

### Azioni Admin su Spazi

**Modificare Spazio**:
1. Click su spazio
2. Click **"Edit"**
3. Modifica qualsiasi campo
4. Salva modifiche

**Disattivare Spazio**:
1. Click su **"Deactivate"**
2. Motivo (opzionale)
3. Conferma

**Eliminare Spazio**:
⚠️ Cancella anche prenotazioni associate
1. Click su **"Delete"**
2. Conferma eliminazione

**Feature Spazio** (Promozione):
1. Click su **"Feature"**
2. Spazio appare in homepage e risultati top
3. Imposta durata feature

---

## 📅 Gestione Prenotazioni

### Visualizzare Prenotazioni

**Sezione**: Admin > Bookings

**Filtri**:
- Per stato (pending, confirmed, cancelled, completed)
- Per date
- Per spazio
- Per utente (host o guest)

### Informazioni Prenotazione

- **Dettagli Base**: Date, orari, prezzo
- **Partecipanti**: Host e guest con profili
- **Pagamenti**: Transazione Stripe, commissioni
- **Messaggi**: Conversazione tra parti
- **Status History**: Log cambiamenti stato

### Azioni Admin su Prenotazioni

**Cancellare Prenotazione**:
1. Click su booking
2. Click **"Cancel Booking"**
3. Seleziona motivo:
   - Richiesta utente
   - Violazione policy
   - Problema tecnico
   - Frode
4. Scegli politica rimborso:
   - Full refund
   - Partial refund
   - No refund
5. Conferma

**Modificare Date/Orari**:
1. Click su **"Edit Booking"**
2. Modifica date/orari
3. Salva (notifica automatica alle parti)

**Risolvere Dispute**:
1. Visualizza messaggi tra parti
2. Raccogli evidenze (screenshot, prove)
3. Prendi decisione:
   - Rimborso completo ospite
   - Pagamento completo host
   - Split (es. 50/50)
4. Applica decisione e chiudi disputa

---

## 💬 Moderazione Recensioni

### Visualizzare Recensioni

**Sezione**: Admin > Reviews

**Filtri**:
- Per rating (1-5 stelle)
- Per stato (active, flagged, removed)
- Per tipo (space review, user review)
- Ricerca per contenuto

### Recensioni Segnalate

**Motivi Segnalazione**:
- Contenuto offensivo
- Spam
- Fake review
- Informazioni personali
- Linguaggio inappropriato

**Azioni**:

**Mantenere Recensione**:
1. Revisiona segnalazione
2. Se legittima: Click **"Keep Review"**
3. Notifica segnalatore

**Rimuovere Recensione**:
1. Se viola policy: Click **"Remove"**
2. Seleziona motivo
3. Conferma (notifica autore)

**Modificare Recensione**:
⚠️ Usa solo per rimozione dati sensibili
1. Click **"Edit"**
2. Modifica testo (es. rimuovi email/telefono)
3. Salva con note admin

---

## 🚨 Gestione Segnalazioni

### Tipi di Segnalazioni

1. **User Reports**: Utenti segnalati
2. **Space Reports**: Spazi problematici
3. **Review Reports**: Recensioni inappropriate
4. **Booking Disputes**: Problemi con prenotazioni

### Workflow Segnalazioni

**Nuova Segnalazione**:
1. Arriva notifica admin
2. Revisiona dettagli segnalazione
3. Verifica evidenze
4. Classifica priorità (low/medium/high/critical)

**Investigazione**:
1. Raccogli informazioni:
   - Storico utente/spazio
   - Messaggi tra parti
   - Screenshot/prove
2. Contatta parti coinvolte se necessario
3. Documenta processo

**Risoluzione**:
1. Prendi decisione basata su policy
2. Applica azione (warning, sospensione, ban, etc.)
3. Notifica parti coinvolte
4. Chiudi segnalazione con note

**Best Practices**:
- Risposta entro 24h per segnalazioni high priority
- Documentazione completa di ogni caso
- Imparzialità e aderenza alle policy
- Comunicazione chiara con utenti

---

## 💰 Gestione Finanziaria

### Dashboard Finanziaria

**Sezione**: Admin > Finance

**Metriche**:
- **Total Revenue**: Commissioni totali
- **Monthly Revenue**: Guadagni mensili
- **Pending Payouts**: Pagamenti da processare
- **Refunds**: Rimborsi emessi

### Transazioni

**Visualizza Tutte le Transazioni**:
- Filtri per data, stato, tipo
- Export CSV per accounting

**Dettagli Transazione**:
- Booking associato
- Importo totale
- Commissione SpaceShare (10%)
- Payout host (90%)
- Fees Stripe
- Stato pagamento

### Rimborsi Manuali

**Quando Usare**:
- Dispute risolte a favore ospite
- Errori di sistema
- Compensazione per disservizi

**Processo**:
1. Admin > Finance > **"Issue Refund"**
2. Seleziona booking
3. Importo rimborso (full o partial)
4. Motivo
5. Conferma → Stripe processa rimborso

### Payout Host

**Gestione Automatica**:
- Payout automatici 2-3 giorni dopo check-in
- Verifica Stripe Connect attivo

**Payout Manuali** (eccezioni):
1. Trova transazione
2. Click **"Process Payout"**
3. Conferma

---

## 📊 Analytics e Report

### Report Disponibili

**User Analytics**:
- Crescita utenti (giornaliera/mensile)
- Utenti attivi vs inattivi
- Distribuzione geografica
- Retention rate

**Space Analytics**:
- Nuovi spazi pubblicati
- Occupancy rate
- Spazi più popolari
- Distribuzione per tipo

**Booking Analytics**:
- Prenotazioni per periodo
- Cancellation rate
- Average booking value
- Peak periods

**Revenue Analytics**:
- Revenue trend
- Commission breakdown
- Payout vs revenue
- Forecast revenue

### Export Report

1. Seleziona report desiderato
2. Imposta date range
3. Click **"Export"**
4. Download CSV/PDF

---

## ⚙️ Impostazioni Sistema

### Configurazioni Globali

**Sezione**: Admin > Settings

**Parametri Modificabili**:

**Commission Rate**:
- Default: 10%
- Modificabile per test o promozioni

**Booking Policies**:
- Cancellation deadlines
- Refund policies
- Booking buffer times

**Payment Settings**:
- Stripe API keys (env variables)
- Payout schedule
- Currency settings

**Email Notifications**:
- Template email
- Frequenza notifiche
- Toggle on/off per tipo

**Feature Flags**:
- Abilita/disabilita funzionalità
- Beta features
- Maintenance mode

### Manutenzione

**Maintenance Mode**:
1. Admin > Settings > **"Maintenance"**
2. Toggle ON
3. Imposta messaggio per utenti
4. Solo admin possono accedere

**Database Backup**:
- Backup automatici giornalieri (Supabase)
- Backup manuali: Admin > **"Backup Now"**

---

## 🔒 Sicurezza e Audit

### Audit Logs

**Visualizza Logs**:
Admin > **"Audit Logs"**

**Eventi Tracciati**:
- Login admin
- Modifiche utenti (ban, suspend, etc.)
- Modifiche spazi (edit, delete)
- Cancellazioni prenotazioni
- Rimborsi emessi
- Modifiche configurazioni

**Informazioni Log**:
- Timestamp
- Admin che ha eseguito azione
- Tipo azione
- Oggetto modificato
- Dettagli modifiche

### Sicurezza

**Best Practices**:
- **Password forte**: Min. 12 caratteri
- **2FA abilitata**: Sempre
- **Sessioni limitate**: Logout automatico
- **Access logs**: Monitora accessi anomali

**Ruoli Granulari** (futuro):
- Super Admin (full access)
- Moderator (solo moderazione contenuti)
- Finance Admin (solo gestione pagamenti)
- Support Admin (solo supporto utenti)

---

## 📞 Supporto Utenti

### Gestione Ticket

**Sezione**: Admin > Support

**Tipi Ticket**:
- Technical issues
- Payment problems
- Account problems
- Booking disputes
- General inquiries

**Workflow Ticket**:
1. Nuovo ticket → Priorità assegnata
2. Admin prende in carico
3. Comunicazione con utente
4. Risoluzione e chiusura
5. Feedback utente (opzionale)

**Stati Ticket**:
- Open
- In Progress
- Waiting for User
- Resolved
- Closed

---

## 🚀 Best Practices Admin

### Moderazione

1. **Rispondi velocemente**: Segnalazioni high priority < 24h
2. **Sii imparziale**: Segui policy, non opinioni personali
3. **Documenta tutto**: Note complete su ogni azione
4. **Comunica chiaramente**: Spiega decisioni agli utenti

### Gestione Community

1. **Monitora trend**: Identifica problemi ricorrenti
2. **Previeni abusi**: Agisci su comportamenti sospetti
3. **Premia utenti positivi**: Feature spazi di qualità
4. **Educa utenti**: Guide e FAQ aggiornate

### Performance

1. **Monitora metriche**: Controlli giornalieri dashboard
2. **Identifica colli di bottiglia**: Spazi/utenti problematici
3. **Ottimizza conversione**: A/B test su funzionalità
4. **Report mensili**: Presentazioni a stakeholders

---

## 🛠️ Troubleshooting Admin

### Problemi Comuni

**Pagamenti Bloccati**:
- Verifica Stripe webhooks funzionanti
- Controlla logs Stripe
- Valida connection Stripe Connect host

**Notifiche Non Inviate**:
- Verifica configurazione email (Supabase Auth)
- Controlla spam/bounce rate
- Valida template email

**Prenotazioni Duplicate**:
- Identifica causa (bug, utente)
- Cancella duplicati
- Rimborsa se necessario

**Spazi Non Visibili**:
- Verifica stato (active)
- Controlla availability
- Valida coordinate GPS

---

## 📚 Risorse Admin

### Documentazione

- **API Reference**: Per integrazioni custom
- **Database Schema**: Struttura DB completa
- **Architecture Guide**: Overview sistema

### Tools Utili

- **Stripe Dashboard**: stripe.com/dashboard
- **Supabase Console**: Gestione database
- **Sentry**: Error monitoring
- **PostHog**: Product analytics

---

## 📞 Escalation

**Problemi Critici**:
- Security breaches
- Payment system down
- Database corruption

**Contatti**:
- **Tech Lead**: tech@spaceshare.com
- **On-call**: +39 XXX XXXXXXX
- **Slack**: #admin-alerts

---

**Gestisci con responsabilità! 🛡️**
