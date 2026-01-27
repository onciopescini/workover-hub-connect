
# Operation 10/10 - Phase 2: Super Admin Dashboard

## Executive Summary

This phase delivers the operational tools required for a single administrator to manage the platform efficiently. We will implement a KYC Approval Queue, Refund/Delete actions in the bookings table, and resurrect critical cron jobs for maintenance automation.

---

## Current State Analysis

### What Exists
| Component | Status | Notes |
|-----------|--------|-------|
| `approve-kyc` Edge Function | ✅ Complete | Handles KYC approval/rejection with notifications |
| `admin-process-refund` Edge Function | ✅ Complete | Stripe refund with DB updates |
| `get_admin_kyc_hosts` RPC | ✅ Complete | Returns hosts filtered by KYC status |
| `kyc-documents` Storage Bucket | ✅ Complete | Private bucket with admin RLS |
| `cleanup_old_application_logs()` Function | ✅ Complete | Function exists, cron is commented out |
| `AdminBookingsPage.tsx` | 🚧 Partial | Read-only, no actions dropdown |
| `AdminKYC.tsx` | ❌ Missing | No UI page exists |
| `retry-failed-invoices` Cron | ❌ Missing | No function or schedule exists |
| Soft-delete for bookings | ❌ Missing | `deleted_at` column not in bookings table |

### E2E Test Expectations
The E2E tests in `tests/e2e/fiscal/kyc-admin-flow.spec.ts` expect:
- Route: `/admin/kyc`
- Data attributes: `data-testid="kyc-card-{email}"`, `data-testid="approve-kyc"`, `data-testid="reject-kyc"`
- Filter: `data-testid="kyc-status-filter"`
- Dialog: `data-testid="kyc-details-dialog"`

---

## Implementation Plan

### 1. KYC Approval Queue

#### 1.1 Create Admin KYC Page

**New File:** `src/pages/admin/AdminKYC.tsx`

This page will:
- Fetch hosts using `get_admin_kyc_hosts` RPC
- Display cards with host info and document counts
- Provide filter by status (pending/approved/rejected/all)
- Support actions: View Documents, Approve, Reject

```typescript
// Key component structure
const AdminKYC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [selectedHost, setSelectedHost] = useState<KYCHost | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Fetch hosts with KYC data
  const { data: hosts, isLoading, refetch } = useQuery({
    queryKey: ['admin_kyc_hosts', statusFilter],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_admin_kyc_hosts', {
        kyc_status_param: statusFilter === 'all' ? null : statusFilter
      });
      if (error) throw error;
      return data as KYCHost[];
    }
  });
  
  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (hostId: string) => {
      const { data, error } = await supabase.functions.invoke('approve-kyc', {
        body: { host_id: hostId, approved: true }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('KYC Approvato');
      refetch();
    }
  });
  
  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ hostId, reason }: { hostId: string; reason: string }) => {
      const { data, error } = await supabase.functions.invoke('approve-kyc', {
        body: { host_id: hostId, approved: false, rejection_reason: reason }
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('KYC Rifiutato');
      refetch();
    }
  });
  
  // View document (signed URL)
  const viewDocument = async (filePath: string) => {
    const { data, error } = await supabase.storage
      .from('kyc-documents')
      .createSignedUrl(filePath, 3600); // 1 hour
    if (data?.signedUrl) {
      window.open(data.signedUrl, '_blank');
    }
  };
};
```

#### 1.2 Add Route and Navigation

**Modify:** `src/components/routing/AppRoutes.tsx`
- Add route: `<Route path="kyc" element={<AdminKYC />} />`

**Modify:** `src/layouts/AdminLayout.tsx`
- Add nav item: `{ label: 'KYC Verification', path: '/admin/kyc', icon: <Shield /> }`

---

### 2. The "Refund Button" (Dispute Resolution)

#### 2.1 Refund Modal Component

**New File:** `src/components/admin/RefundModal.tsx`

