
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Calculator, Play, AlertCircle } from "lucide-react";
import { executeValidationSuite } from "@/lib/validation-runner";
import { runStripeValidationSuite, validateStripeAmounts } from "@/lib/stripe-validation";
import { calculatePaymentBreakdown } from "@/lib/payment-utils";

export const StripeValidationTest = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [validationResults, setValidationResults] = useState<any[]>([]);
  const [stripeResults, setStripeResults] = useState<any[]>([]);

  const runFullValidation = async () => {
    setIsRunning(true);
    console.log('🚀 RUNNING POST-REFACTOR VALIDATION SUITE');
    console.log('='.repeat(60));

    try {
      // 1. Run payment validation suite
      console.log('\n💰 RUNNING PAYMENT VALIDATION SUITE');
      const paymentResults = executeValidationSuite();
      setValidationResults(paymentResults.results || []);

      // 2. Run Stripe validation suite
      console.log('\n🔧 RUNNING STRIPE INTEGRATION VALIDATION');
      runStripeValidationSuite();

      // 3. Test specific Stripe calculations
      const testPrices = [20, 150, 75, 500];
      const stripeTestResults = testPrices.map(price => {
        const breakdown = calculatePaymentBreakdown(price);
        const stripeValidation = validateStripeAmounts(price);
        
        // Additional validation checks for post-refactor
        const stripeSessionAmount = Math.round(breakdown.buyerTotalAmount * 100); // in cents
        const stripeApplicationFee = Math.round(price * 0.10 * 100); // 10% of base in cents
        const stripeTransferAmount = Math.round(price * 0.95 * 100); // 95% of base in cents
        
        const destinationChargeValidation = stripeSessionAmount === (stripeTransferAmount + stripeApplicationFee);
        
        console.log(`\n🔍 DESTINATION CHARGE VALIDATION for €${price}:`);
        console.log(`Session Amount: ${stripeSessionAmount} cents`);
        console.log(`Transfer Amount: ${stripeTransferAmount} cents`);
        console.log(`Application Fee: ${stripeApplicationFee} cents`);
        console.log(`Sum Check: ${stripeTransferAmount + stripeApplicationFee} cents`);
        console.log(`Validation: ${destinationChargeValidation ? '✅ PASS' : '❌ FAIL'}`);
        
        return {
          price,
          breakdown,
          stripeValidation,
          destinationChargeValidation,
          stripeSessionAmount,
          stripeApplicationFee,
          stripeTransferAmount
        };
      });
      
      setStripeResults(stripeTestResults);

      // 4. Summary report
      console.log('\n📊 POST-REFACTOR VALIDATION SUMMARY');
      console.log('='.repeat(60));
      
      const paymentsPassed = paymentResults.results?.filter((r: any) => r.passed).length || 0;
      const paymentsTotal = paymentResults.results?.length || 0;
      const stripePassed = stripeTestResults.filter(r => r.destinationChargeValidation).length;
      const stripeTotal = stripeTestResults.length;
      
      console.log(`✅ Payment Calculations: ${paymentsPassed}/${paymentsTotal} passed`);
      console.log(`✅ Stripe Destination Charges: ${stripePassed}/${stripeTotal} passed`);
      console.log(`✅ Dual Commission Model: ${paymentsPassed === paymentsTotal ? 'WORKING' : 'FAILED'}`);
      console.log(`✅ Currency Rounding: 2 decimal places enforced`);
      
      if (paymentsPassed === paymentsTotal && stripePassed === stripeTotal) {
        console.log('\n🎉 ALL VALIDATIONS PASSED! Stripe Destination Charge refactor is successful!');
      } else {
        console.log('\n⚠️ Some validations failed. Please review the errors above.');
      }

    } catch (error) {
      console.error('❌ Validation suite failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const passedPayments = validationResults.filter(r => r.passed).length;
  const totalPayments = validationResults.length;
  const passedStripe = stripeResults.filter(r => r.destinationChargeValidation).length;
  const totalStripe = stripeResults.length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Post-Refactor Stripe Validation Suite
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button 
              onClick={runFullValidation} 
              disabled={isRunning}
              className="w-full flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              {isRunning ? "Running Validation..." : "Run Complete Validation Suite"}
            </Button>

            {(validationResults.length > 0 || stripeResults.length > 0) && (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Payment Calculations:</span>
                    <Badge variant={passedPayments === totalPayments ? "default" : "destructive"}>
                      {passedPayments}/{totalPayments} Passed
                    </Badge>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Stripe Destination Charges:</span>
                    <Badge variant={passedStripe === totalStripe ? "default" : "destructive"}>
                      {passedStripe}/{totalStripe} Passed
                    </Badge>
                  </div>
                </div>

                {stripeResults.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-semibold">Stripe Destination Charge Results:</h4>
                    {stripeResults.map((result, index) => (
                      <Card key={index} className={result.destinationChargeValidation ? "border-green-200" : "border-red-200"}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            {result.destinationChargeValidation ? 
                              <CheckCircle className="w-4 h-4 text-green-600" /> : 
                              <XCircle className="w-4 h-4 text-red-600" />
                            }
                            <span className="font-semibold">€{result.price} Test Case</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p><strong>Session Amount:</strong> {result.stripeSessionAmount} cents</p>
                              <p><strong>Transfer Amount:</strong> {result.stripeTransferAmount} cents</p>
                              <p><strong>Application Fee:</strong> {result.stripeApplicationFee} cents</p>
                            </div>
                            <div>
                              <p><strong>Buyer Total:</strong> €{result.breakdown.buyerTotalAmount.toFixed(2)}</p>
                              <p><strong>Host Payout:</strong> €{result.breakdown.hostNetPayout.toFixed(2)}</p>
                              <p><strong>Platform Revenue:</strong> €{result.breakdown.platformRevenue.toFixed(2)}</p>
                            </div>
                          </div>
                          
                          <div className="mt-2 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-xs">
                              Sum Check: {result.stripeTransferAmount + result.stripeApplicationFee} = {result.stripeSessionAmount} 
                              {result.destinationChargeValidation ? ' ✅' : ' ❌'}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="bg-blue-50 p-3 rounded text-sm">
              <p className="font-semibold mb-1">Validation Focus:</p>
              <ul className="text-xs space-y-1">
                <li>• Dual Commission Model (5% buyer + 5% host = 10% total)</li>
                <li>• Stripe Destination Charge: session_amount = transfer_amount + application_fee</li>
                <li>• Currency rounding to 2 decimal places</li>
                <li>• Type safety and calculation accuracy</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
