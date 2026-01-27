
# SERVICE LAYER HEALTH REPORT
## Workover Hub Connect - Application Logic Audit

---

## EXECUTIVE SUMMARY

| Metric | Score | Status |
|--------|-------|--------|
| **Architecture Purity Score** | **7.5/10** | Good with remaining violations |
| **Error Handling Score** | **7.0/10** | Inconsistent patterns |
| **Type Safety Score** | **6.5/10** | Too many `any` casts |
| **Cache Management Score** | **8.5/10** | Well-designed with proper invalidations |

**Overall Service Layer Health: 7.4/10** - Functional but needs consistency cleanup

---

## 1. ARCHITECTURE VIOLATION CHECK

### 1.1 The "Dirty Dozen" - Components Still Using Raw SQL

| # | File | Location | Violation Type | Severity |
|---|------|----------|----------------|----------|
| 1 | `src/pages/Onboarding.tsx` | Line 256-269 | Direct profile UPDATE | HIGH |
| 2 | `src/pages/SpacesManage.tsx` | Line 50 | Direct spaces SELECT | HIGH |
| 3 | `src/pages/ChatThread.tsx` | Line 209 | Direct messages DELETE | HIGH |
| 4 | `src/pages/admin/AdminBookingsPage.tsx` | Line 80-83 | Direct booking DELETE | MEDIUM |
| 5 | `src/components/host/kyc/KYCDocumentUpload.tsx` | Line 103-110 | Direct kyc_documents INSERT | MEDIUM |
| 6 | `src/components/reviews/ReviewCard.tsx` | Line 58-64 | Direct reports INSERT | MEDIUM |
| 7 | `src/components/spaces/calendar/ConflictManagementSystem.tsx` | Line 123-130 | Direct notifications INSERT | LOW |
| 8 | `src/components/payments/PaymentsDashboard.tsx` | Line 32-58 | Direct payments SELECT | HIGH |
| 9 | `src/hooks/chat/useChat.ts` | Line 116 | Direct messages DELETE | MEDIUM |
| 10 | `src/hooks/bookings/useBulkBookingActions.ts` | Line 185-190 | Direct messages INSERT | MEDIUM |
| 11 | `src/hooks/admin/useAdminSettings.ts` | Line 14 | Direct system_settings SELECT | LOW |
| 12 | `src/lib/booking-review-utils.ts` | Line 133 | Direct booking_reviews INSERT | MEDIUM |
| 13 | `src/utils/performance-monitor.ts` | Line 125-129 | Direct performance_metrics INSERT | LOW |

### 1.2 Pattern Distribution

```text
ARCHITECTURE VIOLATIONS BY LAYER:
├── src/pages/           - 4 violations (30%)
├── src/components/      - 4 violations (30%)
├── src/hooks/           - 3 violations (23%)
└── src/lib/ + utils/    - 2 violations (15%)
```

### 1.3 Service Layer Coverage by Domain

| Domain | Service Exists | UI Violations | Coverage |
|--------|---------------|---------------|----------|
| **Booking** | `bookingService.ts` | 2 | 85% |
| **Chat** | `chatService.ts` | 3 | 70% |
| **Payments** | Partial (no dedicated service) | 1 | 60% |
| **Admin** | `adminService.ts` | 2 | 75% |
| **Profile** | None | 1 | 0% |
| **KYC** | None | 1 | 0% |
| **Reports** | None | 1 | 0% |
| **Notifications** | None | 1 | 0% |

---

## 2. ERROR HANDLING ANALYSIS

### 2.1 Pattern Inventory

| Service | Return Pattern | Example |
|---------|---------------|---------|
| `bookingService.ts` | `{ success: boolean, data?, error?, errorCode? }` | Lines 27-32 |
| `chatService.ts` | `{ success: boolean, data?, error? }` | Lines 18-40 |
| `stripeService.ts` | `throw new Error()` | Lines 59-61 |
| `adminService.ts` | `throw new Error()` | Lines 41-43, 84-85 |
| `fiscalService.ts` | `throw error` | Lines 69-72 |

### 2.2 Inconsistency Problems

