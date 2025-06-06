
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Calculator, DollarSign, Play, AlertTriangle } from "lucide-react";
import { 
  runPaymentValidation, 
  formatValidationReport, 
  validateCurrencyRounding,
  validateStripeAmount,
  type ValidationResult 
} from "@/lib/payment-validation";
import { calculatePaymentBreakdown } from "@/lib/payment-utils";
import { executeValidationSuite } from "@/lib/validation-runner";
import { validateStripeAmounts } from "@/lib/stripe-validation";

export const PaymentValidationDashboard = () => {
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [reportText, setReportText] = useState<string>("");
  const [fullSuiteRun, setFullSuiteRun] = useState(false);
  const [stripeValidationResults, setStripeValidationResults] = useState<any[]>([]);

  const runValidation = async () => {
    setIsRunning(true);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const results = runPaymentValidation();
    setValidationResults(results);
    setReportText(formatValidationReport(results));
    setIsRunning(false);
  };

  const runPostRefactorValidation = async () => {
    setIsRunning(true);
    setFullSuiteRun(true);
    
    console.log('🚀 POST-REFACTOR STRIPE VALIDATION SUITE');
    console.log('='.repeat(60));

    try {
      // Run payment validation
      const paymentResults = runPaymentValidation();
      setValidationResults(paymentResults);
      setReportText(formatValidationReport(paymentResults));

      // Run Stripe destination charge validation
      const testPrices = [20, 150, 75, 500];
      const stripeResults = testPrices.map(price => {
        const breakdown = calculatePaymentBreakdown(price);
        const stripeValidation = validateStripeAmounts(price);
        
        // Post-refactor validation: Check destination charge math
        const stripeSessionAmount = Math.round(breakdown.buyerTotalAmount * 100);
        const stripeApplicationFee = Math.round(price * 0.10 * 100); // 10% of base
        const stripeTransferAmount = Math.round(price * 0.95 * 100); // 95% of base
        
        const destinationChargeValid = stripeSessionAmount === (stripeTransferAmount + stripeApplicationFee);
        
        console.log(`\n🔍 DESTINATION CHARGE TEST - €${price}:`);
        console.log(`  Session Amount: ${stripeSessionAmount} cents`);
        console.log(`  Application Fee: ${stripeApplicationFee} cents (10% of base)`);
        console.log(`  Transfer Amount: ${stripeTransferAmount} cents (95% of base)`);
        console.log(`  Sum Check: ${stripeTransferAmount} + ${stripeApplicationFee} = ${stripeTransferAmount + stripeApplicationFee}`);
        console.log(`  Expected: ${stripeSessionAmount}`);
        console.log(`  Result: ${destinationChargeValid ? '✅ PASS' : '❌ FAIL'}`);
        
        return {
          price,
          breakdown,
          stripeValidation,
          destinationChargeValid,
          stripeSessionAmount,
          stripeApplicationFee,
          stripeTransferAmount
        };
      });
      
      setStripeValidationResults(stripeResults);

      // Summary
      const paymentsPassed = paymentResults.filter(r => r.passed).length;
      const stripePassed = stripeResults.filter(r => r.destinationChargeValid).length;
      
      console.log('\n📊 POST-REFACTOR SUMMARY:');
      console.log(`✅ Payment Calculations: ${paymentsPassed}/${paymentResults.length}`);
      console.log(`✅ Stripe Destination Charges: ${stripePassed}/${stripeResults.length}`);
      console.log(`✅ Dual Commission (5%+5%): ${paymentsPassed === paymentResults.length ? 'WORKING' : 'FAILED'}`);
      
      if (paymentsPassed === paymentResults.length && stripePassed === stripeResults.length) {
        console.log('\n🎉 ALL POST-REFACTOR VALIDATIONS PASSED!');
      }

    } catch (error) {
      console.error('❌ Post-refactor validation failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const testUICalculations = () => {
    const testPrices = [20, 150, 75, 500];
    
    console.log("🧪 UI CALCULATION VALIDATION:");
    testPrices.forEach(price => {
      const breakdown = calculatePaymentBreakdown(price);
      console.log(`Base: €${price}`);
      console.log(`  Buyer Total: €${breakdown.buyerTotalAmount}`);
      console.log(`  Host Payout: €${breakdown.hostNetPayout}`);
      console.log(`  Platform Revenue: €${breakdown.platformRevenue}`);
      console.log(`  Currency Valid: ${validateCurrencyRounding(breakdown.buyerTotalAmount)}`);
      console.log(`  Stripe Amount: ${validateStripeAmount(breakdown.buyerTotalAmount)} cents`);
      console.log("---");
    });
  };

  const passedCount = validationResults.filter(r => r.passed).length;
  const totalCount = validationResults.length;
  const stripePassed = stripeValidationResults.filter(r => r.destinationChargeValid).length;
  const stripeTotal = stripeValidationResults.length;

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Payment & Stripe Validation Suite
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-4">
              <Button 
                onClick={runValidation} 
                disabled={isRunning}
                variant="outline"
                className="flex-1"
              >
                {isRunning ? "Running..." : "Run Payment Tests"}
              </Button>
              
              <Button 
                onClick={runPostRefactorValidation} 
                disabled={isRunning}
                className="flex items-center gap-2 flex-1"
              >
                <Play className="w-4 h-4" />
                {isRunning ? "Running..." : "Post-Refactor Full Suite"}
              </Button>
            </div>

            {fullSuiteRun && (
              <div className="bg-green-50 p-3 rounded border border-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <p className="text-sm text-green-800 font-semibold">
                    Post-refactor validation completed! 
                  </p>
                </div>
                <p className="text-xs text-green-700 mt-1">
                  Check console for detailed Stripe Destination Charge validation results.
                </p>
              </div>
            )}

            <Button 
              onClick={testUICalculations} 
              variant="secondary"
              size="sm"
            >
              Test UI Calculations (Check Console)
            </Button>

            {stripeValidationResults.length > 0 && (
              <Card className="border-blue-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-blue-600" />
                    Stripe Destination Charge Validation Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid gap-3">
                    {stripeValidationResults.map((result, index) => (
                      <div key={index} className={`p-3 rounded border ${result.destinationChargeValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          {result.destinationChargeValid ? 
                            <CheckCircle className="w-4 h-4 text-green-600" /> : 
                            <XCircle className="w-4 h-4 text-red-600" />
                          }
                          <span className="font-semibold text-sm">€{result.price} - Destination Charge</span>
                        </div>
                        
                        <div className="text-xs space-y-1">
                          <p>Session: {result.stripeSessionAmount} cents | Transfer: {result.stripeTransferAmount} | Fee: {result.stripeApplicationFee}</p>
                          <p>Validation: {result.stripeTransferAmount + result.stripeApplicationFee} = {result.stripeSessionAmount} {result.destinationChargeValid ? '✅' : '❌'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-3 flex items-center gap-2">
                    <Badge variant={stripePassed === stripeTotal ? "default" : "destructive"}>
                      {stripePassed}/{stripeTotal} Stripe Tests Passed
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {validationResults.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Results:</span>
                  <Badge variant={passedCount === totalCount ? "default" : "destructive"}>
                    {passedCount}/{totalCount} Passed
                  </Badge>
                </div>

                <div className="grid gap-4">
                  {validationResults.map((result, index) => (
                    <Card key={index} className={result.passed ? "border-green-200" : "border-red-200"}>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm flex items-center gap-2">
                          {result.passed ? 
                            <CheckCircle className="w-4 h-4 text-green-600" /> : 
                            <XCircle className="w-4 h-4 text-red-600" />
                          }
                          {result.testCase.caseName}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p><strong>Base Price:</strong> €{result.testCase.basePrice}</p>
                            <p><strong>Buyer Total:</strong> €{result.actualResults.buyerTotalPrice}</p>
                            <p><strong>Host Payout:</strong> €{result.actualResults.hostPayout}</p>
                          </div>
                          <div>
                            <p><strong>Buyer Fee:</strong> €{result.actualResults.buyerFee}</p>
                            <p><strong>Host Fee:</strong> €{result.actualResults.hostFee}</p>
                            <p><strong>Stripe Fee:</strong> {result.actualResults.applicationFeeAmount} cents</p>
                          </div>
                        </div>
                        
                        {!result.passed && (
                          <div className="mt-3 p-2 bg-red-50 rounded">
                            <p className="text-sm text-red-800 font-semibold">Errors:</p>
                            <ul className="text-xs text-red-700 mt-1">
                              {result.errors.map((error, idx) => (
                                <li key={idx}>• {error}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Validation Report</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs bg-gray-50 p-3 rounded overflow-auto">
                      {reportText}
                    </pre>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Live UI Component Test
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Test the actual UI components with our validation data:
          </p>
          <div className="grid grid-cols-2 gap-4">
            {[20, 150, 75, 500].map(price => {
              const breakdown = calculatePaymentBreakdown(price);
              return (
                <div key={price} className="bg-gray-50 p-3 rounded">
                  <p className="font-semibold">€{price} booking</p>
                  <div className="text-sm space-y-1 mt-2">
                    <div className="flex justify-between">
                      <span>Base price:</span>
                      <span>€{breakdown.baseAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Service fee (5%):</span>
                      <span>€{breakdown.buyerFeeAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold border-t pt-1">
                      <span>Total to pay:</span>
                      <span>€{breakdown.buyerTotalAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 border-t pt-1">
                      <span>Host receives:</span>
                      <span>€{breakdown.hostNetPayout.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
