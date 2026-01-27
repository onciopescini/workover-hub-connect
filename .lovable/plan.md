
# Day 3: Service Layer Migration - Stripe & Admin Services

## Overview

This task creates two new services (`stripeService.ts` and `adminService.ts`) following the established pattern from `bookingService.ts`, while also fixing the pre-existing build errors that are blocking deployment.

---

## Current State Analysis

### Build Errors to Fix First

Before implementing the new services, we need to fix **24 TypeScript build errors** that are blocking deployment:

| Category | Count | Files |
|----------|-------|-------|
| `unknown` not assignable to `ReactNode` | 4 | `NotificationCenter.tsx`, `NotificationItem.tsx` |
| `userId` undefined issue | 1 | `BookingForm.tsx` |
| Enum string literal mismatches | 3 | `SpaceForm.tsx` |
| Test `Location` type errors | 2 | `useCheckout.test.ts`, `useCheckoutReservationFailure.test.ts` |
| Realtime subscription overloads | 2 | `useConnectionRequests.ts` |
| `RawBookingData` type mismatches | 4 | `useCoworkerBookings.ts`, `useEnhancedBookings.ts`, `useHostBookings.ts` |
| `useBookingsQuery` type errors | 4 | `useBookingsQuery.ts`, `useHostDashboardQuery.ts` |

### Files with Direct Supabase Calls to Migrate

| File | Current Pattern | Target Service |
|------|----------------|----------------|
| `StripeConnectButton.tsx` | `supabase.functions.invoke('create-connect-onboarding-link')` | `stripeService` |
| `useStripeStatus.ts` | `supabase.functions.invoke('check-stripe-status')` | `stripeService` |
| `useStripePayouts.ts` | `supabase.functions.invoke('get-stripe-payouts')` | `stripeService` |
| `AdminBookingsPage.tsx` | `supabase.rpc('admin_get_bookings')` | `adminService` |
| `useAdminBookings.ts` | Complex `supabase.from('bookings')...` | `adminService` |

---

## Implementation Steps

### Phase 1: Fix Critical Build Errors (Priority)

#### 1.1 NotificationCenter.tsx & NotificationItem.tsx

**Issue**: `Type 'unknown' is not assignable to type 'ReactNode'`

**Root Cause**: `metadata` is `Record<string, unknown>` and TypeScript doesn't allow rendering `unknown` directly.

**Fix**: Already using `String()` cast, but need to ensure JSX compatibility by wrapping in fragments or explicit type assertions.

```typescript
// Before (line 235-236)
{notification.metadata["sender_name"] && (
  <span>Da: {String(notification.metadata["sender_name"])}</span>
)}

// After - ensure proper fragment wrapping
{notification.metadata["sender_name"] != null && (
  <span>Da: {String(notification.metadata["sender_name"])}</span>
)}
```

#### 1.2 BookingForm.tsx

**Issue**: `userId: string | undefined` not assignable to `userId: string`

**Fix**: Add early return or guard clause for undefined userId.

#### 1.3 SpaceForm.tsx

**Issue**: Enum string assignments failing strict checks.

**Fix**: Use type assertions for Zod enum fields: `as "home" | "outdoor" | "professional"`.

#### 1.4 useCheckout.test.ts files

**Issue**: Mock `window.location` type incompatibility.

**Fix**: Use proper TypeScript assertion for Location mock.

#### 1.5 useConnectionRequests.ts

**Issue**: Realtime subscription overload error.

**Fix**: Use correct Supabase realtime channel syntax.

#### 1.6 RawBookingData Type Mismatches

**Issue**: `space_id: string | null` vs expected `string`.

**Fix**: Update `RawBookingData` type to allow `null` for optional fields.

---

### Phase 2: Create stripeService.ts

Create `src/services/api/stripeService.ts`:

