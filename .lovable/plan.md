
# Implementation Plan: Dual Fee Model & Backend Stabilization

## Executive Summary

We need to implement the agreed Dual Fee pricing model and fix the validation crash. The current checkout flow has **three critical issues**:

1. **No Pricing Engine Integration** - `create-checkout-v3` uses raw `total_price` without fees
2. **Missing Stripe Metadata** - Webhook expects `base_amount` but checkout doesn't set it
3. **No Stripe Connect** - No `application_fee_amount` or `transfer_data` for host payouts

---

## Transaction Simulation Table (€100 Base Price)

```text
┌─────────────────────────────────────────────────────────────────┐
│                    DUAL FEE MODEL BREAKDOWN                      │
├─────────────────────────────────────────────────────────────────┤
│ Base Price (Host Sets)                           €100.00        │
├─────────────────────────────────────────────────────────────────┤
│ COWORKER SIDE:                                                  │
│   Guest Fee (5% of Base)                         +€5.00         │
│   VAT on Guest Fee (22%)                         +€1.10         │
│   ─────────────────────────────────────────────────────         │
│   TOTAL COWORKER PAYS                           €106.10         │
├─────────────────────────────────────────────────────────────────┤
│ HOST SIDE:                                                      │
│   Base Price                                     €100.00        │
│   Host Fee (5% of Base)                          -€5.00         │
│   ─────────────────────────────────────────────────────         │
│   HOST RECEIVES (Stripe Transfer)                €95.00         │
├─────────────────────────────────────────────────────────────────┤
│ PLATFORM REVENUE:                                               │
│   Guest Fee                                       €5.00         │
│   Guest VAT                                       €1.10         │
│   Host Fee                                        €5.00         │
│   ─────────────────────────────────────────────────────         │
│   PLATFORM GETS (Application Fee)               €11.10         │
├─────────────────────────────────────────────────────────────────┤
│ VERIFICATION: €106.10 = €95.00 + €11.10          ✓ BALANCED    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Technical Implementation

### Phase 1: Update `create-checkout-v3` (Critical)

**File:** `supabase/functions/create-checkout-v3/index.ts`

**Changes Required:**

1. **Import the Pricing Engine:**
```typescript
import { PricingEngine } from "../_shared/pricing-engine.ts";
```

2. **Fetch Host's Stripe Account ID:**
```typescript
async function fetchBookingAndPrice(booking_id: string, user_id: string) {
  const { data, error } = await supabase
    .from("bookings")
    .select(`
      id, user_id, status, total_price, space_id,
      spaces!inner (
        host_id,
        profiles!inner (stripe_account_id)
      )
    `)
    .eq("id", booking_id)
    .single();
  // ... return hostStripeAccountId
}
```

3. **Calculate Pricing Breakdown:**
```typescript
const basePrice = bookingRes.booking.total_price; // This is the BASE price
const pricing = PricingEngine.calculatePricing(basePrice);

// Convert to cents for Stripe
const totalChargeCents = Math.round(pricing.totalGuestPay * 100);
const applicationFeeCents = Math.round(pricing.applicationFee * 100);
const hostPayoutCents = Math.round(pricing.hostPayout * 100);
```

4. **Configure Stripe Checkout with Connect:**
```typescript
const body = new URLSearchParams({
  mode: "payment",
  "payment_method_types[]": "card",
  "line_items[0][quantity]": "1",
  "line_items[0][price_data][currency]": "eur",
  "line_items[0][price_data][unit_amount]": String(totalChargeCents),
  "line_items[0][price_data][product_data][name]": `Prenotazione ${params.booking_id}`,
  
  // STRIPE CONNECT: Route payment to Host
  "payment_intent_data[application_fee_amount]": String(applicationFeeCents),
  "payment_intent_data[transfer_data][destination]": params.hostStripeAccountId,
  
  // METADATA: Required for webhook processing
  "metadata[booking_id]": params.booking_id,
  "metadata[base_amount]": String(basePrice),
  "metadata[user_id]": params.user_id,
  "metadata[host_net_payout]": String(pricing.hostPayout),
  "metadata[total_platform_fee]": String(pricing.applicationFee),
  
  success_url: `${frontendOrigin}/spaces/${params.space_id}/booking-success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${frontendOrigin}/bookings?canceled=true&booking_id=${params.booking_id}`,
});
```

---

### Phase 2: Database Update for `total_price` Storage

**Issue:** Currently `total_price` in bookings stores the **base price** (€100), not the total charged. We need to clarify this semantic.

**Decision:** Keep `total_price` as BASE PRICE (what host set). The Pricing Engine calculates the rest dynamically.

**Add New Migration** to ensure booking has `base_price` column (or rename for clarity):
```sql
-- Add comment to clarify semantics
COMMENT ON COLUMN public.bookings.total_price IS 
  'Base price set by host (before fees). Guest pays more, Host receives less.';
