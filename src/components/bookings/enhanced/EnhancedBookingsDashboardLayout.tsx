import React, { Suspense } from 'react';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadingSkeleton } from '@/components/shared/LoadingSkeleton';

interface EnhancedBookingsDashboardLayoutProps {
  children: React.ReactNode;
}

export function EnhancedBookingsDashboardLayout({ children }: EnhancedBookingsDashboardLayoutProps) {
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