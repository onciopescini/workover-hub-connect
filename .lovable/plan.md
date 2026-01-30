

# COMPLETE WEBHOOK REPAIR - SCHEMA + LOGIC + FRONTEND POLLING

## Summary of Findings

After reviewing the current code, I found:

1. **Schema Bug (Line 66)**: `enhanced-payment-service.ts` uses `title:name` but the column is just `title`
2. **Booking Status Logic**: The code at lines 228-230 DOES branch correctly based on `confirmationType`, BUT there's a potential issue where the payment status correction logic (lines 237-246) only updates the `paymentStatusEnum` variable but does NOT update the database with the corrected values
3. **Frontend**: No retry mechanism - fails immediately if webhook hasn't finished

---

## ACTION 1: Fix Schema Mismatch

**File:** `supabase/functions/stripe-webhooks/services/enhanced-payment-service.ts`

**Line 66:** Change `title:name` to `title`

```typescript
// CURRENT (Line 64-69)
spaces!inner (
  id,
  title:name,  // ← "name" column doesn't exist!
  host_id,
  confirmation_type
)

// FIXED
spaces!inner (
  id,
  title,  // ← Correct column name
  host_id,
  confirmation_type
)
```

---

## ACTION 2: Override Booking Status Logic (MANDATORY)

**File:** `supabase/functions/stripe-webhooks/handlers/enhanced-checkout-handlers.ts`

### Problem Identified

Looking at lines 237-246, there's a logic flaw:

```typescript
// Current code (lines 237-246)
if (isManualCapture && paymentStatusEnum === 'succeeded') {
  paymentStatusEnum = 'pending';  // ← Updates LOCAL variable
  paymentStatus = 'pending';      // ← Updates LOCAL variable
  // BUT DOESN'T UPDATE THE DATABASE!
}
```

The correction happens AFTER the payment has already been saved to the database (lines 145-201). The corrected values are never written back!

### Solution: Move Status Determination BEFORE Database Upsert

Refactor to determine the FINAL status values BEFORE any database operations:

```typescript
// STEP 1: Get confirmation_type from metadata
const metadataConfirmationType = session.metadata?.confirmation_type;

// STEP 2: Pre-flight check - validate booking exists and get DB confirmation_type
const { data: bookingWithSpace, error: bookingCheckError } = await supabaseAdmin
  .from('bookings')
  .select('id, status, space_id, spaces!inner(confirmation_type)')
  .eq('id', bookingId)
  .maybeSingle();

// STEP 3: Determine isManualCapture using BOTH sources (metadata + DB)
const dbConfirmationType = bookingWithSpace?.spaces?.confirmation_type;
const isManualCapture = metadataConfirmationType === 'host_approval' || 
                        dbConfirmationType === 'host_approval';

// STEP 4: Set FINAL status values BEFORE upsert
const paymentStatusEnum = isManualCapture ? 'pending' : 'succeeded';
const paymentStatus = isManualCapture ? 'pending' : 'completed';
const targetBookingStatus = isManualCapture ? 'pending_approval' : 'confirmed';

// STEP 5: Use these FINAL values in all database operations
```

### Specific Code Changes

**Lines 116-133 (Status Determination)** - Enhance to fetch DB confirmation_type early:

```typescript
// CRITICAL: Determine confirmation type from BOTH sources
const metadataConfirmationType = session.metadata?.confirmation_type;

// Fetch DB confirmation_type as part of booking validation (already done at line 66-70)
// Enhance the query to include spaces.confirmation_type
const { data: bookingWithSpace, error: bookingCheckError } = await supabaseAdmin
  .from('bookings')
  .select('id, status, space_id, spaces!inner(confirmation_type)')
  .eq('id', bookingId)
  .maybeSingle();

const dbConfirmationType = bookingWithSpace?.spaces?.confirmation_type;

// Use EITHER source - metadata takes precedence, DB is fallback
const isManualCapture = metadataConfirmationType === 'host_approval' || 
                        dbConfirmationType === 'host_approval';

// FINAL STATUS VALUES - determined ONCE, used everywhere
const paymentStatusEnum = isManualCapture ? 'pending' : 'succeeded';
const paymentStatus = isManualCapture ? 'pending' : 'completed';
const targetBookingStatus = isManualCapture ? 'pending_approval' : 'confirmed';

ErrorHandler.logInfo('FINAL status values determined', {
  sessionId: session.id,
  metadataConfirmationType,
  dbConfirmationType,
  isManualCapture,
  paymentStatusEnum,
  targetBookingStatus
});
```

**Lines 259-265 (Booking Update)** - Use `targetBookingStatus`:

```typescript
// CRITICAL: Use the pre-determined targetBookingStatus
const { error: updateBookingError } = await supabaseAdmin
  .from('bookings')
  .update({
    status: targetBookingStatus,  // ← FORCE THIS STATUS (was: newStatus)
    stripe_payment_intent_id: paymentIntentId || null
  })
  .eq('id', bookingId);
```