```

---

### Phase 3: Fix `validate-payment` Function

**File:** `supabase/functions/validate-payment/index.ts`

**Current Issues:**
1. ✅ Import is correct (`../_shared/error-handler.ts`)
2. ✅ No `workspaces` references
3. ⚠️ Missing `base_amount` handling from metadata

**Add Fallback for `base_amount`:**
```typescript
// If metadata missing base_amount, calculate from session amount
let baseAmount: number;
if (session.metadata?.base_amount) {
  baseAmount = parseFloat(session.metadata.base_amount);
} else {
  // Reverse-engineer from amount_total (not ideal but prevents crash)
  // totalGuestPay = basePrice * 1.061 (5% fee + 22% VAT on fee)
  baseAmount = (session.amount_total || 0) / 100 / 1.061;
}
```

---

### Phase 4: Update `upsertPayment` Function

Store the breakdown in the payments table:

```typescript
async function upsertPayment(params: {
  booking_id: string;
  user_id: string;
  amount: number;        // Total charged (cents)
  currency: string;
  host_amount: number;   // Host payout (euros)
  platform_fee: number;  // Platform revenue (euros)
  // ... other fields
}) {
  const insert = {
    booking_id: params.booking_id,
    user_id: params.user_id,
    amount: params.amount / 100,  // Convert to euros
    currency: params.currency,
    host_amount: params.host_amount,
    platform_fee: params.platform_fee,
    // ... 
  };
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/create-checkout-v3/index.ts` | Import PricingEngine, add Stripe Connect params, add metadata |
| `supabase/functions/validate-payment/index.ts` | Add fallback for missing base_amount |
| `supabase/migrations/XXXXXX_clarify_total_price.sql` | Add column comment for clarity |

---

## Stripe Connect Requirements

**Prerequisites for this to work:**
1. Hosts must have a connected Stripe account (`stripe_account_id` in profiles)
2. The platform Stripe account must be in "destination charges" mode
3. `STRIPE_SECRET_KEY` must be the platform's secret key

**Current State Check:**
- Hosts DO have `stripe_account_id` stored ✓
- `stripe_connected` flag exists ✓
- We need to use `payment_intent_data.transfer_data.destination` for split payments

---

## Verification Steps

After implementation:
1. Create a test booking for €100
2. Verify Stripe Checkout shows €106.10 as total
3. Complete payment
4. Check Stripe Dashboard:
   - Payment: €106.10
   - Application Fee: €11.10
   - Transfer to Host: €95.00
5. Check `payments` table:
   - `amount`: 106.10
   - `host_amount`: 95.00
   - `platform_fee`: 11.10

---

## Edge Cases Handled

| Scenario | Handling |
|----------|----------|
| Low value booking (€5) | Guest Fee floor of €0.50 applies |
| Host Stripe not connected | RPC already blocks booking creation |
| Missing base_amount in webhook | Fallback calculation from total |
| Duplicate webhook events | Existing idempotency check via `stripe_event_id` |

---

## Summary

This implementation:
1. **Activates the Pricing Engine** in checkout
2. **Enables Stripe Connect** for automatic payment splits
3. **Fixes metadata** for webhook processing
4. **Adds resilience** with fallback calculations
5. **Generates €11.10 platform revenue** per €100 booking (vs. €0 currently)
