
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
import { RealtimeBookingsSync } from '@/components/bookings/realtime/RealtimeBookingsSync';
import { ReportSubscriptionToggle } from '@/components/host/reports/ReportSubscriptionToggle';
import { BookingsCalendarView } from '../calendar/BookingsCalendarView';
import { HostBookingsCalendarView } from '../calendar/HostBookingsCalendarView';
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { CompactBookingsFilters } from '../compact/CompactBookingsFilters';
import { BookingsCompactGrid } from '../compact/BookingsCompactGrid';
import { BookingsTableView } from '../table/BookingsTableView';
import { LayoutGrid, Table as TableIcon, Calendar } from 'lucide-react';

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
  cancelBookingLoading,
  refetch
}: EnhancedBookingsDashboardUIProps) {
  const [bulkOpen, setBulkOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'table' | 'calendar'>('grid');
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

  const drawerBookings = useMemo(() => filteredBookings, [filteredBookings]);

  return (
    <EnhancedBookingsDashboardLayout>
      <PaymentSuccessHandler />
      <RealtimeBookingsSync onChange={refetch} />

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
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
            className="h-8"
          >
            <LayoutGrid className="h-4 w-4 mr-2" />
            Griglia
          </Button>
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="h-8"
          >
            <TableIcon className="h-4 w-4 mr-2" />
            Tabella
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
      <div className="px-4">
        {viewMode === 'grid' && (
          <BookingsCompactGrid
            bookings={filteredBookings}
            isLoading={isLoading}
            getUserRole={getUserRole}
            isChatEnabled={isChatEnabled}
            onOpenMessageDialog={actions.onOpenMessageDialog}
            onOpenCancelDialog={actions.onOpenCancelDialog}
          />
        )}

        {viewMode === 'table' && (
          <BookingsTableView
            bookings={filteredBookings}
            isLoading={isLoading}
            getUserRole={getUserRole}
            isChatEnabled={isChatEnabled}
            onOpenMessageDialog={actions.onOpenMessageDialog}
            onOpenCancelDialog={actions.onOpenCancelDialog}
          />
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
              />
            ) : (
              <BookingsCalendarView
                bookings={filteredBookings}
                getUserRole={getUserRole}
                isChatEnabled={isChatEnabled}
                onOpenMessageDialog={actions.onOpenMessageDialog}
                onOpenCancelDialog={actions.onOpenCancelDialog}
              />
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
        selectedBooking={dashboardState.selectedBooking}
        onCancelBooking={actions.onCancelBooking}
        cancelBookingLoading={cancelBookingLoading}
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
