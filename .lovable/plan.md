
# Implementation Plan: Gold Standard Booking Logic (Service Layer)

## Overview

This refactoring creates a dedicated Service Layer for booking operations, replacing scattered inline Supabase calls with clean, testable API functions. The hook will become a thin orchestrator while all backend communication logic moves to dedicated service modules.

---

## Current Architecture Analysis

### Current Flow (useCheckout.ts)
```text
Component → useCheckout Hook → Direct Supabase Calls
                            ↓
                    1. supabase.rpc('validate_and_reserve_slot')
                    2. supabase.functions.invoke('create-checkout-v3')
```

### Target Flow (Service Layer)
```text
Component → useCheckout Hook → bookingService
                            ↓
              1. reserveSlot() → supabase.rpc()
              2. createCheckoutSession() → native fetch()
```

---

## Implementation Steps

### Step 1: Create Service Layer Directory Structure

Create the following files:

| File | Purpose |
|------|---------|
| `src/services/api/bookingService.ts` | Main booking API functions |
| `src/services/api/index.ts` | Barrel export file |

---

### Step 2: Implement bookingService.ts

The service will export two main functions:

#### 2.1 reserveSlot Function

```typescript
interface ReserveSlotParams {
  spaceId: string;
  userId: string;
  startTime: string;  // ISO string
  endTime: string;    // ISO string
  guests: number;
  confirmationType: 'instant' | 'host_approval';
  clientBasePrice?: number;
}

interface ReserveSlotResult {
  success: boolean;
  bookingId?: string;
  error?: string;
}
```

**Implementation Details:**
- Calls `supabase.rpc('validate_and_reserve_slot')` with mapped parameters
- Handles RPC response parsing (the RPC returns `{ success, booking_id, error }`)
- Maps error codes (e.g., `23P01` → `CONFLICT`)
- Throws typed errors for upstream handling

#### 2.2 createCheckoutSession Function

```typescript
interface CreateCheckoutSessionResult {
  success: boolean;
  url?: string;
  sessionId?: string;
  error?: string;
}
```

**Implementation Details:**
- Uses native `fetch()` instead of `supabase.functions.invoke()` for full header control
- Constructs URL: `https://khtqwzvrxzsgfhsslwyz.supabase.co/functions/v1/create-checkout-v3`
- Required Headers:
  - `Authorization: Bearer <access_token>` (from `supabase.auth.getSession()`)
  - `Idempotency-Key: <uuid>` (generated with `crypto.randomUUID()`)
  - `Content-Type: application/json`
  - `apikey: <anon_key>` (Supabase requires this for edge functions)
- Body: `{ booking_id: string }`
- Parses response and handles error states

---

### Step 3: Refactor useCheckout.ts

The hook will be simplified to:

1. **Remove** all direct Supabase imports and calls
2. **Import** `reserveSlot` and `createCheckoutSession` from bookingService
3. **Maintain** existing interfaces (`CheckoutParams`, `CheckoutResult`)
4. **Keep** date/time preparation logic (using `createBookingDateTime`)

**New Flow:**
```typescript
const processCheckout = async (params) => {
  setIsLoading(true);
  try {
    // 1. Prepare ISO timestamps
    const startIso = createBookingDateTime(dateStr, startTime).toISOString();
    const endIso = createBookingDateTime(dateStr, endTime).toISOString();
    
    // 2. Reserve slot via service
    const reservation = await reserveSlot({
      spaceId, userId, startTime: startIso, endTime: endIso,
      guests: guestsCount, confirmationType, clientBasePrice
    });
    
    if (!reservation.success) {
      return { success: false, error: reservation.error, errorCode: 'RESERVE_FAILED' };
    }
    
    // 3. Create checkout session via service
    const checkout = await createCheckoutSession(reservation.bookingId!);
    
    if (!checkout.success || !checkout.url) {
      return { success: false, error: checkout.error, errorCode: 'CHECKOUT_FAILED' };
    }
    
    // 4. Redirect to Stripe
    window.location.href = checkout.url;
    return { success: true, bookingId: reservation.bookingId };
    
  } catch (err) {
    // Error handling...
  } finally {
    setIsLoading(false);
  }
};
```

---

### Step 4: Update Tests

Replace Supabase mocks with service mocks:

#### Current Test Structure (to remove):
```typescript
jest.mock('@/integrations/supabase/client', () => ({
  supabase: { rpc: jest.fn(), functions: { invoke: jest.fn() } }
}));
```

#### New Test Structure:
```typescript
jest.mock('@/services/api/bookingService', () => ({
  reserveSlot: jest.fn(),
  createCheckoutSession: jest.fn()
}));
```

#### Test Cases to Maintain:
1. **Success flow**: `reserveSlot` succeeds → `createCheckoutSession` succeeds → redirect
2. **Reserve slot failure**: `reserveSlot` returns error → proper error handling
3. **Checkout failure**: `reserveSlot` succeeds but `createCheckoutSession` fails
4. **Network error handling**: Service throws exception
5. **Conflict error (slot already booked)**: Specific error code mapping

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/services/api/bookingService.ts` | **CREATE** | New service layer with `reserveSlot` and `createCheckoutSession` |
| `src/services/api/index.ts` | **CREATE** | Barrel export |
| `src/hooks/checkout/useCheckout.ts` | **MODIFY** | Remove inline Supabase calls, use service layer |
| `src/hooks/checkout/__tests__/useCheckout.test.ts` | **MODIFY** | Mock service instead of Supabase |

---

## Technical Details

### Edge Function API Contract (create-checkout-v3)

Based on analysis of `supabase/functions/create-checkout-v3/index.ts`:

**Request:**
```
POST /functions/v1/create-checkout-v3
Headers:
  - Authorization: Bearer <user_token>
  - Idempotency-Key: <uuid>
  - Content-Type: application/json
  - apikey: <anon_key>
Body: { "booking_id": "<uuid>" }
```

**Success Response (200):**
```json
{
  "idempotent": false,
  "checkout_session": { "id": "cs_xxx", "url": "https://checkout.stripe.com/..." },
  "payment": { "id": "...", "status": "pending", ... }
}
```

**Error Response (4xx/5xx):**
```json
{
  "error": "error_code",
  "details": { ... }
}
```

### Idempotency Key Strategy

The `Idempotency-Key` header ensures that:
- Retried requests don't create duplicate payments
- The same checkout session is returned for the same key
- Must be unique per booking attempt (use `crypto.randomUUID()`)

### Environment Variables Used

The service will use these hardcoded values (as per Lovable guidelines - no VITE_* in service code):
- Supabase URL: `https://khtqwzvrxzsgfhsslwyz.supabase.co`
- Supabase Anon Key: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (from project config)

---

## Error Handling Strategy

| Error Source | Error Type | User Message |
|--------------|------------|--------------|
| RPC `23P01` | `CONFLICT` | "Slot already booked" |
| RPC timeout | `TIMEOUT` | "Server not responding, please retry" |
| Checkout 401 | `UNAUTHORIZED` | "Session expired, please login again" |
| Checkout 400 | `INVALID_REQUEST` | "Invalid booking data" |
| Network error | `NETWORK` | "Connection failed, please check your internet" |

---

## Benefits of This Refactoring

1. **Separation of Concerns**: Hook handles state, service handles API calls
2. **Testability**: Easy to mock service functions independently
3. **Header Control**: Native fetch allows full control over Idempotency-Key
4. **Reusability**: Service can be used by other components/hooks
5. **Error Isolation**: API errors handled in one place
6. **Type Safety**: Strong typing on service interfaces
