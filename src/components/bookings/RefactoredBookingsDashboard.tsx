import React from 'react';
import { AccessGuard } from '@/components/shared/access/AccessGuard';
import { LoadingSkeleton } from '@/components/shared/access/LoadingSkeleton';
import { RefactoredBookingsDashboardContent } from './RefactoredBookingsDashboardContent';

export function RefactoredBookingsDashboard() {
  return (
    <AccessGuard 
      requiredRoles={['coworker', 'host', 'admin']}
      loadingFallback={<LoadingSkeleton />}
    >
      <RefactoredBookingsDashboardContent />
    </AccessGuard>
  );
}