
# Day 5: Error Handling & UX Polish - Implementation Plan

## Executive Summary

This task focuses on three areas: (1) fixing remaining build errors from Day 4, (2) standardizing error logging by replacing `console.error` with `sreLogger`, (3) enhancing user feedback with toasts in critical flows, (4) adding dedicated ErrorBoundaries for admin routes, and (5) creating integration tests for the booking service.

---

## Phase 1: Fix Remaining Build Errors (Priority - Blocking)

Before implementing Day 5 features, we must resolve the ~30+ TypeScript build errors from previous days.

### 1.1 Space Form Availability Type Errors

**Files:** `useSpaceFormState.ts`, `useSpaceFormSubmission.ts`

**Issue:** `AvailabilityException.slots` is required (`TimeSlot[]`) but form data has `slots?: ... | undefined`

**Fix:** Normalize exceptions in `handleAvailabilityChange` to ensure `slots` is always an array:

```typescript
// In useSpaceFormState.ts
handleAvailabilityChange: (data: AvailabilityData) => {
  // Normalize exceptions to ensure slots is always an array
  const normalizedData: AvailabilityData = {
    ...data,
    exceptions: data.exceptions.map(ex => ({
      ...ex,
      slots: ex.slots || [] // Ensure slots is never undefined
    }))
  };
  setAvailabilityData(normalizedData);
}
```

### 1.2 AdminStats Interface Mismatch

**File:** `src/lib/admin/admin-stats-utils.ts`

**Issue:** Returns `totalUsers` (camelCase) but `AdminStats` expects `total_users` (snake_case)

**Fix:** Update the return object to use snake_case:

```typescript
return {
  total_users: totalUsers || 0,      // was: totalUsers
  total_hosts: totalHosts || 0,      // was: totalHosts
  total_bookings: totalBookings || 0,
  total_revenue: totalRevenue,
  active_listings: totalSpaces || 0  // was: activeListings
};
```

### 1.3 Missing Admin Type Exports

**File:** `src/types/admin.ts`

**Issue:** `GlobalTag` and `AdminWarning` interfaces are missing from exports

**Fix:** Add missing interfaces:

```typescript
export interface GlobalTag {
  id: string;
  name: string;
  created_at: string;
  approved: boolean;
  approved_by: string | null;
}

export interface AdminWarning {
  id: string;
  user_id: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
}
```

### 1.4 SlotReservationResult exactOptionalPropertyTypes

**File:** `src/lib/booking-reservation-utils.ts`

**Issue:** `reservation_token` and `reserved_until` can be `undefined` but interface expects `string`

**Fix:** Update return statements to handle undefined properly:

```typescript
// Line 115-121
const result: SlotReservationResult = {
  success: true,
  booking_id: data.booking_id,
  reservation_token: data['reservation_token'] as string | undefined,
  reserved_until: data['reserved_until'] as string | undefined
};
```

### 1.5 Conversations Type Errors

**File:** `src/lib/conversations.ts`

**Issue:** `booking_id` missing from message insert, null assignments

**Fix:** Update `sendMessageToConversation` to include optional `booking_id`:

```typescript
type MessageInsertInput = Database['public']['Tables']['messages']['Insert'];

const messageData: Partial<MessageInsertInput> = {
  conversation_id: conversationId,
  content,
  sender_id: senderId
};

if (bookingId) {
  messageData.booking_id = bookingId;
}
```

### 1.6 Chat.ts Insert Error

**File:** `src/lib/chat.ts`

**Issue:** Inserting `booking_id` which may not exist on conversations table

**Fix:** Remove `booking_id` from insert if column doesn't exist, or conditionally add:

```typescript
const insertData: Record<string, unknown> = {};
if (bookingId) {
  insertData.booking_id = bookingId;
}

const { data: newConv, error } = await supabase
  .from('conversations')
  .insert(insertData)
  .select()
  .single();
```

### 1.7 AdminProfile Missing Permissions

**File:** `src/lib/admin/admin-user-utils.ts`

**Issue:** Cast to `AdminProfile[]` fails because `permissions` field is missing

**Fix:** Add permissions mapping:

```typescript
const usersWithRoles = data.map(user => ({
  ...user,
  role: userRolesList[0] || 'coworker',
  roles: userRolesList,
  email: "",
  permissions: [] // Add default empty permissions
}));
```

### 1.8 Rate Limit Index Signature Access

**File:** `src/lib/admin/admin-rate-limit.ts`

**Issue:** Must use bracket notation for index signature properties

**Fix:** Already has `isRateLimitResult` type guard, but access needs bracket notation:

```typescript
// Line 67-72
return {
  allowed: data['allowed'] as boolean,
  remaining: data['remaining'] as number,
  resetMs: data['reset_ms'] as number,
  message: typeof data['message'] === 'string' ? data['message'] : undefined
};
```

---

## Phase 2: Standardize Error Logging in Services

Replace `console.log` and `console.error` with `sreLogger` across all service files.

### 2.1 bookingService.ts

