# Audit tecnico: Flussi critici "Modifica Profilo" e "Delete/Reactivation"

## Scope
Analisi statica del codice frontend/backend e delle migrazioni Supabase sui due flussi:
1. cancellazione account;
2. aggiornamento sezione professionale profilo.

---

## 1) Delete Account — verifica ipotesi “Zombie User”

### Evidenze principali

- Il dialogo impostazioni (`DeleteAccountDialog`) **inserisce solo** una riga in `gdpr_requests` con `request_type: 'data_deletion'` e poi fa `signOut`.
- Nel repository **non esiste** nessun trigger SQL su `gdpr_requests` che cancelli subito `auth.users` o invochi automaticamente un processo di hard delete.
- Esiste invece un flusso separato, basato su **Edge Function** e tabella `account_deletion_requests`:
  - `confirm-account-deletion`: crea token e richiesta conferma via email;
  - `process-account-deletion`: valida token e poi esegue **soft deletion/anonymization** del profilo + ban utente auth (`ban_duration` molto lunga), non hard delete.

### Implicazione tecnica

L’azione “Elimina Account” nel dialogo impostazioni attuale **non avvia** il flusso reale di cancellazione (`account_deletion_requests` + Edge Functions). Quindi l’utente può restare autenticabile con lo stesso `user_id` (specialmente OAuth Google), cioè comportamento “zombie” coerente con il caso riportato.

---

## 2) Errore Modifica Profilo (sezione professionale) — analisi mismatch dati

### Schema/typing rilevato

Nella tabella `profiles` (tipi generati Supabase):
- `job_title`: `string | null`
- `linkedin_url`: `string | null`
- `skills`: `string | null`
- `bio`: `string | null`

Quindi lato DB atteso: **testo semplice nullable**, non array/JSON per `skills`.

### Frontend attuale

- `useProfileForm` gestisce `skills` come **stringa** (textarea), non array.
- `sanitizeProfileUpdate` trimma stringhe e converte stringhe vuote in `null` per i campi nullable (incluso `skills`, `bio`, `job_title`, `linkedin_url`).

### Conclusione mismatch

Non emerge un mismatch del tipo “array/oggetto scritto in colonna testo” sui campi richiesti.

### Probabile causa del 400 Bad Request

Il submit del profilo invia l’intero payload validato; lo schema Zod permette `''` per enum professionali (`job_type`, `work_style`) mentre il DB potrebbe avere vincoli più restrittivi (dipende dal DDL effettivo in ambiente). In presenza di CHECK che non includono stringa vuota, un update con `''` provoca 400.

Inoltre, dopo una cancellazione soft (o profilo in stato incoerente/limbo), il caricamento profilo può deviare verso onboarding e rendere il salvataggio instabile (profilo non pienamente accessibile/coerente).

---

## Lifecycle Verdict

**Verdetto:** con il codice attuale, dal bottone impostazioni l’account **non viene cancellato davvero subito**. Viene solo registrata una richiesta su `gdpr_requests` e fatto logout. Il flusso effettivo di deprovisioning è altrove (`account_deletion_requests` + conferma token + `process-account-deletion`) e in ogni caso implementa soft-delete/ban, non hard delete immediato.

---

## Data Mismatch Verdict

**Campo più sospetto per il 400 (sezione professionale):** `job_type` / `work_style` valorizzati a stringa vuota (`''`) dal form/schema, non `skills`/`bio`/`job_title`/`linkedin_url`.

Sui campi richiesti (`job_title`, `linkedin_url`, `skills`, `bio`) il mapping frontend→DB è coerente (string/null).

---

## Remediation Plan

1. **Unificare il flusso “Elimina Account”**
   - Sostituire in `DeleteAccountDialog` l’insert diretto su `gdpr_requests` con invocazione Edge Function `confirm-account-deletion`.
   - Mostrare chiaramente UX a due fasi: richiesta + conferma email.

2. **Garantire semantics esplicita**
   - Se il requisito business è “Elimina Subito”, introdurre endpoint admin-safe che:
     - disabilita login immediatamente;
     - marca profilo come `deleted_at` + anonymization;
     - opzionalmente hard-delete `auth.users` solo se impatti referenziali sono gestiti.
   - Se si mantiene soft-delete, rinominare UX in “Disattiva account” per allineamento legale/tecnico.

3. **Allineamento type/DB su campi professionali**
   - Normalizzare `'' -> null` anche per enum professionali (`job_type`, `work_style`) prima dell’update.
   - Verificare e documentare CHECK reali in produzione per questi campi.

4. **Guardrail anti-zombie**
   - In login callback, se profilo `deleted_at` non nullo o utente bannato: bloccare onboarding standard e mostrare stato account disattivato.
   - Aggiungere monitoraggio su errori update profilo (payload + codice errore PostgREST) per isolare il campo che rompe in produzione.
