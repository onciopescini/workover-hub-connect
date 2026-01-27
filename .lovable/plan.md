

# HOTFIX: Enable "Request to Book" Payments

## Executive Summary

The checkout flow is blocking "Request to Book" (host approval) payments with a `400 Bad Request: invalid_booking_status` error. This is because:

1. **Status Gate Bug**: Line 71 in `create-checkout-v3` only allows `pending_payment` status
2. **Missing Capture Mode**: No dynamic configuration for pre-authorization vs immediate capture

---

## Root Cause Analysis

### Current Booking Creation Logic (from `validate_and_reserve_slot` RPC)

| Confirmation Type | Initial Status | Payment Required |
|:------------------|:---------------|:-----------------|
| `instant` | `pending_payment` | Yes |
| `host_approval` | `pending_approval` | No (until approved) |

### Current Checkout Validation (Line 71)

```typescript
if (data.status !== "pending_payment") return { error: "invalid_booking_status" };
```

This blocks ALL "Request to Book" flows!

---

## Payment Logic Matrix (Required Behavior)

| Confirmation Type | Booking Status Input | Allowed? | Stripe Capture Method |
|:------------------|:---------------------|:---------|:----------------------|
| **Instant** | `pending_payment` | ✅ Yes | `automatic` |
| **Host Approval** | `pending_approval` | ✅ Yes | `manual` |
| **Host Approval** | `pending_payment` | ✅ Yes | `manual` |
| **Any** | `confirmed` | ❌ No | N/A (already paid) |
| **Any** | `cancelled` | ❌ No | N/A |

---

## Technical Implementation

### File: `supabase/functions/create-checkout-v3/index.ts`

#### Change 1: Update BookingWithHost Type

Add `confirmation_type` field to track booking type:

```typescript
type BookingWithHost = {
  id: string;
  user_id: string;
  status: string;
  total_price: number;
  space_id: string;
  hostStripeAccountId: string | null;
  confirmation_type: string;  // NEW: 'instant' | 'host_approval'
};
```

#### Change 2: Update `fetchBookingAndPrice` Query

Fetch `confirmation_type` from the space:

```typescript
const { data, error } = await supabase
  .from("bookings")
  .select(`
    id, user_id, status, total_price, space_id,
    spaces!inner (
      host_id,
      confirmation_type,
      profiles:host_id (stripe_account_id)
    )
  `)
  .eq("id", booking_id)
  .single();
```

#### Change 3: Fix Status Validation (Line 71)

Replace the strict check with a flexible one:

```typescript
// OLD (Line 71):
if (data.status !== "pending_payment") return { error: "invalid_booking_status" };

// NEW:
const allowedStatuses = ['pending_payment', 'pending_approval', 'pending'];
if (!allowedStatuses.includes(data.status)) {
  return { error: "invalid_booking_status" };
}
```

#### Change 4: Update `createStripeCheckoutSession` Signature

Add `confirmationType` parameter:

```typescript
async function createStripeCheckoutSession(params: {
  // ... existing params ...
  confirmationType: string;  // NEW: 'instant' | 'host_approval'
}) {
```

#### Change 5: Configure Dynamic Capture Method

Add capture method based on confirmation type:

```typescript
// Inside createStripeCheckoutSession, after building base body:

// DYNAMIC CAPTURE: Instant = capture immediately, Request = hold funds
const captureMethod = params.confirmationType === 'instant' ? 'automatic' : 'manual';
body.append("payment_intent_data[capture_method]", captureMethod);

console.log(`[CAPTURE] Confirmation: ${params.confirmationType}, Capture Method: ${captureMethod}`);
```

#### Change 6: Update Main Handler Call

Pass the confirmation type to the session creator:

```typescript
const stripe = await createStripeCheckoutSession({
  // ... existing params ...
  confirmationType: spaces.confirmation_type || 'instant',  // NEW
});
```

---

## Stripe Payment Intent Lifecycle

### Instant Book Flow
```text
Guest Clicks Pay → Checkout Session Created → Payment Captured → Booking Confirmed
                   (capture_method: automatic)
```

### Request to Book Flow
```text
Guest Clicks Pay → Checkout Session Created → Payment AUTHORIZED (not captured)
                   (capture_method: manual)
                                ↓
                   Host Reviews Request
                        ↓           ↓
              Host Accepts    Host Declines
                    ↓              ↓
           Capture Payment    Cancel Authorization
             (via API)          (auto-expires)
                    ↓
            Booking Confirmed
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/create-checkout-v3/index.ts` | Add confirmation_type, fix status gate, configure capture_method |

---

## Future Considerations

After this fix, you'll also need to implement:

1. **Host Capture API**: When host approves, call `stripe.paymentIntents.capture(pi_xxx)` to collect funds
2. **Host Decline API**: When host declines, call `stripe.paymentIntents.cancel(pi_xxx)` to release hold
3. **Auto-Expiry Handling**: If host doesn't respond within 7 days, Stripe auto-releases the authorization

These are separate tasks but depend on this fix being in place first.

---

## Verification Checklist

After implementation:
- [ ] "Instant Book" space → Checkout completes with immediate capture
- [ ] "Request to Book" space → Checkout completes with funds held
- [ ] Payment Intent shows `capture_method: manual` for requests
- [ ] Booking status remains `pending_approval` after payment (not auto-confirmed)

