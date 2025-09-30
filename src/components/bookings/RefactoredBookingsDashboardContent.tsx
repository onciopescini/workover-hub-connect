import React from 'react';
import { useBookingsDashboardState } from '@/hooks/bookings/useBookingsDashboardState';
import { BookingsDashboardHeader } from './dashboard/BookingsDashboardHeader';
import { BookingsDashboardFilters } from './dashboard/BookingsDashboardFilters';
import { BookingsDashboardContent } from './dashboard/BookingsDashboardContent';
import { BookingsDashboardError } from './dashboard/BookingsDashboardError';
import { PaymentSuccessHandler } from './PaymentSuccessHandler';
import { frontendLogger } from '@/utils/frontend-logger';
import { useRenderTracking } from '@/hooks/useMetricsCollection';

export function RefactoredBookingsDashboardContent() {
  useRenderTracking('RefactoredBookingsDashboardContent');
  
  const {
    dashboardState,
    filteredBookings,
    stats,
    isLoading,
    error,
    actions,
    setMessageDialogOpen,
    setCancelDialogOpen,
    setSearchTerm,
    isChatEnabled,
    getUserRole,
    refetch,
    cancelBookingLoading,
  } = useBookingsDashboardState();

  if (error) {
    frontendLogger.bookingDashboard('Dashboard error', error, { 
      component: 'RefactoredBookingsDashboard' 
    });
    return <BookingsDashboardError onRefresh={() => refetch()} />;
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      <PaymentSuccessHandler />

      <BookingsDashboardHeader
        totalBookings={stats.total}
        pendingCount={stats.pending}
        confirmedCount={stats.confirmed}
        totalRevenue={stats.totalRevenue}
      />

      <BookingsDashboardFilters
        searchTerm={dashboardState.searchTerm}
        onSearchChange={setSearchTerm}
        filters={dashboardState.filters}
        onStatusFilter={actions.onStatusFilter}
        onDateRangeFilter={actions.onDateRangeFilter}
        onClearFilters={actions.onClearFilters}
      />

      <BookingsDashboardContent
        isLoading={isLoading}
        bookings={filteredBookings}
        searchTerm={dashboardState.searchTerm}
        getUserRole={getUserRole}
        isChatEnabled={isChatEnabled}
        onOpenMessageDialog={actions.onOpenMessageDialog}
        onOpenCancelDialog={actions.onOpenCancelDialog}
        messageDialogOpen={dashboardState.dialogStates.messageDialog}
        setMessageDialogOpen={setMessageDialogOpen}
        messageBookingId={dashboardState.dialogStates.messageBookingId}
        messageSpaceTitle={dashboardState.dialogStates.messageSpaceTitle}
        cancelDialogOpen={dashboardState.dialogStates.cancelDialog}
        setCancelDialogOpen={setCancelDialogOpen}
        selectedBooking={dashboardState.selectedBooking}
        onCancelBooking={actions.onCancelBooking}
        cancelBookingLoading={cancelBookingLoading}
      />
    </div>
  );
}