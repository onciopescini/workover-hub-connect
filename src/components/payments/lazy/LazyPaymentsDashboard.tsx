import React, { Suspense } from 'react';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';

const PaymentsDashboard = React.lazy(() => 
  import('../PaymentsDashboard').then(module => ({
    default: module.PaymentsDashboard
  }))
);

export function LazyPaymentsDashboard() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="payments" />}>
      <PaymentsDashboard />
    </Suspense>
  );
}