| Line | Current | Replacement |
|------|---------|-------------|
| 70 | `console.log('[BookingService] Calling...')` | `sreLogger.info('Calling validate_and_reserve_slot', { component: 'bookingService', ...rpcParams })` |
| 76 | `console.error('[BookingService] RPC Error')` | `sreLogger.error('RPC error during slot reservation', { component: 'bookingService' }, rpcError)` |
| 96 | `console.error('[BookingService] RPC returned no data')` | `sreLogger.error('RPC returned no data', { component: 'bookingService' })` |
| 110 | `console.log('[BookingService] Reserved slot ID')` | `sreLogger.info('Reserved slot successfully', { component: 'bookingService', bookingId })` |
| 113 | `console.error('[BookingService] Invalid Booking ID')` | `sreLogger.error('Invalid Booking ID format', { component: 'bookingService' })` |
| 141 | `console.error('[BookingService] Session error')` | `sreLogger.error('Session error', { component: 'bookingService' }, sessionError)` |
| 158 | `console.log('[BookingService] Creating checkout')` | `sreLogger.info('Creating checkout session', { component: 'bookingService', bookingId })` |
| 176 | `console.error('[BookingService] Checkout error')` | `sreLogger.error('Checkout error response', { component: 'bookingService', status: response.status })` |
| 209 | `console.error('[BookingService] No checkout URL')` | `sreLogger.error('No checkout URL in response', { component: 'bookingService' })` |
| 217 | `console.log('[BookingService] Checkout session created')` | `sreLogger.info('Checkout session created', { component: 'bookingService', sessionId })` |
| 226 | `console.error('[BookingService] Network error')` | `sreLogger.error('Network error during checkout', { component: 'bookingService' }, error as Error)` |

### 2.2 stripeService.ts

No `console.log/error` calls found - already clean.

### 2.3 adminService.ts

No `console.log/error` calls found - already clean.

---

## Phase 3: Enhance useCheckout with User Feedback

**File:** `src/hooks/checkout/useCheckout.ts`

### Changes Required

1. **Import toast from sonner**
2. **Add toast notifications on errors**
3. **Remove console.log/error statements**

```typescript
import { toast } from 'sonner';
import { sreLogger } from '@/lib/sre-logger';

// Line 73-79: On reservation failure
if (!reservation.success) {
  const errorMessage = reservation.error || 'Reservation failed';
  sreLogger.error('Reservation failed', { 
    component: 'useCheckout',
    spaceId,
    error: errorMessage 
  });
  toast.error(`Prenotazione fallita: ${errorMessage}`);
  return { ... };
}

// Line 82: Remove console.log
// console.log("RESERVED SLOT ID:") -> sreLogger.debug

// Line 89: Remove console.log
// console.log("CHECKOUT PAYLOAD:") -> remove or debug

// Line 94-100: On checkout failure
if (!checkout.success || !checkout.url) {
  const errorMessage = checkout.error || 'No checkout URL';
  sreLogger.error('Checkout failed', { 
    component: 'useCheckout',
    bookingId: reservation.bookingId 
  });
  toast.error(`Pagamento fallito: ${errorMessage}`);
  return { ... };
}

// Line 109-117: On caught exception
catch (err) {
  const caughtError = err instanceof Error ? err : new Error('Unknown error');
  sreLogger.error('Checkout flow failed', { 
    component: 'useCheckout',
    spaceId 
  }, caughtError);
  toast.error(`Errore imprevisto: ${caughtError.message}`);
  return { ... };
}
```

---

## Phase 4: Add Admin-Specific ErrorBoundary

### 4.1 Create AdminErrorBoundary Component

**File:** `src/components/admin/AdminErrorBoundary.tsx`

```typescript
import React from 'react';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface AdminErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
}

const AdminErrorFallback = ({ error, resetError }: AdminErrorFallbackProps) => (
  <div className="min-h-[400px] flex items-center justify-center p-8">
    <Card className="w-full max-w-md">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-destructive" />
          <CardTitle>Errore nel modulo admin</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">
          Si è verificato un errore nel pannello di amministrazione.
          Riprova o contatta il supporto tecnico.
        </p>
        {error && (
          <div className="p-3 bg-muted rounded-md text-sm font-mono overflow-auto max-h-24">
            {error.message}
          </div>
        )}
        <div className="flex gap-2">
          <Button onClick={resetError} variant="outline" className="flex-1">
            <RefreshCw className="h-4 w-4 mr-2" />
            Riprova
          </Button>
          <Button onClick={() => window.location.href = '/admin'} className="flex-1">
            <Home className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
);

export const AdminErrorBoundary = ({ children }: { children: React.ReactNode }) => (
  <ErrorBoundary
    fallback={<AdminErrorFallback />}
    onError={(error, errorInfo) => {
      // Additional admin-specific logging
      console.error('[AdminErrorBoundary]', error, errorInfo);
    }}
  >
    {children}
  </ErrorBoundary>
);
```

### 4.2 Update AdminLayout to Use ErrorBoundary

**File:** `src/layouts/AdminLayout.tsx`

