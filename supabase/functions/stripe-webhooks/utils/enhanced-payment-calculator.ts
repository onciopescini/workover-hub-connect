
import { ErrorHandler } from "./error-handler.ts";

export class EnhancedPaymentCalculator {
  // Calculate payment breakdown with proper VAT on Fee model
  static calculateBreakdown(baseAmount: number) {
    // 5% Service Fee
    const buyerFeeAmount = Math.round(baseAmount * 0.05 * 100) / 100;
    
    // 22% VAT on Service Fee
    const vat = Math.round(buyerFeeAmount * 0.22 * 100) / 100;
    
    // Platform Revenue = Fee + VAT
    const platformRevenue = buyerFeeAmount + vat;
    
    // Total Amount = Base + Fee + VAT
    const buyerTotalAmount = baseAmount + platformRevenue;

    // Host Fee is 0 in current model (Host receives full base amount)
    const hostFeeAmount = 0;
    const hostNetPayout = baseAmount;

    // Stripe Application Fee = Platform Revenue (Fee + VAT)
    const stripeApplicationFee = platformRevenue;
    const stripeTransferAmount = hostNetPayout;

    return {
      baseAmount,
      buyerFeeAmount,
      vat,
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