```typescript
interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: AdminBooking;
  onSuccess: () => void;
}

const RefundModal: React.FC<RefundModalProps> = ({ isOpen, onClose, booking, onSuccess }) => {
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
  const [amount, setAmount] = useState<number>(0);
  const [reason, setReason] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRefund = async () => {
    setIsProcessing(true);
    try {
      // First, we need the dispute ID - for now, call admin-process-refund with booking context
      // The Edge Function currently requires a disputeId, so we may need to create one
      const { error } = await supabase.functions.invoke('admin-process-refund', {
        body: { 
          bookingId: booking.booking_id,
          refundType,
          amount: refundType === 'partial' ? amount : undefined,
          reason
        }
      });
      
      if (error) throw error;
      
      toast.success('Rimborso elaborato con successo');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error('Errore durante il rimborso');
    } finally {
      setIsProcessing(false);
    }
  };
};
```

#### 2.2 Update Admin Bookings Page

**Modify:** `src/pages/admin/AdminBookingsPage.tsx`

Replace the simple "View" button with a DropdownMenu containing:
- View Details
- Process Refund (opens RefundModal)
- Force Delete (opens confirmation dialog)

```typescript
// New imports
import { MoreHorizontal, Eye, RefreshCcw, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RefundModal } from '@/components/admin/RefundModal';

// State for modals
const [refundBooking, setRefundBooking] = useState<AdminBooking | null>(null);
const [deleteBooking, setDeleteBooking] = useState<AdminBooking | null>(null);

// Delete mutation
const deleteMutation = useMutation({
  mutationFn: async (bookingId: string) => {
    const { error } = await supabase
      .from('bookings')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', bookingId);
    if (error) throw error;
  },
  onSuccess: () => {
    toast.success('Prenotazione eliminata');
    queryClient.invalidateQueries({ queryKey: ['admin_bookings'] });
  }
});

// Replace TableCell action:
<TableCell className="text-right">
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon">
        <MoreHorizontal className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem>
        <Eye className="mr-2 h-4 w-4" />
        Visualizza
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem 
        onClick={() => setRefundBooking(booking)}
        disabled={booking.status === 'refunded'}
      >
        <RefreshCcw className="mr-2 h-4 w-4" />
        Rimborsa
      </DropdownMenuItem>
      <DropdownMenuItem 
        onClick={() => setDeleteBooking(booking)}
        className="text-red-600"
      >
        <Trash2 className="mr-2 h-4 w-4" />
        Elimina (Force)
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</TableCell>
```

#### 2.3 Update Edge Function for Direct Booking Refund

**Modify:** `supabase/functions/admin-process-refund/index.ts`

Add support for direct booking refund (without requiring a dispute):

```typescript
// After parsing request, add alternative path:
const { disputeId, bookingId, refundType, amount, reason } = await req.json();

let targetBookingId = bookingId;

if (disputeId) {
  // Existing dispute-based flow
  const { data: dispute } = await supabaseAdmin
    .from('disputes')
    .select('booking_id, status')
    .eq('id', disputeId)
    .single();
  targetBookingId = dispute.booking_id;
} else if (!bookingId) {
  throw new Error('Either disputeId or bookingId is required');
}

// Rest of refund logic uses targetBookingId...
```

---

### 3. Cron Job Resurrection

#### 3.1 Migration for Cron Jobs

**New File:** `supabase/migrations/YYYYMMDDHHMMSS_resurrect_cron_jobs.sql`

