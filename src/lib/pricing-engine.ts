/**
 * Shared Pricing Engine - Dual Fee Model (Gold Standard)
 * 
 * BUSINESS RULE: 5% fee from BOTH sides + 22% VAT on each fee
 * 
 * For €100 base price:
 * - Coworker pays: €106.10 (100 + 5 + 1.10)
 * - Host receives: €93.90 (100 - 5 - 1.10)
 * - Platform gets: €12.20
 */
export const PricingEngine = {
  // Constants
  GUEST_FEE_PERCENT: 0.05,
  HOST_FEE_PERCENT: 0.05,
  MIN_GUEST_FEE: 0.50, // EUR
  VAT_RATE: 0.22,

  /**
   * Calculates the full pricing breakdown based on the Base Price set by the Host.
   *
   * LOGIC (Dual Fee Model):
   * 1. Guest Fee = 5% of Base (Floor: €0.50)
   * 2. Guest VAT = 22% of Guest Fee
   * 3. Total Guest Pay = Base + Guest Fee + Guest VAT
   * 4. Host Fee = 5% of Base
   * 5. Host VAT = 22% of Host Fee
   * 6. Host Payout = Base - Host Fee - Host VAT
   * 7. Application Fee (Platform Revenue) = Total Guest Pay - Host Payout
   */
  calculatePricing: (basePrice: number) => {
    // Rounding helper (2 decimal places)
    const round = (num: number) => Math.round(num * 100) / 100;

    // 1. Guest Fee Calculation
    const rawGuestFee = basePrice * PricingEngine.GUEST_FEE_PERCENT;
    // Apply Minimum Floor (€0.50)
    const guestFee = round(Math.max(rawGuestFee, PricingEngine.MIN_GUEST_FEE));

    // 2. Guest VAT
    const guestVat = round(guestFee * PricingEngine.VAT_RATE);

    // 3. Total Guest Pay (What the user is charged)
    const totalGuestPay = round(basePrice + guestFee + guestVat);

    // 4. Host Fee Calculation
    const hostFee = round(basePrice * PricingEngine.HOST_FEE_PERCENT);

    // 5. Host VAT (NEW - per Dual Fee Model)
    const hostVat = round(hostFee * PricingEngine.VAT_RATE);

    // 6. Host Payout (What the host receives after fees + VAT)
    const hostPayout = round(basePrice - hostFee - hostVat);

    // 7. Application Fee (What Stripe transfers to the Platform)
    // This equals: Guest Fee + Guest VAT + Host Fee + Host VAT
    const applicationFee = round(totalGuestPay - hostPayout);

    return {
      basePrice: round(basePrice),
      guestFee,
      guestVat,
      totalGuestPay,
      hostFee,
      hostVat,
      hostPayout,
      applicationFee
    };
  }
};
