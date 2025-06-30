
import { ErrorHandler } from "./error-handler.ts";

export class EnhancedPaymentCalculator {
  // Calculate payment breakdown with dual commission model
  static calculateBreakdown(baseAmount: number) {
    const buyerFeeAmount = Math.round(baseAmount * 0.05 * 100) / 100;
    const buyerTotalAmount = baseAmount + buyerFeeAmount;
    
    const hostFeeAmount = Math.round(baseAmount * 0.05 * 100) / 100;
    const hostNetPayout = baseAmount - hostFeeAmount;
    
    const platformRevenue = buyerFeeAmount + hostFeeAmount;
    
    // For Stripe Connect: application fee includes both commissions
    const stripeApplicationFee = Math.round(baseAmount * 0.10 * 100) / 100;
    const stripeTransferAmount = hostNetPayout;

    return {
      baseAmount,
      buyerFeeAmount,
      buyerTotalAmount,
      hostFeeAmount,
      hostNetPayout,
      platformRevenue,
      stripeApplicationFee,
      stripeTransferAmount
    };
  }

  static validateBreakdown(
    breakdown: ReturnType<typeof EnhancedPaymentCalculator.calculateBreakdown>,
    sessionAmount: number
  ): boolean {
    const expectedAmount = breakdown.buyerTotalAmount * 100; // Stripe uses cents
    
    if (Math.abs(sessionAmount - expectedAmount) > 1) { // Allow 1 cent tolerance
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
    ErrorHandler.logInfo('Payment breakdown calculated', {
      baseAmount: breakdown.baseAmount,
      buyerFeeAmount: breakdown.buyerFeeAmount,
      buyerTotalAmount: breakdown.buyerTotalAmount,
      hostFeeAmount: breakdown.hostFeeAmount,
      hostNetPayout: breakdown.hostNetPayout,
      platformRevenue: breakdown.platformRevenue,
      stripeApplicationFee: breakdown.stripeApplicationFee,
      stripeTransferAmount: breakdown.stripeTransferAmount
    });
  }
}
