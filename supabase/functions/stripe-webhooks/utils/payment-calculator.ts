
export class PaymentCalculator {
  private static readonly BUYER_FEE_RATE = 0.05; // 5% buyer fee
  private static readonly HOST_FEE_RATE = 0.05; // 5% host fee

  static calculateBreakdown(baseAmount: number) {
    // Buyer pays base amount + 5% buyer fee
    const buyerFeeAmount = Math.round(baseAmount * this.BUYER_FEE_RATE * 100) / 100;
    const buyerTotalAmount = baseAmount + buyerFeeAmount;
    
    // Host receives base amount - 5% host fee
    const hostFeeAmount = Math.round(baseAmount * this.HOST_FEE_RATE * 100) / 100;
    const hostNetPayout = baseAmount - hostFeeAmount;
    
    // Platform revenue = buyer fee + host fee
    const platformRevenue = buyerFeeAmount + hostFeeAmount;

    return {
      baseAmount,
      buyerFeeAmount,
      buyerTotalAmount,
      hostFeeAmount,
      hostNetPayout,
      platformRevenue
    };
  }

  static logBreakdown(breakdown: ReturnType<typeof PaymentCalculator.calculateBreakdown>) {
    console.log('💰 Payment breakdown:', {
      baseAmount: breakdown.baseAmount,
      buyerFeeAmount: breakdown.buyerFeeAmount,
      buyerTotalAmount: breakdown.buyerTotalAmount,
      hostFeeAmount: breakdown.hostFeeAmount,
      hostNetPayout: breakdown.hostNetPayout,
      platformRevenue: breakdown.platformRevenue
    });
  }
}
