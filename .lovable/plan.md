

# Fix Registration Form Password Validation Bug

## Problem Identified

After thorough analysis, I found a **mismatch between the password validation logic in the Register page and the AUTH_ERRORS messages**:

### Root Cause Analysis

**File: `src/pages/Register.tsx`** (The active registration page)

```typescript
// Line 64-67 - Client-side validation
if (password.length < 8) {
  setError(AUTH_ERRORS.WEAK_PASSWORD);
  return;
}
```

**File: `src/utils/auth/auth-errors.ts`**

```typescript
// Line 9 - The error message
WEAK_PASSWORD: 'La password deve contenere almeno 8 caratteri.'
```

### The Bug

The **client-side validation in Register.tsx only checks length ≥ 8**, which matches the error message. However, **Supabase's server-side password policy** is more restrictive and requires:

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

When a user enters a password like `password123` (8+ chars but no uppercase/special), the client-side validation passes, but Supabase rejects it with a "weak password" error. The `mapSupabaseError` function (lines 71-73) then maps it to the same `AUTH_ERRORS.WEAK_PASSWORD` message, which only mentions "8 caratteri" — confusing the user.

### Evidence

There's also a **duplicate registration page** (`src/pages/Signup.tsx`) that correctly validates all requirements with a regex and displays the full message:

```typescript
// Signup.tsx Line 32 - Full regex validation
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]).{8,}$/;

// Signup.tsx Line 123 - Full error message (Italian)
"La password deve essere di almeno 8 caratteri e contenere almeno una lettera maiuscola, una lettera minuscola, un numero e un carattere speciale."
```

But **only `Register.tsx` is used** in the routing (`AppRoutes.tsx` line 98).

---

## Implementation Plan

### Fix 1: Update Client-Side Validation in Register.tsx

**File:** `src/pages/Register.tsx`

Add a proper password regex validation that matches Supabase requirements:

```typescript
// Add password validation regex (after line 33)
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]).{8,}$/;

// Update handlePasswordChange (line 34-42)
const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const newPassword = e.target.value;
  setPassword(newPassword);

  // Clear weak password error if full requirements are met
  if (error === AUTH_ERRORS.WEAK_PASSWORD && passwordRegex.test(newPassword)) {
    setError('');
  }
};

// Update handleSubmit validation (line 64-67)
if (!passwordRegex.test(password)) {
  setError(AUTH_ERRORS.WEAK_PASSWORD);
  return;
}
```

### Fix 2: Update Error Message to Show Full Requirements

**File:** `src/utils/auth/auth-errors.ts`

Update the `WEAK_PASSWORD` constant to include all requirements:

```typescript
// Line 9
WEAK_PASSWORD: 'La password deve contenere almeno 8 caratteri, una lettera maiuscola, una minuscola, un numero e un carattere speciale.',
```

### Fix 3: Add Visual Requirements Hint to Password Field

**File:** `src/pages/Register.tsx`

Add a helper text below the password input to guide users:

```tsx
<div>
  <Label htmlFor="password">Password</Label>
  <div className="relative">
    <Input ... />
    <button type="button" ... />
  </div>
  <p className="text-xs text-muted-foreground mt-1">
    Minimo 8 caratteri, includi maiuscola, minuscola, numero e carattere speciale
  </p>
</div>
```

### Fix 4: Verify Redirect Flow

The `AuthRedirector.tsx` analysis confirms:

| User Roles | Destination |
|:-----------|:------------|
| No roles (new user) | `/profile` (safe landing) |
| Coworker | `/profile` |
| Host | `/host/dashboard` |
| Admin/Moderator | `/admin` |

This is correct behavior — new users without roles land on `/profile`, where they can see the **OnboardingBanner** prompting them to complete setup.

---

## Summary of Changes

| File | Change |
|:-----|:-------|
| `src/pages/Register.tsx` | Add regex validation + helper text |
| `src/utils/auth/auth-errors.ts` | Update error message to show full requirements |

## Technical Details

### Password Regex Breakdown

```javascript
/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]).{8,}$/
```

- `(?=.*[a-z])` - At least one lowercase letter
- `(?=.*[A-Z])` - At least one uppercase letter
- `(?=.*\d)` - At least one digit
- `(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-])` - At least one special character
- `.{8,}$` - Minimum 8 characters total

### Why This Fixes the Bug

1. **Client-side validation now matches server requirements** — Users get instant feedback
2. **Error message explains what's actually wrong** — No more "8 caratteri" confusion
3. **Helper text prevents the error before it happens** — Better UX