**Problem 1: Mixed Return Patterns**
- `bookingService` and `chatService` use the **Result Pattern** (`{ success, data, error }`)
- `stripeService`, `adminService`, and `fiscalService` use **throw errors**
- This forces consuming hooks to handle both patterns differently

**Problem 2: Error Suppression**
Several components still use `console.error` instead of `sreLogger`:
- `src/hooks/chat/useChat.ts` lines 106, 126, 149, 172
- `src/components/spaces/calendar/BookingDetailsModal.tsx` lines 99, 122

### 2.3 Logging Migration Status

| Pattern | Count | Grade |
|---------|-------|-------|
| `sreLogger.error()` | 80+ | A |
| `console.error()` | 15-20 | C |
| Silent failures | 3-5 | F |

---

## 3. TYPE SAFETY GAP (THE "any" HUNT)

### 3.1 Critical `any` Usages in Service Layer

| File | Line | Usage | Risk |
|------|------|-------|------|
| `bookingService.ts` | 165 | `as any` for RPC response | HIGH |
| `adminService.ts` | 80, 87 | View casting to `AdminUser[]` | HIGH |
| `chatService.ts` | 87, 90 | Complex join mapping | MEDIUM |
| `stripeService.ts` | 14-15 | Hardcoded credentials (separate issue) | HIGH |

### 3.2 Critical `any` Usages in Components

| File | Line | Usage | Risk |
|------|------|-------|------|
| `AdminDashboard.tsx` | 32 | `'admin_users_view' as any` | HIGH |
| `AdminRevenue.tsx` | 21 | `'admin_platform_revenue' as unknown` | HIGH |
| `AdvancedRevenueAnalytics.tsx` | 37 | `'host_daily_metrics' as any` | MEDIUM |
| `WaitlistManager.tsx` | 52-54 | Triple `any` cast chain | HIGH |
| `AdminBookingsPage.tsx` | 82 | `{ deleted_at } as any` | MEDIUM |

### 3.3 Infrastructure Type Gaps

| File | Line | Usage | Risk |
|------|------|-------|------|
| `app.config.ts` | 80-81 | `(supabase as any).supabaseUrl` | MEDIUM |
| `space-mappers.ts` | 38-39 | Aggressive row cast | HIGH |
| `conversations.ts` | 25 | `(supabase.rpc as any)` | HIGH |
| `performance.ts` | 236 | `(navigator as any).connection` | LOW |
| `auth-helpers.ts` | 16 | `roles as any[]` | MEDIUM |

### 3.4 Total Count

```text
TYPE SAFETY GAPS:
├── Service Layer (src/services/api/)  - 6 usages
├── Components (src/components/)       - 8 usages
├── Pages (src/pages/)                 - 5 usages
├── Hooks (src/hooks/)                 - 4 usages
└── Utilities (src/lib/, src/utils/)   - 7 usages
────────────────────────────────────────────────
TOTAL: ~30 critical `any` usages
```

---

## 4. STALE DATA RISKS (REACT QUERY ANALYSIS)

### 4.1 Global Cache Configuration

| Setting | Value | Assessment |
|---------|-------|------------|
| `staleTime` | 60,000ms (1 min) | Good default |
| `gcTime` | 600,000ms (10 min) | Good |
| `refetchOnWindowFocus` | `false` | Acceptable |
| `refetchOnReconnect` | `'always'` | Correct |
| `refetchOnMount` | `true` | Correct |

### 4.2 Query Invalidation Coverage

| Action | Keys Invalidated | Coverage |
|--------|------------------|----------|
| Booking created | `enhancedBookings`, `hostDashboardMetrics` | Complete |
| Booking cancelled | `enhancedBookings`, `hostDashboardMetrics` | Complete |
| Payment verified | `enhanced-bookings`, `coworker-bookings`, `host-bookings` | Complete |
| Message sent | `messages`, `conversations`, `unreadCount` | Complete |
| Profile updated | `profile` | Complete |
| Stripe connected | `host-progress` | Complete |

### 4.3 Stale Data Risks Identified

| Risk | Scenario | Current Behavior | Impact |
|------|----------|------------------|--------|
| **Calendar Double-Booking** | User books slot, another user sees stale availability | `staleTime: 2min` for availability | LOW - Short stale time |
| **Payment Status Lag** | Payment completes, user sees "pending" | `refetchOnWindowFocus: false` for bookings | MEDIUM - May confuse users |
| **Stripe Connection** | Host completes Stripe, progress tracker stale | Polling every 30s if not connected | LOW - Good polling |

