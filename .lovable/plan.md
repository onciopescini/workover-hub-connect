

# DEEP AUDIT: Cancellation Policy & Refund Logic

## Executive Summary

After a comprehensive code review of the cancellation and refund mechanisms, I found **3 CRITICAL schema bugs** and **1 LOGIC concern**. The good news: the Stripe interaction logic is fundamentally correct.

---

## PHASE 1: LOGIC INSPECTION RESULTS

### 1. `host-reject-booking/index.ts` - ✅ CORRECT

| Check | Status | Details |
|:------|:-------|:--------|
| **Mechanism** | ✅ Correct | Uses `stripe.paymentIntents.cancel()` for `requires_capture` status (lines 185-191) |
| **Fallback** | ✅ Correct | If PI already captured (`succeeded`), correctly creates refund instead (lines 195-204) |
| **Idempotency** | ✅ Correct | Handles already-canceled PI gracefully (lines 192-194) |
| **DB Update** | ✅ Correct | Sets `status: 'cancelled'`, `cancelled_by_host: true` (lines 223-232) |

**Code Snippet (lines 185-191):**
```typescript
if (pi.status === 'requires_capture') {
  await stripe.paymentIntents.cancel(pi.id, {
    cancellation_reason: 'requested_by_customer'
  });
}
```

**Verdict:** This function correctly handles host rejection - it releases the authorization hold (not refund) for pending Request to Book flows.

---

### 2. `cancel-booking/index.ts` - ⚠️ HAS BUGS

| Check | Status | Details |
|:------|:-------|:--------|
| **Policy Check** | ✅ Yes | Uses `booking.cancellation_policy` from DB (line 136) |
| **Timing Check** | ✅ Yes | Calculates `bookingDateTime` from `booking_date + start_time` (lines 187-190) |
| **Refund Math** | ✅ Correct | Uses `calculateRefund()` from policy-calculator (line 193) |
| **Platform Fee** | ⚠️ Partial | Refunds are based on `basePriceCents` (line 229), not gross amount |
| **Host Transfer Reversal** | ✅ Yes | Reverses host transfer proportionally (lines 236-247) |
| **Schema Bug** | ❌ CRITICAL | Line 105: `title:name` - column `name` doesn't exist! |

**Code Snippet (line 105) - BUG:**
```typescript
.select('host_id, title:name')  // ← FAILS: "name" column doesn't exist
```

**Verdict:** The logic is sound, but **this function will crash silently** due to the schema mismatch, causing `workspace` to be `null` and the host check to fail.

---

### 3. `policy-calculator.ts` - ✅ CORRECT

The policy calculator implements correct refund percentages:

| Policy | >7 days | 5-7 days | 24h-5 days | <24h |
|:-------|:--------|:---------|:-----------|:-----|
| **Flexible** | 100% | 100% | 100% | 0% |
| **Moderate** | 100% | 100% | 50% | 0% |
| **Strict** | 50% | 0% | 0% | 0% |

---

### 4. `booking-expiry-check/index.ts` - ✅ CORRECT

| Check | Status | Details |
|:------|:-------|:--------|
| **Auth Release** | ✅ Yes | Correctly calls `stripe.paymentIntents.cancel()` for expired `pending_approval` bookings (lines 45-54) |
| **DB Update** | ✅ Yes | Sets `status: 'cancelled'` with appropriate reason |

---

## PHASE 2: DATA INTEGRITY SIMULATION

### Scenario: User Cancels Confirmed Booking (Late)

1. **cancel-booking** is invoked
2. Query for `workspace` FAILS due to `title:name` bug → `workspace = null`
3. Function returns 404 "Workspace not found" (line 110-114)
4. **No Stripe refund is processed**
5. **Booking remains in `confirmed` status**

**Impact:** User sees error, no refund happens, booking is NOT cancelled.

### Scenario: Host Rejects Request to Book

1. **host-reject-booking** is invoked
2. Correctly fetches `space` with `title` (FIXED in last deploy)
3. Calls `stripe.paymentIntents.cancel()` to release authorization
4. Updates booking to `status: 'cancelled'`
5. Payment record updated to `payment_status: 'cancelled'` (via code logic)

**Impact:** ✅ Works correctly after CORS/schema fix.

---

## REFUND LOGIC AUDIT REPORT

| Scenario | Current Code Logic | Stripe Method | Potential Risk |
|:---------|:-------------------|:--------------|:---------------|
| **Host Reject** | Check PI status. If `requires_capture` → cancel. If `succeeded` → refund 100%. | `paymentIntents.cancel()` or `refunds.create()` | ✅ OK |
| **User Cancel (Free)** | Calculate refund via policy-calculator. If `refundPercentage = 1.0` → full refund. Reverses host transfer. | `transfers.createReversal()` + `refunds.create()` | ❌ **BLOCKED BY SCHEMA BUG** |
| **User Cancel (Late)** | Calculate refund via policy-calculator. If `refundPercentage < 1.0` → partial refund. | `refunds.create({ amount })` | ❌ **BLOCKED BY SCHEMA BUG** |
| **System Auto-Cancel (Expiry)** | Release auth if PI exists. Pure DB cancel. | `paymentIntents.cancel()` | ✅ OK |

---

## CRITICAL BUGS FOUND

### Bug 1: `cancel-booking/index.ts` Line 105
```typescript
.select('host_id, title:name')  // "name" column doesn't exist
```
**Impact:** ALL user-initiated and host-initiated cancellations fail with 404.

### Bug 2: `booking-service.ts` Line 19
```typescript
title:name  // "name" column doesn't exist
```
**Impact:** Webhook may fail to fetch booking details correctly.

### Bug 3: `admin-process-refund/index.ts` Lines 81-88
```typescript
.in('payment_status', ['succeeded', 'paid'])  // "paid" is not a valid enum value
```
**Impact:** Admin refunds may fail for valid payments.

---

## RECOMMENDED FIXES

### Fix 1: `cancel-booking/index.ts` (CRITICAL)
**Line 105:** Change `title:name` to `title`

```typescript
// BEFORE
.select('host_id, title:name')

// AFTER
.select('host_id, title')
```

### Fix 2: `booking-service.ts` (CRITICAL)
**Line 19:** Change `title:name` to `title`

```typescript
// BEFORE
title:name

// AFTER
title
```

### Fix 3: `admin-process-refund/index.ts` (MEDIUM)
**Line 85:** Fix payment status filter

```typescript
// BEFORE
.in('payment_status', ['succeeded', 'paid'])

// AFTER
.in('payment_status', ['completed', 'succeeded'])  // Match actual enum values
```

---

## Summary Matrix

| Component | Status | Issue | Priority |
|:----------|:-------|:------|:---------|
| `host-reject-booking` | ✅ Fixed | None (after last deploy) | - |
| `cancel-booking` | ❌ BROKEN | Schema bug line 105 | **CRITICAL** |
| `booking-service.ts` | ❌ BROKEN | Schema bug line 19 | **CRITICAL** |
| `admin-process-refund` | ⚠️ Degraded | Wrong status filter | MEDIUM |
| `policy-calculator` | ✅ OK | None | - |
| `booking-expiry-check` | ✅ OK | None | - |

---

## Deployment Order

1. Fix schema bugs in `cancel-booking` and `booking-service.ts`
2. Fix payment status filter in `admin-process-refund`
3. Deploy all three Edge Functions
4. Test user cancellation flow

