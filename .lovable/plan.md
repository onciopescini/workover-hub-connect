
# Super Admin Dashboard - Platform Oversight (Build Plan)

## Executive Summary

After auditing the existing admin infrastructure, I've found that **most of the core structure already exists**. The `/admin` route is protected, RPC-based admin verification is in place, and many widgets are functional. The task is to **enhance** the existing dashboard with missing widgets and add the Force Cancel capability.

---

## Current State Analysis

### Security Infrastructure (Already Implemented)

| Component | Status | Implementation |
|:----------|:-------|:---------------|
| Admin Route Protection | ✅ Exists | `AdminLayout.tsx` calls `supabase.rpc('is_admin', { p_user_id })` |
| Database Function | ✅ Exists | `is_admin()` checks `admins` table for user membership |
| RLS Policies | ✅ Exists | Multiple tables use `is_admin(auth.uid())` in policies |
| Admin Actions Log | ✅ Exists | `admin_actions_log` table with `admin_process_refund` logging |

**Security Verification**: The current implementation is secure - it uses server-side RPC validation (`SECURITY DEFINER` function) that checks the `admins` table, NOT client-side storage or URL guessing.

### Existing Admin Pages

| Page | Status | Features |
|:-----|:-------|:---------|
| `/admin` (Dashboard) | ✅ Basic | Total Users, Gross Volume, Estimated Revenue |
| `/admin/bookings` | ✅ Complete | Booking table, Refund Modal, Force Delete |
| `/admin/users` | ✅ Exists | User management |
| `/admin/kyc` | ✅ Exists | KYC verification queue |
| `/admin/revenue` | ✅ Exists | Monthly revenue breakdown |

### Missing Dashboard Widgets

| Widget | Current | Required |
|:-------|:--------|:---------|
| Pending Escrow | ❌ Missing | Show funds held awaiting payout |
| Pending Approval Count | ❌ Missing | Bookings awaiting host approval |
| Disputed/Cancelled Today | ❌ Missing | Quick health indicator |
| Host vs Coworker Signups | ❌ Missing | User growth chart by role |

### Missing Actions

| Action | Status | Notes |
|:-------|:-------|:------|
| Force Cancel Booking | ❌ Missing | Different from "Force Delete" - should trigger full refund |
| Refund Override | ✅ Exists | `RefundModal.tsx` + `admin-process-refund` edge function |

---

## Implementation Plan

### Phase 1: Enhance AdminDashboard with Missing Widgets

**File**: `src/pages/admin/AdminDashboard.tsx`

**New Widgets to Add**:

1. **Financial Pulse Card (Enhanced)**
   - Gross Volume (existing)
   - Estimated Revenue (existing)
   - **NEW**: Pending Escrow - Query: `SUM(total_price) WHERE payout_completed_at IS NULL AND status IN ('served', 'confirmed')`

2. **Booking Health Card (New)**
   - Pending Approval Count - Query: `COUNT(*) WHERE status = 'pending_approval'`
   - Disputed Today - Query: `COUNT(*) WHERE status = 'disputed' AND created_at >= today`
   - Cancelled Today - Query: `COUNT(*) WHERE status = 'cancelled' AND cancelled_at >= today`

3. **User Growth Chart (New)**
   - Integrate existing `useAdminAnalytics` hook
   - Show Host vs Coworker signups over last 30 days
   - Use recharts `AreaChart` for visualization

**Data Source**: Extend existing queries in `AdminDashboard.tsx` to include:
```typescript
// Pending Escrow
const { data: pendingEscrow } = await supabase
  .from('bookings')
  .select('total_price')
  .is('payout_completed_at', null)
  .in('status', ['served', 'confirmed'])
  .is('deleted_at', null);

// Booking Health
const { count: pendingApproval } = await supabase
  .from('bookings')
  .select('id', { count: 'exact', head: true })
  .eq('status', 'pending_approval')
  .is('deleted_at', null);
```

### Phase 2: Add Force Cancel Action to AdminBookingsPage

**File**: `src/pages/admin/AdminBookingsPage.tsx`

**Current Actions**:
- View Details
- Rimborsa (Refund) → Triggers `admin-process-refund`
- Elimina (Force) → Soft-delete (`deleted_at`)

**New Action**: "Forza Cancellazione" (Force Cancel)

**Behavior**:
1. Opens a confirmation dialog (similar to delete dialog)
2. Calls `admin-process-refund` with `refundType: 'full'`
3. Also updates booking status to `cancelled`
4. Logs action to `admin_actions_log`

**UI Location**: Add as new DropdownMenuItem in the Actions menu

**Difference from Refund**:
- Refund: User requested, applies policy
- Force Cancel: Admin override, ALWAYS full refund, sets status = 'cancelled'

### Phase 3: Create Admin Action Center Panel

**New File**: `src/components/admin/AdminActionCenter.tsx`

A collapsible panel for quick interventions:

