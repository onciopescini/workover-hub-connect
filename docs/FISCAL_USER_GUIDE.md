# 📋 Guida Utente: Modulo Fiscale

**WorkOver Fiscal Module - User Guide**  
Versione: 1.0

---

## 🎯 Indice

- [Per Host](#per-host)
  - [Configurazione Regime Fiscale](#configurazione-regime-fiscale)
  - [Dashboard Fatture](#dashboard-fatture)
- [Per Coworker](#per-coworker)
  - [Richiedere Fattura](#richiedere-fattura)
  - [I Miei Documenti](#i-miei-documenti)
- [FAQ](#faq)

---

## 🏠 Per Host

### Configurazione Regime Fiscale

Quando crei il tuo profilo host, dovrai selezionare il tuo regime fiscale. Questa scelta determina quale tipo di documento emetterai per ogni prenotazione.

#### 🔵 Host Privato (no P.IVA)

**Quando scegliere:**
- Non hai Partita IVA
- Affitti occasionalmente il tuo spazio
- Non sei soggetto a IVA

**Come configurare:**
1. Vai su **Profilo > Modifica**
2. Nella sezione "Dati Fiscali", seleziona **"Privato"**
3. Salva

**Cosa emetterai:**
- ✅ **Ricevute non fiscali** per ogni prenotazione
- ⚠️ Le ricevute hanno valore probatorio ma **NON fiscale**
- ⚠️ I coworker **non possono detrarle/dedurle** ai fini fiscali

**Esempio ricevuta:**
```
Ricevuta Non Fiscale #RIC-2025-001
Data: 15 gennaio 2025
Importo: €100,00

Emittente: Mario Rossi (Privato)
Destinatario: Società XYZ S.r.l.

⚠️ Documento non valido ai fini fiscali (IVA/detrazioni)
```

---

#### 🟢 Host con Regime Forfettario

**Quando scegliere:**
- Hai Partita IVA in regime forfettario
- Fatturato annuo < €85.000
- Non applichi IVA sulle fatture

**Come configurare:**
1. Vai su **Profilo > Modifica**
2. Seleziona **"Regime Forfettario"**
3. Inserisci:
   - **P.IVA** (11 cifre numeriche) es: `12345678901`
   - **Codice Fiscale** (16 caratteri alfanumerici) es: `RSSMRA80A01H501U`
4. Salva

**Cosa emetterai:**
- ✅ **Fatture elettroniche XML** senza IVA
- ✅ Valide per detrazioni/deduzioni fiscali
- ℹ️ Dicitura obbligatoria: *"Operazione effettuata ai sensi dell'art. 1, comma 54-89, L. 190/2014"*

**Esempio fattura forfettaria:**
```
Fattura Elettronica #FT-2025-001
Data: 15 gennaio 2025

Imponibile: €100,00
IVA: €0,00 (Regime Forfettario)
TOTALE: €100,00

Emittente: Giovanni Bianchi - P.IVA 12345678901
Destinatario: Società XYZ S.r.l.

Dicitura: Operazione effettuata ai sensi dell'art. 1,
comma 54-89, L. 190/2014
```

---

#### 🟡 Host con Regime Ordinario

**Quando scegliere:**
- Hai Partita IVA in regime ordinario
- Fatturato annuo ≥ €85.000 o scelta volontaria
- Applichi IVA sulle fatture

**Come configurare:**
1. Vai su **Profilo > Modifica**
2. Seleziona **"Regime Ordinario"**
3. Inserisci:
   - **P.IVA** (11 cifre)
   - **Codice Fiscale** (16 caratteri)
   - **Aliquota IVA** (es: `22%`)
4. Salva

**Cosa emetterai:**
- ✅ **Fatture elettroniche XML** con IVA
- ✅ Valide per detrazioni/deduzioni fiscali
- ℹ️ IVA calcolata automaticamente secondo aliquota impostata

**Esempio fattura ordinaria:**
```
Fattura Elettronica #FT-2025-001
Data: 15 gennaio 2025

Imponibile: €100,00
IVA (22%): €22,00
TOTALE: €122,00

Emittente: Bianchi Coworking S.r.l.
P.IVA: 12345678901
Destinatario: Società XYZ S.r.l.
```

---

### Dashboard Fatture

Accedi alla dashboard fatture tramite il menu: **Dashboard Host > Fatture**

La dashboard è divisa in **3 tab**:

#### 📬 Tab 1: Fatture da Emettere

Visualizza tutte le prenotazioni per cui devi emettere fattura.

**Cosa vedrai:**
- 📅 Data prenotazione
- 👤 Dati fiscali del coworker (CF/P.IVA, indirizzo, PEC/SDI)
- 💰 Importo da fatturare
- ⏰ **Countdown T+7 giorni** (deadline legale)
- 📄 Pulsante "Scarica PDF Riepilogo"

**Badge countdown:**
- 🟢 **7-3 giorni rimanenti**: Countdown verde
- 🟡 **2-1 giorni rimanenti**: Warning giallo
- 🔴 **SCADUTA**: Oltre T+7, urgente!

**Azioni:**

1️⃣ **Scarica PDF Riepilogo**
   - Ottieni un PDF con tutti i dati del coworker
   - Usa questo per emettere la fattura nel tuo gestionale

2️⃣ **Conferma Fattura Emessa**
   - Dopo aver emesso la fattura, clicca "Conferma Emessa"
   - La fattura sparirà da "Pending" e comparirà in "Storico"

**Esempio card fattura pending:**
```
┌─────────────────────────────────────────┐
│ Prenotazione del 15 gennaio 2025       │
│ Spazio: Ufficio Centro                 │
│                                         │
│ Coworker: Maria Verdi                  │
│ P.IVA: 98765432100                     │
│ Indirizzo: Via Roma 123, Milano 20100 │
│ PEC: maria.verdi@pec.it                │
│                                         │
│ Importo da fatturare: €90,00           │
│                                         │
│ 🟢 Scadenza tra 5 giorni               │
│                                         │
│ [Scarica PDF] [Conferma Emessa]       │
└─────────────────────────────────────────┘
```

---

#### 💳 Tab 2: Note di Credito Richieste

Visualizza le richieste di Nota di Credito dopo cancellazioni.

**Quando compare una NC qui:**
- Un coworker ha cancellato una prenotazione
- La fattura era già stata emessa da te
- Devi emettere Nota di Credito per sbloccare il rimborso

**Cosa vedrai:**
- 📅 Data prenotazione cancellata
- 👤 Coworker richiedente
- 💰 Importo da stornare
- 📝 Motivo cancellazione
- ⏰ Countdown T+7 per emissione NC

**Azioni:**

1️⃣ **Emetti NC manualmente** nel tuo gestionale  
2️⃣ **Conferma NC Emessa** → Sblocca rimborso automatico Stripe

**Esempio card NC:**
```
┌─────────────────────────────────────────┐
│ Prenotazione cancellata del 10 gen 2025│
│ Motivo: Emergenza familiare            │
│                                         │
│ Coworker: Giovanni Rossi               │
│ Importo da stornare: €90,00            │
│                                         │
│ 🟡 NC richiesta 3 giorni fa            │
│                                         │
│ [Conferma NC Emessa]                   │
└─────────────────────────────────────────┘
```

---

#### 📊 Tab 3: Storico

Visualizza tutte le fatture e NC già confermate.

**Features:**
- 🗓️ Filtro per anno fiscale (dropdown)
- 📥 Export CSV per commercialista
- 🔍 Ricerca per numero fattura/coworker
- 📄 Download PDF/XML

**Export CSV include:**
```
Data, Tipo, Numero, Cliente, Imponibile, IVA, Totale
2025-01-15, Fattura, FT-2025-001, Maria Verdi, €100.00, €22.00, €122.00
2025-01-10, NC, NC-2025-001, Giovanni Rossi, €100.00, €22.00, €122.00
```

---

## 👨‍💻 Per Coworker

### Richiedere Fattura

Durante la prenotazione presso uno **spazio con host P.IVA**, vedrai l'opzione per richiedere fattura.

#### Step 1: Riepilogo Prenotazione

Nella pagina di checkout, vedrai:

```
┌─────────────────────────────────────────┐
│ Riepilogo Prenotazione                 │
│                                         │
│ Spazio: Ufficio Centro                 │
│ Data: 20 gennaio 2025                  │
│ Orario: 09:00 - 12:00                  │
│ Totale: €100,00                        │
│                                         │
│ ☑ Richiedo fattura elettronica        │
│   (Solo per host P.IVA)                │
└─────────────────────────────────────────┘
```

#### Step 2: Compila Dati Fiscali

Se attivi il toggle "Richiedo fattura", vedrai campi aggiuntivi:

**Opzione A: Privato (Codice Fiscale)**
```
Nome/Cognome: Maria Verdi
Codice Fiscale: VRDMRA85M50F205Z (16 caratteri)
Indirizzo: Via Roma 123
Città: Milano
CAP: 20100
```

**Opzione B: Azienda (P.IVA)**
```
Ragione Sociale: Società XYZ S.r.l.
P.IVA: 98765432100 (11 cifre)
Indirizzo: Via Milano 456
Città: Roma
CAP: 00100
PEC: societa@pec.it (obbligatoria)
  OPPURE
Codice SDI: A1B2C3D (7 caratteri)
```

**⚠️ Note Importanti:**
- PEC o Codice SDI sono **obbligatori** per aziende
- Dati immutabili dopo il pagamento
- Verifica attentamente prima di confermare

#### Step 3: Procedi al Pagamento

Dopo il pagamento:
- ✅ Riceverai fattura via email (MOCK in fase beta)
- 📥 Potrai scaricare PDF/XML da "I Miei Documenti"
- 💼 Fattura valida per detrazioni/deduzioni fiscali

---

### I Miei Documenti

Accedi al tuo archivio documenti: **Menu Utente > I Miei Documenti**

#### 📄 Tab 1: Ricevute Non Fiscali

Visualizza ricevute da host privati (no P.IVA).

**Cosa vedrai:**
- 🧾 Numero ricevuta (es: `RIC-2025-001`)
- 📅 Data e spazio
- 💰 Importo pagato
- 👤 Nome host
- 📥 Download PDF

**⚠️ Importante:**
- Ricevute **NON detraibili/deducibili** fiscalmente
- Hanno valore solo **probatorio** della transazione
- Utili per rendicontazione aziendale interna

**Esempio card ricevuta:**
```
┌─────────────────────────────────────────┐
│ 🧾 Ricevuta #RIC-2025-001              │
│                                         │
│ Ufficio Centrale - 15 gennaio 2025    │
│ Emittente: Mario Rossi (Privato)      │
│                                         │
│ Canone: €100,00                        │
│ TOTALE: €100,00                        │
│                                         │
│ ⚠️ Documento NON valido ai fini fiscali│
│                                         │
│ [Scarica PDF]                          │
└─────────────────────────────────────────┘
```

---

#### 📑 Tab 2: Fatture Elettroniche

Visualizza fatture da host P.IVA (forfettario/ordinario).

**Cosa vedrai:**
- 📝 Numero fattura (es: `FT-2025-001`)
- 📅 Data emissione
- 💰 Breakdown IVA:
  - Imponibile
  - IVA (% e importo)
  - Totale
- 👤 Dati emittente (host)
- 🚀 Stato SDI (consegnata/in elaborazione)
- 📥 Download **PDF** e **XML**

**✅ Vantaggi:**
- Fatture **valide per detrazioni/deduzioni** fiscali
- Conservale per dichiarazione dei redditi
- XML necessario per invio al commercialista

**Esempio card fattura:**
```
┌─────────────────────────────────────────┐
│ 📝 Fattura #FT-2025-001                │
│                                         │
│ Ufficio Centro - 15 gennaio 2025      │
│ Emittente: Bianchi Coworking S.r.l.   │
│ P.IVA: 12345678901                     │
│                                         │
│ Imponibile: €100,00                    │
│ IVA (22%): €22,00                      │
│ ────────────────────                   │
│ TOTALE: €122,00                        │
│                                         │
│ ✅ Stato SDI: Consegnata               │
│                                         │
│ ℹ️ Documento valido per                │
│ detrazioni/deduzioni fiscali           │
│                                         │
│ [PDF] [XML]                            │
└─────────────────────────────────────────┘
```

---

#### 🗓️ Filtri e Export

**Filtro Anno Fiscale:**
```
Anno: [2025 ▼]
      2024
      2023
      2022
```

**Export CSV per Commercialista:**
```
Data       | Tipo     | Numero     | Emittente          | Imponibile | IVA    | Totale  | Detraibile
-----------|----------|------------|-------------------|-----------|--------|---------|------------
2025-01-15 | Fattura  | FT-2025-001| Bianchi Coworking | €100.00   | €22.00 | €122.00 | Sì
2025-01-10 | Ricevuta | RIC-2025-001| Mario Rossi      | €100.00   | €0.00  | €100.00 | No
```

---

### Note di Credito

Se cancelli una prenotazione **dopo che l'host ha emesso fattura**:

1. 🚨 L'host dovrà emettere **Nota di Credito**
2. 📧 Riceverai NC via email
3. 💰 Rimborso processato **solo dopo emissione NC**
4. ⏰ Tempo stimato: 7-10 giorni lavorativi

**Tracking NC:**
- Vedrai stato NC in "I Miei Documenti"
- Notifica push quando NC emessa
- Download PDF NC disponibile

---

## ❓ FAQ

### Q1: Cosa cambia se l'host è privato vs P.IVA?

**A:** 
- **Host privato** → Ricevuta non fiscale (non detraibile)
- **Host P.IVA** → Fattura elettronica (detraibile/deducibile)

### Q2: Posso modificare i dati fiscali dopo il pagamento?

**A:** ❌ **No**, i dati fiscali sono immutabili post-pagamento per conformità normativa. Verifica attentamente prima di confermare.

### Q3: Come ottengo il rimborso se cancello?

**A:** 
- **Fattura non ancora emessa** → Rimborso automatico
- **Fattura già emessa** → Host deve emettere NC, poi rimborso automatico

### Q4: Dove trovo le fatture per la dichiarazione dei redditi?

**A:** 
1. Vai su **"I Miei Documenti"**
2. Tab **"Fatture Elettroniche"**
3. Filtro anno fiscale (es: 2024)
4. Clicca **"Export CSV"**
5. Invia CSV al commercialista

### Q5: L'host non ha emesso la fattura entro T+7, cosa succede?

**A:** 
- Host vede badge **"SCADUTA"** rosso
- Puoi contattare supporto WorkOver per sollecito
- Invieremo reminder automatici all'host

### Q6: Posso richiedere fattura anche se l'host è privato?

**A:** ❌ **No**, host privati possono emettere solo ricevute non fiscali. Se hai necessità di fattura, prenota presso host P.IVA.

### Q7: Quanto tempo ho per richiedere fattura?

**A:** Devi richiedere fattura **durante il checkout**, prima del pagamento. Non è possibile richiederla successivamente.

### Q8: La ricevuta non fiscale ha valore legale?

**A:** ✅ **Sì**, ha valore **probatorio** (prova della transazione), ma **non fiscale** (non detraibile/deducibile).

### Q9: Posso scaricare solo il PDF o anche l'XML?

**A:** Per le **fatture elettroniche** puoi scaricare **sia PDF che XML**. Le ricevute sono solo PDF.

### Q10: Il countdown T+7 parte dalla data di prenotazione o pagamento?

**A:** Il countdown parte dalla **data del pagamento completato** (non dalla data futura di utilizzo dello spazio).

---

## 📞 Supporto

**Hai altre domande?**

- 📧 Email: [support@workover.app](mailto:support@workover.app)
- 💬 Chat: Disponibile in-app (angolo in basso a destra)
- 📱 Telefono: +39 02 1234 5678 (Lun-Ven 9-18)

---

**Ultimo Aggiornamento:** Gennaio 2025  
**Versione Guida:** 1.0
