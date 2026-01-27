export function calculatePlatformFee(amount: number, feePercentage: number = 5): number {
  return amount * (feePercentage / 100);
}

export function calculateHostAmount(amount: number, feePercentage: number = 5): number {
  return amount - calculatePlatformFee(amount, feePercentage);
}

export function detectPaymentAnomalies(payment: any): string[] {
  const anomalies: string[] = [];

  if (payment.payment_status === 'completed') {
    // Check for missing breakdown
    if (!payment.host_amount || !payment.platform_fee) {
      anomalies.push("Missing host_amount or platform_fee");
    }

    // Check for amount mismatch
    if (payment.host_amount && payment.platform_fee) {
      const expectedTotal = Number(payment.host_amount) + Number(payment.platform_fee);
      const actualTotal = Number(payment.amount);
      if (Math.abs(expectedTotal - actualTotal) > 0.02) {
        anomalies.push(`Amount mismatch: expected ${expectedTotal.toFixed(2)}, got ${actualTotal.toFixed(2)}`);
      }
    }

    // Check for unreasonably high platform fee
    if (payment.platform_fee) {
      const feePercentage = (Number(payment.platform_fee) / Number(payment.amount)) * 100;
      if (feePercentage > 15) {
        anomalies.push(`Unusually high platform fee: ${feePercentage.toFixed(1)}%`);
      }
    }
  }

  return anomalies;
}
