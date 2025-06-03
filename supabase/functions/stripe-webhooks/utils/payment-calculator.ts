
export class PaymentCalculator {
  private static readonly PLATFORM_FEE_RATE = 0.05; // 5%
  private static readonly HOST_RATE = 0.95; // 95%

  static calculateBreakdown(totalAmount: number) {
    const platformFeeAmount = Math.round(totalAmount * this.PLATFORM_FEE_RATE);
    const hostAmount = totalAmount - platformFeeAmount;
    const hostTransferAmount = Math.round(hostAmount * this.HOST_RATE);
    const platformTotalFee = totalAmount - hostTransferAmount;

    return {
      totalAmount,
      platformFeeAmount,
      hostAmount,
      hostTransferAmount,
      platformTotalFee
    };
  }

  static logBreakdown(breakdown: ReturnType<typeof PaymentCalculator.calculateBreakdown>) {
    console.log('💰 Transfer breakdown:', {
      totalAmount: breakdown.totalAmount / 100,
      hostTransferAmount: breakdown.hostTransferAmount / 100,
      platformTotalFee: breakdown.platformTotalFee / 100
    });
  }
}
