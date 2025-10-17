
export class PaymentCalculator {
  private static readonly BUYER_FEE_RATE = 0.05; // 5% buyer fee
  private static readonly HOST_FEE_RATE = 0.05; // 5% host fee
  private static readonly VAT_RATE = 0.22; // 22% VAT (FASE 1.3)
  private static readonly TOTAL_PLATFORM_FEE_RATE = 0.10; // 10% total platform fee

  static calculateBreakdown(baseAmount: number) {
    const round = (n: number) => Math.round(n * 100) / 100;
    
    // Buyer fees
    const buyerFeeAmount = round(baseAmount * this.BUYER_FEE_RATE);
    const buyerVat = round(buyerFeeAmount * this.VAT_RATE);
    const buyerTotalAmount = baseAmount + buyerFeeAmount + buyerVat;
    
    // Host fees (FASE 1.3: NOW INCLUDING VAT)
    const hostFeeAmount = round(baseAmount * this.HOST_FEE_RATE);
    const hostVat = round(hostFeeAmount * this.VAT_RATE);
    const hostNetPayout = baseAmount - hostFeeAmount - hostVat;
    
    // Platform revenue = buyer + host commissions + VAT
    const totalPlatformFee = buyerFeeAmount + buyerVat + hostFeeAmount + hostVat;
    
    return {
      baseAmount,
      buyerFeeAmount,
      buyerVat,
      buyerTotalAmount,
      hostFeeAmount,
      hostVat, // ADDED
      hostNetPayout,
      totalPlatformFee,
      stripeApplicationFee: round(baseAmount * this.TOTAL_PLATFORM_FEE_RATE),
      stripeTransferAmount: hostNetPayout
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
