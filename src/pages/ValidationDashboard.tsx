
import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlayCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { sprint1Validator } from '@/lib/validation-suite';
import { executeValidationSuite } from '@/lib/validation-runner';

const ValidationDashboard = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [lastRun, setLastRun] = useState<Date | null>(null);

  const handleRunValidation = async () => {
    setIsRunning(true);
    try {
      await sprint1Validator.runFullValidation();
      setLastRun(new Date());
    } catch (error) {
      console.error('Validation failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const handleRunPaymentValidation = () => {
    executeValidationSuite();
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Sprint 1 Validation Dashboard
            </h1>
            <p className="text-lg text-gray-600">
              Comprehensive testing suite for all platform features
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid gap-6 md:grid-cols-2 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlayCircle className="h-5 w-5" />
                  Full Platform Validation
                </CardTitle>
                <CardDescription>
                  Run comprehensive tests across all Sprint 1 features
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">
                      Last run: {lastRun ? lastRun.toLocaleString() : 'Never'}
                    </span>
                    {isRunning && (
                      <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                        <Clock className="h-3 w-3 mr-1" />
                        Running...
                      </Badge>
                    )}
                  </div>
                  <Button 
                    onClick={handleRunValidation}
                    disabled={isRunning}
                    className="w-full"
                  >
                    {isRunning ? 'Running Validation...' : 'Run Full Validation'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Payment System Test
                </CardTitle>
                <CardDescription>
                  Validate dual commission model and Stripe integration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  onClick={handleRunPaymentValidation}
                  variant="outline"
                  className="w-full"
                >
                  Run Payment Validation
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Validation Categories */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Validation Categories</CardTitle>
              <CardDescription>
                Overview of all areas being tested
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">📅 Event Management</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Event CRUD operations</li>
                    <li>• Participant management</li>
                    <li>• Space associations</li>
                    <li>• Waitlist functionality</li>
                  </ul>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">💰 Host Revenue</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Revenue calculations</li>
                    <li>• DAC7 thresholds</li>
                    <li>• CSV export functionality</li>
                    <li>• Stripe payout accuracy</li>
                  </ul>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">🔒 GDPR Privacy</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Data export requests</li>
                    <li>• Account deletion flow</li>
                    <li>• Cookie consent mgmt</li>
                    <li>• Request audit trail</li>
                  </ul>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">💳 Payments & Booking</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Dual commission (5%+5%)</li>
                    <li>• Payment sessions</li>
                    <li>• Booking calculations</li>
                    <li>• Fee distribution</li>
                  </ul>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">🔧 Platform Integrity</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Role-based navigation</li>
                    <li>• Auth flow protection</li>
                    <li>• Supabase RLS policies</li>
                    <li>• Type safety checks</li>
                  </ul>
                </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">📊 Data Validation</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Database queries</li>
                    <li>• RPC function calls</li>
                    <li>• Type consistency</li>
                    <li>• API endpoints</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>How to Use</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">1. Full Platform Validation</h4>
                  <p className="text-sm text-gray-600">
                    Runs comprehensive tests across all Sprint 1 features. Check the browser console 
                    for detailed output and any errors encountered.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">2. Payment System Test</h4>
                  <p className="text-sm text-gray-600">
                    Specifically validates the dual commission model calculations and Stripe 
                    integration accuracy.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">3. Console Output</h4>
                  <p className="text-sm text-gray-600">
                    Open your browser's developer console (F12) to see detailed validation results, 
                    including success/failure status for each category.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default ValidationDashboard;