### 4.4 Missing Invalidations

| Action | Missing Invalidation |
|--------|---------------------|
| Space published | `hostDashboardMetrics` not always invalidated |
| Review submitted | `space-detail` not invalidated (cached rating) |

---

## 5. THE REFACTOR PLAN

### Priority 0: Security Fix (Immediate)

**File:** `src/services/api/stripeService.ts` lines 14-15

```typescript
// BEFORE - Hardcoded credentials
const SUPABASE_URL = 'https://khtqwzvrxzsgfhsslwyz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1...';

// AFTER - Use imported client
import { supabase } from '@/integrations/supabase/client';
// Remove hardcoded constants, use supabase client directly
```

### Priority 1: Create Missing Services (Week 1)

Create new service files to eliminate UI-layer database calls:

| New Service | Tables Covered | Files to Migrate |
|-------------|----------------|------------------|
| `src/services/api/profileService.ts` | `profiles` | `Onboarding.tsx` |
| `src/services/api/reportService.ts` | `reports` | `ReviewCard.tsx` |
| `src/services/api/kycService.ts` | `kyc_documents` | `KYCDocumentUpload.tsx` |
| `src/services/api/notificationService.ts` | `notifications`, `user_notifications` | `ConflictManagementSystem.tsx` |
| `src/services/api/paymentService.ts` | `payments` | `PaymentsDashboard.tsx` |

**Example: profileService.ts**
```typescript
export interface UpdateProfileParams {
  userId: string;
  data: Partial<ProfileData>;
}

export interface UpdateProfileResult {
  success: boolean;
  error?: string;
}

export async function updateProfile(params: UpdateProfileParams): Promise<UpdateProfileResult> {
  const { error } = await supabase
    .from('profiles')
    .update(params.data)
    .eq('id', params.userId);
  
  if (error) {
    sreLogger.error('Profile update failed', { component: 'profileService' }, error);
    return { success: false, error: error.message };
  }
  
  return { success: true };
}
```

### Priority 2: Standardize Error Handling (Week 1)

Update all services to use the Result Pattern:

**Files to Update:**
- `src/services/api/stripeService.ts` - Change from `throw` to `{ success, data, error }`
- `src/services/api/adminService.ts` - Change from `throw` to `{ success, data, error }`
- `src/services/api/fiscalService.ts` - Change from `throw` to `{ success, data, error }`

**Example: stripeService.ts**
```typescript
// BEFORE
export async function checkAccountStatus(): Promise<StripeAccountStatus> {
  const { data, error } = await supabase.functions.invoke('check-stripe-status');
  if (error) {
    throw new Error(`Stripe status check failed: ${error.message}`);
  }
  return { ... };
}

// AFTER
export async function checkAccountStatus(): Promise<CheckAccountStatusResult> {
  const { data, error } = await supabase.functions.invoke('check-stripe-status');
  if (error) {
    sreLogger.error('Stripe status check failed', { component: 'stripeService' }, error);
    return { success: false, error: error.message };
  }
  return { success: true, data: { ... } };
}
```

### Priority 3: Type-Safe RPC Responses (Week 2)

Create explicit interfaces for all RPC responses:

**File:** `src/types/rpc.ts`
```typescript
export interface ValidateSlotRPCResponse {
  booking_id: string;
  status: 'frozen' | 'pending' | 'confirmed';
}

export interface AdminBookingsRPCResponse {
  id: string;
  user_id: string;
  space_id: string;
  // ... all fields
}

export interface GetCoworkersRPCResponse {
  id: string;
  first_name: string;
  last_name: string;
  profession: string | null;
  avatar_url: string | null;
  cached_avg_rating: number | null;
  linkedin_url: string | null;
}
```

**Update Services:**
```typescript
// BEFORE
const dataObj = rpcData as any;
const bookingId = dataObj.booking_id || dataObj;

// AFTER
const response = rpcData as ValidateSlotRPCResponse;
const bookingId = response.booking_id;
```

### Priority 4: View Type Definitions (Week 2)

Create type definitions for database views:

