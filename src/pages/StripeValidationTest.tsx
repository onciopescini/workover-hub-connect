import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { StripeValidationTest } from '@/components/validation/StripeValidationTest';

const StripeValidationTestPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Stripe Destination Charge Validation
          </h1>
          <p className="text-lg text-gray-600">
            Post-refactor validation suite for dual commission model
          </p>
        </div>
          
        <StripeValidationTest />
      </div>
    </div>
  );
};

export default StripeValidationTestPage;
