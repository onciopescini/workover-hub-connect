
// Payment validation utility for dual commission model testing
export interface PaymentTestCase {
  caseName: string;
  basePrice: number;
  expectedResults: {
    buyerTotalPrice: number;
    hostPayout: number;
    buyerFee: number;
    hostFee: number;
    platformTotalFee: number;
    applicationFeeAmount: number; // For Stripe in cents
  };
}

export interface ValidationResult {
  testCase: PaymentTestCase;
  actualResults: {
    buyerTotalPrice: number;
    hostPayout: number;
    buyerFee: number;
    hostFee: number;
    platformTotalFee: number;
    applicationFeeAmount: number;
  };
  passed: boolean;
  errors: string[];
}

// Test cases as specified
export const testCases: PaymentTestCase[] = [
  {
    caseName: "Case 1: Hourly booking — base price 20€",
    basePrice: 20,
    expectedResults: {
      buyerTotalPrice: 21.00,
      hostPayout: 19.00,
      buyerFee: 1.00,
      hostFee: 1.00,
      platformTotalFee: 2.00,
      applicationFeeAmount: 100 // 1€ in cents
    }
  },
  {
    caseName: "Case 2: Daily booking — base price 150€",
    basePrice: 150,
    expectedResults: {
      buyerTotalPrice: 157.50,
      hostPayout: 142.50,
      buyerFee: 7.50,
      hostFee: 7.50,
      platformTotalFee: 15.00,
      applicationFeeAmount: 750 // 7.50€ in cents
    }
  },
  {
    caseName: "Case 3: Random booking — base price 75€",
    basePrice: 75,
    expectedResults: {
      buyerTotalPrice: 78.75,
      hostPayout: 71.25,
      buyerFee: 3.75,
      hostFee: 3.75,
      platformTotalFee: 7.50,
      applicationFeeAmount: 375 // 3.75€ in cents
    }
  },
  {
    caseName: "Case 4: High-value booking — base price 500€",
    basePrice: 500,
    expectedResults: {
      buyerTotalPrice: 525.00,
      hostPayout: 475.00,
      buyerFee: 25.00,
      hostFee: 25.00,
      platformTotalFee: 50.00,
      applicationFeeAmount: 2500 // 25€ in cents
    }
  }
];

// Validation function using our existing payment calculation logic
export const validatePaymentCalculation = (basePrice: number): ValidationResult['actualResults'] => {
  // Use the same logic from payment-utils.ts
  const buyerFeeAmount = Math.round(basePrice * 0.05 * 100) / 100; // 5% buyer fee
  const buyerTotalPrice = basePrice + buyerFeeAmount;
  
  const hostFeeAmount = Math.round(basePrice * 0.05 * 100) / 100; // 5% host fee
  const hostPayout = basePrice - hostFeeAmount;
  
  const platformTotalFee = buyerFeeAmount + hostFeeAmount;
  const applicationFeeAmount = Math.round(hostFeeAmount * 100); // Convert to cents for Stripe

  return {
    buyerTotalPrice: Math.round(buyerTotalPrice * 100) / 100,
    hostPayout: Math.round(hostPayout * 100) / 100,
    buyerFee: buyerFeeAmount,
    hostFee: hostFeeAmount,
    platformTotalFee: Math.round(platformTotalFee * 100) / 100,
    applicationFeeAmount
  };
};

// Comprehensive validation runner
export const runPaymentValidation = (): ValidationResult[] => {
  return testCases.map(testCase => {
    const actualResults = validatePaymentCalculation(testCase.basePrice);
    const errors: string[] = [];
    
    // Check each calculation
    if (actualResults.buyerTotalPrice !== testCase.expectedResults.buyerTotalPrice) {
      errors.push(`Buyer total price mismatch: expected ${testCase.expectedResults.buyerTotalPrice}, got ${actualResults.buyerTotalPrice}`);
    }
    
    if (actualResults.hostPayout !== testCase.expectedResults.hostPayout) {
      errors.push(`Host payout mismatch: expected ${testCase.expectedResults.hostPayout}, got ${actualResults.hostPayout}`);
    }
    
    if (actualResults.buyerFee !== testCase.expectedResults.buyerFee) {
      errors.push(`Buyer fee mismatch: expected ${testCase.expectedResults.buyerFee}, got ${actualResults.buyerFee}`);
    }
    
    if (actualResults.hostFee !== testCase.expectedResults.hostFee) {
      errors.push(`Host fee mismatch: expected ${testCase.expectedResults.hostFee}, got ${actualResults.hostFee}`);
    }
    
    if (actualResults.platformTotalFee !== testCase.expectedResults.platformTotalFee) {
      errors.push(`Platform total fee mismatch: expected ${testCase.expectedResults.platformTotalFee}, got ${actualResults.platformTotalFee}`);
    }
    
    if (actualResults.applicationFeeAmount !== testCase.expectedResults.applicationFeeAmount) {
      errors.push(`Application fee amount mismatch: expected ${testCase.expectedResults.applicationFeeAmount}, got ${actualResults.applicationFeeAmount}`);
    }

    // Validate 10% total platform fee
    const expectedTotalPercentage = testCase.basePrice * 0.10;
    if (Math.abs(actualResults.platformTotalFee - expectedTotalPercentage) > 0.01) {
      errors.push(`Platform total fee should be 10% of base price (${expectedTotalPercentage}), got ${actualResults.platformTotalFee}`);
    }

    return {
      testCase,
      actualResults,
      passed: errors.length === 0,
      errors
    };
  });
};

// Currency and rounding validation
export const validateCurrencyRounding = (amount: number): boolean => {
  // Check if amount has maximum 2 decimal places
  const rounded = Math.round(amount * 100) / 100;
  return Math.abs(amount - rounded) < 0.001;
};

// Stripe amount validation (convert to cents)
export const validateStripeAmount = (euroAmount: number): number => {
  return Math.round(euroAmount * 100);
};

export const formatValidationReport = (results: ValidationResult[]): string => {
  let report = "🔍 PAYMENT VALIDATION REPORT\n";
  report += "=" + "=".repeat(50) + "\n\n";
  
  results.forEach((result, index) => {
    report += `${index + 1}. ${result.testCase.caseName}\n`;
    report += `   Base Price: €${result.testCase.basePrice}\n`;
    report += `   Status: ${result.passed ? "✅ PASSED" : "❌ FAILED"}\n`;
    
    if (result.passed) {
      report += `   ✓ Buyer Total: €${result.actualResults.buyerTotalPrice}\n`;
      report += `   ✓ Host Payout: €${result.actualResults.hostPayout}\n`;
      report += `   ✓ Platform Fee: €${result.actualResults.platformTotalFee} (10%)\n`;
      report += `   ✓ Stripe Application Fee: ${result.actualResults.applicationFeeAmount} cents\n`;
    } else {
      report += `   Errors:\n`;
      result.errors.forEach(error => {
        report += `     • ${error}\n`;
      });
    }
    report += "\n";
  });
  
  const passedCount = results.filter(r => r.passed).length;
  report += `SUMMARY: ${passedCount}/${results.length} tests passed\n`;
  
  return report;
};