```typescript
/**
 * Stripe Service Layer
 * 
 * Handles all Stripe Connect operations with proper error handling
 * and type safety.
 */

import { supabase } from '@/integrations/supabase/client';

// Supabase project constants
const SUPABASE_URL = 'https://khtqwzvrxzsgfhsslwyz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

// ============= TYPES =============

export interface StripeAccountStatus {
  connected: boolean;
  accountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  onboardingStatus: 'none' | 'pending' | 'completed';
}

export interface StripeOnboardingResult {
  success: boolean;
  url?: string;
  stripeAccountId?: string;
  error?: string;
}

export interface StripePayoutData {
  availableBalance: number;
  pendingBalance: number;
  currency: string;
  lastPayout: {
    amount: number;
    arrivalDate: string;
    status: string;
  } | null;
}

// ============= METHODS =============

/**
 * Check and update Stripe account connection status.
 * Calls the check-stripe-status Edge Function.
 */
export async function checkAccountStatus(): Promise<StripeAccountStatus> {
  const { data, error } = await supabase.functions.invoke('check-stripe-status');
  
  if (error) throw new Error(`Stripe status check failed: ${error.message}`);
  
  return {
    connected: data?.connected ?? false,
    accountId: data?.account_id ?? null,
    chargesEnabled: data?.charges_enabled ?? false,
    payoutsEnabled: data?.payouts_enabled ?? false,
    detailsSubmitted: data?.details_submitted ?? false,
    onboardingStatus: data?.onboarding_status ?? 'none'
  };
}

/**
 * Create or get Stripe Connect onboarding/dashboard link.
 * Uses native fetch for full header control.
 */
export async function createOnboardingLink(): Promise<StripeOnboardingResult> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !sessionData.session?.access_token) {
    return { success: false, error: 'Session expired, please login again' };
  }
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-connect-onboarding-link`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionData.session.access_token}`,
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
      }
    });
    
    const data = await response.json();
    
    if (!response.ok || data.error) {
      return { success: false, error: data.error || 'Failed to create onboarding link' };
    }
    
    return {
      success: true,
      url: data.url,
      stripeAccountId: data.stripe_account_id
    };
  } catch (err) {
    return { success: false, error: 'Network error connecting to Stripe' };
  }
}

/**
 * Get payout information for a host.
 */
export async function getPayouts(hostId: string): Promise<StripePayoutData> {
  const { data, error } = await supabase.functions.invoke('get-stripe-payouts', {
    body: { host_id: hostId }
  });
  
  if (error) throw new Error(`Failed to fetch payouts: ${error.message}`);
  
  return {
    availableBalance: data?.available_balance ?? 0,
    pendingBalance: data?.pending_balance ?? 0,
    currency: data?.currency ?? 'EUR',
    lastPayout: data?.last_payout ?? null
  };
}
```

---

### Phase 3: Create adminService.ts

Create `src/services/api/adminService.ts`:

```typescript
/**
 * Admin Service Layer
 * 
 * Handles all admin dashboard operations with proper error handling
 * and type safety.
 */

import { supabase } from '@/integrations/supabase/client';
import { AdminBooking, AdminUser, AdminStats } from '@/types/admin';
import { mapAdminBookingRecord } from '@/lib/admin-mappers';

// ============= TYPES =============

export interface GetBookingsParams {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
}

export interface GetBookingsResult {
  bookings: AdminBooking[];
  totalCount: number;
}

// ============= METHODS =============

/**
 * Fetch all bookings with optional filtering.
 * Uses the admin_get_bookings RPC for security.
 */
export async function getAllBookings(params: GetBookingsParams = {}): Promise<GetBookingsResult> {
  const { page = 1, pageSize = 50, status, search } = params;
  
  const { data, error } = await supabase.rpc('admin_get_bookings');
  
  if (error) throw new Error(`Failed to fetch bookings: ${error.message}`);
  
  // Map and filter the results
  let bookings = (data || [])
    .map(mapAdminBookingRecord)
    .filter((item): item is AdminBooking => item !== null);
  
  // Apply client-side filtering
  if (status && status !== 'all') {
    bookings = bookings.filter(b => b.status === status);
  }
  
  if (search) {
    const searchLower = search.toLowerCase();
    bookings = bookings.filter(b =>
      b.coworker_name?.toLowerCase().includes(searchLower) ||
      b.coworker_email?.toLowerCase().includes(searchLower) ||
      b.space_name?.toLowerCase().includes(searchLower) ||
      b.host_name?.toLowerCase().includes(searchLower)
    );
  }
  
  // Apply pagination
  const start = (page - 1) * pageSize;
  const paginatedBookings = bookings.slice(start, start + pageSize);
  
  return {
    bookings: paginatedBookings,
    totalCount: bookings.length
  };
}

/**
 * Fetch all users for admin management.
 */
export async function getAllUsers(): Promise<AdminUser[]> {
  const { data, error } = await supabase
    .from('admin_users_view' as any)
    .select('*');
  
  if (error) throw new Error(`Failed to fetch users: ${error.message}`);
  
  return data as AdminUser[];
}

/**
 * Toggle user account status (active/suspended).
 */
export async function toggleUserStatus(userId: string, newStatus: 'active' | 'suspended'): Promise<void> {
  const { error } = await supabase.rpc('admin_toggle_user_status', {
    target_user_id: userId,
    new_status: newStatus
  });
  
  if (error) throw new Error(`Failed to update user status: ${error.message}`);
}

/**
 * Get system-wide metrics for dashboard.
 */
export async function getSystemMetrics(): Promise<AdminStats> {
  // This consolidates the logic from admin-stats-utils.ts
  const [
    { count: totalUsers },
    { count: totalHosts },
    { count: totalBookings },
    { count: activeListings },
    { data: payments }
  ] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'host'),
    supabase.from('bookings').select('id', { count: 'exact', head: true }),
    supabase.from('spaces').select('id', { count: 'exact', head: true }).eq('published', true),
    supabase.from('payments').select('amount').eq('payment_status', 'completed')
  ]);
  
  const totalRevenue = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
  
  return {
    total_users: totalUsers || 0,
    total_hosts: totalHosts || 0,
    total_bookings: totalBookings || 0,
    total_revenue: totalRevenue,
    active_listings: activeListings || 0
  };
}
```

