
export class PaymentCalculator {
  private static readonly BUYER_FEE_RATE = 0.05; // 5% buyer fee
  private static readonly HOST_FEE_RATE = 0.05; // 5% host fee
  private static readonly TOTAL_PLATFORM_FEE_RATE = 0.10; // 10% total platform fee

  static calculateBreakdown(baseAmount: number) {
    // Buyer pays base amount + 5% buyer fee
    const buyerFeeAmount = Math.round(baseAmount * this.BUYER_FEE_RATE * 100) / 100;
    const buyerTotalAmount = baseAmount + buyerFeeAmount;
    
    // Host receives base amount - 5% host fee
    const hostFeeAmount = Math.round(baseAmount * this.HOST_FEE_RATE * 100) / 100;
    const hostNetPayout = baseAmount - hostFeeAmount;
    
    // Platform revenue = buyer fee + host fee (total 10% of base amount)
    const platformRevenue = buyerFeeAmount + hostFeeAmount;
    
    // For Stripe Connect: application fee includes both commissions
    const stripeApplicationFee = Math.round(baseAmount * this.TOTAL_PLATFORM_FEE_RATE * 100) / 100;
    
    // For Stripe Connect: transfer amount is base amount minus host fee only
    const stripeTransferAmount = hostNetPayout;

    return {
      baseAmount,
      buyerFeeAmount,
      buyerTotalAmount,
      hostFeeAmount,
      hostNetPayout,
      platformRevenue,
      stripeApplicationFee, // This is what goes to Stripe as application_fee
      stripeTransferAmount // This is what gets transferred to host
    };
  }

  static logBreakdown(breakdown: ReturnType<typeof PaymentCalculator.calculateBreakdown>) {
    console.log('💰 Payment breakdown:', {
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
