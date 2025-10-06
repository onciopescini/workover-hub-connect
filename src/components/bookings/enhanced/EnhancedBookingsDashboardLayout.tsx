import React, { Suspense } from 'react';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';
import { useRenderTracking } from '@/hooks/useMetricsCollection';

interface EnhancedBookingsDashboardLayoutProps {
  children: React.ReactNode;
}

export function EnhancedBookingsDashboardLayout({ children }: EnhancedBookingsDashboardLayoutProps) {
  useRenderTracking('EnhancedBookingsDashboardLayout');
  
  return (
    <div className="container mx-auto py-8 space-y-8">
      <ErrorBoundary>
        <Suspense fallback={<LoadingSkeleton variant="bookings" />}>
          {children}
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}