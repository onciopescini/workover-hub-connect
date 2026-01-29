

# DEEP ARCHITECTURAL SCAN & LOGIC REPAIR

## Executive Summary

The audit reveals **THREE critical bugs** causing "Request to Book" flows to be wrongfully auto-confirmed:

| Component | Bug | Severity |
|:----------|:----|:---------|
| `create-checkout-v3` | Missing `confirmation_type` in Stripe metadata | **CRITICAL** |
| `validate-payment` | Always sets `status: 'confirmed'` (ignores confirmation type) | **CRITICAL** |
| `BookingSuccess.tsx` | Always shows "Pagamento completato!" (no Request to Book state) | **HIGH** |

---

## Phase 1: Deep Scan Results

### Checkpoint 1: Booking Creation (`create-checkout-v3`)

**Finding: `confirmation_type` NOT included in Stripe metadata**

```typescript
// Current Code (Lines 176-181) - MISSING confirmation_type
body.append("metadata[booking_id]", params.booking_id);
body.append("metadata[user_id]", params.user_id);
body.append("metadata[base_amount]", String(params.basePrice));
body.append("metadata[host_net_payout]", String(params.hostPayout));
body.append("metadata[total_platform_fee]", String(params.platformFee));
// ← confirmation_type NOT SENT! Webhook cannot branch.
```

The `confirmationType` is available in `params.confirmationType` (Line 161, 305) but **never appended to metadata**.

**Evidence**: Search for `metadata[confirmation_type` returns 0 matches.

---

### Checkpoint 2: Webhook Processing (`enhanced-checkout-handlers.ts`)

**Finding: Handler correctly checks for `confirmation_type`, but it's always `undefined`**

```typescript
// Lines 79-83 - Logic is CORRECT but metadata.confirmation_type is UNDEFINED
const isManualCapture = session.metadata?.confirmation_type === 'host_approval' ||
                        session.metadata?.capture_method === 'manual';

// Result: isManualCapture is ALWAYS false because metadata lacks confirmation_type
```

