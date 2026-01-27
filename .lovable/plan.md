
# HOTFIX: Host Workflow & Automated Expiration (Gold Standard)

## Executive Summary

Two critical issues need resolution:
1. **host-reject-booking Edge Function is MISSING** - The frontend calls it but it doesn't exist (404)
2. **host-approve-booking exists** but we should verify it's deployed and hardened
3. **Expiration logic exists** via `booking-expiry-check` function with pg_cron, but needs verification

---

## Action Consequence Matrix (Verified Behavior)

| Host Action | Current Time vs Booking Time | Resulting Status | Stripe Action | Refund/Capture? |
|:------------|:-----------------------------|:-----------------|:--------------|:----------------|
| **Accept** | Future | `confirmed` | `stripe.paymentIntents.capture(pi_xxx)` | ✅ Host Paid |
| **Reject** | Future | `cancelled` | `stripe.paymentIntents.cancel(pi_xxx)` | ↩️ Full Refund (Release) |
| **Ignore** | Past (Expired) | `cancelled` | `stripe.paymentIntents.cancel(pi_xxx)` | ↩️ Full Refund (Release) |

---

## Current State Analysis

### 1. host-approve-booking (EXISTS ✅)
- Located at: `supabase/functions/host-approve-booking/index.ts`
- Uses `service_role` key correctly
- Captures payment via `stripe.paymentIntents.capture(pi.id)`
- Has compensating transaction (refund on DB failure)
- Status check: `status === 'pending_approval'` ✅

### 2. host-reject-booking (MISSING ❌)
- **File does not exist**: `supabase/functions/host-reject-booking/index.ts`
- Frontend hook `useRejectBooking` calls this function
- Results in 404 error when hosts try to reject

### 3. booking-expiry-check (EXISTS ✅)
- Located at: `supabase/functions/booking-expiry-check/index.ts`
- Already handles:
  - `pending_approval` where `approval_deadline < NOW()` → Cancels + releases Stripe auth
  - `pending_payment` where `payment_deadline < NOW()` → Cancels booking
  - `pending` with expired `slot_reserved_until` → Cancels booking
- Uses `stripe.paymentIntents.cancel(pi.id)` to release holds
- Scheduled via pg_cron every 5 minutes

---

## Implementation Plan

### Phase 1: Create host-reject-booking Edge Function (CRITICAL)

**File:** `supabase/functions/host-reject-booking/index.ts`

This function will:
1. Authenticate the calling host
2. Verify they own the space attached to the booking
3. Check booking status is `pending_approval`
4. **Release Stripe authorization** via `stripe.paymentIntents.cancel(pi_xxx)`
5. Update booking status to `cancelled`
6. Send notification to coworker

**Logic Flow:**
```text
Host Clicks Reject
     ↓
Auth Validation (service_role for DB, user token for identity)
     ↓
Fetch Booking + Space (verify host_id matches user.id)
     ↓
Status Check (must be 'pending_approval')
     ↓
Stripe: Cancel Payment Intent (releases held funds)
     ↓
DB: Update status = 'cancelled', cancellation_reason
     ↓
Notify Coworker (via send-booking-notification)
     ↓
Return Success
```

**Code Structure (matching host-approve-booking pattern):**
```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@15.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // 1. CORS
  // 2. Auth validation
  // 3. Get booking_id + reason from body
  // 4. Fetch booking with stripe_payment_intent_id
  // 5. Fetch space to verify host_id
  // 6. Check booking.status === 'pending_approval'
  // 7. Stripe: Cancel PaymentIntent (release funds)
  // 8. DB: Update booking to 'cancelled'
  // 9. Notify coworker
  // 10. Return success
});
```

### Phase 2: Update config.toml

**File:** `supabase/config.toml`

Add configuration for the new function:
```toml
[functions.host-reject-booking]
verify_jwt = true
```

### Phase 3: UI Guard Enhancement (Optional)

**File:** `src/components/bookings/SmartBookingActions.tsx`

Add time-based guard to disable approve/reject buttons if booking is in the past:

```typescript
import { isPast, parseISO } from 'date-fns';

// Inside component
const bookingEndDateTime = parseISO(`${booking.booking_date}T${booking.end_time}`);
const isBookingPast = isPast(bookingEndDateTime);

// In JSX, disable buttons
<Button 
  onClick={handleApprove}
  disabled={isApproving || isBookingPast}
>
  {isBookingPast ? 'Scaduta' : isApproving ? 'Approvo...' : 'Approva'}
</Button>
```

---

## Technical Details

### host-reject-booking Implementation

**Input:**
```json
{
  "booking_id": "uuid",
  "reason": "Date non disponibili"
}
```

**Output (Success):**
```json
{
  "success": true,
  "booking_id": "uuid",
  "stripe_cancelled": true
}
```

**Output (Error):**
```json
{
  "error": "Booking not found" | "Unauthorized" | "Invalid status"
}
```

**Stripe API Call:**
```typescript
// Release held funds back to customer
await stripe.paymentIntents.cancel(paymentIntentId);
```

**Key Differences from host-approve-booking:**
| Aspect | host-approve-booking | host-reject-booking |
|--------|---------------------|---------------------|
| Stripe Action | `paymentIntents.capture()` | `paymentIntents.cancel()` |
| New Status | `confirmed` | `cancelled` |
| Notification Type | `confirmation` | `rejection` |
| Money Flow | Platform captures funds → Host payout | Funds released to coworker |

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/host-reject-booking/index.ts` | **CREATE** | Handle rejection + Stripe release |
| `supabase/config.toml` | MODIFY | Add function config |
| `src/components/bookings/SmartBookingActions.tsx` | MODIFY (Optional) | Add isPast guard |

---

## Existing Expiration Logic Verification

The `booking-expiry-check` function already handles:

1. **Expired Approval Requests:**
   ```sql
   status = 'pending_approval' AND approval_deadline <= NOW()
   ```
   - Releases Stripe auth via `stripe.paymentIntents.cancel()`
   - Updates status to `cancelled`
   - Notifies coworker

2. **Expired Payment Deadlines:**
   ```sql
   status = 'pending_payment' AND payment_deadline <= NOW()
   ```
   - Updates status to `cancelled`
   - Notifies both parties

3. **Expired Slot Reservations:**
   ```sql
   status = 'pending' AND slot_reserved_until <= NOW()
   ```
   - Updates status to `cancelled`
   - Notifies coworker

**Cron Schedule:** Every 5 minutes via pg_cron

---

## Deployment Steps

1. Create `supabase/functions/host-reject-booking/index.ts`
2. Update `supabase/config.toml` to include the function
3. Deploy both `host-approve-booking` and `host-reject-booking`
4. (Optional) Update SmartBookingActions UI with isPast guard

---

## Verification Checklist

After implementation:
- [ ] Host can reject a `pending_approval` booking
- [ ] Stripe PaymentIntent is cancelled (funds released)
- [ ] Booking status changes to `cancelled`
- [ ] Coworker receives rejection notification
- [ ] Expired bookings are auto-cancelled by cron
- [ ] Past bookings show disabled buttons (if UI guard added)
