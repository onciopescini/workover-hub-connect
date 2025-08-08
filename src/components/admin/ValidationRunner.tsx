
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlayCircle, Settings } from 'lucide-react';
import { executeValidationSuite } from '@/lib/validation-runner';
import { sprint1Validator } from '@/lib/validation-suite';
import { useLogger } from '@/hooks/useLogger';

export const ValidationRunner = () => {
  const { info } = useLogger({ context: 'ValidationRunner' });

  const handleRunPaymentValidation = () => {
    info('Starting Payment Validation Suite');
    executeValidationSuite();
  };

  const handleRunFullValidation = async () => {
    info('Starting Full Sprint 1 Validation Suite');
    await sprint1Validator.runFullValidation();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Validation Tools
        </CardTitle>
        <CardDescription>
          Run comprehensive tests to validate platform functionality
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Button 
              onClick={handleRunPaymentValidation}
              variant="outline"
              className="flex items-center gap-2"
            >
              <PlayCircle className="h-4 w-4" />
              Payment Validation
            </Button>
            
            <Button 
              onClick={handleRunFullValidation}
              className="flex items-center gap-2"
            >
              <PlayCircle className="h-4 w-4" />
              Full Platform Test
            </Button>
          </div>
          
          <div className="text-xs text-gray-500">
            <p>• Payment Validation: Tests dual commission model (5%+5%) and Stripe calculations</p>
            <p>• Full Platform Test: Validates all Sprint 1 features including GDPR and revenue</p>
            <p>• Check browser console for detailed results</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
