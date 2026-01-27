
# Day 5: UX Safety Net - Build Fixes & Error Handling

## Overview

This plan addresses two priorities:
1. **Fix remaining build errors** (blocking deployment)
2. **Implement UX Safety Net features** (error handling and user feedback)

---

## Part 1: Fix Build Errors (Blocking)

### 1.1 BookingSuccess.tsx - TS7030: Not all code paths return a value

**File:** `src/pages/BookingSuccess.tsx`
**Line:** 18 (useEffect callback)

**Problem:** The `setInterval` callback in the useEffect doesn't explicitly return a value on all code paths. TypeScript expects the callback to either always return a value or never return one.

**Fix:** Add explicit `return undefined;` at the end of the interval callback:

```typescript
const interval: any = setInterval(function() {
  const timeLeft = animationEnd - Date.now();

  if (timeLeft <= 0) {
    clearInterval(interval);
    return;
  }

  // ... confetti logic ...
  
  return undefined; // Explicit return for TypeScript
}, 250);
```

---

### 1.2 UserProfileView.tsx - Type 'unknown' is not assignable to type 'ReactNode'

**File:** `src/pages/UserProfileView.tsx`
**Lines:** 180, 251, 271, 277, 283, 314, 338, 469, 492

**Problem:** The `profile` object is typed as `Record<string, unknown>` (or similar), and when accessing properties like `profile['portfolio_url']` or `profile['job_title']`, TypeScript sees them as `unknown`. React components cannot render `unknown` values directly.

**Current Code Examples:**
```typescript
// Line 180 - Conditional rendering
{profile['portfolio_url'] && (  // unknown cannot be rendered

// Line 251 - Badge content
{(String(profile['collaboration_availability']) !== 'not_available' && profile['collaboration_availability']) && (

// Line 271 - Text content
{profile['job_title'] && (  // unknown cannot be rendered
```

**Fix:** For each line, either:
- Cast to string explicitly: `String(profile['portfolio_url'])`
- Use a type guard before rendering
- Wrap in `String()` where the value is rendered as text

**Changes Required:**

| Line | Current | Fix |
|------|---------|-----|
| 180 | `{profile['portfolio_url'] && (` | Keep as is (truthy check), but ensure rendered value uses `String()` |
| 251 | `&& profile['collaboration_availability'])` | The value isn't rendered directly here, so keep |
| 271 | `{profile['job_title'] && (` | Already using `String()` in line 274 |
| 277 | `{profile['profession'] && (` | Already using `String()` in line 280 |
| 283 | `{profile['location'] && (` | Already using `String()` in line 286 |
| 314 | `{profile['portfolio_url'] && (` | Value rendered via href in line 322 with `String()` |
| 338 | `{profile['bio'] && (` | Already using `String()` in line 344 |
| 469 | `{profile['preferred_work_mode'] && (` | All uses already cast with `String()` |
| 492 | `{profile['collaboration_description'] && (` | Already using `String()` in line 499 |

**Root Issue:** The actual issue is that these conditional expressions (`{value && ...}`) can potentially render `false` or the raw `unknown` value when the condition is truthy but the value isn't a valid ReactNode.

**Solution:** Change pattern from:
```typescript
{profile['key'] && (<Component />)}
```
To:
```typescript
{Boolean(profile['key']) && (<Component />)}
```
Or use nullish coalescing with explicit null:
```typescript
{profile['key'] ? (<Component />) : null}
```

---

## Part 2: Day 5 UX Features

### 2.1 Error Boundary Already Exists

The project already has a robust `ErrorBoundary` component in `src/components/error/ErrorBoundary.tsx` that:
- Integrates with Sentry for error tracking
- Uses `sreLogger.error` for structured logging
- Shows Italian-language UI ("Qualcosa è andato storto")
- Has "Riprova" and "Vai alla Home" buttons
- Auto-reloads after 3 consecutive errors

**Already wrapped in `src/main.tsx`:**
```typescript
<ErrorBoundary showDetails={import.meta.env.DEV}>
  <App />
</ErrorBoundary>
```

**No changes needed** - the global error boundary is already implemented.

---

### 2.2 Enhance useCheckout.ts with Toast Notifications

**File:** `src/hooks/checkout/useCheckout.ts`

**Changes:**

1. **Import toast from sonner and sreLogger**
2. **Replace console.log/error with sreLogger**
3. **Add toast notifications for user feedback**

