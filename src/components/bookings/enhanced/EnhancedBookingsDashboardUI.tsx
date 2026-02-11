
import React, { useCallback, useMemo, useState } from 'react';
import { BookingsDashboardHeader } from '../dashboard/BookingsDashboardHeader';
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
import { ReportSubscriptionToggle } from '@/components/host/reports/ReportSubscriptionToggle';
import { BookingsCalendarView } from '../calendar/BookingsCalendarView';
import { HostBookingsCalendarView } from '../calendar/HostBookingsCalendarView';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { CompactBookingsFilters } from '../filters/CompactBookingsFilters';
import { EnhancedBookingCard } from '../EnhancedBookingCard';
import { BookingDetailDialog } from './BookingDetailDialog';
import { LayoutList, Calendar } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { EmptyBookingsState } from '../EmptyBookingsState';

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
  setRejectDialogOpen: (open: boolean) => void;
  setDisputeDialogOpen: (open: boolean) => void;
  cancelBookingLoading: boolean;
  disputeBookingLoading: boolean;
  rejectBookingLoading: boolean;
  rejectDialogOpen: boolean;
  refetch: () => void;
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
  setRejectDialogOpen,
  setDisputeDialogOpen,
  cancelBookingLoading,
  disputeBookingLoading,
  rejectBookingLoading,
  rejectDialogOpen,
  refetch
}: EnhancedBookingsDashboardUIProps) {
  const [bulkOpen, setBulkOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedBookingDetails, setSelectedBookingDetails] = useState<BookingWithDetails | null>(null);

  const { hasAnyRole } = useRoleAccess();
  const isHost = hasAnyRole(['host', 'admin']);

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
    await groupMessage(ids, content);
  }, [groupMessage]);

  const handleCalendarEventClick = useCallback((booking: BookingWithDetails) => {
    setSelectedBookingDetails(booking);
  }, []);

  const drawerBookings = useMemo(() => filteredBookings, [filteredBookings]);

  return (
    <EnhancedBookingsDashboardLayout>
      <PaymentSuccessHandler />

      <BookingsDashboardHeader
        totalBookings={enhancedStats.total}
        pendingCount={enhancedStats.pending}
        confirmedCount={enhancedStats.confirmed}
        totalRevenue={enhancedStats.totalRevenue}
      />

      {/* Compact Filters - Sticky at top */}
      <CompactBookingsFilters
        searchTerm={dashboardState.searchTerm}
        onSearchChange={actions.onSearchChange}
        filters={dashboardState.filters}
        onStatusFilter={(status) => actions.onStatusFilter(status || 'all')}
        onDateRangeFilter={(range) => actions.onDateRangeFilter(range || undefined)}
        onClearFilters={actions.onClearFilters}
      />

      {/* Toolbar Actions */}
      <div className="flex items-center justify-between mb-4 px-4 mt-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}>
            Azioni Bulk
          </Button>
          <Button variant="outline" size="sm" onClick={onExportCsv}>
            Esporta CSV
          </Button>
          <ReportSubscriptionToggle />
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="h-8"
          >
            <LayoutList className="h-4 w-4 mr-2" />
            Lista
          </Button>
          <Button
            variant={viewMode === 'calendar' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('calendar')}
            className="h-8"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Calendario
          </Button>
        </div>
      </div>

      {/* Content Views */}
      <div className="px-4 pb-12">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          <>
            {viewMode === 'list' && (
              filteredBookings.length > 0 ? (
                <div className="space-y-4 max-w-3xl mx-auto">
                  {filteredBookings.map((booking) => (
                    <EnhancedBookingCard
                      key={booking.id}
                      booking={booking}
                      userRole={getUserRole(booking)}
                      isChatEnabled={isChatEnabled(booking)}
                      onOpenMessageDialog={actions.onOpenMessageDialog}
                      onOpenCancelDialog={actions.onOpenCancelDialog}
                      onApproveBooking={actions.onApproveBooking}
                      onOpenRejectDialog={actions.onOpenRejectDialog}
                      onOpenDisputeDialog={actions.onOpenDisputeDialog}
                    />
                  ))}
                </div>
              ) : (
                <EmptyBookingsState activeTab={dashboardState.filters.status || 'all'} />
              )
            )}

            {viewMode === 'calendar' && (
              <>
                {isHost ? (
                  <HostBookingsCalendarView
                    bookings={filteredBookings}
                    getUserRole={getUserRole}
                    isChatEnabled={isChatEnabled}
                    onOpenMessageDialog={actions.onOpenMessageDialog}
                    onOpenCancelDialog={actions.onOpenCancelDialog}
                    onEventClick={handleCalendarEventClick}
                  />
                ) : (
                  <BookingsCalendarView
                    bookings={filteredBookings}
                    getUserRole={getUserRole}
                    isChatEnabled={isChatEnabled}
                    onOpenMessageDialog={actions.onOpenMessageDialog}
                    onOpenCancelDialog={actions.onOpenCancelDialog}
                    onEventClick={handleCalendarEventClick}
                  />
                )}
              </>
            )}
          </>
        )}
      </div>

      <EnhancedBookingsDashboardDialogs
        messageDialogOpen={dashboardState.dialogStates.messageDialog}
        setMessageDialogOpen={setMessageDialogOpen}
        messageBookingId={dashboardState.dialogStates.messageBookingId}
        messageSpaceTitle={dashboardState.dialogStates.messageSpaceTitle}
        cancelDialogOpen={dashboardState.dialogStates.cancelDialog}
        setCancelDialogOpen={setCancelDialogOpen}
        rejectDialogOpen={rejectDialogOpen}
        setRejectDialogOpen={setRejectDialogOpen}
        disputeDialogOpen={dashboardState.dialogStates.disputeDialog}
        setDisputeDialogOpen={setDisputeDialogOpen}
        selectedBooking={dashboardState.selectedBooking}
        onCancelBooking={actions.onCancelBooking}
        onSubmitDispute={actions.onSubmitDispute}
        onRejectBooking={actions.onRejectBooking}
        cancelBookingLoading={cancelBookingLoading}
        disputeBookingLoading={disputeBookingLoading}
        rejectBookingLoading={rejectBookingLoading}
      />

      <BookingDetailDialog
        isOpen={!!selectedBookingDetails}
        onClose={() => setSelectedBookingDetails(null)}
        booking={selectedBookingDetails}
        userRole={selectedBookingDetails ? getUserRole(selectedBookingDetails) : 'coworker'}
        isChatEnabled={selectedBookingDetails ? isChatEnabled(selectedBookingDetails) : false}
        onOpenMessageDialog={actions.onOpenMessageDialog}
        onOpenCancelDialog={(booking) => {
          setSelectedBookingDetails(null); // Close details modal first
          actions.onOpenCancelDialog(booking);
        }}
        onOpenDisputeDialog={(booking) => {
          setSelectedBookingDetails(null);
          actions.onOpenDisputeDialog(booking);
        }}
      />

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
