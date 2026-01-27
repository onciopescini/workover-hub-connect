

# HOTFIX: Dual Fee Architecture & Stability (Gold Standard)

## Executive Summary

This plan addresses **two critical issues**:
1. **Pricing Engine Mismatch** - Current logic differs from the user's specified formula
2. **500 Error Root Cause** - The `validate-payment` function sets `payment_status = 'completed'` but the database trigger checks for `payment_status_enum = 'succeeded'`

---

## Transaction Simulation Tables

### CURRENT IMPLEMENTATION (€100 Base Price)

| Component | Formula | Value (€) |
|:----------|:--------|----------:|
| **Base Price** | Input | €100.00 |
| Guest Fee | 100 × 5% | €5.00 |
| Guest VAT | 5 × 22% | €1.10 |
| **User Pays** | 100 + 5 + 1.10 | **€106.10** |
| Host Fee | 100 × 5% | €5.00 |
| **Host Receives** | 100 - 5 | **€95.00** |
| **Platform Net** | 106.10 - 95.00 | **€11.10** |

### USER'S REQUIRED IMPLEMENTATION (€100 Base Price)

| Component | Formula | Value (€) |
|:----------|:--------|----------:|
| **Base Price** | Input | €100.00 |
| Coworker Fee | 100 × 5% | €5.00 |
| Coworker VAT | 5 × 22% | €1.10 |
| **User Pays** | 100 + 5 + 1.10 | **€106.10** |
| Host Fee | 100 × 5% | €5.00 |
| Host VAT | 5 × 22% | €1.10 |
| **Host Receives** | 100 - 5 - 1.10 | **€93.90** |
| **Platform Net** | 106.10 - 93.90 | **€12.20** |

---

## Critical Decision Required

The user's task specifies that **Host VAT should be deducted from the Host Payout**:

```
Host Payout = X - (X * 0.05) - (X * 0.05 * 0.22)
Example (€100): 100 - 5 - 1.10 = €93.90
```

However, the current `PricingEngine` does NOT apply VAT to the host side:

```typescript
// Current (line 41 of _shared/pricing-engine.ts)
const hostPayout = round(basePrice - hostFee);  // €95.00

// User's Requirement
const hostPayout = round(basePrice - hostFee - hostVat);  // €93.90
```

**This is a business decision** - we can either:
- **Option A**: Keep current logic (€95 to host, €11.10 to platform)
- **Option B**: Implement user's specified formula (€93.90 to host, €12.20 to platform)

---

## Technical Root Cause: 500 Error

The Edge Function logs reveal the exact error:

```
Error updating booking: {
  code: "P0001",
  message: "Cannot confirm booking without a succeeded payment."
}
```

### The Bug

1. **Database Trigger** (`guard_confirm_without_success`):
   ```sql
   IF NOT EXISTS (
     SELECT 1 FROM public.payments p
     WHERE p.booking_id = NEW.id
       AND p.payment_status_enum = 'succeeded'  -- ← Checks THIS column
   ) THEN
     RAISE EXCEPTION 'Cannot confirm booking without a succeeded payment.';
   END IF;
   ```

2. **validate-payment Function** (line 107):
   ```typescript
   payment_status: 'completed',  // ← Sets the WRONG column (text field)
   // Missing: payment_status_enum: 'succeeded'
   ```

3. **Result**: The trigger checks `payment_status_enum` (which is never set to 'succeeded'), so booking confirmation always fails.

---

## Implementation Plan

### Phase 1: Fix validate-payment (Critical - Stops 500 Errors)

**File:** `supabase/functions/validate-payment/index.ts`

**Changes:**
1. Set `payment_status_enum: 'succeeded'` when inserting/updating payment
2. Use consistent status values across both columns

```typescript
// Line ~102-113: INSERT case
const { error: insertError } = await supabaseAdmin
  .from('payments')
  .insert({
    booking_id: session.metadata.booking_id,
    user_id: session.metadata.user_id,
    amount: totalAmount,
    currency: (session.currency || 'eur').toUpperCase(),
    payment_status: 'completed',
    payment_status_enum: 'succeeded',  // ADD THIS LINE
    stripe_session_id: session_id,
    receipt_url: session.receipt_url,
    host_amount: hostAmount,
    platform_fee: platformFee,
    method: 'stripe'
  });

// Line ~126-131: UPDATE case
const { error: updateError } = await supabaseAdmin
  .from('payments')
  .update({
    payment_status: 'completed',
    payment_status_enum: 'succeeded',  // ADD THIS LINE
    receipt_url: session.receipt_url
  })
  .eq('id', existingPayment.id);
```

### Phase 2: Fix Pricing Engine (If Option B Chosen)

**File:** `supabase/functions/_shared/pricing-engine.ts`

**Changes** (only if user confirms Option B):
```typescript
calculatePricing: (basePrice: number) => {
  const round = (num: number) => Math.round(num * 100) / 100;

  // Guest side (unchanged)
  const rawGuestFee = basePrice * PricingEngine.GUEST_FEE_PERCENT;
  const guestFee = round(Math.max(rawGuestFee, PricingEngine.MIN_GUEST_FEE));
  const guestVat = round(guestFee * PricingEngine.VAT_RATE);
  const totalGuestPay = round(basePrice + guestFee + guestVat);

  // Host side (UPDATED per user requirement)
  const hostFee = round(basePrice * PricingEngine.HOST_FEE_PERCENT);
  const hostVat = round(hostFee * PricingEngine.VAT_RATE);  // NEW LINE
  const hostPayout = round(basePrice - hostFee - hostVat);  // CHANGED

  // Platform revenue recalculated
  const applicationFee = round(totalGuestPay - hostPayout);

  return {
    basePrice: round(basePrice),
    guestFee,
    guestVat,
    totalGuestPay,
    hostFee,
    hostVat,     // NEW FIELD
    hostPayout,
    applicationFee
  };
}
```

**Also update:** `src/lib/pricing-engine.ts` (frontend copy for UI display)

### Phase 3: Sync Frontend Pricing Engine

If Phase 2 is implemented, the frontend `src/lib/pricing-engine.ts` must be updated to match.

---

## Files to Modify

| File | Changes | Priority |
|------|---------|----------|
| `supabase/functions/validate-payment/index.ts` | Add `payment_status_enum: 'succeeded'` | **CRITICAL** |
| `supabase/functions/_shared/pricing-engine.ts` | Add hostVat calculation (if Option B) | Medium |
| `src/lib/pricing-engine.ts` | Mirror backend changes (if Option B) | Medium |

---

## Deployment Steps

1. Deploy `validate-payment` first (stops 500 errors immediately)
2. If pricing change approved, deploy pricing engine updates
3. Test a complete payment flow end-to-end

---

## Verification Checklist

After implementation:
- [ ] Payment completes without 500 error
- [ ] Booking status changes to 'confirmed' 
- [ ] `payments.payment_status_enum` is 'succeeded'
- [ ] Stripe Dashboard shows correct application fee

---

## Summary

| Issue | Root Cause | Fix |
|-------|------------|-----|
| **500 Error** | Trigger checks `payment_status_enum` but code sets `payment_status` | Add `payment_status_enum: 'succeeded'` |
| **Pricing Discrepancy** | Current: Host gets €95; Required: Host gets €93.90 | Update PricingEngine (pending confirmation) |

