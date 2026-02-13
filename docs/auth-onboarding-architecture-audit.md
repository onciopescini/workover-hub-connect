# Audit Architetturale Completo (Deep Dive)
## Stack Autenticazione + Onboarding (Email/Password + Google OAuth)

## 1) Diagramma del Flusso Attuale (testuale)

### A. Entry point autenticazione (Frontend)
1. Le route protette passano da `RequireAuth`: se non autenticato, redirect a `/login?returnUrl=<pathCorrente>`.
2. In parallelo (globale), `LimboGuard` e `AuthRedirector` osservano sempre lo stato auth e forzano redirect in base a ruoli/stato.
3. `useAuthLogic` inizializza sessione via `supabase.auth.getSession()`, poi prova a caricare `profiles` e `user_roles`.

### B. Registrazione Email/Password
1. `Register.tsx` costruisce `emailRedirectTo = /auth/callback?returnUrl=...` e chiama `signUp`.
2. `signUp` (`useAuthMethods`) esegue cleanup auth locale + `signOut(global)` prima della signup, poi `supabase.auth.signUp`.
3. Se è richiesta conferma email, UI mostra stato “controlla email”.
4. Click su email -> `AuthCallback.tsx` esegue `exchangeCodeForSession`, recupera sessione, naviga su `returnUrl` o fallback `/dashboard`.
5. In parallelo `onAuthStateChange` di `useAuthLogic` ricarica profilo/ruoli e può innescare redirect di ruolo/onboarding.

### C. Login Email/Password
1. `Login.tsx` prende `returnUrl` e chiama `signIn`.
2. `signIn` usa `cleanSignIn` (rate-limit + cleanup + signout globale + signInWithPassword).
3. Dopo successo:
   - `signIn` può già navigare se riceve `redirectTo`.
   - `Login.tsx` naviga a `returnUrl` o `/`.
4. In parallelo `AuthRedirector` può intercettare transizione guest->auth e spingere verso `/profile`, `/host/dashboard`, `/admin`.

### D. Login/Signup Google OAuth
1. `cleanSignInWithGoogle` fa cleanup auth e `signOut(global)`, poi `signInWithOAuth({ provider: 'google', redirectTo: /auth/callback })`.
2. Non viene propagato `returnUrl` nella `redirectTo` OAuth.
3. `AuthCallback` legge solo `returnUrl` dalla query corrente; se assente, fallback `/dashboard`.

### E. Bootstrap profilo DB
1. Trigger DB `handle_new_user` su `auth.users` tenta `INSERT INTO public.profiles ... ON CONFLICT DO NOTHING`.
2. Se frontend non trova profilo, `useAuthLogic` invoca Edge Function `create-profile`; se fallisce prova addirittura insert diretto client su `profiles`.
3. `create-profile` rifiuta creazione se `user_roles` è vuota (ritorna 400 “Role missing”).

---

## 2) Deep Dive Criticità (Vulnerabilità / Fragilità)

## P0 (Bloccanti)

### P0-1 — Orchestrazione redirect concorrente (tripla regia)
**Sintomo:** redirect non deterministico, flicker, possibili loop visibili.  
**Cause:** tre livelli possono navigare quasi contemporaneamente:
- `useAuthRedirects.handleRoleBasedRedirect` (invocato da `useAuthLogic`),
- `AuthRedirector` globale,
- `LimboGuard` globale.

In caso di sessione valida ma ruoli/profilo ancora non coerenti, ogni guard applica regole diverse (`/onboarding` vs `/profile` vs dashboard).  
**Rischio:** UX degradata, routing race, troubleshooting difficile.

### P0-2 — Dipendenza hard da `user_roles` senza provisioning atomico garantito
**Sintomo:** utente autenticato ma senza ruolo (“limbo”), onboarding bloccato o redirect contraddittori.  
**Cause:**
- Trigger `handle_new_user` crea profilo ma **non assegna ruoli**.
- `create-profile` richiede ruoli esistenti e rifiuta creazione in assenza.
- `useAuthLogic` se ruoli vuoti forza stato autenticato con `profile=null` e loading disattivato.

**Rischio:** account creato ma non utilizzabile in modo consistente; support load elevato.

