# Manual Testing Checklist - Staging Environment

## 🎯 Prerequisites
- [ ] Staging environment accessible
- [ ] Test users created (admin, host forfettario, host privato, coworker verified/unverified)
- [ ] Stripe test mode active (pk_test_...)
- [ ] Resend sandbox configured
- [ ] Cron jobs enabled via feature flags

---

## 📝 Test Scenarios

### SCENARIO 1: Complete Fiscal Flow (P.IVA Forfettario)

**Tester**: `coworker.verified@test.workover.app`  
**Host**: `host.forfettario@test.workover.app` (Stripe connected)

#### Steps:
1. **Login** as coworker
2. **Navigate** to space "Spazio Forfettario Test"
3. **Book** tomorrow, 09:00-12:00 (3h @ €15/h = €45 base)
4. **Verify pricing breakdown**:
   - Base: €45.00
   - Service fee (10%): €4.50
   - IVA (22% on service fee): €0.99
   - **Total: €50.49**
5. **Confirm** → Redirect to Stripe Checkout (test mode)
6. **Use Stripe test card**: `4242 4242 4242 4242`
7. **Complete payment** → Redirected to `/success`
8. **Verify booking status**: "Confermata"
9. **Verify payment record** in admin panel:
   - `payment_status = 'completed'`
   - `host_amount = €45.00`
   - `platform_fee = €5.49` (service fee + IVA)

#### Expected Results:
- ✅ Pricing calculation correct (2 decimal rounding)
- ✅ Stripe checkout completes without errors
- ✅ Booking confirmed after payment
- ✅ Payment breakdown stored correctly

---

### SCENARIO 2: Host Discount Impact on Service Fee

**Tester**: Same as above  
**Space**: Enable 20% discount code `HOST20`

#### Steps:
1. **Book** same space, same time
2. **Apply discount code** `HOST20` at checkout
3. **Verify new pricing**:
   - Base: ~~€45.00~~ **→ €36.00** (20% off)
   - Service fee (10% di €36): **€3.60**
   - IVA (22% di €3.60): **€0.79**
   - **Total: €40.39**
4. **Complete payment**
5. **Verify** in DB:
   - Payment `amount = 40.39`
   - Payment `host_amount = 36.00`
   - Payment `platform_fee = 4.39`

#### Expected Results:
- ✅ Service fee calculated on discounted base (NOT original)
- ✅ IVA adjusted accordingly
- ✅ Host receives discounted amount (€36)

---

### SCENARIO 3: RLS Email Gating

**Tester**: `coworker.unverified@test.workover.app`

#### Steps:
1. **Login** as unverified coworker
2. **Try to book** any space
3. **Verify**: Blocked at checkout with message
   - "Email non verificata"
   - Button: "Verifica email"
4. **Verify error**: Toast with friendly message (NOT raw RLS error)

#### Expected Results:
- ✅ RLS policy blocks unverified user
- ✅ `useRLSErrorHandler` catches error
- ✅ User sees friendly UI message

---

### SCENARIO 4: RLS Stripe Gating (Host)

**Tester**: `host.nostripe@test.workover.app`

#### Steps:
1. **Login** as host without Stripe
2. **Create unpublished space**
3. **Try to publish** space
4. **Verify**: Blocked with message
   - "Stripe non connesso"
   - Button: "Completa onboarding Stripe"

#### Expected Results:
- ✅ RLS blocks publish without Stripe
- ✅ Friendly error message shown
- ✅ CTA button redirects to Stripe onboarding

---

### SCENARIO 5: Admin Access Control

**Tester**: `admin@test.workover.app`

#### Steps:
1. **Login** as admin
2. **Navigate** to `/admin`
3. **Verify access** to:
   - User management
   - Space management
   - Payment records
   - Cron job monitoring

#### Expected Results:
- ✅ Admin dashboard accessible
- ✅ All admin widgets visible
- ✅ No permission errors

---

### SCENARIO 6: Non-Admin Cannot Access Admin Panel

**Tester**: `coworker.verified@test.workover.app`

#### Steps:
1. **Login** as coworker
2. **Try to navigate** to `/admin`
3. **Verify**: Redirected or blocked with message

#### Expected Results:
- ✅ Access denied for non-admin
- ✅ Friendly error message
- ✅ Redirect to homepage

---

## 📊 Test Summary Report

### Completion Checklist
- [ ] All 6 scenarios executed
- [ ] All ✅ checkmarks verified
- [ ] No critical errors found
- [ ] Performance acceptable (< 3s checkout flow)
- [ ] Timezone correct (Europe/Rome)
- [ ] Email delivery working (if applicable)
- [ ] Stripe test mode payments successful
- [ ] RLS policies enforcing correctly
- [ ] Dashboard monitoring data accurate

### Sign-Off
- **Tester Name**: ___________________
- **Date**: ___________________
- **Status**: 🟢 PASS / 🔴 FAIL
- **Notes**: ___________________
