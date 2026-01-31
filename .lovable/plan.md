
# Notification System Repair Plan

## Problem Summary

Three critical issues need to be fixed:

1. **Host Rejection Bug (P1)**: The `host-reject-booking` function calls `send-booking-notification` with `type: 'rejection'`, but the Zod schema only allows `['confirmation', 'new_request', 'host_confirmation', 'refund']`, causing the call to fail with a 400 Bad Request.

2. **Cancellation Notifications Gap (P2)**: The `cancel-booking` function processes refunds correctly but never notifies either party (guest or host) via email or in-app notification.

3. **In-App Consistency**: Both rejection and cancellation events should insert records into `user_notifications` for in-app visibility.

---

## Implementation Plan

### Phase 1: Fix Host Rejection Notifications

**File Changes:**

**1. Update `supabase/functions/send-booking-notification/index.ts`**

Add 'rejection' to the Zod enum and implement the case handler:

```typescript
// Line 18: Update Zod schema
const requestSchema = z.object({
  type: z.enum(['confirmation', 'new_request', 'host_confirmation', 'refund', 'rejection', 'cancellation']),
  booking_id: z.string().uuid(),
  metadata: z.record(z.any()).optional()
});
```

Add the rejection case in the switch statement (after the refund case, around line 207):

```typescript
case 'rejection': {
  // Notify Guest that their request was rejected
  emailRequest = {
    type: 'booking_cancelled',  // Reuse existing cancellation template
    to: booking.user.email,
    data: {
      userName: guestName,
      spaceTitle: spaceTitle,
      bookingDate: formatDate(booking.booking_date),
      reason: metadata?.reason || 'L\'host non ha potuto accettare la tua richiesta',
      cancellationFee: 0,
      refundAmount: 0, // Authorization released, no actual refund
      currency: booking.currency || 'eur',
      bookingId: booking.id,
      cancelledByHost: true
    }
  };

  notificationRequest = {
    user_id: booking.user_id,
    type: 'booking',
    title: 'Richiesta Rifiutata ❌',
    content: `L'host ha rifiutato la tua richiesta per "${spaceTitle}".`,
    metadata: { booking_id: booking.id, type: 'rejection', reason: metadata?.reason }
  };
  break;
}
```

**2. Verify `supabase/functions/host-reject-booking/index.ts`**

The existing call is correct (line 245-247):
```typescript
await supabaseAdmin.functions.invoke('send-booking-notification', {
  body: { booking_id: booking_id, type: 'rejection' }
});
```

Add the reason to the payload for better user context:
```typescript
await supabaseAdmin.functions.invoke('send-booking-notification', {
  body: { 
    booking_id: booking_id, 
    type: 'rejection',
    metadata: { reason: reason }
  }
});
```

---

### Phase 2: Implement Cancellation Notifications

**File Changes:**

**1. Update `supabase/functions/send-booking-notification/index.ts`**

Add the cancellation case (after the rejection case):

```typescript
case 'cancellation': {
  const cancelledByHost = metadata?.cancelled_by_host === true;
  const refundAmount = metadata?.refund_amount || 0;
  const cancellationFee = metadata?.cancellation_fee || 0;
  
  // Email to Guest
  emailRequest = {
    type: 'booking_cancelled',
    to: booking.user.email,
    data: {
      userName: guestName,
      spaceTitle: spaceTitle,
      bookingDate: formatDate(booking.booking_date),
      reason: metadata?.reason || (cancelledByHost ? 'Cancellata dall\'host' : 'Cancellata su richiesta'),
      cancellationFee: cancellationFee,
      refundAmount: refundAmount,
      currency: booking.currency || 'eur',
      bookingId: booking.id,
      cancelledByHost: cancelledByHost
    }
  };

  // In-App notification to the affected party
  if (cancelledByHost) {
    // Host cancelled → Notify Guest
    notificationRequest = {
      user_id: booking.user_id,
      type: 'booking',
      title: 'Prenotazione Cancellata ❌',
      content: `L'host ha cancellato la prenotazione per "${spaceTitle}". Riceverai un rimborso completo.`,
      metadata: { booking_id: booking.id, type: 'cancellation', refund_amount: refundAmount }
    };
  } else {
    // Guest cancelled → Notify Host
    notificationRequest = {
      user_id: hostProfile.id,
      type: 'booking',
      title: 'Prenotazione Cancellata ❌',
      content: `${guestName} ha cancellato la prenotazione per "${spaceTitle}".`,
      metadata: { booking_id: booking.id, type: 'cancellation' }
    };
  }
  break;
}
```

**2. Update `supabase/functions/cancel-booking/index.ts`**

After the successful DB update (around line 306), add notification dispatch:

```typescript
// 9. NOTIFICATIONS (After successful DB update)
try {
  console.log(`[cancel-booking] Dispatching notifications...`);
  
  const refundAmountEuros = refundId 
    ? (grossAmountCents ? grossAmountCents / 100 : booking.total_price || 0)
    : 0;
  
  const { error: notifyError } = await supabaseClient.functions.invoke('send-booking-notification', {
    body: {
      type: 'cancellation',
      booking_id: booking_id,
      metadata: {
        cancelled_by_host: cancelled_by_host,
        refund_amount: refundAmountEuros,
        cancellation_fee: 0,
        reason: reason || (cancelled_by_host ? 'Cancellata dall\'host' : 'Cancellata dall\'ospite')
      }
    }
  });

  if (notifyError) {
    console.error('[cancel-booking] Notification dispatch failed:', notifyError);
  } else {
    console.log('[cancel-booking] Notifications dispatched successfully');
  }
} catch (notifyErr) {
  console.error('[cancel-booking] Notification error (non-blocking):', notifyErr);
}
```

---

### Phase 3: Also Notify Host When Guest's Request is Rejected

When a host rejects a booking, the host should also receive confirmation. Add a second notification insert in `send-booking-notification` for the rejection case:

```typescript
case 'rejection': {
  // ... existing email to guest ...
  
  // Also notify Host (confirmation of their action)
  const hostNotification = {
    user_id: hostProfile.id,
    type: 'booking',
    title: 'Richiesta Rifiutata',
    content: `Hai rifiutato la richiesta di ${guestName} per "${spaceTitle}".`,
    metadata: { booking_id: booking.id, type: 'rejection_confirmed' }
  };
  
  // Insert host notification (non-blocking)
  await supabaseAdmin.from('user_notifications').insert(hostNotification);
  
  // ... existing guest notification ...
}
```

---

## Files to Modify

| File | Changes |
|:-----|:--------|
| `supabase/functions/send-booking-notification/index.ts` | Add 'rejection' and 'cancellation' to Zod schema; implement both switch cases |
| `supabase/functions/host-reject-booking/index.ts` | Pass reason in metadata when calling send-booking-notification |
| `supabase/functions/cancel-booking/index.ts` | Add notification dispatch after successful cancellation |

---

## Technical Details

### Updated Zod Schema
```typescript
const requestSchema = z.object({
  type: z.enum([
    'confirmation',     // Booking confirmed (instant or manual)
    'new_request',      // New booking request for host
    'host_confirmation', // Host gets confirmation of booking
    'refund',           // Refund processed (admin)
    'rejection',        // NEW: Host rejected request
    'cancellation'      // NEW: Booking cancelled by either party
  ]),
  booking_id: z.string().uuid(),
  metadata: z.record(z.any()).optional()
});
```

### Notification Flow After Changes

| Event | Guest Email | Guest In-App | Host Email | Host In-App |
|:------|:------------|:-------------|:-----------|:------------|
| **Host Rejects** | Yes (booking_cancelled) | Yes | No | Yes (action confirmed) |
| **Guest Cancels** | Yes (booking_cancelled) | No | Yes (host_booking_cancelled) | Yes |
| **Host Cancels** | Yes (booking_cancelled) | Yes | No | No |

### Email Template Reuse
- Rejection uses `booking_cancelled` template with `cancelledByHost: true`
- Cancellation uses `booking_cancelled` for guest, `host_booking_cancelled` for host

---

## Verification Steps

After deployment:

1. **Test Rejection Flow**: Create a booking request, have host reject it, verify:
   - Guest receives rejection email
   - Guest sees in-app notification
   - Host sees confirmation notification

2. **Test Guest Cancellation**: Create confirmed booking, cancel as guest, verify:
   - Guest receives cancellation email with refund info
   - Host receives in-app notification about freed slot

3. **Test Host Cancellation**: Create confirmed booking, cancel as host, verify:
   - Guest receives cancellation email with full refund
   - Guest sees in-app notification