### P0-3 — Fallback client-side di inserimento `profiles` (logica critica sul client)
**Sintomo:** frontend tenta insert diretto su `profiles` quando Edge Function fallisce.
**Rischio:**
- viola separation of concerns (critical bootstrap lato client),
- esito dipendente da policy RLS/stato token,
- percorsi di bootstrap multipli e non idempotenti.

---

## P1 (Rischio alto)

### P1-1 — Preservazione incompleta `returnUrl` sul flusso Google OAuth
`Register/Login` gestiscono `returnUrl`, ma `cleanSignInWithGoogle` non la include in `redirectTo`; callback quindi perde il contesto e manda a fallback dashboard.
**Impatto:** perdita prenotazione in corso / deep-link context dopo OAuth.

### P1-2 — Conflitto policy `profiles`: apertura globale vs policy own-profile
Esistono migrazioni con policy molto permissiva (`USING true` per authenticated) e altre che restringono own-profile + restrictive policy soft-delete.  
**Impatto:** possibile overexposure dati profilo tra utenti autenticati (dipende dallo stato finale migrazioni applicate).

### P1-3 — Gestione linking Email/Password <-> Google non esplicita
Non risulta flusso applicativo di account-linking (`linkIdentity` o percorso equivalente): il sistema si affida al comportamento di default provider/Supabase.
**Impatto:** duplicazioni identità, login confusion, onboarding duplicato.

### P1-4 — Cleanup aggressivo pre-login (global signOut) in signup/signin
Cleanup+global signOut prima di ogni login/signup riduce limbo token ma introduce effetti collaterali cross-tab/dispositivo/sessioni attive.
**Impatto:** logout inattesi, churn UX multi-tab.

---

## P2 (Ottimizzazioni / robustezza)

### P2-1 — Typing hygiene
Presenti `catch (err: any)` e oggetti `Record<string, any>` nelle routine auth/profile update.
**Impatto:** riduzione type safety, manutenzione difficile.

### P2-2 — Cache profile non sincronizzata con QueryClient come single source
`ProfileCacheManager` custom convive con invalidate/refetch React Query e realtime updates.
**Impatto:** rischio stale reads o overwrite non deterministico.

### P2-3 — Regole di redirect non centralizzate
Le condizioni di redirect sono duplicate in più componenti/hooks con eccezioni ad-hoc.
**Impatto:** regressioni frequenti su onboarding/auth callback.

---

## 3) Analisi specifica richieste

### 3.1 Race condition sessione Supabase vs fetch profilo
- `onAuthStateChange` può scattare mentre `initializeAuth` è ancora in corso.
- Esiste abort controller per fetch concorrenti, ma restano finestre in cui stato sessione/ruoli/profilo è parziale.
- `TOKEN_REFRESHED` viene ignorato (bene per performance), ma non risolve mismatch ruoli/profilo se aggiornati out-of-band.

### 3.2 Cosa succede se trigger `handle_new_user` fallisce?
- Non c’è canale di retry transazionale esplicito lato backend applicativo.
- Frontend tenta “auto-healing” via Edge Function e infine via insert diretto client.
- Quindi: il profilo **non è garantito** prima del primo fetch frontend; è “eventualmente creato” da percorsi multipli.

### 3.3 Il profilo è creato sempre prima che il frontend lo richieda?
No, non garantito deterministicamente:
- dipende da trigger DB,
- da disponibilità Edge Function,
- da presenza di `user_roles`.

### 3.4 Linking Google con account Email pre-esistente
Nel codice applicativo analizzato non c’è una strategia esplicita di account linking/merge. È un gap architetturale.

### 3.5 Conferma email e stato prenotazione (`returnUrl`)
- Flusso email/password: abbastanza preservato (`returnUrl` propagato fino a callback).
- Flusso Google: non preservato end-to-end.

---

## 4) Matrice Vulnerabilità

