import { sreLogger } from '@/lib/sre-logger';
import { PLATFORM_FEE_RATE } from '@/config/fiscal-constants';

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
  // Use PLATFORM_FEE_RATE instead of hardcoded 0.05
  const buyerFeeAmount = Math.round(basePrice * PLATFORM_FEE_RATE * 100) / 100;
  const buyerTotalPrice = basePrice + buyerFeeAmount;
  const hostFeeAmount = Math.round(basePrice * PLATFORM_FEE_RATE * 100) / 100;
  const hostPayout = basePrice - hostFeeAmount;
  
  // Convert to Stripe amounts (cents)
  const stripeSessionAmount = Math.round(buyerTotalPrice * 100);
  const stripeApplicationFee = Math.round(hostFeeAmount * 100);
  const hostTransferAmount = Math.round(hostPayout * 100);
  
  // Validation checks
  const expectedSessionAmount = Math.round((basePrice * (1 + PLATFORM_FEE_RATE)) * 100);
  if (stripeSessionAmount !== expectedSessionAmount) {
    errors.push(`Session amount mismatch: expected ${expectedSessionAmount} cents, got ${stripeSessionAmount} cents`);
  }
  
  const expectedApplicationFee = Math.round((basePrice * PLATFORM_FEE_RATE) * 100);
  if (stripeApplicationFee !== expectedApplicationFee) {
    errors.push(`Application fee mismatch: expected ${expectedApplicationFee} cents, got ${stripeApplicationFee} cents`);
  }
  
  const expectedTransferAmount = Math.round((basePrice * (1 - PLATFORM_FEE_RATE)) * 100);
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
  
  sreLogger.info('STRIPE VALIDATION', {
    testCase: result.testCase,
    validationStatus: result.validationStatus,
    basePrice: result.basePrice,
    buyerTotalPrice: result.buyerTotalPrice,
    hostPayout: result.hostPayout,
    stripeSessionAmount: result.stripeSessionAmount,
    stripeApplicationFee: result.stripeApplicationFee,
    hostTransferAmount: result.hostTransferAmount,
    errors: result.errors
  });
};

// Run comprehensive Stripe validation
export const runStripeValidationSuite = (): void => {
  sreLogger.info('RUNNING STRIPE VALIDATION SUITE');
  
  const testPrices = [20, 150, 75, 500];
  testPrices.forEach(price => {
    logStripeValidationResults(price);
  });
  
  sreLogger.info('Stripe validation suite completed');
};
