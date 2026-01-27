
# HOTFIX: Real World Testing Stabilization
## Fixing 406 Error and Admin Crash

---

## ISSUE 1: 406 Error on Legal Documents Fetch

### Root Cause
The `useTermsAcceptance.ts` hook (line 36) uses `.single()` when fetching the latest ToS version from `legal_documents_versions`. When the table is empty:
- `.single()` expects exactly one row
- Returns HTTP 406 error when zero rows found

### Solution (Two-Part Fix)

**Part A: Database Migration - Seed Initial Legal Documents**

Create `supabase/migrations/YYYYMMDDHHMMSS_seed_legal_docs.sql`:

```sql
-- Seed initial legal document versions
-- These provide baseline ToS and Privacy Policy for new deployments

INSERT INTO public.legal_documents_versions (
  id,
  document_type,
  version,
  content,
  effective_date,
  created_at
) VALUES (
  gen_random_uuid(),
  'tos',
  '1.0',
  'Termini di Servizio di Workover Hub Connect.

1. ACCETTAZIONE DEI TERMINI
Utilizzando la piattaforma Workover Hub Connect, accetti integralmente i presenti Termini di Servizio.

2. DESCRIZIONE DEL SERVIZIO
Workover Hub Connect è una piattaforma di prenotazione spazi di coworking che connette host (proprietari di spazi) e coworker (utenti che prenotano).

3. REGISTRAZIONE E ACCOUNT
Per utilizzare i servizi è necessario registrarsi fornendo informazioni accurate e complete.

4. RESPONSABILITÀ DEGLI UTENTI
Gli utenti sono responsabili del corretto utilizzo della piattaforma e del rispetto delle regole degli spazi prenotati.

5. PAGAMENTI E RIMBORSI
I pagamenti sono processati tramite Stripe. Le politiche di cancellazione sono definite da ogni singolo host.

6. PRIVACY
Il trattamento dei dati personali è descritto nella nostra Privacy Policy.

7. MODIFICHE AI TERMINI
Ci riserviamo il diritto di modificare questi termini con preavviso agli utenti registrati.

8. LEGGE APPLICABILE
Questi termini sono regolati dalla legge italiana.',
  CURRENT_DATE,
  NOW()
), (
  gen_random_uuid(),
  'privacy_policy',
  '1.0',
  'Privacy Policy di Workover Hub Connect.

1. TITOLARE DEL TRATTAMENTO
Workover Hub Connect è responsabile del trattamento dei tuoi dati personali.

2. DATI RACCOLTI
Raccogliamo: nome, cognome, email, telefono (opzionale), dati di prenotazione, informazioni di pagamento.

3. FINALITÀ DEL TRATTAMENTO
I dati sono utilizzati per: gestione account, prenotazioni, pagamenti, comunicazioni di servizio.

4. BASE GIURIDICA
Il trattamento si basa su: esecuzione contrattuale, consenso, adempimento obblighi legali.

5. CONSERVAZIONE DEI DATI
I dati sono conservati per la durata del rapporto contrattuale più i termini di legge.

6. DIRITTI DELL''INTERESSATO
Hai diritto a: accesso, rettifica, cancellazione, portabilità, opposizione al trattamento.

7. CONDIVISIONE DEI DATI
I dati sono condivisi con: Stripe (pagamenti), Supabase (hosting), host degli spazi prenotati.

8. CONTATTI
Per esercitare i tuoi diritti: privacy@workover.app',
  CURRENT_DATE,
  NOW()
)
ON CONFLICT (document_type, version) DO NOTHING;
```

**Part B: Service Fix - Change `.single()` to `.maybeSingle()`**

Update `src/hooks/useTermsAcceptance.ts` line 36:

```typescript
// BEFORE (line 34-36)
.order('effective_date', { ascending: false })
.limit(1)
.single();

// AFTER
.order('effective_date', { ascending: false })
.limit(1)
.maybeSingle();
```

This change ensures:
- Returns `null` instead of throwing 406 when table is empty
- Existing logic on lines 38-42 already handles `!latestToS` case gracefully

---

## ISSUE 2: Admin Users Page Crash on Null Fields

### Root Cause
In `src/pages/admin/AdminUsers.tsx` line 59:
```typescript
user.email.toLowerCase().includes(searchTerm.toLowerCase())
```

While the `AdminUser` type defines `email` as required (`string`), the actual database view can return null values for users with incomplete profiles. Additionally, `first_name` and `last_name` are explicitly nullable.

### Solution

Update the filter function (lines 58-62) with null-safe operators:

```typescript
// BEFORE
const filteredUsers = users?.filter(user =>
  user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
  (user.first_name && user.first_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
  (user.last_name && user.last_name.toLowerCase().includes(searchTerm.toLowerCase()))
) || [];

// AFTER
const filteredUsers = users?.filter(user => {
  const searchLower = searchTerm.toLowerCase();
  const email = (user.email || '').toLowerCase();
  const firstName = (user.first_name || '').toLowerCase();
  const lastName = (user.last_name || '').toLowerCase();
  
  return email.includes(searchLower) ||
         firstName.includes(searchLower) ||
         lastName.includes(searchLower);
}) || [];
```

Also update line 121 for the avatar fallback to handle null email:
```typescript
// BEFORE
<AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} />

// AFTER
<AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email || user.id}`} />
```

---

## IMPLEMENTATION SUMMARY

| Fix | File | Line(s) | Change |
|-----|------|---------|--------|
| 1A | `supabase/migrations/YYYYMMDDHHMMSS_seed_legal_docs.sql` | New | Insert v1.0 ToS and Privacy Policy |
| 1B | `src/hooks/useTermsAcceptance.ts` | 36 | `.single()` -> `.maybeSingle()` |
| 2A | `src/pages/admin/AdminUsers.tsx` | 58-62 | Null-safe string operations in filter |
| 2B | `src/pages/admin/AdminUsers.tsx` | 121 | Fallback to `user.id` if email is null |

---

## VERIFICATION

After implementation:
- [ ] Empty `legal_documents_versions` table does not cause 406 error
- [ ] Users with null first_name/last_name don't crash admin page
- [ ] Search filter works correctly with partial data
- [ ] Avatar generation works even without email