| ID | Severity | Area | Problema | Effetto business | Evidenza |
|---|---|---|---|---|---|
| V-01 | P0 | Frontend Routing | Redirect orchestration concorrente (3 controller) | Loop/flicker, accesso non deterministico | `LimboGuard`, `AuthRedirector`, `useAuthRedirects` |
| V-02 | P0 | Auth/DB Contract | `user_roles` non garantito all’atto di registrazione | utenti in limbo, onboarding bloccato | `handle_new_user` vs `create-profile` |
| V-03 | P0 | Security/Architecture | Insert profilo fallback dal client | logica critica lato client, inconsistenza | `useAuthLogic.fetchUserProfile` |
| V-04 | P1 | UX/Onboarding | `returnUrl` non propagato in Google OAuth | perdita stato prenotazione/deep link | `cleanSignInWithGoogle` + `AuthCallback` |
| V-05 | P1 | Security/RLS | Policy profili potenzialmente troppo permissive | data exposure tra authenticated | migrazioni policy profiles |
| V-06 | P1 | Identity | Linking Email/Google non implementato esplicitamente | duplicati account / confusione accesso | assenza flusso link identity |
| V-07 | P2 | Type Safety | Uso di `any` in path auth | bug silenti | `Register`, `useAuthMethods` |
| V-08 | P2 | State mgmt | Cache custom + query cache + realtime | stale data / overwrite | `useProfileCache`, `Onboarding`, realtime in `useAuthLogic` |

---

## 5) Piano di Remediation Enterprise (Definitivo)

## Fase 1 — Contract DB atomico (P0)
1. **Unificare bootstrap in DB**:
   - trigger unico su `auth.users` che crea **sempre**:
     - `profiles` minimo valido,
     - ruolo base `coworker` in `user_roles` (idempotente `ON CONFLICT DO NOTHING`).
2. **Eliminare dipendenza da client bootstrap**:
   - rimuovere insert diretto client su `profiles`.
   - Edge Function `create-profile` solo per enrich, non per creazione critica.
3. **Aggiungere auditing robusto**:
   - tabella `auth_bootstrap_failures` + `RAISE LOG`/notifica per failure trigger.

## Fase 2 — Router auth deterministico (P0)
1. Creare un **solo orchestratore** (`AuthFlowGate`) con state machine esplicita:
   - `unauthenticated` -> `authenticating` -> `session_ready` -> `profile_ready` -> `role_ready` -> `routed`.
2. Disattivare redirect side-effect in `LimboGuard`/`AuthRedirector` o convertirli in pure guards senza `navigate` concorrenti.
3. Definire priorità unica delle route target (returnUrl > onboarding > role-dashboard).

## Fase 3 — Return URL e prenotazioni (P1)
1. Propagare `returnUrl` anche in OAuth Google (`redirectTo` con query o `state` firmato).
2. In callback validare `returnUrl` con allowlist path interna.
3. Persistenza server-side opzionale stato prenotazione (`pending_intent`) legata a user/session per recovery post-confirm.

## Fase 4 — Identity linking enterprise (P1)
1. Introdurre flusso “link identity” esplicito:
   - utente loggato email può collegare Google dal profilo,
   - bloccare creazione account paralleli non linkati.
2. Normalizzare email-case e verificare collisioni prima onboarding finale.
3. Telemetria: metriche di collision/linking outcome.

## Fase 5 — Security + Type Safety + Operatività (P1/P2)
1. Revisione finale RLS `profiles` secondo principio minimo privilegio (public projection via view/RPC dedicata, non `SELECT *`).
2. Rimuovere `any` da path auth critici (`Register`, `useAuthMethods`).
3. Centralizzare costanti auth-route/query-key.
4. Test end-to-end obbligatori:
   - signup email + conferma + returnUrl,
   - signup/login Google + returnUrl,
   - doppio click / refresh a metà callback,
   - multi-tab logout/login.

---

## 6) Architettura target (Gold Standard)

- **Database-first, idempotente**: creazione user profile+role atomica in DB.
- **Frontend stateless su bootstrap**: non crea entità critiche, solo visualizza stato e invoca API sicure.
- **Routing deterministico**: una sola macchina a stati per redirect.
- **Identity unificata**: linking esplicito provider multipli.
- **RLS least privilege**: dati profilo completi solo owner/admin; viste pubbliche minimali separate.

---

## 7) Conclusione operativa

Il sistema attuale contiene già hardening importanti (trigger idempotente, abort controller, callback dedicata), ma rimane fragile perché la creazione identità/profilo/ruolo non è ancora un contratto atomico unico e i redirect sono distribuiti su più attori concorrenti. La priorità assoluta è consolidare il bootstrap DB e ridurre i redirect controller a uno solo.
