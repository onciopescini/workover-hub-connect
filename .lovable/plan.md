
# Day 7: Deep Cleaning - Remove Zombie Code

## Overview

Following the successful migration to the Service Layer Pattern, this cleanup removes deprecated hooks, unused components, and redundant utility files to keep the codebase lean and maintainable.

---

## Summary of Actions

| Category | File | Action |
|----------|------|--------|
| Hook (unused) | `src/hooks/useMapboxGeocodingCached.ts` | DELETE |
| Hook (refactor) | `src/hooks/useStripeStatus.ts` | REFACTOR to use `stripeService` |
| Hook (keep) | `src/hooks/useGDPRRequests.ts` | KEEP (already uses `privacyService`) |
| Component | `src/components/layout/NotificationButton.tsx` | DELETE |
| Component | `src/components/payments/PaymentButton.tsx` | DELETE |
| Utility | `src/lib/stripe-status-utils.ts` | DELETE |
| Utility | `src/lib/admin-utils.ts` | KEEP as re-export layer |
| Utility | `src/lib/admin/admin-payment-utils.ts` | REMOVE deprecated function |

---

## Phase 1: Delete Deprecated Hooks

### 1.1 DELETE: `src/hooks/useMapboxGeocodingCached.ts`

**Status:** Completely unused - no imports found anywhere in the codebase.

**Reason:** Replaced by `mapboxService.ts` which handles token caching internally.

**Action:** Safe to delete.

---

### 1.2 REFACTOR: `src/hooks/useStripeStatus.ts`

**Status:** Still in use by:
- `src/components/payments/HostStripeStatus.tsx` (line 9)
- Indirectly by `ProfileDashboard.tsx` and `HostDashboardHeader.tsx`

**Current Problem:** The hook makes direct `supabase.functions.invoke('check-stripe-status')` calls (lines 46, 94) instead of using `stripeService.checkAccountStatus()`.

**Action:** Refactor to use `stripeService`:

```typescript
// Before (line 46):
const { data, error } = await supabase.functions.invoke('check-stripe-status');

// After:
import { checkAccountStatus } from '@/services/api/stripeService';
// ...
const statusResult = await checkAccountStatus();
```

The hook should remain as a React wrapper around the service (managing state like `isVerifying`, `hasVerified`, and integrating with `useAuth` for profile refresh).

---

### 1.3 KEEP: `src/hooks/useGDPRRequests.ts`

**Status:** Already correctly uses `privacyService` (confirmed in previous refactoring).

**Still in use by:**
- `src/pages/Privacy.tsx`
- `src/components/settings/GDPRExportButton.tsx`

**Action:** Keep as-is. The hook provides React state management (`useState`, `useEffect`, `useCallback`) around the service calls.

---

## Phase 2: Delete Deprecated Components

### 2.1 DELETE: `src/components/layout/NotificationButton.tsx`

**Status:** Explicitly deprecated in file header:
```typescript
// This component is now deprecated - notifications are integrated directly in UnifiedHeader
// Keeping for backwards compatibility but no longer used
```

**Verification:** No active imports found. `OptimizedUnifiedHeader.tsx` imports `NotificationIcon` directly.

**Action:** Safe to delete.

---

### 2.2 DELETE: `src/components/payments/PaymentButton.tsx`

**Status:** Explicitly deprecated in code:
```typescript
toast.error("PaymentButton deprecato - usa TwoStepBookingForm", { ... });
```

**Verification:** No active imports found. The project uses `TwoStepBookingForm` for all payment flows.

**Action:** Safe to delete.

---

## Phase 3: Clean `src/lib`

### 3.1 DELETE: `src/lib/stripe-status-utils.ts`

**Status:** Contains two functions that are completely unused:
- `checkAndUpdateStripeStatus()` - 0 imports found
- `fixCurrentStripeIssue()` - 0 imports found

**Reason:** Redundant with `stripeService.checkAccountStatus()`.

**Action:** Safe to delete.

---

### 3.2 KEEP: `src/lib/admin-utils.ts`

**Status:** Re-export barrel file for backward compatibility.

**Current content:**
```typescript
export { isCurrentUserAdmin } from "./admin/admin-auth-utils";
export { getAdminStats } from "./admin/admin-stats-utils";
export { getAllUsers, suspendUser, ... } from "./admin/admin-user-utils";
// ... more re-exports
```

**Still in use by 5+ files:**
- `AdminProtected.tsx` - uses `isCurrentUserAdmin`
- `useUsersQuery.ts` - uses user management functions
- `useAdminActionsLog.ts` - uses `getAdminActionsLog`
- `useUserActions.ts` - uses `banUser`, `unbanUser`
- `useAdminDashboard.ts` - uses `getAdminStats`