1. **Quick Refund by Booking ID**
   - Input: Booking ID
   - Action: Fetch booking → Show summary → Confirm refund

2. **Dispute Resolution Queue**
   - List of `disputed` bookings
   - Quick action buttons: Refund to Guest | Payout to Host

3. **Pending Alerts**
   - KYC overdue count (link to /admin/kyc)
   - Unresolved support tickets
   - GDPR requests pending

---

## File Changes Summary

| File | Action | Description |
|:-----|:-------|:------------|
| `src/pages/admin/AdminDashboard.tsx` | **EDIT** | Add Pending Escrow, Booking Health, User Growth widgets |
| `src/pages/admin/AdminBookingsPage.tsx` | **EDIT** | Add "Force Cancel" action in dropdown |
| `src/components/admin/AdminActionCenter.tsx` | **CREATE** | Quick intervention panel |
| `src/hooks/admin/useAdminDashboardStats.ts` | **CREATE** | Centralized hook for all dashboard metrics |

---

## Technical Details

### New Hook: `useAdminDashboardStats`

Centralizes all dashboard queries to avoid N+1 issues:

```typescript
export function useAdminDashboardStats() {
  return useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const [pendingEscrow, bookingHealth, userCounts] = await Promise.all([
        // Pending Escrow
        supabase.from('bookings').select('total_price')
          .is('payout_completed_at', null)
          .in('status', ['served', 'confirmed'])
          .is('deleted_at', null),
        // Booking Health
        Promise.all([
          supabase.from('bookings').select('id', { count: 'exact', head: true })
            .eq('status', 'pending_approval').is('deleted_at', null),
          supabase.from('bookings').select('id', { count: 'exact', head: true })
            .eq('status', 'disputed').is('deleted_at', null),
          supabase.from('bookings').select('id', { count: 'exact', head: true })
            .eq('status', 'cancelled')
            .gte('cancelled_at', new Date().toISOString().split('T')[0])
        ]),
        // User counts from existing views
        supabase.from('admin_users_view').select('*', { count: 'exact', head: true })
      ]);

      return {
        pendingEscrow: pendingEscrow.data?.reduce((sum, b) => sum + (b.total_price || 0), 0) || 0,
        pendingApproval: bookingHealth[0].count || 0,
        disputed: bookingHealth[1].count || 0,
        cancelledToday: bookingHealth[2].count || 0,
        totalUsers: userCounts.count || 0,
      };
    },
    refetchInterval: 60000, // Auto-refresh every minute
  });
}
```

### Force Cancel Flow

```text
User clicks "Forza Cancellazione"
        ↓
AlertDialog opens (confirmation)
        ↓
On confirm: Call mutation
        ↓
Mutation:
  1. supabase.functions.invoke('admin-process-refund', {
       body: { bookingId, refundType: 'full', reason: 'Admin force cancel' }
     })
  2. (The edge function already handles status update + logging)
        ↓
Invalidate queries → UI updates
```

### Dashboard Layout (Enhanced)

```text
+--------------------------------------------------+
|  Admin Control Center                            |
|  Overview of platform performance                |
+--------------------------------------------------+
|  [Users]    [Gross Volume]    [Net Revenue]      |  ← Existing
|   1,234      €45,678           €4,567            |
+--------------------------------------------------+
|  [Pending Escrow]  [Pending Approval]  [Issues]  |  ← NEW
|   €42.50 (9)        5 bookings          3 today  |
+--------------------------------------------------+
|                                                  |
|  User Growth (Last 30 Days)                      |  ← NEW
|  ╭──────────────────────────────╮                |
|  │  📈 Hosts vs Coworkers Chart │                |
|  ╰──────────────────────────────╯                |
|                                                  |
+--------------------------------------------------+
```

---

## Security Confirmation

**How URL Guessing is Prevented**:

1. `AdminLayout.tsx` wraps all `/admin/*` routes
2. On mount, it calls `supabase.rpc('is_admin', { p_user_id })` 
3. This RPC is a `SECURITY DEFINER` function that queries `admins` table
4. If not admin, user is redirected to `/`
5. Even if someone bypasses frontend, all sensitive queries hit RLS policies that check `is_admin(auth.uid())`

**Current `is_admin()` function**:
```sql
CREATE FUNCTION public.is_admin()
  RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admins WHERE user_id = (SELECT auth.uid()));
$$
```

This is the correct pattern - no localStorage, no hardcoded credentials, pure database-backed RBAC.

---

## Expected Outcome

After implementation:

1. **Dashboard shows real-time platform pulse**:
   - Financial: GMV + Revenue + Pending Escrow
   - Operational: Pending approvals, disputes, cancellations
   - Growth: Host vs Coworker signup trends

2. **Force Cancel capability**:
   - Admin can cancel any booking with automatic full refund
   - Action is logged to `admin_actions_log`
   - Notifications are triggered

3. **Security unchanged**:
   - Same RPC-based admin verification
   - No new attack vectors introduced
