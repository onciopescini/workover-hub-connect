import React from 'react';
import { BookingsDashboardHeader } from '../dashboard/BookingsDashboardHeader';
import { BookingsDashboardFilters } from '../dashboard/BookingsDashboardFilters';
import { BookingsDashboardContent } from '../dashboard/BookingsDashboardContent';
import { PaymentSuccessHandler } from '../PaymentSuccessHandler';
import { EnhancedBookingsDashboardLayout } from './EnhancedBookingsDashboardLayout';
import { EnhancedBookingsDashboardDialogs } from './EnhancedBookingsDashboardDialogs';
import { BookingsDashboardState, BookingsStats } from '@/types/bookings/bookings-dashboard.types';
import { BookingsActions } from '@/types/bookings/bookings-actions.types';
import { BookingWithDetails } from '@/types/booking';

interface EnhancedBookingsDashboardUIProps {
  dashboardState: BookingsDashboardState;
  filteredBookings: BookingWithDetails[];
  enhancedStats: BookingsStats & { conversionRate: string; avgBookingValue: string };
  actions: BookingsActions & { onSearchChange: (term: string) => void };
  isLoading: boolean;
  getUserRole: (booking: BookingWithDetails) => "host" | "coworker";
  isChatEnabled: (booking: BookingWithDetails) => boolean;
  setMessageDialogOpen: (open: boolean) => void;
  setCancelDialogOpen: (open: boolean) => void;
  cancelBookingLoading: boolean;
}

export function EnhancedBookingsDashboardUI({
  dashboardState,
  filteredBookings,
  enhancedStats,
  actions,
  isLoading,
  getUserRole,
  isChatEnabled,
  setMessageDialogOpen,
  setCancelDialogOpen,
  cancelBookingLoading
}: EnhancedBookingsDashboardUIProps) {
  return (
    <EnhancedBookingsDashboardLayout>
      <PaymentSuccessHandler />
      
      <BookingsDashboardHeader
        totalBookings={enhancedStats.total}
        pendingCount={enhancedStats.pending}
        confirmedCount={enhancedStats.confirmed}
        totalRevenue={enhancedStats.totalRevenue}
      />
      
      <BookingsDashboardFilters
        searchTerm={dashboardState.searchTerm}
        onSearchChange={actions.onSearchChange}
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
      
      <EnhancedBookingsDashboardDialogs
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
    </EnhancedBookingsDashboardLayout>
  );
}