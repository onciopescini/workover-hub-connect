
# HOTFIX: Stripe Webhook & Payment Capture Cascade

## Executive Summary

The entire host approval workflow is broken due to a **cascading failure** starting from the `stripe-webhooks` Edge Function. This analysis provides the complete fix chain.

---

## Root Cause Chain (Verified)

```text
┌─────────────────────────────────────────────────────────────────────────────────┐
│ STEP 1: Stripe Webhook Crashes                                                  │
│ ─────────────────────────────────────────────────────────────────────────────── │
│ Error: "SubtleCryptoProvider cannot be used in a synchronous context.           │
│        Use `await constructEventAsync(...)` instead of `constructEvent(...)`"   │
│                                                                                 │
│ File: stripe-webhooks/index.ts (Line 35)                                        │
│ Current: stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET)       │
│ Fix:     await stripe.webhooks.constructEventAsync(body, sig, SECRET)           │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ STEP 2: Payment Intent ID Never Saved                                          │
│ ─────────────────────────────────────────────────────────────────────────────── │
│ The webhook handler in enhanced-checkout-handlers.ts correctly extracts        │
│ `session.payment_intent` but the crash prevents execution.                      │
│                                                                                 │
│ DB Evidence: ALL payments have stripe_payment_intent_id = NULL                  │
│ DB Evidence: ALL pending_approval bookings have stripe_payment_intent_id = NULL │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ STEP 3: Host Approval Cannot Capture                                           │
│ ─────────────────────────────────────────────────────────────────────────────── │
│ host-approve-booking reads booking.stripe_payment_intent_id → NULL              │
│ Cannot call stripe.paymentIntents.capture() without the ID                      │
│ payment_status_enum remains 'pending' (never updated to 'succeeded')            │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ STEP 4: DB Trigger Blocks Confirmation                                          │
│ ─────────────────────────────────────────────────────────────────────────────── │
│ Trigger: guard_confirm_without_success                                          │
│ Requirement: payment_status_enum = 'succeeded' before status = 'confirmed'      │
│ Result: RAISE EXCEPTION → 500 Error returned to frontend                        │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Why create-checkout-v3 Didn't Save the PI ID

The Stripe Checkout Session API does **not return the payment_intent** at creation time. It only returns it **after the customer completes payment**. This is documented Stripe behavior:

```json
// Response from POST /v1/checkout/sessions (BEFORE customer pays)
{
  "id": "cs_test_xxx",
  "payment_intent": null,  // ← NULL at creation
  "payment_status": "unpaid",
  "status": "open"
}
```

The `payment_intent` is populated only in the `checkout.session.completed` webhook event, which is exactly where the crash occurs.

---

## Fix Implementation Plan

### Phase 1: Fix stripe-webhooks (ROOT CAUSE)

**File**: `supabase/functions/stripe-webhooks/index.ts`

**Change**: Line 35

```typescript
// BEFORE (crashes in Deno)
const event = stripe.webhooks.constructEvent(body, sig, STRIPE_WEBHOOK_SECRET);

// AFTER (async-safe for Deno)
const event = await stripe.webhooks.constructEventAsync(body, sig, STRIPE_WEBHOOK_SECRET);
```

This single fix restores the entire webhook pipeline:
- `checkout.session.completed` events will process successfully
- `payment_intent` IDs will be saved to bookings and payments tables
- Future host approvals will have the ID they need

### Phase 2: Add Fallback in host-approve-booking (SELF-HEALING)

**File**: `supabase/functions/host-approve-booking/index.ts`

For bookings that were created before the fix, the `stripe_payment_intent_id` is NULL. We need a fallback mechanism to retrieve the PI ID from Stripe using the session ID.

**Logic (around line 127)**:

```typescript
// Step A: Get Payment Intent ID (with fallback)
let paymentIntentId = booking.stripe_payment_intent_id;

// FALLBACK: If PI ID is missing, try to retrieve from Stripe via session
if (!paymentIntentId) {
  console.log(`[HOST-APPROVE] PI ID missing on booking, attempting fallback via payments table...`);
  
  // Get the session ID from payments table
  const { data: payment } = await supabaseAdmin
    .from("payments")
    .select("stripe_session_id")
    .eq("booking_id", booking_id)
    .single();
  
  if (payment?.stripe_session_id) {
    console.log(`[HOST-APPROVE] Found session ID: ${payment.stripe_session_id}, retrieving from Stripe...`);
    
    // Retrieve the checkout session from Stripe to get the PI ID
    const session = await stripe.checkout.sessions.retrieve(payment.stripe_session_id);
    
    if (session.payment_intent) {
      paymentIntentId = typeof session.payment_intent === 'string' 
        ? session.payment_intent 
        : session.payment_intent.id;
      
      console.log(`[HOST-APPROVE] Retrieved PI ID from Stripe: ${paymentIntentId}`);
      
      // Self-heal: Update the booking with the PI ID for future operations
      await supabaseAdmin
        .from("bookings")
        .update({ stripe_payment_intent_id: paymentIntentId })
        .eq("id", booking_id);
      
      // Also update the payment record
      await supabaseAdmin
        .from("payments")
        .update({ stripe_payment_intent_id: paymentIntentId })
        .eq("booking_id", booking_id);
      
      console.log(`[HOST-APPROVE] Self-healed: PI ID saved to booking and payment records`);
    } else {
      console.error(`[HOST-APPROVE] Stripe session has no payment_intent. Payment may not be complete.`);
      throw new Error("Payment not yet completed by guest. Cannot approve.");
    }
  } else {
    console.error(`[HOST-APPROVE] No payment record found for booking ${booking_id}`);
    throw new Error("No payment found for this booking.");
  }
}
```

### Phase 3: Add Fallback in host-reject-booking

**File**: `supabase/functions/host-reject-booking/index.ts`

Same fallback logic for rejections, since we need the PI ID to call `stripe.paymentIntents.cancel()`.

---

## Files to Modify

| File | Change | Impact |
|:-----|:-------|:-------|
| `supabase/functions/stripe-webhooks/index.ts` | `constructEvent` → `await constructEventAsync` | Fixes webhook processing |
| `supabase/functions/host-approve-booking/index.ts` | Add PI ID fallback via Stripe API | Self-heals broken bookings |
| `supabase/functions/host-reject-booking/index.ts` | Add PI ID fallback via Stripe API | Self-heals broken bookings |

---

## Verification Checklist

After deployment:
- [ ] Webhook processes `checkout.session.completed` without error
- [ ] New payments have `stripe_payment_intent_id` populated
- [ ] New bookings have `stripe_payment_intent_id` populated
- [ ] Host can approve existing broken bookings (fallback works)
- [ ] Host can reject existing broken bookings (fallback works)
- [ ] DB trigger `guard_confirm_without_success` passes on approval

---

## Technical Summary

| Issue | Root Cause | Fix |
|:------|:-----------|:----|
| Webhook 500 error | `constructEvent` sync call in Deno | Use `constructEventAsync` |
| PI ID missing | Webhook crash prevents save | Fix webhook + add fallback |
| Approval fails | No PI ID to capture | Fallback retrieves from Stripe |
| Rejection fails | No PI ID to cancel | Fallback retrieves from Stripe |
| DB trigger blocks | payment_status_enum not updated | Fix already in place (Step B) |