**File:** `src/types/views.ts`
```typescript
export interface AdminUsersView {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
  role: string;
  status: string;
  // ... all view columns
}

export interface AdminPlatformRevenueView {
  month: string;
  total_payments: number;
  gross_volume: number;
  estimated_revenue: number;
}

export interface HostDailyMetricsView {
  booking_date: string;
  daily_revenue: number;
  total_bookings: number;
  confirmed_bookings: number;
  host_id: string;
}
```

**Update Components:**
```typescript
// BEFORE
const { data } = await supabase
  .from('admin_users_view' as any)
  .select('*');

// AFTER
import { AdminUsersView } from '@/types/views';
const { data } = await supabase
  .from('admin_users_view' as 'profiles')
  .select('*') as { data: AdminUsersView[] | null; error: any };
```

### Priority 5: Migrate Remaining Violations (Week 2-3)

| Component | Current Call | Target Service |
|-----------|-------------|----------------|
| `ChatThread.tsx` | `supabase.from('messages').delete()` | `chatService.deleteMessage()` |
| `useChat.ts` | `supabase.from('messages').delete()` | `chatService.deleteMessage()` |
| `useBulkBookingActions.ts` | `supabase.from('messages').insert()` | `chatService.sendMessage()` |
| `booking-review-utils.ts` | `supabase.from('booking_reviews').insert()` | New `reviewService.submitReview()` |
| `SpacesManage.tsx` | `supabase.from('spaces').select()` | New hook using `spaceService` |

---

## 6. VERIFICATION CHECKLIST

After implementing fixes:

- [ ] Search for `supabase.from(` in `src/pages/` - should return 0 results
- [ ] Search for `supabase.from(` in `src/components/` - should return 0 results
- [ ] Search for `as any` in `src/services/api/` - should return < 3 results
- [ ] All services return `{ success, data?, error? }` pattern
- [ ] All RPC calls use typed response interfaces
- [ ] Console shows no `console.error` calls (all use `sreLogger`)

---

## 7. FILES SUMMARY

### New Files to Create

| File | Purpose |
|------|---------|
| `src/services/api/profileService.ts` | Profile CRUD operations |
| `src/services/api/paymentService.ts` | Payment queries and mutations |
| `src/services/api/reportService.ts` | User reports/flags |
| `src/services/api/kycService.ts` | KYC document management |
| `src/services/api/notificationService.ts` | Notification operations |
| `src/types/rpc.ts` | RPC response type definitions |
| `src/types/views.ts` | Database view type definitions |

### Files to Modify

| File | Changes |
|------|---------|
| `src/services/api/stripeService.ts` | Remove hardcoded credentials, standardize returns |
| `src/services/api/adminService.ts` | Standardize to Result Pattern |
| `src/services/api/fiscalService.ts` | Standardize to Result Pattern |
| `src/services/api/bookingService.ts` | Add typed RPC response |
| `src/services/api/chatService.ts` | Add `deleteMessage()` method |
| `src/pages/Onboarding.tsx` | Use `profileService.updateProfile()` |
| `src/pages/SpacesManage.tsx` | Use hook with service |
| `src/pages/ChatThread.tsx` | Use `chatService.deleteMessage()` |
| `src/components/payments/PaymentsDashboard.tsx` | Use `paymentService` |
| `src/components/host/kyc/KYCDocumentUpload.tsx` | Use `kycService` |
| `src/components/reviews/ReviewCard.tsx` | Use `reportService` |

---

## 8. IMPACT METRICS

### Before vs After

| Metric | Current | Target |
|--------|---------|--------|
| Architecture Violations | 13 | 0 |
| `any` Usages in Services | 6 | 0 |
| `any` Usages in Components | 13 | < 5 |
| Error Handling Patterns | 2 (mixed) | 1 (Result Pattern) |
| Service Layer Coverage | 65% | 95% |

### Target Scores

| Metric | Current | Target |
|--------|---------|--------|
| Architecture Purity | 7.5/10 | 9.5/10 |
| Error Handling | 7.0/10 | 9.0/10 |
| Type Safety | 6.5/10 | 8.5/10 |
| Cache Management | 8.5/10 | 9.0/10 |
| **Overall** | **7.4/10** | **9.0/10** |
