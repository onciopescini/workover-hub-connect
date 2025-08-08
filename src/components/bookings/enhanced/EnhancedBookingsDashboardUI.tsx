
import React, { useCallback, useMemo, useState } from 'react';
import { BookingsDashboardHeader } from '../dashboard/BookingsDashboardHeader';
import { BookingsDashboardFilters } from '../dashboard/BookingsDashboardFilters';
import { BookingsDashboardContent } from '../dashboard/BookingsDashboardContent';
import { PaymentSuccessHandler } from '../PaymentSuccessHandler';
import { EnhancedBookingsDashboardLayout } from './EnhancedBookingsDashboardLayout';
import { EnhancedBookingsDashboardDialogs } from './EnhancedBookingsDashboardDialogs';
import { BookingsDashboardState, BookingsStats } from '@/types/bookings/bookings-dashboard.types';
import { BookingsActions } from '@/types/bookings/bookings-actions.types';
import { BookingWithDetails } from '@/types/booking';
import { Button } from '@/components/ui/button';
import { exportBookingsToCSV } from '@/utils/csv/exportBookingsCsv';
import { BulkSelectionDrawer } from '@/components/bookings/bulk/BulkSelectionDrawer';
import { useBulkBookingActions } from '@/hooks/bookings/useBulkBookingActions';
import { RealtimeBookingsSync } from '@/components/bookings/realtime/RealtimeBookingsSync';
import { ReportSubscriptionToggle } from '@/components/host/reports/ReportSubscriptionToggle';

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
  refetch: () => void; // aggiunto per realtime/refresh post-azioni
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
  cancelBookingLoading,
  refetch
}: EnhancedBookingsDashboardUIProps) {
  const [bulkOpen, setBulkOpen] = useState(false);

  const { confirmMultiple, cancelMultiple, groupMessage, loading: bulkLoading } = useBulkBookingActions({
    onAfterAll: refetch,
  });

  const onExportCsv = useCallback(() => {
    exportBookingsToCSV(filteredBookings);
  }, [filteredBookings]);

  const handleBulkConfirm = useCallback(async (ids: string[]) => {
    await confirmMultiple(ids);
  }, [confirmMultiple]);

  const handleBulkCancel = useCallback(async (ids: string[], reason: string) => {
    await cancelMultiple(ids, reason);
  }, [cancelMultiple]);

  const handleBulkMessage = useCallback(async (ids: string[], content: string) => {
    // inviamo con template già renderizzato singolarmente nel server? Qui inviamo testo uguale
    await groupMessage(ids, content);
  }, [groupMessage]);

  // Memo di bookings per drawer
  const drawerBookings = useMemo(() => filteredBookings, [filteredBookings]);

  return (
    <EnhancedBookingsDashboardLayout>
      <PaymentSuccessHandler />

      {/* Realtime sync: aggiorna dashboard e quindi calendario avanzato */}
      <RealtimeBookingsSync onChange={refetch} />

      <BookingsDashboardHeader
        totalBookings={enhancedStats.total}
        pendingCount={enhancedStats.pending}
        confirmedCount={enhancedStats.confirmed}
        totalRevenue={enhancedStats.totalRevenue}
      />

      {/* Toolbar azioni aggiuntive */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setBulkOpen(true)}>
            Azioni Bulk
          </Button>
          <Button variant="outline" onClick={onExportCsv}>
            Esporta CSV
          </Button>
        </div>
      </div>

      {/* Toggle report mensile (opt-in) */}
      <div className="mb-4">
        <ReportSubscriptionToggle />
      </div>

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

      {/* Drawer per selezione bulk */}
      <BulkSelectionDrawer
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        bookings={drawerBookings}
        onConfirm={handleBulkConfirm}
        onCancel={handleBulkCancel}
        onGroupMessage={handleBulkMessage}
        isProcessing={bulkLoading}
      />
    </EnhancedBookingsDashboardLayout>
  );
}
