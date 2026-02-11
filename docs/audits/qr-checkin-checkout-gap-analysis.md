# Audit Database & Backend — QR Check-in/Check-out Readiness

## Scope
Valutazione della prontezza infrastrutturale per:
1. tracciamento fisico utenti (check-in/check-out onsite),
2. disponibilità in tempo reale,
3. automazioni backend post-booking.

---

## 1) Audit `bookings` (ciclo di vita fisico)

### Campi presenti oggi (rilevanti)
Dallo schema applicativo tipizzato risultano presenti:
- `checked_in_at`
- `checked_in_by`
- `check_in_method`
- `service_completed_at`
- `service_completed_by`
- `reservation_token`
- `slot_reserved_until`
- `status`

Questi campi indicano che il sistema copre **prenotazione + check-in + completamento servizio**, ma non un check-out fisico esplicito.

### Campi non presenti (gap funzionali richiesti)
Non risultano campi dedicati a:
- `checked_out_at`
- `checked_out_by`
- `checkout_method`
- `no_show` / `no_show_at` / `no_show_reason`
- token QR one-time dedicato al check-in fisico (es. `checkin_qr_token`, `checkin_qr_expires_at`, `checkin_qr_used_at`)

`reservation_token` esiste ma è legato al processo di prenotazione/hold slot, non a un token one-time di presenza fisica.

### Stato enum attuale (`booking_status`)
Valori correnti:
- `pending`
- `confirmed`
- `cancelled`
- `pending_approval`
- `pending_payment`
- `served`
- `refunded`
- `disputed`
- `frozen`
- `checked_in`

**Gap semantico**: manca uno stato esplicito `checked_out` e/o `no_show`, utile per analytics attendance, SLA host e antifrode.

---

## 2) Audit `spaces` (QR token per spazio)

### Presenza token QR spazio
Nella tabella `spaces` non emergono colonne dedicate a token QR statico/dinamico dello spazio, ad esempio:
- `checkin_qr_token`
- `checkin_qr_rotated_at`
- `checkin_qr_enabled`

Il QR oggi sembra basarsi sul payload booking-side (`booking_id`) esposto dal frontend, non su un secret per spazio.

### Implicazione
L’approccio attuale consente check-in host-driven ma con livello di hardening limitato lato anti-replay/tampering se non accompagnato da token temporanei firmati.

---

## 3) Disponibilità in tempo reale

### Logica attuale
La disponibilità viene calcolata considerando booking overlap su stati:
- `pending`
- `confirmed`

Questo avviene sia nelle RPC di availability batch sia nella `validate_and_reserve_slot`, con logica di conflitto per fasce orarie.

### Gap rispetto a check-out fisico
La riapertura effettiva dello slot **non è guidata da `checked_out_at`** (campo assente), ma dalla finestra oraria e dallo stato booking.

Conseguenza: non c’è un modello “occupazione reale” che liberi capacità quando l’utente lascia fisicamente lo spazio prima della fine slot.

---

## 4) Backend / Cron jobs

### Automazioni già presenti
Sono presenti automazioni `pg_cron` che:
- marcano booking `confirmed` come `served` oltre `end_time` (+grace),
- programmano payout,
- congelano/cancellano booking in specifici scenari di compliance/pagamento.

Quindi il passaggio a stato “servito/completato” è **automatico** (non solo manuale).

### Gap rispetto presenza fisica
Le automazioni sono **time-based** e payment/compliance-based, non attendance-based:
- non esiste auto-determinazione di `no_show`,
- non esiste check-out automatico su eventi fisici,
- non esiste riconciliazione presenza fisica vs slot prenotato.

---

## 5) Gap Analysis (sintesi)

### Livello di maturità attuale
- **Buono** per booking lifecycle amministrativo/commerciale.
- **Parziale** per tracking fisico enterprise (check-in/check-out/non presenza).

### Gap critici
1. Assenza di `checked_out_*`.
2. Assenza di `no_show_*`.
3. Assenza di token QR enterprise dedicati (one-time/expirable/revocable).
4. Disponibilità non basata su occupazione reale onsite.
5. Mancanza di audit trail dettagliato dell’evento fisico (device/network/geoposizione/attestazione).

---

## 6) Colonne DB mancanti consigliate (Enterprise)

### A) `bookings` — presenza fisica
- `checked_out_at timestamptz`
- `checked_out_by uuid`
- `checkout_method text` (es. `qr_scan`, `manual_host`, `auto_timeout`, `nfc`)
- `no_show boolean default false`
- `no_show_at timestamptz`
- `no_show_reason text`

### B) `bookings` — sicurezza token QR
- `checkin_qr_token_hash text` (mai token in chiaro)
- `checkin_qr_issued_at timestamptz`
- `checkin_qr_expires_at timestamptz`
- `checkin_qr_used_at timestamptz`
- `checkin_qr_nonce uuid`
- `checkin_qr_revoked_at timestamptz`

### C) `bookings` — evidenze onsite / antifrode
- `checkin_latitude numeric`
- `checkin_longitude numeric`
- `checkout_latitude numeric`
- `checkout_longitude numeric`
- `checkin_accuracy_meters numeric`
- `checkout_accuracy_meters numeric`
- `checkin_ip inet`
- `checkout_ip inet`
- `checkin_user_agent text`
- `checkout_user_agent text`
- `checkin_device_fingerprint text`
- `checkout_device_fingerprint text`

### D) `spaces` — policy/check-in config
- `checkin_qr_secret text` (o riferimento KMS)
- `checkin_qr_rotation_interval_minutes int`
- `checkin_geofence_center geography(point,4326)`
- `checkin_geofence_radius_meters int`
- `checkin_enforcement_mode text` (`soft`, `strict`)

### E) Enum suggeriti
- Estendere `booking_status` con: `checked_out`, `no_show`.
- In alternativa: mantenere `booking_status` commerciale e introdurre `attendance_status` separato (`not_arrived`, `checked_in`, `checked_out`, `no_show`).

---

## 7) Conclusione operativa
L’infrastruttura corrente è adatta a un modello booking/payment-driven con check-in base, ma **non ancora enterprise-ready** per attendance fisica robusta.

Per il go-live QR enterprise, priorità:
1. introdurre modello dati attendance completo (`checked_out`, `no_show`, token life-cycle),
2. separare availability “prenotata” da occupancy “reale”,
3. rafforzare auditability e antifrode (geo/device/network evidence),
4. aggiornare cron/rpc affinché le transizioni di stato includano eventi fisici.