```sql
-- =====================================================
-- CRON JOBS RESURRECTION MIGRATION
-- Purpose: Enable maintenance automation
-- =====================================================

-- 1. ENABLE cleanup-app-logs (was commented out)
-- Runs daily at 3 AM UTC, deletes logs older than 30 days
SELECT cron.schedule(
  'cleanup-app-logs',
  '0 3 * * *', -- Daily at 3:00 AM
  $$SELECT cleanup_old_application_logs()$$
);

-- 2. CREATE retry-failed-invoices cron job
-- Runs nightly at 3 AM UTC to retry invoice generation for failed payments

-- First, create the retry function
CREATE OR REPLACE FUNCTION retry_failed_invoices()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  failed_count INTEGER := 0;
  success_count INTEGER := 0;
  payment_record RECORD;
BEGIN
  -- Find payments without invoices (completed status, no invoice record)
  FOR payment_record IN
    SELECT 
      p.id as payment_id,
      p.booking_id,
      s.host_id,
      p.platform_fee
    FROM payments p
    JOIN bookings b ON b.id = p.booking_id
    JOIN spaces s ON s.id = b.space_id
    LEFT JOIN invoices i ON i.payment_id = p.id
    WHERE p.payment_status IN ('completed', 'succeeded', 'paid')
      AND i.id IS NULL
      AND p.created_at > NOW() - INTERVAL '30 days'
    LIMIT 10
  LOOP
    -- Log attempt
    INSERT INTO application_logs (log_level, message, context, component)
    VALUES ('INFO', 'Retry invoice generation', 
      jsonb_build_object('payment_id', payment_record.payment_id),
      'retry_failed_invoices');
    
    failed_count := failed_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'identified_for_retry', failed_count,
    'timestamp', NOW()
  );
END;
$$;

-- Schedule the retry job
SELECT cron.schedule(
  'retry-failed-invoices',
  '0 3 * * *', -- Daily at 3:00 AM (same as cleanup)
  $$
  SELECT net.http_post(
    url := 'https://khtqwzvrxzsgfhsslwyz.supabase.co/functions/v1/retry-failed-invoices',
    headers := '{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtodHF3enZyeHpzZ2Zoc3Nsd3l6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5NDg0ODUsImV4cCI6MjA2MzUyNDQ4NX0.QThCoBfb0JuFZ5dLru-TNSA_B0PZqp8AL0x0yaEWNFk"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- 3. ADD deleted_at to bookings for soft-delete
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Create partial index for active bookings
CREATE INDEX IF NOT EXISTS idx_bookings_not_deleted 
ON public.bookings(deleted_at) 
WHERE deleted_at IS NULL;

-- Update admin_get_bookings to exclude deleted
-- (Recreate or ALTER the function to filter deleted_at IS NULL)
```

#### 3.2 Create retry-failed-invoices Edge Function

**New File:** `supabase/functions/retry-failed-invoices/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[retry-failed-invoices] Starting batch retry...');

    // Find payments without invoices
    const { data: payments, error: fetchError } = await supabaseAdmin
      .from('payments')
      .select(`
        id,
        booking_id,
        platform_fee,
        amount,
        bookings!inner(
          space_id,
          spaces!inner(host_id)
        )
      `)
      .in('payment_status', ['completed', 'succeeded', 'paid'])
      .gt('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .limit(10);

    if (fetchError) {
      console.error('[retry-failed-invoices] Fetch error:', fetchError);
      throw fetchError;
    }

    // Filter those without invoices
    const paymentIds = payments?.map(p => p.id) || [];
    const { data: existingInvoices } = await supabaseAdmin
      .from('invoices')
      .select('payment_id')
      .in('payment_id', paymentIds);

    const invoicedIds = new Set(existingInvoices?.map(i => i.payment_id) || []);
    const missingInvoices = payments?.filter(p => !invoicedIds.has(p.id)) || [];

    console.log(`[retry-failed-invoices] Found ${missingInvoices.length} payments without invoices`);

    let successCount = 0;
    let failCount = 0;

    for (const payment of missingInvoices) {
      try {
        const hostId = (payment as any).bookings?.spaces?.host_id;
        if (!hostId) {
          console.log(`[retry-failed-invoices] No host_id for payment ${payment.id}, skipping`);
          continue;
        }

        const hostFee = Number(payment.platform_fee || 0) / 2;
        const hostVat = hostFee * 0.22;

        const { error: invokeError } = await supabaseAdmin.functions.invoke('generate-host-invoice', {
          body: {
            payment_id: payment.id,
            booking_id: payment.booking_id,
            host_id: hostId,
            breakdown: {
              host_fee: hostFee,
              host_vat: hostVat,
              total: hostFee + hostVat
            }
          }
        });

        if (invokeError) {
          console.error(`[retry-failed-invoices] Failed for payment ${payment.id}:`, invokeError);
          failCount++;
        } else {
          console.log(`[retry-failed-invoices] Success for payment ${payment.id}`);
          successCount++;
        }
      } catch (e) {
        console.error(`[retry-failed-invoices] Exception for payment ${payment.id}:`, e);
        failCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: missingInvoices.length,
        succeeded: successCount,
        failed: failCount
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[retry-failed-invoices] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

---

### 4. Delete Booking (Nuclear Option)

#### 4.1 Soft-Delete Implementation

The migration in section 3.1 adds the `deleted_at` column. The UI implementation in section 2.2 adds the "Force Delete" action.

#### 4.2 Update admin_get_bookings RPC

**Modify via Migration:** The RPC should filter out deleted bookings:

```sql
-- In the same migration file, recreate the RPC
CREATE OR REPLACE FUNCTION admin_get_bookings()
RETURNS TABLE(...) AS $$
BEGIN
  RETURN QUERY
  SELECT ...
  FROM bookings b
  WHERE b.deleted_at IS NULL  -- Add this filter
  ...
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## Files Summary

