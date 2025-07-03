import React, { Suspense } from 'react';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';

const EnhancedBookingsDashboard = React.lazy(() => 
  import('../EnhancedBookingsDashboard').then(module => ({
    default: module.EnhancedBookingsDashboard
  }))
);

export function LazyEnhancedBookingsDashboard() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="bookings" />}>
      <EnhancedBookingsDashboard />
    </Suspense>
  );
}