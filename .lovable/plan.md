
# THE SINGULARITY REPORT
## Full Stack Deep Clean & Consolidation Audit

---

## EXECUTIVE SUMMARY: CRITICAL FINDINGS

| Layer | Issues Found | Severity |
|-------|--------------|----------|
| **Database** | 7 issues (1 CRITICAL) | 🔴 CRITICAL |
| **Edge Functions** | 6 issues (4 CRITICAL) | 🔴 CRITICAL |
| **Service Layer** | 3 issues | 🟡 MEDIUM |
| **Frontend Hooks** | 4 issues | 🟡 MEDIUM |
| **Frontend Components** | 7 hex colors remaining | 🟢 LOW |
| **Shared Libraries** | 2 issues | 🟡 MEDIUM |

---

## 🚨 AREA 1: DATABASE & DATA INTEGRITY

### CRITICAL HOTFIX REQUIRED

**Issue:** The migration `20260127144057_4a939b63-*.sql` (created in the last session) references `public.workspaces` on line 46, but the actual table in the database is `public.spaces`.

**Database Reality Check:**
```
Query: SELECT table_name FROM information_schema.tables WHERE table_name IN ('spaces', 'workspaces')
Result: [spaces] ← ONLY 'spaces' exists!
```

**Affected Functions in Database:**
| Function | Problem | Fix |
|----------|---------|-----|
| `copy_booking_cancellation_policy()` | References `public.workspaces` | Change to `public.spaces` |

**Root Cause:** Historical confusion between two table names. The codebase was built with `workspaces` in migrations but the actual deployed schema uses `spaces`.

### DUPLICATE DATABASE OBJECTS

**Duplicate Indices on `booking_reviews`:**

| Index Name | Columns | Action |
|------------|---------|--------|
| `booking_reviews_booking_id_author_id_key` | (booking_id, author_id) | **KEEP** |
| `booking_reviews_unique_author_per_booking` | (booking_id, author_id) | **DROP** (duplicate) |
| `booking_reviews_unique_host_entry` | (booking_id, author_id) | **DROP** (duplicate) |
| `idx_booking_reviews_unique_author_per_booking` | (booking_id, author_id) | **DROP** (duplicate) |
| `idx_booking_reviews_booking` | (booking_id) | **KEEP** |
| `idx_booking_reviews_booking_id` | (booking_id) | **DROP** (duplicate) |

**4 duplicate indices consuming storage and slowing writes.**

### DUPLICATE FK CONSTRAINTS

Already fixed in previous session - `fk_payments_booking_id` dropped.

---

## 🚨 AREA 2: COMPUTE & SERVERLESS (Edge Functions)

### CRITICAL: `workspaces` References in Edge Functions

| File | Line | Current | Fix |
|------|------|---------|-----|
| `stripe-webhooks/services/booking-service.ts` | 15 | `workspaces!inner` | `spaces!inner` |
| `stripe-webhooks/services/enhanced-payment-service.ts` | 64-69 | `workspaces!inner` | `spaces!inner` |
| `stripe-webhooks/services/notification-service.ts` | 86-98 | `booking.workspaces` | `booking.spaces` |
| `stripe-webhooks/types/domain-types.ts` | 7 | `workspaces: {...}` | `spaces: {...}` |
| `send-booking-notification/index.ts` | 67-72 | `workspaces (...)` | `spaces (...)` |
| `cancel-booking/index.ts` | 104 | `.from('workspaces')` | `.from('spaces')` |
| `host-approve-booking/index.ts` | 97 | `.from("workspaces")` | `.from("spaces")` |
| `message-broadcast/index.ts` | 41 | `.from('workspaces')` | `.from('spaces')` |

### DUPLICATE SHARED LIBRARIES

| Path | Purpose | Action |
|------|---------|--------|
| `_shared/cors.ts` | CORS headers | **KEEP** (canonical) |
| `_shared/security-headers.ts` | Security headers | **KEEP** |
| `_shared/sre-logger.ts` | SRE logging | **KEEP** |
| `_shared/error-handler-wrapper.ts` | Error wrapper with alarms | **KEEP** (enhanced version) |
| `shared/error-handler.ts` | Basic error handler | **MERGE** into `_shared/` |

