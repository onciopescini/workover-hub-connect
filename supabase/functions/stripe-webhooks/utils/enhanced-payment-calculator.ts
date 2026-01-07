
import { ErrorHandler } from "./error-handler.ts";
import { PricingEngine } from "../../_shared/pricing-engine.ts";

export class EnhancedPaymentCalculator {
  // Calculate payment breakdown using the centralized Pricing Engine
  static calculateBreakdown(baseAmount: number) {
    const pricing = PricingEngine.calculatePricing(baseAmount);

    return {
      baseAmount: pricing.basePrice,
      buyerFeeAmount: pricing.guestFee,
      vat: pricing.guestVat,
      buyerTotalAmount: pricing.totalGuestPay,
      hostFeeAmount: pricing.hostFee,
      hostNetPayout: pricing.hostPayout,
      platformRevenue: pricing.applicationFee,

      // Legacy Aliases for existing consumers if any
      stripeApplicationFee: pricing.applicationFee,
      stripeTransferAmount: pricing.hostPayout
    };
  }

  static validateBreakdown(
    breakdown: ReturnType<typeof EnhancedPaymentCalculator.calculateBreakdown>,
    sessionAmount: number
  ): boolean {
    const expectedAmount = Math.round(breakdown.buyerTotalAmount * 100); // Stripe uses cents
    
    // Allow 1 cent tolerance for float math
    if (Math.abs(sessionAmount - expectedAmount) > 1) {
      ErrorHandler.logError('Payment amount mismatch', {
        expected: expectedAmount,
        actual: sessionAmount,
        breakdown
      });
      return false;
    }

    return true;
  }

  static logBreakdown(breakdown: ReturnType<typeof EnhancedPaymentCalculator.calculateBreakdown>) {
    ErrorHandler.logInfo('Payment breakdown calculated (New Engine)', {
      baseAmount: breakdown.baseAmount,
      buyerTotalAmount: breakdown.buyerTotalAmount,
      hostNetPayout: breakdown.hostNetPayout,
      platformRevenue: breakdown.platformRevenue
    });
  }
}
