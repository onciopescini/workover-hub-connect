

# HOTFIX: Stripe Webhook Repair & Host Function Rescue

## Executive Summary

The codebase already contains the correct fixes from previous hotfixes, but **the deployed functions are not running the latest code**. Database evidence proves that `stripe_payment_intent_id` is still NULL and `payment_status_enum` is not being updated despite the code changes.

---

## Root Cause: Stale Deployment

### Database Evidence (Live Data)

| Booking ID | Booking PI ID | Payment PI ID | payment_status | payment_status_enum | Status |
|:-----------|:--------------|:--------------|:---------------|:--------------------|:-------|
| 863776ce... | **NULL** | **NULL** | completed | **pending** | pending_approval |
| 2878a95e... | **NULL** | **NULL** | completed | **pending** | pending_approval |
| 5fde655a... | **NULL** | **NULL** | completed | **pending** | pending_approval |
| d6c95777... | **NULL** | **NULL** | completed | **pending** | pending_approval |

All recent bookings created AFTER the hotfix show:
- `stripe_payment_intent_id = NULL` (both tables)
- `payment_status_enum = pending` (not `succeeded`)

**This proves the deployed webhook is NOT running the fixed code.**

---

## Code Verification (All Correct)

### 1. stripe-webhooks/index.ts - ✅ Already Correct

```typescript
// Line 35 - CORRECT (async version)
const event = await stripe.webhooks.constructEventAsync(body, sig, STRIPE_WEBHOOK_SECRET);
```

### 2. enhanced-checkout-handlers.ts - ✅ Already Correct

```typescript
// Lines 66-74 - PI ID Extraction
const paymentIntentId = typeof session.payment_intent === 'string'
  ? session.payment_intent
  : session.payment_intent?.id || null;

// Lines 76-83 - Status Determination
const isManualCapture = session.metadata?.confirmation_type === 'host_approval' ||
                        session.metadata?.capture_method === 'manual';
const paymentStatusEnum = isManualCapture ? 'pending' : 'succeeded';

// Lines 105-108 - UPDATE path includes PI ID
.update({
  payment_status: paymentStatus,
  payment_status_enum: paymentStatusEnum,  // ✓ Correct
  stripe_payment_intent_id: paymentIntentId,  // ✓ Correct
  ...
})

// Lines 140-143 - INSERT path includes PI ID
.insert({
  payment_status_enum: paymentStatusEnum,  // ✓ Correct
  stripe_payment_intent_id: paymentIntentId,  // ✓ Correct
  ...
})
```

### 3. host-approve-booking/index.ts - ✅ Already Correct

```typescript
// Lines 18-24 - POST method handling
if (req.method !== "POST") {
  return new Response(
    JSON.stringify({ error: "Method Not Allowed" }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 405 }
  );
}

// Lines 131-175 - Self-Healing Fallback (ALREADY IMPLEMENTED)
if (!paymentIntentId) {
  console.log(`[HOST-APPROVE] PI ID missing on booking, attempting fallback via payments table...`);
  
  const { data: payment } = await supabaseAdmin
    .from("payments")
    .select("stripe_session_id")
    .eq("booking_id", booking_id)
    .single();
  
  if (payment?.stripe_session_id) {
    const session = await stripe.checkout.sessions.retrieve(payment.stripe_session_id);
    
    if (session.payment_intent) {
      paymentIntentId = typeof session.payment_intent === 'string' 
        ? session.payment_intent 
        : session.payment_intent.id;
      
      // Self-heal: Update DB records
      await supabaseAdmin
        .from("bookings")
        .update({ stripe_payment_intent_id: paymentIntentId })
        .eq("id", booking_id);
      
      await supabaseAdmin
        .from("payments")
        .update({ stripe_payment_intent_id: paymentIntentId })
        .eq("booking_id", booking_id);
    }
  }
}
```

### 4. host-reject-booking/index.ts - ✅ Already Correct

Same self-healing pattern implemented at lines 132-176.

---

## Solution: Force Redeployment

Since all code is correct but not running in production, we need to:

### Step 1: Deploy all three functions with fresh build

Deploy the following functions to force the Supabase platform to rebuild and deploy from the current codebase:

1. `stripe-webhooks`
2. `host-approve-booking`
3. `host-reject-booking`

### Step 2: Trigger a test webhook to verify

After deployment, we can verify by:
- Testing the webhook endpoint directly
- Creating a new test booking to confirm PI ID is saved

### Step 3: Test host approval on existing broken booking

The self-healing fallback in `host-approve-booking` should:
1. Detect missing PI ID
2. Fetch it from Stripe via session ID
3. Update DB records (self-heal)
4. Capture the payment
5. Update status to confirmed

---

## Self-Healing Code Reference

This is the critical self-healing block in `host-approve-booking` (lines 131-175):

```typescript
// Step A: Get Payment Intent ID (with self-healing fallback)
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

---

## Deployment Plan

| Function | Status | Action |
|:---------|:-------|:-------|
| `stripe-webhooks` | Code correct, deployment stale | **REDEPLOY** |
| `host-approve-booking` | Code correct, deployment stale | **REDEPLOY** |
| `host-reject-booking` | Code correct, deployment stale | **REDEPLOY** |

---

## Verification Checklist

After deployment:
- [ ] New checkout sessions save `stripe_payment_intent_id` to both tables
- [ ] `payment_status_enum` correctly reflects capture method
- [ ] Host approval works on broken bookings (self-healing)
- [ ] Host rejection works on broken bookings (self-healing)
- [ ] DB trigger `guard_confirm_without_success` passes on approval

