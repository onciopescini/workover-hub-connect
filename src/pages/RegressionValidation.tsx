
import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { RegressionValidationRunner } from '@/components/validation/RegressionValidationRunner';

const RegressionValidation = () => {
  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Workover Sprint 1 Regression Validation
            </h1>
            <p className="text-lg text-gray-600">
              Comprehensive full-system validation across all platform modules
            </p>
          </div>
          
          <RegressionValidationRunner />
        </div>
      </div>
    </MainLayout>
  );
};

export default RegressionValidation;
