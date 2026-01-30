

# Fix Plan: Auto-Confirm Bug & QR Code Display

## Root Cause Analysis

After tracing the code and logs, I've identified **TWO critical bugs**:

### Bug 1: Undefined Variable in Webhook (CRITICAL)
**File:** `supabase/functions/stripe-webhooks/handlers/enhanced-checkout-handlers.ts`  
**Line 272:** Uses undefined variable `newStatus` in success message

```typescript
return { 
  success: true, 
  message: `Checkout session processed successfully. Booking ${newStatus}.`  // ← CRASH!
};
```

The variable `targetBookingStatus` exists, but `newStatus` does not. This causes the webhook to crash AFTER the booking update succeeds, leading to Stripe retries and potential duplicate processing.

### Bug 2: Payment Status Race Condition in validate-payment (CRITICAL)
**File:** `supabase/functions/validate-payment/index.ts`  
**Lines 142-148:** ALWAYS sets payment to `succeeded` FIRST, even for Request to Book

```typescript
// Line 145-146 (runs for ALL bookings)
payment_status: 'completed',
payment_status_enum: 'succeeded',  // ← Triggers guard_confirm_without_success to allow confirmation!
```

Then only AFTER this (lines 168-173), it corrects back to `pending` for Request to Book. But during that window, concurrent processes may see `succeeded` and allow confirmation.

---

## Evidence from Logs

| Timestamp | Event | Status |
|:----------|:------|:-------|
| 10:33:07 | Webhook sets booking to `pending_approval` | ✓ |
| 10:33:09 | Webhook crashes: `newStatus is not defined` | ✗ |
| 10:33:19 | validate-payment sets payment to `succeeded` | Briefly |
| 10:33:19 | validate-payment corrects payment to `pending` | Too late |
| 10:33:19 | Booking updated_at | Status: `confirmed` |

The booking's `updated_at` (10:33:19.740362) is BEFORE the payment's `updated_at` (10:33:19.783345), confirming the race condition.

---

## Technical Fixes

### Fix 1: Replace Undefined Variable (Backend)
**File:** `supabase/functions/stripe-webhooks/handlers/enhanced-checkout-handlers.ts`  
**Line 272:** Replace `newStatus` with `targetBookingStatus`

```typescript
// BEFORE
return { 
  success: true, 
  message: `Checkout session processed successfully. Booking ${newStatus}.`
};

// AFTER
return { 
  success: true, 
  message: `Checkout session processed successfully. Booking ${targetBookingStatus}.`
};
```

### Fix 2: Conditional Payment Status Logic (Backend)
**File:** `supabase/functions/validate-payment/index.ts`  
**Lines 140-160:** Set correct payment status IMMEDIATELY based on confirmation type, NOT after

```typescript
// BEFORE (lines 142-148)
const { error: updateError } = await supabaseAdmin
  .from('payments')
  .update({
    payment_status: 'completed',       // Always 'completed'
    payment_status_enum: 'succeeded',  // Always 'succeeded'
    receipt_url: session.receipt_url
  })
  .eq('id', existingPayment.id);

// AFTER
const correctPaymentStatus = isRequestToBook ? 'pending' : 'completed';
const correctPaymentStatusEnum = isRequestToBook ? 'pending' : 'succeeded';

const { error: updateError } = await supabaseAdmin
  .from('payments')
  .update({
    payment_status: correctPaymentStatus,
    payment_status_enum: correctPaymentStatusEnum,
    receipt_url: session.receipt_url
  })
  .eq('id', existingPayment.id);
```

**Also update lines 117-128** (the INSERT path for fallback):

```typescript
// BEFORE (lines 122-123)
payment_status: 'completed',
payment_status_enum: 'succeeded',

// AFTER
payment_status: isRequestToBook ? 'pending' : 'completed',
payment_status_enum: isRequestToBook ? 'pending' : 'succeeded',
```

### Fix 3: Remove Redundant Correction Block
**Lines 164-186** can be simplified since payment status is now set correctly upfront. Keep only the logging:

```typescript
if (isRequestToBook) {
  ErrorHandler.logSuccess('Request to Book - payment authorized, booking pending_approval', {
    booking_id: session.metadata.booking_id,
    payment_status: 'pending'
  });
  // No database update needed - already set correctly above
} else {
  // Instant Book: confirm booking
  const { error: bookingError } = await supabaseAdmin
    .from('bookings')
    .update({
      status: 'confirmed',
      updated_at: new Date().toISOString()
    })
    .eq('id', session.metadata.booking_id);
  // ... error handling
}
```

### Fix 4: QR Code Guard Already Correct
**File:** `src/components/bookings/checkin/BookingQRCode.tsx`  
**Lines 18-21:** Already correctly guards with `status === 'confirmed'`

```typescript
const isConfirmed = status === 'confirmed';
if (!isConfirmed || !isBookingToday) {
  return null;
}
```

No changes needed - the QR code will correctly hide once the backend stops auto-confirming.

---

## Summary of Changes

| File | Change | Priority |
|:-----|:-------|:---------|
| `enhanced-checkout-handlers.ts` (line 272) | Fix undefined `newStatus` → `targetBookingStatus` | CRITICAL |
| `validate-payment/index.ts` (lines 122-123) | Set correct payment status based on `isRequestToBook` in INSERT | CRITICAL |
| `validate-payment/index.ts` (lines 145-146) | Set correct payment status based on `isRequestToBook` in UPDATE | CRITICAL |
| `validate-payment/index.ts` (lines 168-186) | Remove redundant correction block (now handled upfront) | HIGH |
| `BookingQRCode.tsx` | No change needed - guard already correct | N/A |

---

## Deployment Order

1. Deploy `stripe-webhooks` (fix undefined variable crash)
2. Deploy `validate-payment` (fix race condition)
3. Test with a new Request to Book transaction

---

## Expected Behavior After Fix

| Flow Type | Payment Status | Booking Status | QR Code |
|:----------|:---------------|:---------------|:--------|
| **Request to Book** | `pending` (authorized) | `pending_approval` | Hidden |
| **Instant Book** | `succeeded` (captured) | `confirmed` | Visible (if today) |

