/**
 * Shared Pricing Engine - Force Update
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
   * LOGIC:
   * 1. Guest Fee = 5% of Base (Floor: €0.50)
   * 2. Guest VAT = 22% of Guest Fee
   * 3. Total Guest Pay = Base + Guest Fee + Guest VAT
   * 4. Host Fee = 5% of Base
   * 5. Host Payout = Base - Host Fee
   * 6. Application Fee (Platform Revenue) = Total Guest Pay - Host Payout
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

    // 4. Host Fee Calculation (No floor specified for host)
    const hostFee = round(basePrice * PricingEngine.HOST_FEE_PERCENT);

    // 5. Host Payout (What the host receives)
    const hostPayout = round(basePrice - hostFee);

    // 6. Application Fee (What Stripe transfers to the Platform)
    // This must equal: Guest Fee + Guest VAT + Host Fee
    // Calculation: Total Charge - Host Payout
    const applicationFee = round(totalGuestPay - hostPayout);

    return {
      basePrice: round(basePrice),
      guestFee,
      guestVat,
      totalGuestPay,
      hostFee,
      hostPayout,
      applicationFee
    };
  }
};
