
import React from 'react';
import { AccessGuard } from '@/components/shared/access/AccessGuard';
import { LoadingSkeleton } from '@/components/shared/access/LoadingSkeleton';
import { EnhancedBookingsDashboard } from './EnhancedBookingsDashboard';

export function BookingsDashboard() {
  return (
    <AccessGuard 
      requiredRoles={['coworker', 'host', 'admin']}
      loadingFallback={<LoadingSkeleton />}
    >
      <EnhancedBookingsDashboard />
    </AccessGuard>
  );
}