**Remove Lines 227-246** - Delete the redundant logic that recalculates status after the fact.

---

## ACTION 3: Frontend Polling with Retry Mechanism

**File:** `src/hooks/usePaymentVerification.ts`

Add exponential backoff retry to handle race conditions where webhook hasn't finished:

```typescript
export const usePaymentVerification = (sessionId: string | null): PaymentVerificationResult => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingStatus, setBookingStatus] = useState<string | null>(null);
  const [confirmationType, setConfirmationType] = useState<string | null>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!sessionId) return;

    const MAX_ATTEMPTS = 5;
    const BASE_DELAY_MS = 1000;

    const verifyPaymentWithRetry = async (attempt: number = 1): Promise<void> => {
      try {
        sreLogger.debug('Verifying payment', { sessionId, attempt, maxAttempts: MAX_ATTEMPTS });

        const { data, error: functionError } = await supabase.functions.invoke('validate-payment', {
          body: { session_id: sessionId }
        });

        if (functionError || !data?.success) {
          // If we have retries left, wait and try again
          if (attempt < MAX_ATTEMPTS) {
            const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1); // Exponential backoff
            sreLogger.debug('Retry scheduled', { attempt, nextAttemptIn: delay });
            await new Promise(resolve => setTimeout(resolve, delay));
            return verifyPaymentWithRetry(attempt + 1);
          }
          // All retries exhausted
          throw new Error(functionError?.message || data?.error || 'Payment verification failed after retries');
        }

        // Success!
        setIsSuccess(true);
        setBookingId(data.booking_id);
        setBookingStatus(data.booking_status || 'confirmed');
        setConfirmationType(data.confirmation_type || 'instant');
        
        // Invalidate booking queries
        queryClient.invalidateQueries({ queryKey: ['enhanced-bookings'] });
        queryClient.invalidateQueries({ queryKey: ['coworker-bookings'] });
        queryClient.invalidateQueries({ queryKey: ['host-bookings'] });
        
        // Show appropriate toast
        const isRequestToBook = data.confirmation_type === 'host_approval';
        if (isRequestToBook) {
          toast.success('Richiesta inviata! L\'host valuterà la tua prenotazione.', { duration: 5000 });
        } else {
          toast.success('Pagamento completato con successo! La tua prenotazione è confermata.', { duration: 5000 });
        }

        sreLogger.info('Payment verification succeeded', { 
          bookingId: data.booking_id,
          bookingStatus: data.booking_status,
          confirmationType: data.confirmation_type,
          attempts: attempt
        });

      } catch (err: unknown) {
        sreLogger.error('Payment verification failed after all retries', { sessionId, attempts: attempt }, err as Error);
        setError(err instanceof Error ? err.message : 'Errore nella verifica del pagamento');
        toast.error('Errore nella verifica del pagamento. Contatta il supporto se il problema persiste.');
      }
    };

    setIsLoading(true);
    setError(null);
    
    verifyPaymentWithRetry()
      .finally(() => setIsLoading(false));

  }, [sessionId, queryClient]);

  return { isLoading, isSuccess, error, bookingId, bookingStatus, confirmationType };
};
```

---

## Files to Modify

| File | Change | Priority |
|:-----|:-------|:---------|
| `enhanced-payment-service.ts` | Fix `title:name` → `title` (line 66) | **CRITICAL** |
| `enhanced-checkout-handlers.ts` | Move status determination BEFORE upsert, use `targetBookingStatus` | **CRITICAL** |
| `usePaymentVerification.ts` | Add retry mechanism with exponential backoff | **HIGH** |

---

## Deployment Order

1. Deploy `stripe-webhooks` (schema + logic fixes)
2. Deploy frontend (retry mechanism)
3. Test with new Request to Book transaction

---

## Confirmation: Logic Override

The key change is replacing the auto-confirm logic with conditional `targetBookingStatus`:

```typescript
// OLD (auto-confirms everything):
const newStatus = confirmationType === 'instant' ? 'confirmed' : 'pending_approval';
// But this was calculated AFTER the payment upsert, and the correction was never saved!

// NEW (strict branching BEFORE any DB ops):
const targetBookingStatus = isManualCapture ? 'pending_approval' : 'confirmed';
// Used directly in the booking update query
```

---

## Expected Audit Matrix (Post-Fix)

| Component | Check | Expected Result |
|:----------|:------|:----------------|
| **Webhook** | DB Error Visibility | ✅ Logs specific SQL error with code/details |
| **Webhook** | Schema Query | ✅ Uses correct `title` column |
| **Webhook** | "Request" Logic | ✅ Sets `pending_approval` + `pending` BEFORE upsert |
| **Frontend** | Race Condition | ✅ Retries up to 5 times with exponential backoff |
| **Host** | Approval Flow | ✅ Already captures funds correctly |

