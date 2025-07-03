import React, { Suspense } from 'react';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';

const DataMinimizationAuditDashboard = React.lazy(() => 
  import('../DataMinimizationAuditDashboard').then(module => ({
    default: module.DataMinimizationAuditDashboard
  }))
);

export function LazyDataMinimizationAuditDashboard() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="admin" />}>
      <DataMinimizationAuditDashboard />
    </Suspense>
  );
}