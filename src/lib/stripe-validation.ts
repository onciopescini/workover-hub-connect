
// Stripe integration validation utilities
export interface StripeValidationResult {
  testCase: string;
  basePrice: number;
  buyerTotalPrice: number;
  hostPayout: number;
  stripeSessionAmount: number; // In cents
  stripeApplicationFee: number; // In cents
  hostTransferAmount: number; // In cents
  validationStatus: 'PASS' | 'FAIL';
  errors: string[];
}

export const validateStripeAmounts = (basePrice: number): StripeValidationResult => {
  const errors: string[] = [];
  
  // Calculate expected amounts using our payment logic
  const buyerFeeAmount = Math.round(basePrice * 0.05 * 100) / 100;
  const buyerTotalPrice = basePrice + buyerFeeAmount;
  const hostFeeAmount = Math.round(basePrice * 0.05 * 100) / 100;
  const hostPayout = basePrice - hostFeeAmount;
  
  // Convert to Stripe amounts (cents)
  const stripeSessionAmount = Math.round(buyerTotalPrice * 100);
  const stripeApplicationFee = Math.round(hostFeeAmount * 100);
  const hostTransferAmount = Math.round(hostPayout * 100);
  
  // Validation checks
  const expectedSessionAmount = Math.round((basePrice * 1.05) * 100);
  if (stripeSessionAmount !== expectedSessionAmount) {
    errors.push(`Session amount mismatch: expected ${expectedSessionAmount} cents, got ${stripeSessionAmount} cents`);
  }
  
  const expectedApplicationFee = Math.round((basePrice * 0.05) * 100);
  if (stripeApplicationFee !== expectedApplicationFee) {
    errors.push(`Application fee mismatch: expected ${expectedApplicationFee} cents, got ${stripeApplicationFee} cents`);
  }
  
  const expectedTransferAmount = Math.round((basePrice * 0.95) * 100);
  if (hostTransferAmount !== expectedTransferAmount) {
    errors.push(`Transfer amount mismatch: expected ${expectedTransferAmount} cents, got ${hostTransferAmount} cents`);
  }
  
  // Check that session amount = transfer amount + application fee
  if (stripeSessionAmount !== (hostTransferAmount + stripeApplicationFee)) {
    errors.push(`Amount breakdown error: session amount (${stripeSessionAmount}) should equal transfer (${hostTransferAmount}) + fee (${stripeApplicationFee})`);
  }
  
  return {
    testCase: `Stripe validation for €${basePrice}`,
    basePrice,
    buyerTotalPrice,
    hostPayout,
    stripeSessionAmount,
    stripeApplicationFee,
    hostTransferAmount,
    validationStatus: errors.length === 0 ? 'PASS' : 'FAIL',
    errors
  };
};

export const logStripeValidationResults = (basePrice: number): void => {
  const result = validateStripeAmounts(basePrice);
  
  console.log(`🔍 STRIPE VALIDATION: ${result.testCase}`);
  console.log(`Status: ${result.validationStatus}`);
  console.log(`Base Price: €${result.basePrice}`);
  console.log(`Buyer Total: €${result.buyerTotalPrice}`);
  console.log(`Host Payout: €${result.hostPayout}`);
  console.log(`Stripe Session Amount: ${result.stripeSessionAmount} cents`);
  console.log(`Stripe Application Fee: ${result.stripeApplicationFee} cents`);
  console.log(`Host Transfer Amount: ${result.hostTransferAmount} cents`);
  
  if (result.errors.length > 0) {
    console.log('❌ Errors:');
    result.errors.forEach(error => console.log(`  • ${error}`));
  } else {
    console.log('✅ All validations passed');
  }
  console.log('---');
};

// Run comprehensive Stripe validation
export const runStripeValidationSuite = (): void => {
  console.log('🚀 RUNNING STRIPE VALIDATION SUITE');
  console.log('=====================================');
  
  const testPrices = [20, 150, 75, 500];
  testPrices.forEach(price => {
    logStripeValidationResults(price);
  });
  
  console.log('Stripe validation suite completed.');
};
