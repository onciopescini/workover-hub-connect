
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, AlertTriangle, Play, Zap, Database } from "lucide-react";
import { regressionValidator } from "@/lib/regression-validation";
import { sreLogger } from '@/lib/sre-logger';

export const RegressionValidationRunner = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<{
    passed: string[];
    warnings: string[];
    errors: string[];
    summary: string;
  } | null>(null);

  // Auto-run validation on component mount to verify schema fixes
  useEffect(() => {
    const autoRunValidation = async () => {
      // Auto-running regression validation to verify schema fixes
      setIsRunning(true);
      
      try {
        const validationResults = await regressionValidator.runFullRegression();
        setResults(validationResults);
      } catch (error) {
        sreLogger.error('Auto-run regression validation failed', {}, error as Error);
        setResults({
          passed: [],
          warnings: [],
          errors: [`Auto-run validation failure: ${error}`],
          summary: '🔴 AUTO-RUN REGRESSION VALIDATION FAILED'
        });
      } finally {
        setIsRunning(false);
      }
    };

    // Run after a short delay to ensure component is mounted
    const timer = setTimeout(autoRunValidation, 1000);
    return () => clearTimeout(timer);
  }, []);

  const runFullRegression = async () => {
    setIsRunning(true);
    // Starting full Sprint 1 regression validation
    
    try {
      const validationResults = await regressionValidator.runFullRegression();
      setResults(validationResults);
    } catch (error) {
      sreLogger.error('Regression validation failed', {}, error as Error);
      setResults({
        passed: [],
        warnings: [],
        errors: [`Critical validation failure: ${error}`],
        summary: '🔴 REGRESSION VALIDATION FAILED'
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusColor = () => {
    if (!results) return '';
    if (results.errors.length > 0) return 'text-red-600';
    if (results.warnings.length > 0) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusIcon = () => {
    if (!results) return null;
    if (results.errors.length > 0) return <XCircle className="w-5 h-5 text-red-600" />;
    if (results.warnings.length > 0) return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    return <CheckCircle className="w-5 h-5 text-green-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Schema Fixes Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <Database className="w-4 h-4" />
        <AlertDescription>
          <div className="font-semibold mb-2">✅ Schema Fixes Applied Successfully:</div>
          <div className="text-sm space-y-1">
            <div>• Added foreign key constraint: bookings.user_id → profiles.id</div>
            <div>• Added profile fields: phone, city, profession, competencies, industries</div>
            <div>• Auto-running validation to verify fixes...</div>
          </div>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Sprint 1 Regression Validation Suite
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button 
              onClick={runFullRegression} 
              disabled={isRunning}
              className="w-full flex items-center gap-2"
              size="lg"
            >
              <Play className="w-4 h-4" />
              {isRunning ? "Running Full Regression..." : "Run Complete Regression Validation"}
            </Button>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Validation Scope:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>• Payments & Stripe Integration</div>
                <div>• Bookings System + New FK</div>
                <div>• Events Management</div>
                <div>• GDPR Compliance</div>
                <div>• User Profiles + New Fields</div>
                <div>• Messaging & Networking</div>
                <div>• Admin Panel</div>
                <div>• Navigation & Routes</div>
                <div>• Database Schema Alignment</div>
                <div>• Type Safety & Integration</div>
              </div>
            </div>

            {results && (
              <div className="space-y-4">
                <Alert>
                  <div className="flex items-center gap-2">
                    {getStatusIcon()}
                    <AlertDescription className={`font-semibold ${getStatusColor()}`}>
                      {results.summary}
                    </AlertDescription>
                  </div>
                </Alert>

                {/* Passed Modules */}
                {results.passed.length > 0 && (
                  <Card className="border-green-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        Passed Modules ({results.passed.length}/10)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid gap-2">
                        {results.passed.map((module, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              ✓ {module}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Warnings */}
                {results.warnings.length > 0 && (
                  <Card className="border-yellow-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        Warnings ({results.warnings.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {results.warnings.map((warning, index) => (
                          <div key={index} className="p-2 bg-yellow-50 rounded text-sm">
                            ⚠️ {warning}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Errors */}
                {results.errors.length > 0 && (
                  <Card className="border-red-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <XCircle className="w-4 h-4 text-red-600" />
                        Critical Issues ({results.errors.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-2">
                        {results.errors.map((error, index) => (
                          <div key={index} className="p-2 bg-red-50 rounded text-sm">
                            ❌ {error}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            <div className="text-xs text-gray-500">
              <p>Auto-validation runs on page load to verify schema fixes. Check browser console for detailed validation logs and results.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