**Downstream Effect**: 
- `paymentStatusEnum` always = `'succeeded'` (wrong for Request to Book)
- `newStatus` always = `'confirmed'` (Line 188 - but only if the DB lookup doesn't override)

Wait - let me check Line 186-188 more carefully:

```typescript
// Line 186 - THIS fetches from DB, not metadata!
const confirmationType = booking.spaces.confirmation_type;
// Line 188
const newStatus = confirmationType === 'instant' ? 'confirmed' : 'pending_approval';
```

**AH!** The webhook DOES check `booking.spaces.confirmation_type` from the **database join** (Line 186), NOT from metadata. So the newStatus branching IS working correctly!

**BUT** - The `paymentStatusEnum` logic (Lines 79-83) uses **metadata**, which is missing. So `payment_status_enum` is wrongly set to `'succeeded'` instead of `'pending'`.

---

### Checkpoint 3: Frontend Verification (`validate-payment`)

**Finding: CRITICAL BUG - Always auto-confirms regardless of type**

```typescript
// Lines 147-154 - HARDCODED TO 'confirmed'
const { error: bookingError } = await supabaseAdmin
  .from('bookings')
  .update({
    status: 'confirmed',  // ← WRONG! Should branch on confirmation_type
    updated_at: new Date().toISOString()
  })
  .eq('id', session.metadata.booking_id);
```

**This is THE primary bug**. When the user lands on BookingSuccess and triggers `usePaymentVerification` → `validate-payment`, this function unconditionally sets `status: 'confirmed'`, **overwriting** the webhook's correct `pending_approval` status.

**Race Condition**: If `validate-payment` runs AFTER the webhook, it overwrites `pending_approval` → `confirmed`.

---

### Checkpoint 4: UI (`BookingSuccess.tsx`)

**Finding: No differentiation for Request to Book**

```typescript
// Lines 102-115 - Always shows "Pagamento completato!"
<h1>{isLoading ? 'Verifica pagamento...' : 'Pagamento completato!'}</h1>

{isSuccess && !isLoading && (
  <p>La tua prenotazione è stata confermata...</p>
)}
```

No branching for `pending_approval` / "Request Sent to Host" state.

---

## Phase 2: The Resolution

### Fix 1: Add `confirmation_type` to Stripe Metadata

**File**: `supabase/functions/create-checkout-v3/index.ts`

**Location**: After line 181

```typescript
// Add confirmation_type to metadata for webhook processing
body.append("metadata[confirmation_type]", params.confirmationType);
```

This enables the webhook to correctly determine `isManualCapture`.

---

### Fix 2: Fix `validate-payment` to Respect Confirmation Type

**File**: `supabase/functions/validate-payment/index.ts`

**Current (Lines 147-154)**:
```typescript
// ALWAYS sets 'confirmed' - WRONG
await supabaseAdmin
  .from('bookings')
  .update({ status: 'confirmed', ... })
  .eq('id', session.metadata.booking_id);
```

**Fixed**:
```typescript
// Get confirmation_type from metadata or fetch from booking
const confirmationType = session.metadata?.confirmation_type;
const isRequestToBook = confirmationType === 'host_approval';

// For manual capture (Request to Book), payment is AUTHORIZED not CAPTURED
// Stripe still reports payment_status: 'paid' for authorized payments
if (isRequestToBook) {
  // Request to Book: Payment authorized, booking awaits host approval
  // Update payment to 'pending' (authorized but not captured)
  const { error: paymentError } = await supabaseAdmin
    .from('payments')
    .update({
      payment_status: 'pending',
      payment_status_enum: 'pending',
    })
    .eq('stripe_session_id', session_id);
    
  // Keep booking as 'pending_approval' (don't change status)
  // The webhook should have already set this correctly
  ErrorHandler.logInfo('Request to Book - keeping pending_approval status', {
    booking_id: session.metadata.booking_id
  });
} else {
  // Instant Book: Payment captured, confirm booking
  // (existing INSERT/UPDATE logic for payment with 'succeeded')
  // ...existing payment upsert code...
  
  // Confirm booking
  await supabaseAdmin
    .from('bookings')
    .update({ status: 'confirmed', updated_at: new Date().toISOString() })
    .eq('id', session.metadata.booking_id);
}
```

**Key Logic**:
- **Instant Book**: `payment_status_enum = 'succeeded'`, `booking.status = 'confirmed'`
- **Request to Book**: `payment_status_enum = 'pending'`, `booking.status = 'pending_approval'` (no change)

---

### Fix 3: Fix `enhanced-checkout-handlers.ts` Status Determination

**File**: `supabase/functions/stripe-webhooks/handlers/enhanced-checkout-handlers.ts`

**Current (Lines 79-83)**:
```typescript
// Uses metadata (which is undefined) - falls back incorrectly
const isManualCapture = session.metadata?.confirmation_type === 'host_approval' ||
                        session.metadata?.capture_method === 'manual';
```

**Fixed** (after Fix 1 is deployed, metadata will have `confirmation_type`):
```typescript
// After Fix 1, this will work correctly because metadata.confirmation_type is set
const isManualCapture = session.metadata?.confirmation_type === 'host_approval';
```

But as a **safety fallback**, also check the DB join result:
```typescript
// Line 186 already fetches from DB
const confirmationType = booking.spaces.confirmation_type;
// Use BOTH sources (metadata and DB) for redundancy
const isManualCapture = session.metadata?.confirmation_type === 'host_approval' ||
                        confirmationType === 'host_approval';
```

---

### Fix 4: Update `BookingSuccess.tsx` for Request to Book State

**File**: `src/pages/BookingSuccess.tsx`

**Add**: Hook to fetch booking status and differentiate messaging

```typescript
// Add hook to get booking status
const [bookingStatus, setBookingStatus] = useState<string | null>(null);

// After verification, fetch the actual booking status
useEffect(() => {
  if (isSuccess && sessionId) {
    // Fetch booking to get actual status
    const fetchBookingStatus = async () => {
      const { data } = await supabase.functions.invoke('validate-payment', {
        body: { session_id: sessionId, status_only: true }
      });
      setBookingStatus(data?.booking_status || 'confirmed');
    };
    fetchBookingStatus();
  }
}, [isSuccess, sessionId]);

// Update UI to branch on status
{isSuccess && !isLoading && bookingStatus === 'pending_approval' && (
  <div className="space-y-4">
    <h1 className="text-2xl font-bold">Richiesta inviata!</h1>
    <p className="text-muted-foreground">
      La tua richiesta è stata inviata all'host. Riceverai una notifica quando 
      l'host approverà la tua prenotazione.
    </p>
    ...
  </div>
)}

{isSuccess && !isLoading && bookingStatus === 'confirmed' && (
  <div className="space-y-4">
    <h1 className="text-2xl font-bold">Pagamento completato!</h1>
    <p className="text-muted-foreground">
      La tua prenotazione è stata confermata. Riceverai una email di conferma a breve.
    </p>
    ...
  </div>
)}
```

**Alternative simpler approach**: Use the metadata `confirmation_type` passed via URL param:
1. In `create-checkout-v3` success_url, add `&type={confirmation_type}`
2. In BookingSuccess, read `type` from searchParams to determine messaging

---

## Phase 3: Logic Truth Matrix

After implementing all fixes:

| Scenario | Initial DB Status | Capture Method | Webhook Outcome (DB) | `validate-payment` Outcome | UI Message |
|:---------|:------------------|:---------------|:---------------------|:---------------------------|:-----------|
| **Instant Book** | `pending_payment` | `automatic` | `payment_status_enum: succeeded`, `status: confirmed` | No change (already confirmed) | "Pagamento completato!" |
| **Request to Book** | `pending_approval` | `manual` | `payment_status_enum: pending`, `status: pending_approval` | No change (respects type) | "Richiesta inviata all'host!" |

---

## Files to Modify

| File | Change | Priority |
|:-----|:-------|:---------|
| `supabase/functions/create-checkout-v3/index.ts` | Add `metadata[confirmation_type]` | **CRITICAL** |
| `supabase/functions/validate-payment/index.ts` | Branch on `confirmation_type`, don't auto-confirm Request to Book | **CRITICAL** |
| `supabase/functions/stripe-webhooks/handlers/enhanced-checkout-handlers.ts` | Add DB fallback for `isManualCapture` | **MEDIUM** |
| `src/pages/BookingSuccess.tsx` | Differentiate "Request Sent" vs "Confirmed" UI | **HIGH** |
| `src/hooks/usePaymentVerification.ts` | Return `booking_status` for UI branching | **HIGH** |

---

## Deployment Order

1. Deploy `create-checkout-v3` (metadata fix)
2. Deploy `validate-payment` (branching logic)
3. Deploy `stripe-webhooks` (handlers update)
4. Deploy frontend changes (BookingSuccess UI)

---

## Technical Summary

| Root Cause | Impact | Fix |
|:-----------|:-------|:----|
| Missing `confirmation_type` in metadata | Webhook can't determine flow type | Add to metadata in checkout |
| `validate-payment` hardcodes `confirmed` | Overwrites `pending_approval` | Branch on `confirmation_type` |
| UI shows same message for both flows | User confusion | Show "Request Sent" for host_approval |