---

### Phase 4: Refactor Components

#### 4.1 StripeConnectButton.tsx

**Changes:**
- Import `createOnboardingLink` from `@/services/api/stripeService`
- Replace `supabase.functions.invoke('create-connect-onboarding-link')` with `createOnboardingLink()`
- Use structured result instead of raw response

#### 4.2 useStripeStatus.ts

**Changes:**
- Import `checkAccountStatus` from `@/services/api/stripeService`
- Replace `supabase.functions.invoke('check-stripe-status')` with `checkAccountStatus()`

#### 4.3 useStripePayouts.ts

**Changes:**
- Import `getPayouts` from `@/services/api/stripeService`
- Replace `supabase.functions.invoke('get-stripe-payouts')` with service call
- Note: Keep the hook structure but delegate to service

#### 4.4 AdminBookingsPage.tsx

**Changes:**
- Import `getAllBookings` from `@/services/api/adminService`
- Replace `supabase.rpc('admin_get_bookings')` with `getAllBookings()`
- Remove local mapper call (service handles it)

---

### Phase 5: Update Barrel Export

Update `src/services/api/index.ts`:

```typescript
/**
 * API Services Barrel Export
 */

// Booking Service
export {
  reserveSlot,
  createCheckoutSession,
  type ReserveSlotParams,
  type ReserveSlotResult,
  type CreateCheckoutSessionResult
} from './bookingService';

// Stripe Service
export {
  checkAccountStatus,
  createOnboardingLink,
  getPayouts,
  type StripeAccountStatus,
  type StripeOnboardingResult,
  type StripePayoutData
} from './stripeService';

// Admin Service
export {
  getAllBookings,
  getAllUsers,
  toggleUserStatus,
  getSystemMetrics,
  type GetBookingsParams,
  type GetBookingsResult
} from './adminService';
```

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/components/notifications/NotificationCenter.tsx` | MODIFY | Fix ReactNode type errors |
| `src/components/notifications/NotificationItem.tsx` | MODIFY | Fix ReactNode type errors |
| `src/components/spaces/BookingForm.tsx` | MODIFY | Add userId guard |
| `src/components/spaces/SpaceForm.tsx` | MODIFY | Fix enum type assertions |
| `src/hooks/checkout/__tests__/useCheckout.test.ts` | MODIFY | Fix Location mock |
| `src/hooks/checkout/__tests__/useCheckoutReservationFailure.test.ts` | MODIFY | Fix Location mock |
| `src/hooks/networking/useConnectionRequests.ts` | MODIFY | Fix realtime subscription |
| `src/types/booking.ts` or related | MODIFY | Fix RawBookingData null types |
| `src/services/api/stripeService.ts` | CREATE | New Stripe service |
| `src/services/api/adminService.ts` | CREATE | New Admin service |
| `src/services/api/index.ts` | MODIFY | Add new exports |
| `src/components/stripe/StripeConnectButton.tsx` | MODIFY | Use stripeService |
| `src/hooks/useStripeStatus.ts` | MODIFY | Use stripeService |
| `src/hooks/useStripePayouts.ts` | MODIFY | Use stripeService |
| `src/pages/admin/AdminBookingsPage.tsx` | MODIFY | Use adminService |

---

## Technical Notes

### Service Pattern Consistency

All services follow the established pattern from `bookingService.ts`:
- Typed interfaces for all inputs/outputs
- Structured error handling with clear messages
- Native fetch for Edge Functions requiring header control
- `supabase.functions.invoke` for simpler Edge Function calls
- `supabase.rpc` for database RPC calls

### Why Native Fetch for Onboarding Link?

The `create-connect-onboarding-link` Edge Function may need future enhancements like:
- Custom headers for rate limiting
- Request deduplication
- Retry logic with exponential backoff

Using native fetch provides flexibility for these additions.

---

## Verification Checklist

1. All 24 build errors resolved
2. `stripeService.ts` exports 3 methods
3. `adminService.ts` exports 4 methods
4. `StripeConnectButton.tsx` uses service (no direct Supabase)
5. `useStripeStatus.ts` uses service (no direct Supabase)
6. `AdminBookingsPage.tsx` uses service (no direct Supabase)
7. All loading states preserved
8. Toast notifications still work correctly

---

## Expected Outcome

| Metric | Before | After |
|--------|--------|-------|
| Build errors | 24 | 0 |
| Direct Supabase calls in Stripe components | 4 | 0 |
| Direct Supabase calls in Admin pages | 2 | 0 |
| Service Layer coverage | 1 service | 3 services |