### Files to Create

| File | Description |
|------|-------------|
| `src/pages/admin/AdminKYC.tsx` | KYC Approval Queue page |
| `src/components/admin/RefundModal.tsx` | Refund processing modal |
| `supabase/migrations/YYYYMMDDHHMMSS_resurrect_cron_jobs.sql` | Cron jobs + soft-delete column |
| `supabase/functions/retry-failed-invoices/index.ts` | Retry invoice generation Edge Function |

### Files to Modify

| File | Changes |
|------|---------|
| `src/pages/admin/AdminBookingsPage.tsx` | Add dropdown actions, refund modal, delete dialog |
| `src/components/routing/AppRoutes.tsx` | Add `/admin/kyc` route |
| `src/layouts/AdminLayout.tsx` | Add KYC nav item with Shield icon |
| `supabase/functions/admin-process-refund/index.ts` | Support direct booking refund (without dispute) |

---

## Type Definitions

### KYCHost Interface

```typescript
// src/types/admin.ts - add this interface
export interface KYCHost {
  host_id: string;
  first_name: string;
  last_name: string;
  email: string;
  kyc_verified: boolean | null;
  kyc_rejection_reason: string | null;
  stripe_connected: boolean;
  created_at: string;
  kyc_documents_count: number;
  tax_details_count: number;
  active_spaces_count: number;
  total_bookings_count: number;
}
```

---

## Verification Checklist

After implementation:
- [ ] `/admin/kyc` route accessible and shows pending hosts
- [ ] KYC Approve button triggers `approve-kyc` function
- [ ] KYC Reject button requires reason and sends notification
- [ ] "View Doc" opens signed URL in new tab
- [ ] AdminBookingsPage has 3-dot dropdown menu
- [ ] Refund modal opens and processes refund
- [ ] Force Delete sets `deleted_at` and removes from list
- [ ] `cron.job` table shows `cleanup-app-logs` scheduled
- [ ] `cron.job` table shows `retry-failed-invoices` scheduled
- [ ] Edge Functions deploy without errors
- [ ] `npm run build` succeeds

---

## Security Considerations

| Action | Protection |
|--------|------------|
| KYC Approval | `is_admin()` check in Edge Function |
| Refund | `is_admin()` check + Stripe API validation |
| Delete Booking | Soft-delete only (recoverable) + RLS |
| Cron Jobs | Service role key in headers |

---

## Operational Impact

| Metric | Before | After |
|--------|--------|-------|
| Manual KYC Review | Database queries | 1-click UI |
| Refund Processing | Edge Function call | Button in table |
| Invoice Retry | Manual reconciliation | Automated nightly |
| Log Cleanup | Never (accumulating) | Daily purge (30d) |
| Booking Deletion | Not possible | Soft-delete with audit |
