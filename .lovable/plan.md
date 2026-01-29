

# System Audit & Logic Repair - Booking Lifecycle

## Critical Bugs Identified

### Bug 1: JavaScript Variable Hoisting Error (FATAL)

**File:** `supabase/functions/stripe-webhooks/handlers/enhanced-checkout-handlers.ts`

**Error:** `Cannot access 'isManualCapture' before initialization`

**Root Cause:** Line 93 references `isManualCapture` but that variable is not declared until line 197. The code declares `isManualCaptureFromMetadata` at line 83 but the log statement at line 93 incorrectly uses `isManualCapture`.

**Impact:** The entire webhook crashes before saving any data, which is why:
- `stripe_payment_intent_id` is NULL in both bookings and payments tables
- The webhook fails silently and returns 400 error to Stripe
- The `validate-payment` function becomes the only data path (but it also has issues)

---

### Bug 2: Incorrect Payment Success Check for Manual Capture (CRITICAL)

**File:** `supabase/functions/validate-payment/index.ts`

**Line 68:** `const isPaymentSuccessful = session.payment_status === 'paid' && session.status === 'complete';`

**Problem:** For "Request to Book" (manual capture), Stripe returns:
- `payment_status: 'unpaid'` (because funds are authorized, NOT captured)
- `status: 'complete'` (session completed successfully)

The current check requires `payment_status === 'paid'`, so it evaluates to `false` for all Request to Book flows.

**Impact:** The function skips all database updates and returns `success: false`, causing the UI to show "Payment Failed" error.

---

## Database Evidence

| Booking ID | confirmation_type | status | payment_status | PI ID |
|:-----------|:------------------|:-------|:---------------|:------|
| 03e862d7... | host_approval | pending_approval | pending | NULL |
| 966e19f0... | instant | confirmed | completed | NULL |
| 07e2ed11... | host_approval | **confirmed** | completed | pi_3SuVo7... |

Note: Booking `07e2ed11` was auto-confirmed despite being `host_approval` - this is the legacy bug. Recent bookings show the webhook is failing completely (NULL PI IDs).

---

## Edge Function Log Evidence

```
ERROR: "Cannot access 'isManualCapture' before initialization"
```

```
Session retrieved: payment_status: "unpaid", status: "complete"
```

---

## Phase 2: The Resolution

### Fix 1: Variable Name Typo in Webhook Handler

**File:** `supabase/functions/stripe-webhooks/handlers/enhanced-checkout-handlers.ts`

**Line 93:** Change `isManualCapture` to `isManualCaptureFromMetadata`

```typescript
// Line 93 - CURRENT (BROKEN)
ErrorHandler.logInfo('Payment status determined', {
  sessionId: session.id,
  isManualCapture,  // ← Variable doesn't exist yet!
  paymentStatusEnum,
  ...
});

// Line 93 - FIXED
ErrorHandler.logInfo('Payment status determined', {
  sessionId: session.id,
  isManualCapture: isManualCaptureFromMetadata,  // ← Use correct variable
  paymentStatusEnum,
  ...
});
```

---

### Fix 2: Accept 'unpaid' Status for Manual Capture in validate-payment

**File:** `supabase/functions/validate-payment/index.ts`

**Line 68:** For manual capture (Request to Book), `payment_status` is `'unpaid'` but the session is valid.

```typescript
// CURRENT (BROKEN) - Line 68
const isPaymentSuccessful = session.payment_status === 'paid' && session.status === 'complete';

// FIXED
// For Request to Book: payment_status = 'unpaid' (authorized), status = 'complete'
// For Instant Book: payment_status = 'paid' (captured), status = 'complete'
const isInstantBookSuccess = session.payment_status === 'paid' && session.status === 'complete';
const isRequestToBookSuccess = session.payment_status === 'unpaid' && session.status === 'complete' && isRequestToBook;
const isPaymentSuccessful = isInstantBookSuccess || isRequestToBookSuccess;
```

**Also update the response logic:** Currently when `isPaymentSuccessful` is false, the function returns `success: isPaymentSuccessful` (i.e., `false`). We need to ensure Request to Book flows also return `success: true`.

---

### Fix 3: Ensure Response Always Includes booking_status and confirmation_type

For Request to Book flows that pass the new check, ensure the correct status is returned:
- `booking_status: 'pending_approval'`
- `confirmation_type: 'host_approval'`

---

## Phase 3: Logic Truth Matrix (After Fix)

| Scenario | Stripe payment_status | Stripe session status | validate-payment Success | booking_status | UI Message |
|:---------|:---------------------|:---------------------|:-------------------------|:---------------|:-----------|
| **Instant Book** | `paid` | `complete` | `true` | `confirmed` | "Pagamento completato!" |
| **Request to Book** | `unpaid` | `complete` | `true` | `pending_approval` | "Richiesta inviata!" |

---

## Files to Modify

| File | Change | Priority |
|:-----|:-------|:---------|
| `enhanced-checkout-handlers.ts` | Fix variable name typo (line 93: `isManualCapture` -> `isManualCaptureFromMetadata`) | **CRITICAL** |
| `validate-payment/index.ts` | Accept `unpaid` status for Request to Book flows | **CRITICAL** |

---

## Deployment Order

1. Fix and deploy `stripe-webhooks` (variable typo fix)
2. Fix and deploy `validate-payment` (payment status check fix)
3. Verify with a new test booking

---

## Technical Summary

| Root Cause | Impact | Fix |
|:-----------|:-------|:----|
| Variable `isManualCapture` used before declaration | Webhook crashes, no DB updates | Change to `isManualCaptureFromMetadata` |
| `payment_status === 'paid'` check excludes manual capture | UI shows "Payment Failed" for Request to Book | Add check for `unpaid` + `complete` |