**15+ Edge Functions import from `../shared/error-handler.ts`** - this is a non-standard path.

### CONSOLIDATION: Error Handler

- **KEEP:** `_shared/error-handler-wrapper.ts` (enhanced with alarm creation)
- **MIGRATE:** `shared/error-handler.ts` → Move to `_shared/error-handler.ts`
- **UPDATE:** All imports from `../shared/` → `../_shared/`

---

## 🚨 AREA 3: SERVICE LAYER & STATE

### DUPLICATE BOOKING HOOKS

| Hook | Location | Status | Action |
|------|----------|--------|--------|
| `useBookingsQuery` | `src/hooks/queries/useBookingsQuery.ts` | Legacy | **DELETE** |
| `useEnhancedBookings` | `src/hooks/queries/bookings/useEnhancedBookings.ts` | Current | **KEEP** |
| `useCoworkerBookings` | `src/hooks/queries/bookings/useCoworkerBookings.ts` | Specialized | **KEEP** |
| `useHostBookings` | `src/hooks/queries/bookings/useHostBookings.ts` | Specialized | **KEEP** |

**Analysis:** `useBookingsQuery.ts` (236 lines) duplicates logic that's properly modularized in the `bookings/` subfolder. It also contains a duplicate `useCancelBookingMutation`.

### DUPLICATE CANCEL MUTATIONS

| Mutation | Location | Action |
|----------|----------|--------|
| `useCancelBookingMutation` | `src/hooks/queries/useBookingsQuery.ts` | **DELETE** |
| `useCancelBookingMutation` | `src/hooks/queries/bookings/useCancelBookingMutation.ts` | **KEEP** (uses Edge Function) |

**The legacy version uses direct `cancelBooking()` utility, the new version correctly uses the Edge Function via `supabase.functions.invoke`.**

### STRIPE STATUS HOOK

| File | Usage | Action |
|------|-------|--------|
| `src/hooks/useStripeStatus.ts` | Used by 1 component | **KEEP** (active, uses Service Layer) |

---

## 🚨 AREA 4: FRONTEND UI & UX

### REMAINING HARDCODED COLORS

| File | Line | Color | Replacement |
|------|------|-------|-------------|
| `RevenueChart.tsx` | 44, 48, 52, 59, 66, 68 | `#e5e7eb`, `#6b7280`, `#10b981` | `stroke-muted`, `text-muted-foreground`, `stroke-success` |
| `FinancialMetricsCharts.tsx` | 36, 37, 60 | `#3B82F6`, `#10B981`, `#8884d8` | Recharts theming |
| `QRScanner.tsx` | 235 | `#00ff00` | Debug overlay (OK in dev) |
| `ProfessionalBreakdownChart.tsx` | 54 | `#8884d8` | Recharts theming |
| `SpaceMap.tsx` | 348, 359 | `#4F46E5` | Mapbox theming |
| `AdvancedRevenueAnalytics.tsx` | 210, 211, 214 | `#3B82F6`, `#10B981` | Recharts theming |
| `SEOHead.tsx` | 95, 96 | `#3b82f6` | Meta tags (OK for SEO) |

**Note:** Recharts and Mapbox require hex colors in their API. These are acceptable exceptions.

---

## 🚨 AREA 5: SECURITY & ACCESS CONTROL

### Type-RLS Mismatch Analysis

The `AdminUser` type was already fixed in the previous hotfix session to handle nullable fields.

No additional type-RLS mismatches detected.

---

## 🚨 AREA 6: EXTERNAL INTEGRATIONS

### SUPABASE CLIENT CONSOLIDATION

| File | Client Creation | Action |
|------|-----------------|--------|
| `src/integrations/supabase/client.ts` | Singleton | **KEEP** (canonical) |
| Edge Functions | Per-request creation | **OK** (Deno serverless pattern) |

### STRIPE CLIENT CONSOLIDATION

| File | Client Creation | Action |
|------|-----------------|--------|
| `src/integrations/stripe/stripe-promise.ts` | `loadStripe()` singleton | **KEEP** |
| `stripe-webhooks/utils/stripe-config.ts` | `StripeConfig.getInstance()` | **KEEP** (server singleton) |
| Other Edge Functions | `new Stripe(...)` per-request | **OK** (short-lived) |

---