```typescript
import { AdminErrorBoundary } from '@/components/admin/AdminErrorBoundary';

// Wrap <Outlet /> with AdminErrorBoundary
<main className="flex-1 ml-64 p-8">
  <AdminErrorBoundary>
    <Outlet />
  </AdminErrorBoundary>
</main>
```

---

## Phase 5: Create Integration Test for Booking Flow

**File:** `src/services/api/__tests__/bookingService.integration.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { reserveSlot, createCheckoutSession } from '../bookingService';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
    auth: {
      getSession: vi.fn()
    }
  }
}));

// Mock fetch for Edge Function calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Booking Service Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Full Booking Flow', () => {
    it('should complete checkout flow when reservation and checkout succeed', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // 1. Mock successful slot reservation
      (supabase.rpc as any).mockResolvedValueOnce({
        data: { booking_id: 'test-booking-123' },
        error: null
      });

      // 2. Mock successful auth session
      (supabase.auth.getSession as any).mockResolvedValueOnce({
        data: { 
          session: { access_token: 'mock-token' }
        },
        error: null
      });

      // 3. Mock successful checkout session creation
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          checkout_session: {
            url: 'https://checkout.stripe.com/test',
            id: 'cs_test_123'
          }
        })
      });

      // Execute reservation
      const reserveResult = await reserveSlot({
        spaceId: 'space-123',
        userId: 'user-456',
        startTime: '2024-01-15T09:00:00Z',
        endTime: '2024-01-15T17:00:00Z',
        guests: 1,
        confirmationType: 'instant',
        clientBasePrice: 100
      });

      expect(reserveResult.success).toBe(true);
      expect(reserveResult.bookingId).toBe('test-booking-123');

      // Execute checkout
      const checkoutResult = await createCheckoutSession(reserveResult.bookingId!);

      expect(checkoutResult.success).toBe(true);
      expect(checkoutResult.url).toBe('https://checkout.stripe.com/test');
      expect(checkoutResult.sessionId).toBe('cs_test_123');
    });

    it('should return error when reservation fails', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      (supabase.rpc as any).mockResolvedValueOnce({
        data: null,
        error: { message: 'Slot already booked', code: '23P01' }
      });

      const result = await reserveSlot({
        spaceId: 'space-123',
        userId: 'user-456',
        startTime: '2024-01-15T09:00:00Z',
        endTime: '2024-01-15T17:00:00Z',
        guests: 1,
        confirmationType: 'instant'
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('CONFLICT');
    });

    it('should return error when checkout session fails', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      (supabase.auth.getSession as any).mockResolvedValueOnce({
        data: { 
          session: { access_token: 'mock-token' }
        },
        error: null
      });

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Invalid booking ID' })
      });

      const result = await createCheckoutSession('invalid-booking');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_REQUEST');
    });

    it('should handle network errors gracefully', async () => {
      const { supabase } = await import('@/integrations/supabase/client');
      
      (supabase.auth.getSession as any).mockResolvedValueOnce({
        data: { 
          session: { access_token: 'mock-token' }
        },
        error: null
      });

      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      const result = await createCheckoutSession('test-booking');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NETWORK');
    });
  });
});
```

---

## Files to Create

| File | Description |
|------|-------------|
| `src/components/admin/AdminErrorBoundary.tsx` | Admin-specific error boundary with Italian messaging |
| `src/services/api/__tests__/bookingService.integration.test.ts` | Integration test for booking flow |

## Files to Modify

| File | Changes |
|------|---------|
| `src/types/admin.ts` | Add `GlobalTag` and `AdminWarning` interfaces |
| `src/lib/admin/admin-stats-utils.ts` | Fix snake_case property names |
| `src/lib/admin/admin-rate-limit.ts` | Use bracket notation for index access |
| `src/lib/admin/admin-user-utils.ts` | Add `permissions` field to mapping |
| `src/lib/booking-reservation-utils.ts` | Fix exactOptionalPropertyTypes issues |
| `src/lib/conversations.ts` | Fix message insert types |
| `src/lib/chat.ts` | Fix conversation insert |
| `src/hooks/useSpaceFormState.ts` | Normalize availability exceptions |
| `src/hooks/useSpaceFormSubmission.ts` | Fix availability type cast |
| `src/services/api/bookingService.ts` | Replace console.* with sreLogger |
| `src/hooks/checkout/useCheckout.ts` | Add toast notifications |
| `src/layouts/AdminLayout.tsx` | Wrap Outlet with AdminErrorBoundary |

---

## Verification Checklist

After implementation:
- [ ] `npm run build` completes with 0 errors
- [ ] Booking flow shows toast on reservation failure
- [ ] Booking flow shows toast on checkout failure
- [ ] Admin pages show friendly error UI when component crashes
- [ ] No `console.error` calls in `src/services/` directory
- [ ] Integration test passes: `npm test -- bookingService.integration`

---

## Expected Outcome

| Metric | Before | After |
|--------|--------|-------|
| Build errors | 30+ | 0 |
| `console.error` in services | 10+ | 0 |
| User-facing error toasts | 0 | 3+ |
| Admin ErrorBoundary | None | Dedicated |
| Integration tests | 0 | 1 file (4 tests) |
