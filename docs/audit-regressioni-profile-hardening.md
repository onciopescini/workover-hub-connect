# Audit Mirato: Regressioni post-hardening `profiles`

## Scope
- **Errore 400 Profile Edit**: verifica del flusso `ProfileEdit`/`useProfileForm` rispetto a `sanitizeProfileUpdate`.
- **Stale State User Menu**: verifica della sorgente dati del menu utente e del motivo per cui `onboarding_completed` resta `false` dopo onboarding.
- **Gap Analysis**: confronto tra `Onboarding.tsx` (funzionante) e `ProfileEdit.tsx` (segnalato come regressivo).

---

## 1) Root Cause Analysis

### A. Errore 400 su Profile Edit

**Esito audit:** nel flusso attuale `ProfileEdit` → `ProfileEditContainer` → `useProfileForm` la sanitizzazione è presente.

- `useProfileForm.handleSubmit` valida con Zod e invoca `sanitizeProfileUpdate(validatedData)` prima di chiamare `updateProfile`.
- `useAuthMethods.updateProfile` applica **nuovamente** `sanitizeProfileUpdate` prima della query Supabase.
- La utility rimuove esplicitamente campi non scrivibili (`id`, `role`, `created_at`, `updated_at`, `subscription_status`, `email`) e qualunque chiave non presente nella allowlist `CLIENT_WRITABLE_PROFILE_FIELDS`.

👉 **Conclusione tecnica:** il branch analizzato non mostra una causa diretta del 400 nel path `ProfileEdit` corrente. Se il 400 è ancora osservato in produzione, la causa più probabile è un path legacy/alternativo che aggiorna `profiles` senza passare dalla stessa pipeline di sanitizzazione.

### B. Stale State nel menu utente

**Esito audit:** il menu utente (`OptimizedUnifiedHeader`) legge `authState.profile` da `useAuth`, quindi **non** usa React Query direttamente né uno stato locale dedicato al menu.

Il problema di stale state è principalmente attribuibile a una condizione di update troppo debole in `shouldUpdateAuthState`:

- la funzione considera aggiornamento solo se cambia `user.id`, `isAuthenticated`, `profile.id` o `isLoading`;
- se cambia un campo interno del profilo (es. `onboarding_completed: false -> true`) ma `profile.id` resta identico, può ritornare `false` e bloccare l'update dello stato auth.

👉 **Conclusione tecnica:** la stale view è coerente con un gate di aggiornamento che non confronta i campi del profilo rilevanti per la UI. L'assenza di invalidate React Query globale nel menu non è il problema principale, perché il menu non dipende da quella cache.

---

## 2) Evidence (snippet)

### 2.1 Sanitizzazione nel submit Profile Edit

`src/hooks/useProfileForm.ts`:

```ts
const validatedData = profileEditSchema.parse(formData);
const dataToSubmit = sanitizeProfileUpdate(validatedData);
await updateProfile(dataToSubmit);
```

### 2.2 Doppia sanitizzazione anche nel metodo auth

`src/hooks/auth/useAuthMethods.ts`:

```ts
const sanitized = sanitizeProfileUpdate(updates);

if (Object.keys(sanitized).length === 0) {
  return;
}

const { error } = await supabase
  .from('profiles')
  .update(sanitized)
  .eq('id', currentUser.id);
```

### 2.3 Rimozione campi tossici

`src/constants/profile.ts` + `src/utils/profile/sanitizeProfileUpdate.ts`:

```ts
export const NON_WRITABLE_PROFILE_FIELDS: ReadonlySet<string> = new Set([
  'id',
  'role',
  'created_at',
  'updated_at',
  'subscription_status',
  'email',
]);
```

### 2.4 Menu utente alimentato da `authState.profile`

`src/components/layout/OptimizedUnifiedHeader.tsx`:

```ts
const { authState, signOut } = useAuth();
...
{((authState.profile && !authState.profile.onboarding_completed) || ... ) && !isAdmin && (
  <DropdownMenuItem asChild>
    <Link to="/onboarding" ...>Completa onboarding</Link>
  </DropdownMenuItem>
)}
```

### 2.5 Punto di stale state (gate update non sensibile ai campi profilo)

`src/utils/auth/auth-helpers.ts`:

```ts
return (
  prev.user?.id !== user?.id ||
  prev.isAuthenticated !== isAuthenticated ||
  prev.profile?.id !== profile?.id ||
  prev.isLoading
);
```

---

## 3) Gap Analysis: Onboarding vs ProfileEdit

## Cosa fa Onboarding (gold-standard parziale)
- Sanitizza payload (`sanitizeOnboardingProfileUpdate`) e forza `onboarding_completed: true`.
- Chiama `updateProfile`.
- Esegue `queryClient.invalidateQueries(['profile'])` + `refetchQueries` prima della navigate.
- Inserisce micro-buffer (`setTimeout(50ms)`) per assorbire eventuali race lato observer.

## Cosa manca/è fragile fuori da Onboarding
- Il menu utente non usa React Query: dipende da `authState.profile`.
- `authState` può non aggiornarsi in alcune transizioni se `shouldUpdateAuthState` non riconosce la mutazione del profilo.
- `ProfileEdit` non fa invalidate/refetch React Query (non strettamente necessario per header, ma utile per coerenza cross-feature se altre view leggono query `['profile']`).

---

## 4) Recommendation (piano operativo)

## R1. Correggere la root cause dello stale auth state (priorità massima)
1. Rafforzare `shouldUpdateAuthState`:
   - confrontare `profile` in modo più robusto (es. `updated_at`, `onboarding_completed`, `stripe_onboarding_status` e altri campi critici UI), oppure
   - evitare il gate per update provenienti da fetch profilo post-write.
2. Aggiungere test unitari su `shouldUpdateAuthState` per casi:
   - stesso `profile.id` ma `onboarding_completed` diverso;
   - stesso `profile.id` ma `updated_at` diverso.

## R2. Uniformare invalidazione cache post-update
1. Centralizzare una utility post-profile-write (es. `syncProfileAfterMutation`) che:
   - invalida `useProfileCache` (già fatto in `updateProfile`),
   - esegue `refreshProfile`,
   - invalida query React Query correlate (`['profile']`, eventuali query dipendenti da onboarding/status).
2. Chiamare questa utility da tutti i punti di scrittura profilo (Onboarding, ProfileEdit, wizard host, settings).

## R3. Hardening anti-400 su tutti i writer di `profiles`
1. Vincolare ogni `.from('profiles').update(...)` client-side a passare da `sanitizeProfileUpdate` (o API service unico).
2. Opzionale: usare `profileService.updateProfile` come unico entrypoint per evitare path divergenti.
3. Aggiungere logging strutturato del payload **sanitizzato** (chiavi, non valori sensibili) in ambiente dev/staging per troubleshooting immediato.

## R4. Coerenza architetturale (gold standard completo)
- Estrarre costanti query key in `src/constants/` (es. `PROFILE_QUERY_KEYS`) e riusarle ovunque.
- Mantenere DB-first naming coerente e prohibire legacy paths non tipizzati.

---

## 5) Executive Summary
- **Errore 400**: nel flusso `ProfileEdit` analizzato la sanitizzazione è presente e doppia; non risultano campi tossici inviati in quel path.
- **Menu stale**: causa primaria individuata nel gate `shouldUpdateAuthState`, che non rileva modifiche interne al profilo a parità di `profile.id`.
- **Gap principale**: onboarding contiene step extra di sync (invalidate/refetch) non standardizzati globalmente; serve un post-mutation sync unico e obbligatorio.