```typescript
import { toast } from 'sonner';
import { sreLogger } from '@/lib/sre-logger';

// Line 73-80: Reservation failure
if (!reservation.success) {
  const errorMessage = reservation.error || 'Reservation failed';
  sreLogger.error('Reservation failed', { 
    component: 'useCheckout',
    spaceId,
    error: errorMessage 
  });
  toast.error(`Prenotazione fallita: ${errorMessage}`);
  return { ... };
}

// Line 82: Replace console.log
// DELETE: console.log("RESERVED SLOT ID:", reservation.bookingId);
sreLogger.debug('Reserved slot', { component: 'useCheckout', bookingId: reservation.bookingId });

// Line 89: Replace console.log
// DELETE: console.log("CHECKOUT PAYLOAD:", payload);
// (Just remove - debug info not needed)

// Line 94-101: Checkout failure
if (!checkout.success || !checkout.url) {
  const errorMessage = checkout.error || 'No checkout URL';
  sreLogger.error('Checkout failed', { 
    component: 'useCheckout',
    bookingId: reservation.bookingId,
    error: errorMessage
  });
  toast.error(`Pagamento fallito: ${errorMessage}`);
  return { ... };
}

// Line 103-105: Success - add toast before redirect
sreLogger.info('Checkout success, redirecting to Stripe', { 
  component: 'useCheckout', 
  url: checkout.url 
});
toast.success("Prenotazione confermata! Reindirizzamento a Stripe...");
window.location.href = checkout.url;

// Line 109-117: Catch block
catch (err) {
  const caughtError = err instanceof Error ? err : new Error('Unknown error occurred');
  // DELETE: console.error("CRITICAL FAILURE:", caughtError.message);
  sreLogger.error('Checkout flow critical failure', { 
    component: 'useCheckout',
    spaceId 
  }, caughtError);
  toast.error(`Errore imprevisto: ${caughtError.message}`);
  return { ... };
}
```

---

### 2.3 Replace Console Logs in bookingService.ts

**File:** `src/services/api/bookingService.ts`

Replace all `console.log` and `console.error` with `sreLogger`:

| Line | Current | Replacement |
|------|---------|-------------|
| 70 | `console.log('[BookingService] Calling...')` | `sreLogger.info('Calling validate_and_reserve_slot', { component: 'bookingService', ...rpcParams })` |
| 76 | `console.error('[BookingService] RPC Error')` | `sreLogger.error('RPC error during slot reservation', { component: 'bookingService' }, rpcError)` |
| 96 | `console.error('[BookingService] RPC returned no data')` | `sreLogger.error('RPC returned no data', { component: 'bookingService' })` |
| 110 | `console.log('[BookingService] Reserved slot ID')` | `sreLogger.info('Reserved slot successfully', { component: 'bookingService', bookingId })` |
| 113 | `console.error('[BookingService] Invalid Booking ID')` | `sreLogger.error('Invalid Booking ID format', { component: 'bookingService', rpcData })` |
| 141 | `console.error('[BookingService] Session error')` | `sreLogger.error('Session error', { component: 'bookingService' }, sessionError as Error)` |
| 158 | `console.log('[BookingService] Creating checkout')` | `sreLogger.info('Creating checkout session', { component: 'bookingService', bookingId, idempotencyKey })` |
| 176 | `console.error('[BookingService] Checkout error')` | `sreLogger.error('Checkout error response', { component: 'bookingService', status: response.status, responseData })` |
| 209 | `console.error('[BookingService] No checkout URL')` | `sreLogger.error('No checkout URL in response', { component: 'bookingService', responseData })` |
| 217 | `console.log('[BookingService] Checkout session created')` | `sreLogger.info('Checkout session created successfully', { component: 'bookingService', sessionId })` |
| 226 | `console.error('[BookingService] Network error')` | `sreLogger.error('Network error during checkout', { component: 'bookingService' }, error as Error)` |

---

### 2.4 Create Smoke Test

**New File:** `src/services/api/__tests__/smoke.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { reserveSlot, createCheckoutSession } from '../bookingService';

describe('Service Smoke Test', () => {
  it('bookingService exports reserveSlot function', () => {
    expect(reserveSlot).toBeDefined();
    expect(typeof reserveSlot).toBe('function');
  });

  it('bookingService exports createCheckoutSession function', () => {
    expect(createCheckoutSession).toBeDefined();
    expect(typeof createCheckoutSession).toBe('function');
  });
});
```

Note: stripeService might not exist as a consolidated module yet, so the test focuses on bookingService which we know exists.

---

## Summary of Files to Modify

| File | Action | Priority |
|------|--------|----------|
| `src/pages/BookingSuccess.tsx` | Add explicit return in setInterval callback | High (Build blocker) |
| `src/pages/UserProfileView.tsx` | Fix unknown → ReactNode type errors with Boolean() pattern | High (Build blocker) |
| `src/hooks/checkout/useCheckout.ts` | Add toast notifications + replace console.* with sreLogger | Medium |
| `src/services/api/bookingService.ts` | Replace console.* with sreLogger | Medium |
| `src/services/api/__tests__/smoke.test.ts` | Create new smoke test file | Low |

---

## Verification Checklist

After implementation:
- [ ] `npm run build` completes with 0 errors
- [ ] Checkout flow shows toast on reservation failure
- [ ] Checkout flow shows toast on checkout success (before redirect)
- [ ] Checkout flow shows toast on checkout failure
- [ ] No `console.log` or `console.error` in `src/services/api/bookingService.ts`
- [ ] No `console.log` or `console.error` in `src/hooks/checkout/useCheckout.ts`
- [ ] Smoke test passes

---

## Expected Outcome

| Metric | Before | After |
|--------|--------|-------|
| Build errors | 10 | 0 |
| `console.*` in bookingService | 11 | 0 |
| `console.*` in useCheckout | 3 | 0 |
| User-facing error toasts | 0 | 3 |
| Smoke tests | 0 | 1 file (2 tests) |
