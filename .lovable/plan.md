

# HOTFIX: Stripe Success URL Redirect

## Root Cause Analysis

The `create-checkout-v3` Edge Function (lines 113-114) sets the Stripe `success_url` and `cancel_url` to point to the **Supabase Edge Function URL**:

```typescript
success_url: `${SUPABASE_URL}/functions/v1/validate-payment?booking_id=${params.booking_id}&status=success`,
cancel_url: `${SUPABASE_URL}/functions/v1/validate-payment?booking_id=${params.booking_id}&status=cancel`,
```

This causes:
- User completes payment on Stripe Checkout
- Stripe redirects to the Edge Function URL (`/functions/v1/validate-payment`)
- Browser makes a GET request without Authorization headers
- Edge Function returns 401 Unauthorized (black screen)

The correct flow should redirect to the **Frontend App** where:
- User sees a "Payment Successful" confirmation page
- The `stripe-webhooks` function (which we secured earlier) handles the database update via `checkout.session.completed` event

---

## Solution

### Step 1: Update `create-checkout-v3/index.ts`

Modify the function to:
1. Accept `origin` from the request body (already sent by frontend in `usePaymentLink.ts` line 76)
2. Use the frontend URL pattern `/spaces/{spaceId}/booking-success?session_id={CHECKOUT_SESSION_ID}`
3. Add a fallback to the published app URL for safety

**Changes to `createStripeCheckoutSession` function (lines 100-116):**

```typescript
// Add origin parameter
async function createStripeCheckoutSession(params: {
  amountCents: number;
  currency: string;
  idempotencyKey: string;
  booking_id: string;
  origin: string;  // NEW: Frontend origin
  space_id: string; // NEW: For success URL routing
}) {
  // Fallback to production URL if origin not provided
  const frontendOrigin = params.origin || 'https://workover-hub-connect.lovable.app';
  
  const body = new URLSearchParams({
    mode: "payment",
    "payment_method_types[]": "card",
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": params.currency,
    "line_items[0][price_data][unit_amount]": String(params.amountCents),
    "line_items[0][price_data][product_data][name]": `Booking ${params.booking_id}`,
    // FIXED: Point to Frontend success/cancel pages
    success_url: `${frontendOrigin}/spaces/${params.space_id}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${frontendOrigin}/bookings?canceled=true&booking_id=${params.booking_id}`,
    "metadata[booking_id]": params.booking_id,
  });
  // ... rest of function
}
```

**Changes to `fetchBookingAndPrice` function (lines 41-55):**

```typescript
async function fetchBookingAndPrice(booking_id: string, user_id: string) {
  const { data, error } = await supabase
    .from("bookings")
    .select("id, user_id, status, total_price, space_id")  // ADD space_id
    .eq("id", booking_id)
    .single();

  if (error || !data) return { error: "booking_not_found" };
  if (data.user_id !== user_id) return { error: "forbidden" };
  if (data.status !== "pending_payment") return { error: "invalid_booking_status" };

  const amountCents = Math.max(0, Math.round(Number(data.total_price) * 100));
  const currency = "eur";
  return { booking: data, amountCents, currency, spaceId: data.space_id };  // ADD spaceId
}
```

**Changes to `CreateCheckoutBody` type (line 5):**

```typescript
type CreateCheckoutBody = { 
  booking_id: string;
  origin?: string;  // Frontend origin for redirect URLs
};
```

**Changes to main handler (lines 196-207):**

```typescript
// Get origin from request for redirect URLs
const origin = req.headers.get('origin') || payload.origin || 'https://workover-hub-connect.lovable.app';

// ... existing validation code ...

const stripe = await createStripeCheckoutSession({
  amountCents: bookingRes.amountCents!,
  currency: bookingRes.currency!,
  idempotencyKey,
  booking_id: payload.booking_id,
  origin,                           // NEW
  space_id: bookingRes.spaceId!,    // NEW
});
```

---

## Technical Details

### Current Flow (BROKEN)
```text
User clicks Pay → Stripe Checkout → Payment Complete
                                         ↓
                      Redirect to: supabase.co/functions/v1/validate-payment
                                         ↓
                      401 Unauthorized (no auth headers) ❌
```

### Fixed Flow
```text
User clicks Pay → Stripe Checkout → Payment Complete
                                         ↓
                      Redirect to: workover-hub-connect.lovable.app/spaces/{id}/booking-success
                                         ↓
                      Frontend shows success page with confetti ✅
                                         ↓
                      (Meanwhile) Stripe Webhook → checkout.session.completed
                                         ↓
                      stripe-webhooks Edge Function confirms booking ✅
```

### Webhook Verification
The `stripe-webhooks/index.ts` already handles `checkout.session.completed` events (line 44), which properly updates the payment and booking status. The frontend success page is purely presentational.

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/create-checkout-v3/index.ts` | Update success_url, cancel_url, add origin/space_id params |

---

## Verification Checklist

After implementation:
- [ ] Complete a test payment flow
- [ ] Verify redirect goes to `/spaces/{id}/booking-success?session_id=...`
- [ ] Confirm confetti animation plays on success page
- [ ] Verify `stripe-webhooks` still processes `checkout.session.completed` event
- [ ] Confirm booking status updates to `confirmed` in database

