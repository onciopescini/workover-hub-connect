
import React from 'react';
import { PaymentValidationDashboard } from '@/components/validation/PaymentValidationDashboard';

const PaymentValidation = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Payment Validation Suite
          </h1>
          <p className="text-gray-600">
            Comprehensive validation of the dual commission payment model for Workover
          </p>
        </div>
        
        <PaymentValidationDashboard />
      </div>
    </div>
  );
};

export default PaymentValidation;
