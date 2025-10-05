# 📖 Guida Utente - SpaceShare

Benvenuto su SpaceShare! Questa guida ti aiuterà a utilizzare la piattaforma per prenotare spazi o affittare i tuoi.

---

## 🎯 Panoramica

SpaceShare è una piattaforma che connette chi cerca spazi (ospiti) con chi li offre (host). Puoi essere entrambi!

### Ruoli Utente

- **Ospite**: Cerca e prenota spazi
- **Host**: Pubblica e gestisce i propri spazi
- **Admin**: Gestisce la piattaforma (ruolo speciale)

---

## 🚀 Primi Passi

### 1. Registrazione e Login

1. Clicca su **"Registrati"** nella homepage
2. Inserisci email e password
3. Conferma l'email (controlla la casella spam)
4. Accedi con le tue credenziali

**Login con Google**: Puoi anche registrarti/accedere con Google per maggiore velocità.

### 2. Completa il tuo Profilo

1. Vai su **Profilo** (icona utente in alto a destra)
2. Aggiungi una foto profilo
3. Inserisci nome e cognome
4. Scrivi una bio (opzionale ma consigliata)
5. Salva le modifiche

**Perché è importante?** Un profilo completo aumenta la fiducia degli altri utenti.

---

## 🔍 Come Ospite: Prenotare Spazi

### Cercare Spazi

1. **Homepage**: Usa la mappa o la lista per esplorare
2. **Ricerca Avanzata**: Filtra per:
   - Tipo di spazio (ufficio, sala riunioni, coworking, etc.)
   - Prezzo (range min-max)
   - Capacità (numero persone)
   - Servizi (WiFi, proiettore, aria condizionata, etc.)
3. **Mappa Interattiva**: Clicca sui marker per vedere i dettagli

### Visualizzare Dettagli Spazio

Ogni spazio mostra:
- **Foto e descrizione**
- **Prezzo orario**
- **Capacità e servizi**
- **Posizione sulla mappa**
- **Recensioni di altri utenti**
- **Calendario disponibilità**

### Effettuare una Prenotazione

1. Seleziona lo spazio desiderato
2. Clicca su **"Prenota"**
3. Scegli data e ora (inizio e fine)
4. Controlla il riepilogo:
   - Durata in ore
   - Prezzo totale
   - Fee di servizio (10%)
5. Aggiungi un messaggio opzionale per l'host
6. Clicca su **"Conferma Prenotazione"**
7. Completa il pagamento con Stripe

**Stati Prenotazione**:
- **Pending**: In attesa di approvazione dall'host
- **Confirmed**: Approvata e confermata
- **Rejected**: Rifiutata dall'host
- **Cancelled**: Cancellata da te o dall'host
- **Completed**: Terminata con successo

### Gestire le tue Prenotazioni

**Dashboard Prenotazioni** (`/bookings`):
- Visualizza tutte le tue prenotazioni
- Filtra per stato (pending, confirmed, etc.)
- Invia messaggi all'host
- Cancella prenotazioni (se consentito)
- Lascia recensioni dopo il completamento

### Cancellazione Prenotazioni

**Politica di Cancellazione**:
- **Più di 24h prima**: Rimborso completo
- **Meno di 24h**: Potrebbe non essere rimborsabile
- Contatta l'host per casi speciali

**Come Cancellare**:
1. Vai su **Prenotazioni**
2. Trova la prenotazione da cancellare
3. Clicca su **"Cancella"**
4. Seleziona il motivo della cancellazione
5. Conferma

### Lasciare Recensioni

**Dopo ogni prenotazione completata**:
1. Vai su **Prenotazioni**
2. Clicca su **"Lascia Recensione"**
3. Valuta da 1 a 5 stelle
4. Scrivi un commento dettagliato
5. Invia la recensione

**Cosa valutare**:
- Pulizia dello spazio
- Corrispondenza alla descrizione
- Servizi disponibili
- Comunicazione con l'host
- Rapporto qualità-prezzo

---

## 🏠 Come Host: Gestire Spazi

### Diventare Host

1. Vai su **Dashboard Host** (`/host`)
2. Clicca su **"Aggiungi Spazio"**
3. Completa il form di registrazione

### Creare un Nuovo Spazio

**Informazioni Base**:
- **Titolo**: Nome dello spazio (es. "Ufficio luminoso centro Milano")
- **Descrizione**: Dettagli completi (min. 50 caratteri)
- **Tipo**: Seleziona categoria (ufficio, sala riunioni, etc.)
- **Indirizzo**: Posizione esatta

**Prezzi e Capacità**:
- **Prezzo orario**: Quanto vuoi guadagnare all'ora
- **Capacità**: Numero massimo di persone

**Servizi**:
Seleziona tutti i servizi disponibili:
- WiFi veloce
- Proiettore/Monitor
- Aria condizionata
- Caffetteria
- Parcheggio
- Cucina
- etc.

**Foto**:
- Carica almeno 3 foto di qualità
- Prima foto = foto principale
- Mostra lo spazio da diverse angolazioni

**Regole e Politiche**:
- Check-in/Check-out
- Regole della casa
- Politica di cancellazione

### Gestire Prenotazioni

**Dashboard Host** (`/host`):
- **Prenotazioni Pending**: Richieste da approvare/rifiutare
- **Prenotazioni Confermate**: Booking attivi
- **Statistiche**: Guadagni, occupazione, trend

