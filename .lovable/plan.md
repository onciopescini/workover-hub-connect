

# HOTFIX: Stripe Webhook Upsert Failure (Root Cause Analysis & Fix)

## Executive Summary

The `checkout.session.completed` webhook fails with `"Payment not found after upsert"` due to **TWO critical issues** in the enhanced-checkout-handlers.ts logic.

---

## Root Cause Analysis

### Issue #1: Missing `stripe_payment_intent_id` in UPDATE path

**Location:** `enhanced-checkout-handlers.ts` lines 76-85

When an existing payment is found and updated, the code sets:
- `payment_status: 'completed'`
- `receipt_url`
- `stripe_event_id`
- `host_amount`
- `platform_fee`

**BUT IT NEVER SAVES `stripe_payment_intent_id`!**

```typescript
// CURRENT CODE (BROKEN)
.update({
  payment_status: 'completed',
  receipt_url: session.receipt_url || null,
  stripe_event_id: eventId,
  host_amount: breakdown.hostNetPayout,
  platform_fee: breakdown.platformRevenue
})
// ← Missing: stripe_payment_intent_id !!!
```

**Database Evidence:** All 10 recent payments have `stripe_payment_intent_id = NULL` despite having `payment_status = 'completed'`.

### Issue #2: Missing `stripe_payment_intent_id` in INSERT path

**Location:** `enhanced-checkout-handlers.ts` lines 100-114

The INSERT fallback also does not include `stripe_payment_intent_id`:

```typescript
// CURRENT CODE (BROKEN)
.insert({
  booking_id: bookingId,
  user_id: session.metadata!.user_id,
  amount: (session.amount_total || 0) / 100,
  currency: (session.currency || 'eur').toUpperCase(),
  payment_status: 'completed',
  stripe_session_id: session.id,
  receipt_url: session.receipt_url || null,
  host_amount: breakdown.hostNetPayout,
  platform_fee: breakdown.platformRevenue,
  stripe_event_id: eventId,
  method: 'stripe'
})
// ← Missing: stripe_payment_intent_id !!!
```

### Issue #3: Missing `payment_status_enum` in both paths

The database has TWO status fields:
- `payment_status` (text, legacy)
- `payment_status_enum` (USER-DEFINED enum)

The webhook updates `payment_status = 'completed'` but leaves `payment_status_enum = 'pending'`. This causes the DB trigger `guard_confirm_without_success` to block booking confirmations.

---

## Fix Implementation

### File: `supabase/functions/stripe-webhooks/handlers/enhanced-checkout-handlers.ts`

#### Change 1: Add Payment Intent ID extraction BEFORE the upsert logic (around line 66)

```typescript
// Extract Payment Intent ID BEFORE database operations
const paymentIntentId = typeof session.payment_intent === 'string'
  ? session.payment_intent
  : session.payment_intent?.id || null;

ErrorHandler.logInfo('Payment Intent ID extracted for upsert', {
  sessionId: session.id,
  paymentIntentId: paymentIntentId || 'NULL'
});
```

#### Change 2: Fix UPDATE path (lines 76-85)

```typescript
// FIXED: Include stripe_payment_intent_id and payment_status_enum
const { error: updateError } = await supabaseAdmin
  .from('payments')
  .update({
    payment_status: 'completed',
    payment_status_enum: 'succeeded',  // ← ADD THIS
    stripe_payment_intent_id: paymentIntentId,  // ← ADD THIS
    receipt_url: session.receipt_url || null,
    stripe_event_id: eventId,
    host_amount: breakdown.hostNetPayout,
    platform_fee: breakdown.platformRevenue
  })
  .eq('id', existingPayment.id);
```

#### Change 3: Fix INSERT path (lines 100-114)

```typescript
// FIXED: Include stripe_payment_intent_id and payment_status_enum
const { error: insertError } = await supabaseAdmin
  .from('payments')
  .insert({
    booking_id: bookingId,
    user_id: session.metadata!.user_id,
    amount: (session.amount_total || 0) / 100,
    currency: (session.currency || 'eur').toUpperCase(),
    payment_status: 'completed',
    payment_status_enum: 'succeeded',  // ← ADD THIS
    stripe_session_id: session.id,
    stripe_payment_intent_id: paymentIntentId,  // ← ADD THIS
    receipt_url: session.receipt_url || null,
    host_amount: breakdown.hostNetPayout,
    platform_fee: breakdown.platformRevenue,
    stripe_event_id: eventId,
    method: 'stripe'
  });
```

#### Change 4: Handle "Request to Book" flows (Manual Capture)

For manual capture flows, the payment is authorized but NOT captured yet. The status should be different:

```typescript
// Determine correct status based on capture method
const isManualCapture = session.payment_intent_data?.capture_method === 'manual' 
  || session.metadata?.confirmation_type === 'host_approval';

// For manual capture: funds are authorized, not yet captured
// For automatic capture: funds are captured, payment succeeded
const paymentStatusEnum = isManualCapture ? 'pending' : 'succeeded';
const paymentStatus = isManualCapture ? 'pending' : 'completed';

ErrorHandler.logInfo('Payment status determined', {
  sessionId: session.id,
  isManualCapture,
  paymentStatusEnum,
  paymentStatus
});
```

Then use these variables in both UPDATE and INSERT:

```typescript
.update({
  payment_status: paymentStatus,
  payment_status_enum: paymentStatusEnum,
  stripe_payment_intent_id: paymentIntentId,
  // ... rest
})
```

---

## Complete Fixed Logic (handleCheckoutSessionCompleted)

The corrected flow should be:

```text
1. Extract Payment Intent ID from session
2. Determine capture method (manual vs automatic)
3. Set appropriate status (pending for manual, succeeded for automatic)
4. Check if payment exists by stripe_session_id
5. IF EXISTS → UPDATE with PI ID, status, etc.
6. IF NOT EXISTS → INSERT with PI ID, status, etc.
7. Update booking with PI ID
8. Send notifications
```

---

## Files to Modify

| File | Change | Priority |
|:-----|:-------|:---------|
| `supabase/functions/stripe-webhooks/handlers/enhanced-checkout-handlers.ts` | Add `stripe_payment_intent_id` to UPDATE/INSERT, add `payment_status_enum`, handle manual capture | **CRITICAL** |

---

## Verification Checklist

After deployment:
- [ ] Webhook processes `checkout.session.completed` without error
- [ ] `payments.stripe_payment_intent_id` is populated (not NULL)
- [ ] `payments.payment_status_enum` matches intent (`succeeded` for instant, `pending` for request)
- [ ] Host approval can capture the payment
- [ ] DB trigger `guard_confirm_without_success` passes

---

## Technical Summary

| Issue | Root Cause | Fix |
|:------|:-----------|:----|
| "Payment not found after upsert" | Query succeeds, but missing PI ID causes downstream issues | Add `stripe_payment_intent_id` to both UPDATE and INSERT |
| `payment_status_enum = 'pending'` forever | Webhook only updates `payment_status` (legacy field) | Also update `payment_status_enum` |
| DB trigger blocks confirmation | `payment_status_enum` not `succeeded` | Set correctly based on capture method |
| Host approval fails | No PI ID to capture | PI ID now saved in webhook |

