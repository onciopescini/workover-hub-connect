import React from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import { useEnhancedBookingsDashboard } from '@/hooks/bookings/enhanced/useEnhancedBookingsDashboard';
import { BookingsDashboardUnauthenticated } from '../dashboard/BookingsDashboardUnauthenticated';
import { BookingsDashboardError } from '../dashboard/BookingsDashboardError';
import { EnhancedBookingsDashboardUI } from './EnhancedBookingsDashboardUI';

export function EnhancedBookingsDashboardContainer() {
  const { authState } = useAuth();
  const dashboardState = useEnhancedBookingsDashboard();

  if (!authState.isAuthenticated) {
    return <BookingsDashboardUnauthenticated />;
  }

  if (dashboardState.error) {
    return <BookingsDashboardError onRefresh={dashboardState.refetch} />;
  }

  return <EnhancedBookingsDashboardUI {...dashboardState} />;
}