**Action:** Keep as-is. This is a clean re-export pattern, not duplicated logic. The actual implementations are already modularized in `src/lib/admin/*.ts`.

---

### 3.3 REFACTOR: `src/lib/admin/admin-payment-utils.ts`

**Status:** Contains:
- `calculatePlatformFee()` - KEEP (still useful utility)
- `calculateHostAmount()` - KEEP (still useful utility)
- `exportPaymentsToCSV()` - DELETE (deprecated, unused, replaced by `exportAdminCSV`)
- `detectPaymentAnomalies()` - KEEP (still useful for admin validation)

**Action:** Remove only the deprecated `exportPaymentsToCSV` function.

---

## Phase 4: Additional Refactoring

### 4.1 REFACTOR: `src/components/payments/HostStripeStatus.tsx`

**Current Problem:** Makes direct `supabase.functions.invoke()` call (line 36).

**Action:** Refactor to use `stripeService.createOnboardingLink()`:

```typescript
// Before (line 36):
const { data, error } = await supabase.functions.invoke(API_ENDPOINTS.STRIPE_CONNECT, { ... });

// After:
import { createOnboardingLink } from '@/services/api/stripeService';
// ...
const result = await createOnboardingLink();
if (result.success && result.url) {
  window.location.href = result.url;
}
```

---

## Files Summary

### Files to DELETE (4 files)

| File | Reason |
|------|--------|
| `src/hooks/useMapboxGeocodingCached.ts` | Unused, replaced by `mapboxService` |
| `src/components/layout/NotificationButton.tsx` | Deprecated, replaced by `NotificationIcon` |
| `src/components/payments/PaymentButton.tsx` | Deprecated, replaced by `TwoStepBookingForm` |
| `src/lib/stripe-status-utils.ts` | Unused, redundant with `stripeService` |

### Files to MODIFY (3 files)

| File | Changes |
|------|---------|
| `src/hooks/useStripeStatus.ts` | Replace `supabase.functions.invoke` with `stripeService.checkAccountStatus()` |
| `src/components/payments/HostStripeStatus.tsx` | Replace direct Supabase call with `stripeService.createOnboardingLink()` |
| `src/lib/admin/admin-payment-utils.ts` | Remove deprecated `exportPaymentsToCSV` function |

### Files to KEEP (unchanged)

| File | Reason |
|------|--------|
| `src/hooks/useGDPRRequests.ts` | Already uses `privacyService`, provides React state wrapper |
| `src/lib/admin-utils.ts` | Clean re-export barrel, still actively imported |

---

## Technical Details

### useStripeStatus.ts Refactoring

```typescript
// Import
import { checkAccountStatus } from '@/services/api/stripeService';

// In verifyStripeStatus():
const statusResult = await checkAccountStatus();

sreLogger.info('Stripe status verification complete', { 
  userId: authState.user.id, 
  connected: statusResult.connected,
  updated: statusResult.updated
});

if (statusResult.updated || isReturningFromStripe) {
  await refreshProfile();
  if (statusResult.connected) {
    toast.success('Account Stripe collegato con successo!');
  }
}

// In manualRefresh():
const statusResult = await checkAccountStatus();

if (statusResult.updated) {
  await refreshProfile();
  toast.success('Status Stripe aggiornato');
} else {
  toast.info('Lo status è già aggiornato');
}
```

### HostStripeStatus.tsx Refactoring

```typescript
// Import
import { createOnboardingLink } from '@/services/api/stripeService';

// In connect():
const result = await createOnboardingLink();

if (!result.success) {
  throw new Error(result.error || 'Failed to create onboarding link');
}

if (result.url) {
  window.location.href = result.url;
} else {
  throw new Error('No redirect URL returned');
}
```

---

## Verification Checklist

After implementation:
- [ ] `npm run build` completes with 0 errors
- [ ] No orphaned imports referencing deleted files
- [ ] `useStripeStatus` hook works correctly with service
- [ ] `HostStripeStatus` component connects to Stripe correctly
- [ ] All deleted files have no remaining references

---

## Expected Outcome

| Metric | Before | After |
|--------|--------|-------|
| Deprecated hooks | 1 | 0 |
| Deprecated components | 2 | 0 |
| Unused utility files | 1 | 0 |
| Direct Supabase calls in UI | 2 | 0 |
| Lines of dead code removed | ~350 | 0 |
