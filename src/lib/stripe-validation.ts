import { sreLogger } from '@/lib/sre-logger';
import { PricingEngine } from '@/lib/pricing-engine';

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
  
  // Use Pricing Engine to get exact breakdown
  const breakdown = PricingEngine.calculatePricing(basePrice);
  
  // Convert to Stripe amounts (cents)
  // Engine returns values in EUR (2 decimals), so we multiply by 100 and round
  const stripeSessionAmount = Math.round(breakdown.totalGuestPay * 100);
  const stripeApplicationFee = Math.round(breakdown.applicationFee * 100);
  const hostTransferAmount = Math.round(breakdown.hostPayout * 100);
  
  // Validation Logic checks consistency of the breakdown itself
  
  // 1. Session Amount check: Does it equal Application Fee + Host Transfer?
  // Note: Stripe splits the charge into Transfer + Application Fee
  // Transfer = Host Payout
  // Application Fee = Platform Revenue (Guest Fee + Guest VAT + Host Fee)
  if (stripeSessionAmount !== (hostTransferAmount + stripeApplicationFee)) {
    errors.push(`Amount breakdown error: session amount (${stripeSessionAmount}) should equal transfer (${hostTransferAmount}) + fee (${stripeApplicationFee})`);
  }
  
  // 2. Base integrity check (not fully exhaustive but sanity check)
  // Ensure the engine's output for total matches what we expect from component parts
  const expectedTotal = Math.round((breakdown.basePrice + breakdown.guestFee + breakdown.guestVat) * 100);
  if (stripeSessionAmount !== expectedTotal) {
    errors.push(`Total mismatch: Session (${stripeSessionAmount}) vs Calculated (${expectedTotal})`);
  }

  return {
    testCase: `Stripe validation for €${basePrice}`,
    basePrice,
    buyerTotalPrice: breakdown.totalGuestPay,
    hostPayout: breakdown.hostPayout,
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
  
  const testPrices = [2.50, 20, 150, 75, 500]; // Added 2.50 for low value test
  testPrices.forEach(price => {
    logStripeValidationResults(price);
  });
  
  sreLogger.info('Stripe validation suite completed');
};
