

# HOTFIX: Debug Silent DB Upsert Failure

## Root Cause Analysis

The error `"Payment not found after upsert"` is misleading. The actual failure occurs in `getPaymentBySessionId()` which uses an `INNER JOIN` to `bookings`:

```typescript
// enhanced-payment-service.ts lines 57-70
.select(`
  *,
  bookings!inner (...)  // ← INNER JOIN fails if booking doesn't exist!
`)
```

If the `booking_id` in metadata references a non-existent booking, the JOIN returns 0 rows even if the payment was inserted successfully.

---

## Proposed Fix: Expose the REAL Database Error

### Fix 1: Add Pre-Flight Validation for `booking_id`

**File:** `supabase/functions/stripe-webhooks/handlers/enhanced-checkout-handlers.ts`

**Location:** After line 54 (after extracting `bookingId`)

Add explicit validation that `booking_id` exists in the database before attempting any upsert:

```typescript
const bookingId = session.metadata!.booking_id;

// CRITICAL: Validate booking exists BEFORE upsert
if (!bookingId) {
  ErrorHandler.logError('CRITICAL: Missing booking_id in metadata', {
    sessionId: session.id,
    metadata: session.metadata
  });
  return { success: false, error: 'Missing booking_id in Stripe metadata' };
}

const { data: bookingExists, error: bookingCheckError } = await supabaseAdmin
  .from('bookings')
  .select('id, status')
  .eq('id', bookingId)
  .maybeSingle();

if (bookingCheckError) {
  ErrorHandler.logError('CRITICAL: Database error checking booking existence', {
    bookingId,
    error: bookingCheckError.message,
    code: bookingCheckError.code
  });
  return { success: false, error: `DB Error: ${bookingCheckError.message} (Code: ${bookingCheckError.code})` };
}

if (!bookingExists) {
  ErrorHandler.logError('CRITICAL: Booking not found in database', {
    bookingId,
    sessionId: session.id
  });
  return { success: false, error: `Booking ${bookingId} not found in database` };
}

ErrorHandler.logInfo('Booking validated', { bookingId, status: bookingExists.status });
```

### Fix 2: Enhance `getPaymentBySessionId` Error Logging

**File:** `supabase/functions/stripe-webhooks/services/enhanced-payment-service.ts`

**Location:** Lines 74-78

Expose the actual Supabase error details:

```typescript
if (error) {
  ErrorHandler.logError('Error fetching payment by session ID', {
    sessionId,
    errorMessage: error.message,
    errorCode: error.code,
    errorDetails: error.details,
    errorHint: error.hint
  });
  return null;
}
```

### Fix 3: Add Fallback Query Without JOIN

If the `bookings!inner` join fails, retry with a simple query to isolate the issue:

```typescript
// If join query fails, try a simple query to check if payment exists at all
if (error) {
  ErrorHandler.logError('Join query failed, trying simple payment fetch', { sessionId });
  
  const { data: simpleData, error: simpleError } = await supabaseAdmin
    .from('payments')
    .select('id, booking_id, stripe_session_id')
    .eq('stripe_session_id', sessionId)
    .maybeSingle();
    
  if (simpleData) {
    ErrorHandler.logError('Payment EXISTS but booking join failed', {
      paymentId: simpleData.id,
      bookingId: simpleData.booking_id
    });
  } else {
    ErrorHandler.logError('Payment truly not found after upsert', {
      sessionId,
      simpleError: simpleError?.message
    });
  }
  return null;
}
```

---

## Files to Modify

| File | Change | Priority |
|:-----|:-------|:---------|
| `enhanced-checkout-handlers.ts` | Add pre-flight validation for `booking_id` before upsert | **CRITICAL** |
| `enhanced-payment-service.ts` | Expose full error details in `getPaymentBySessionId` | **HIGH** |

---

## Deployment Plan

1. Apply fixes to both files
2. Deploy `stripe-webhooks` edge function
3. Trigger a test webhook to verify error details are now exposed
4. Use the exposed error to identify the true root cause

---

## Expected Output After Fix

When the error occurs, logs will now show:

```json
{
  "context": "Error fetching payment by session ID",
  "sessionId": "cs_test_xxx",
  "errorMessage": "...",
  "errorCode": "PGRST116",
  "errorDetails": "..."
}
```

Or if booking is missing:

```json
{
  "context": "CRITICAL: Booking not found in database",
  "bookingId": "uuid-xxx",
  "sessionId": "cs_test_xxx"
}
```

This will reveal whether the issue is:
- FK constraint violation
- Booking deleted/rolled back
- RLS policy blocking access
- Other database error