**Approvare/Rifiutare Prenotazioni**:
1. Visualizza i dettagli della richiesta
2. Controlla date e profilo ospite
3. Clicca su **"Approva"** o **"Rifiuta"**
4. Aggiungi un messaggio (opzionale per approvazione, obbligatorio per rifiuto)

**Modificare Spazi**:
1. Vai su **I Miei Spazi** (`/host/spaces`)
2. Clicca su uno spazio
3. Modifica le informazioni
4. Salva le modifiche

### Gestire Disponibilità

**Calendario**:
- Blocca date non disponibili
- Imposta orari di apertura
- Crea eccezioni per giorni festivi

### Pagamenti e Guadagni

**Stripe Connect**:
1. Configura account Stripe dalla Dashboard Host
2. Completa la verifica identità
3. Ricevi pagamenti automaticamente

**Commissioni**:
- SpaceShare trattiene il 10% su ogni prenotazione
- Ricevi il 90% del prezzo di listino
- Pagamenti entro 2-3 giorni lavorativi

---

## 💬 Messaggistica

### Inviare Messaggi

1. Da una prenotazione: Clicca su **"Messaggi"**
2. Scrivi il tuo messaggio
3. Allega file se necessario (max 10MB)
4. Invia

**Notifiche**: Riceverai notifiche via email per nuovi messaggi.

### Best Practices

- **Rispondi velocemente**: Tempo medio < 24h
- **Sii professionale**: Usa un linguaggio cortese
- **Sii chiaro**: Fornisci tutte le informazioni necessarie
- **Non condividere dati sensibili**: Usa sempre la piattaforma

---

## ⭐ Sistema di Recensioni

### Valutazioni

**Come Ospite**:
- Valuta host e spazio dopo ogni prenotazione
- Le recensioni sono pubbliche

**Come Host**:
- Valuta gli ospiti dopo ogni prenotazione
- Le recensioni sono pubbliche

**Rating Medio**:
- Visibile su profilo e spazi
- Influenza visibilità nei risultati di ricerca

### Segnalare Problemi

Se riscontri problemi:
1. Contatta l'altra parte tramite messaggi
2. Se non risolto, contatta il supporto
3. Includi screenshot e dettagli

---

## 🔐 Sicurezza e Privacy

### Protezione Account

- **Password forte**: Min. 8 caratteri con lettere, numeri e simboli
- **Verifica email**: Conferma sempre la tua email
- **Logout**: Disconnettiti da dispositivi pubblici

### Pagamenti Sicuri

- **Stripe**: Tutti i pagamenti tramite Stripe (certificato PCI-DSS)
- **Non pagare fuori piattaforma**: Mai effettuare pagamenti diretti

### Privacy

- **Dati Personali**: Condivisi solo con utenti coinvolti in prenotazioni
- **Indirizzo**: Visibile solo dopo conferma prenotazione
- **Policy Privacy**: Leggi la privacy policy completa

---

## 💳 Gestione Pagamenti

### Metodi di Pagamento Accettati

- Carte di credito/debito (Visa, Mastercard, American Express)
- Google Pay
- Apple Pay

### Rimborsi

**Tempi**:
- Rimborsi processati entro 5-10 giorni lavorativi
- Dipende dalla banca emittente

**Casi di Rimborso**:
- Cancellazione entro policy
- Spazio non disponibile
- Problemi gravi non risolti

---

## 📱 App Mobile e Notifiche

### Notifiche Email

Ricevi notifiche per:
- Nuove prenotazioni
- Messaggi
- Approvazioni/Rifiuti
- Recensioni
- Promemoria check-in

**Gestione Notifiche**: Vai su Impostazioni > Notifiche

---

## ❓ FAQ

### Per Ospiti

**Q: Posso modificare una prenotazione?**
A: Contatta l'host tramite messaggi. Le modifiche richiedono approvazione.

**Q: Cosa succede se l'host cancella?**
A: Ricevi rimborso completo e credito extra del 10%.

**Q: Posso prenotare più spazi contemporaneamente?**
A: Sì, non ci sono limiti.

### Per Host

**Q: Posso bloccare date specifiche?**
A: Sì, usa il calendario disponibilità.

**Q: Quando ricevo i pagamenti?**
A: 2-3 giorni dopo il check-in confermato.

**Q: Posso rifiutare una prenotazione?**
A: Sì, ma troppi rifiuti influenzano il ranking.

### Generali

**Q: Come contatto il supporto?**
A: Email support@spaceshare.com o chat in-app.

**Q: SpaceShare è disponibile nella mia città?**
A: Verifica sulla mappa. Sempre nuove città in arrivo!

---

## 📞 Supporto

### Contatti

- **Email**: support@spaceshare.com
- **Chat**: Disponibile in app (9:00-18:00)
- **Centro Assistenza**: help.spaceshare.com

### Tempi di Risposta

- Chat: < 2 ore (orario lavorativo)
- Email: < 24 ore
- Urgenze: Contatta tramite chat

---

## 🎓 Risorse Aggiuntive

- **Blog**: Consigli e best practices
- **Video Tutorial**: Guide passo-passo
- **Community**: Forum utenti
- **Newsletter**: Novità e promozioni

---

**Buona esperienza su SpaceShare! 🚀**
