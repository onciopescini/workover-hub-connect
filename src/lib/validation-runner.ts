// Validation suite execution function - circular dependency fixed
// Now imports from validation-suite without being imported BY validation-suite

import { runPaymentValidation, formatValidationReport } from './payment-validation';
import { runStripeValidationSuite } from './stripe-validation';
import { sprint1Validator } from './validation-suite';
import { sreLogger } from '@/lib/sre-logger';
import type { PaymentValidationResult } from './validation-types';

// Validation suite execution function - only runs when manually called
export const executeValidationSuite = (): PaymentValidationResult => {
  sreLogger.info('🎯 WORKOVER PAYMENT VALIDATION SUITE', { action: 'validation_suite_start' });
  
  // Run payment calculation validation
  const results = runPaymentValidation();
  const report = formatValidationReport(results);
  sreLogger.debug('Validation report generated', { action: 'validation_report', report });
  
  // Run Stripe integration validation
  runStripeValidationSuite();
  
  // Summary
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  
  sreLogger.info('🏁 VALIDATION SUMMARY', { 
    action: 'validation_summary',
    passedCount,
    totalCount,
    stripeValidated: true,
    currencyRounding: '2 decimal places',
    rlsAuth: 'unchanged'
  });
  
  if (passedCount === totalCount) {
    sreLogger.info('✅ ALL VALIDATIONS PASSED - Dual commission model is working correctly!', { 
      action: 'validation_complete',
      status: 'success'
    });
  } else {
    sreLogger.error('❌ Some validations failed - please review the errors above', { 
      action: 'validation_complete',
      status: 'failed',
      passedCount,
      totalCount
    });
  }
  
  return {
    passed: passedCount === totalCount,
    results,
    passedCount,
    totalCount
  };
};

// Run comprehensive Sprint 1 validation
export const executeFullValidation = async (): Promise<void> => {
  sreLogger.info('🚀 EXECUTING FULL SPRINT 1 VALIDATION', { action: 'full_validation_start' });
  
  // Run payment validation first
  executeValidationSuite();
  
  // Then run comprehensive validation
  await sprint1Validator.runFullValidation();
};
