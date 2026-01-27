
# HOTFIX: Debug Application-Level 404/500 (DB Trigger Conflict)

## Executive Summary

The investigation reveals that the reported "404" is actually a **500 Internal Server Error** caused by a database trigger conflict. The functions are executing correctly, but the `guard_confirm_without_success` trigger blocks the status update.

---

## Root Cause Chain

```text
1. Guest creates "Request to Book" booking
   └── Booking status: pending_approval
   
2. Guest pays via Stripe Checkout (capture_method: manual)
   └── Payment created with:
       ├── payment_status_enum = 'pending'  ← PROBLEM HERE
       └── stripe_payment_intent_id = NULL

3. Host clicks "Approve" → Edge Function runs
   └── Function attempts: UPDATE bookings SET status = 'confirmed'
   
4. DB Trigger guard_confirm_without_success fires
   └── Checks: SELECT 1 FROM payments WHERE payment_status_enum = 'succeeded'
   └── Result: NOT FOUND (because it's 'pending', not 'succeeded')
   └── Action: RAISE EXCEPTION 'Cannot confirm booking without a succeeded payment.'
   
5. Edge Function catches DB error → Returns 500
```

---

## Database Evidence

**Booking Record:**
| Field | Value |
|:------|:------|
| id | 5fde655a-fdb3-4482-ae49-10bb2af7b230 |
| status | pending_approval |
| stripe_payment_intent_id | NULL |

**Payment Record (same booking):**
| Field | Value |
|:------|:------|
| payment_status | pending |
| payment_status_enum | pending |
| stripe_payment_intent_id | NULL |

**DB Trigger Definition:**
```sql
IF NEW.status = 'confirmed' AND (OLD.status IS DISTINCT FROM 'confirmed') THEN
  IF NOT EXISTS (
    SELECT 1 FROM public.payments p
    WHERE p.booking_id = NEW.id
      AND p.payment_status_enum = 'succeeded'  -- ← THIS CHECK FAILS
  ) THEN
    RAISE EXCEPTION 'Cannot confirm booking without a succeeded payment.';
  END IF;
END IF;
```

---

## The Business Logic Problem

For "Request to Book" bookings, the flow is:

1. **Payment authorized** (funds held, not captured)
2. **Host approves** → Stripe capture → Payment succeeds
3. **Booking confirmed**

But the current code:
- Sets `payment_status_enum = 'pending'` at checkout
- Never updates it to `succeeded` until AFTER webhook fires
- Host approval tries to confirm BEFORE the payment is marked succeeded

**The trigger assumes payment success BEFORE confirmation, but for manual capture, success happens DURING host approval.**

---

## Technical Fix Plan

### Phase 1: Fix host-approve-booking Logic

**File:** `supabase/functions/host-approve-booking/index.ts`

The function must update the payment status BEFORE attempting to confirm the booking:

```typescript
// STEP 1: Capture Payment (if exists)
if (paymentIntentId) {
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (pi.status === 'requires_capture') {
    const capturedPi = await stripe.paymentIntents.capture(pi.id);
    if (capturedPi.status === 'succeeded') {
      // STEP 2: Update payment record FIRST
      await supabaseAdmin
        .from("payments")
        .update({
          payment_status: 'completed',
          payment_status_enum: 'succeeded',
          capture_status: 'captured'
        })
        .eq("booking_id", booking_id);
    }
  }
}

// STEP 3: Now update booking (trigger will pass)
await supabaseAdmin
  .from("bookings")
  .update({ status: "confirmed" })
  .eq("id", booking_id);
```

### Phase 2: Handle Missing Payment Intent ID

The booking shows `stripe_payment_intent_id = NULL` on the booking record. This needs to be:
1. Stored during checkout (already done in `create-checkout-v3`)
2. Synced to the booking record (currently missing)

**Fix:** After Stripe checkout creation, update the booking with the payment intent ID:

```typescript
// In create-checkout-v3 after session creation
await supabase
  .from("bookings")
  .update({ stripe_payment_intent_id: stripe.session.payment_intent_id })
  .eq("id", booking_id);
```

### Phase 3: Add Diagnostic Logging

Both Edge Functions need better error logging:

```typescript
// Before returning 404
console.error(`[HOST-APPROVE] Booking not found: ${booking_id}`);

// Before returning 403
console.error(`[HOST-APPROVE] Host mismatch: Expected ${workspace.host_id}, got ${user.id}`);

// After DB update failure
console.error(`[HOST-APPROVE] DB Update Failed:`, updateError);
```

---

## Files to Modify

| File | Change | Priority |
|:-----|:-------|:---------|
| `supabase/functions/host-approve-booking/index.ts` | Update payment status before booking confirmation | **CRITICAL** |
| `supabase/functions/create-checkout-v3/index.ts` | Store payment_intent_id on booking record | HIGH |
| `supabase/functions/host-reject-booking/index.ts` | Add diagnostic logging | MEDIUM |

---

## Implementation Details

### host-approve-booking Changes

**Before DB Update (around line 153):**

```typescript
// NEW: Update payment status BEFORE booking confirmation
// This satisfies the guard_confirm_without_success trigger
if (paymentIntentId) {
  const { error: paymentUpdateError } = await supabaseAdmin
    .from("payments")
    .update({
      payment_status: 'completed',
      payment_status_enum: 'succeeded',
      capture_status: 'captured'
    })
    .eq("booking_id", booking_id);
    
  if (paymentUpdateError) {
    console.error(`[HOST-APPROVE] Failed to update payment status:`, paymentUpdateError);
    throw new Error(`Payment status update failed: ${paymentUpdateError.message}`);
  }
  console.log(`[HOST-APPROVE] Payment status updated to succeeded`);
}

// EXISTING: Update Database
const { error: updateError } = await supabaseAdmin
  .from("bookings")
  .update({
    status: "confirmed",
    updated_at: new Date().toISOString(),
  })
  .eq("id", booking_id);
```

### create-checkout-v3 Changes

**After Stripe session creation (around line 307):**

```typescript
// Store payment_intent_id on booking for later capture
if (stripe.session.payment_intent_id) {
  await supabase
    .from("bookings")
    .update({ stripe_payment_intent_id: stripe.session.payment_intent_id })
    .eq("id", payload.booking_id);
    
  console.log(`[CHECKOUT] Stored PI ${stripe.session.payment_intent_id} on booking`);
}
```

---

## Alternative: Modify the Trigger

If business logic allows, the trigger could be updated to:

```sql
-- Allow confirmation if payment_status_enum is 'succeeded' OR 'pending' (for manual capture)
IF NEW.status = 'confirmed' AND (OLD.status IS DISTINCT FROM 'confirmed') THEN
  IF NOT EXISTS (
    SELECT 1 FROM public.payments p
    WHERE p.booking_id = NEW.id
      AND p.payment_status_enum IN ('succeeded', 'pending')  -- Allow pending for pre-auth
  ) THEN
    RAISE EXCEPTION 'Cannot confirm booking without a valid payment.';
  END IF;
END IF;
```

However, this is less safe as it allows confirmation without payment completion. The recommended approach is to update payment status BEFORE booking confirmation.

---

## Verification Checklist

After implementation:
- [ ] Payment status updates to 'succeeded' before booking confirmation
- [ ] Booking status changes to 'confirmed' without trigger error
- [ ] Payment intent ID is stored on booking record
- [ ] Edge function logs show clear error messages on failure
- [ ] Host can approve "Request to Book" bookings successfully

---

## Summary

| Issue | Root Cause | Fix |
|:------|:-----------|:----|
| 500 Error on Approve | DB trigger requires `payment_status_enum = 'succeeded'` | Update payment status BEFORE booking confirmation |
| Missing Payment Intent | Not stored on booking record | Store PI ID after checkout creation |
| No Diagnostic Info | Insufficient logging | Add context to all error returns |