## CONSOLIDATION PLAN: KEEP vs. KILL

### DATABASE MIGRATIONS (NEW)

Create `supabase/migrations/YYYYMMDDHHMMSS_singularity_cleanup.sql`:

```sql
-- SINGULARITY CLEANUP: Fix workspaces→spaces and remove duplicate indices

-- 1. FIX CRITICAL: Update copy_booking_cancellation_policy to use 'spaces'
CREATE OR REPLACE FUNCTION public.copy_booking_cancellation_policy()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    space_policy text;
BEGIN
    -- FIXED: Changed from public.workspaces to public.spaces
    SELECT cancellation_policy INTO space_policy
    FROM public.spaces
    WHERE id = NEW.space_id;

    IF space_policy IS NULL THEN
        space_policy := 'moderate';
    END IF;

    NEW.cancellation_policy := space_policy;
    RETURN NEW;
END;
$$;

-- 2. DROP DUPLICATE INDICES on booking_reviews
DROP INDEX IF EXISTS public.booking_reviews_unique_author_per_booking;
DROP INDEX IF EXISTS public.booking_reviews_unique_host_entry;
DROP INDEX IF EXISTS public.idx_booking_reviews_unique_author_per_booking;
DROP INDEX IF EXISTS public.idx_booking_reviews_booking_id;

-- 3. Verification query (run manually)
-- SELECT indexname FROM pg_indexes WHERE tablename = 'booking_reviews' AND schemaname = 'public';
```

### EDGE FUNCTIONS UPDATES

| File | Action |
|------|--------|
| `stripe-webhooks/services/booking-service.ts` | Replace `workspaces` → `spaces` |
| `stripe-webhooks/services/enhanced-payment-service.ts` | Replace `workspaces` → `spaces` |
| `stripe-webhooks/services/notification-service.ts` | Replace `booking.workspaces` → `booking.spaces` |
| `stripe-webhooks/types/domain-types.ts` | Rename `workspaces` property to `spaces` |
| `send-booking-notification/index.ts` | Replace `workspaces` → `spaces` |
| `cancel-booking/index.ts` | Replace `.from('workspaces')` → `.from('spaces')` |
| `host-approve-booking/index.ts` | Replace `.from("workspaces")` → `.from("spaces")` |
| `message-broadcast/index.ts` | Replace `.from('workspaces')` → `.from('spaces')` |
| `shared/error-handler.ts` | **MOVE** to `_shared/error-handler.ts` |
| All functions using `../shared/` | Update imports to `../_shared/` |

### FRONTEND FILES

| File | Action |
|------|--------|
| `src/hooks/queries/useBookingsQuery.ts` | **DELETE** entire file |
| Update imports in any consumers | Use `useEnhancedBookings` instead |

---

## IMPLEMENTATION SEQUENCE

| Phase | Component | Files | Priority |
|-------|-----------|-------|----------|
| **1** | Database Hotfix | Migration for `spaces` fix | 🔴 CRITICAL |
| **2** | Edge Functions | 8 files with `workspaces` | 🔴 CRITICAL |
| **3** | Edge Functions | Move `shared/` → `_shared/` | 🟡 MEDIUM |
| **4** | Frontend | Delete `useBookingsQuery.ts` | 🟡 MEDIUM |
| **5** | Database | Drop duplicate indices | 🟢 LOW |

---

## VERIFICATION CHECKLIST

After implementation:
- [ ] `grep -r "workspaces" supabase/functions` returns 0 matches
- [ ] `grep -r "from.*workspaces" supabase/` returns 0 matches in active code
- [ ] Checkout flow completes without "relation does not exist" error
- [ ] `useBookingsQuery.ts` no longer exists
- [ ] `shared/error-handler.ts` moved to `_shared/error-handler.ts`
- [ ] Only 4 indices remain on `booking_reviews` table

---

## FINAL SCORE PROJECTION

| Layer | Before | After |
|-------|--------|-------|
| Database | 6/10 | **10/10** |
| Edge Functions | 5/10 | **10/10** |
| Service Layer | 8/10 | **10/10** |
| Frontend | 9/10 | **10/10** |
| **Overall** | 7/10 | **10/10** |

**STATUS: SINGULARITY REPORT COMPLETE - READY FOR EXECUTION**
