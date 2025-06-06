
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Calculator, DollarSign } from "lucide-react";
import { 
  runPaymentValidation, 
  formatValidationReport, 
  validateCurrencyRounding,
  validateStripeAmount,
  type ValidationResult 
} from "@/lib/payment-validation";
import { calculatePaymentBreakdown } from "@/lib/payment-utils";

export const PaymentValidationDashboard = () => {
  const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [reportText, setReportText] = useState<string>("");

  const runValidation = async () => {
    setIsRunning(true);
    
    // Simulate async validation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const results = runPaymentValidation();
    setValidationResults(results);
    setReportText(formatValidationReport(results));
    setIsRunning(false);
  };

  const testUICalculations = () => {
    // Test our UI components' calculation logic
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

  useEffect(() => {
    testUICalculations();
  }, []);

  const passedCount = validationResults.filter(r => r.passed).length;
  const totalCount = validationResults.length;

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Payment Calculation Validation Suite
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button 
              onClick={runValidation} 
              disabled={isRunning}
              className="w-full"
            >
              {isRunning ? "Running Validation..." : "Run Payment Validation Tests"}
            </Button>

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
