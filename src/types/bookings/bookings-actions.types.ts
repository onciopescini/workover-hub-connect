import { BookingWithDetails } from "@/types/booking";

export interface BookingsActions {
  onOpenMessageDialog: (bookingId: string, spaceTitle: string) => void;
  onOpenCancelDialog: (booking: BookingWithDetails) => void;
  onCancelBooking: (reason?: string) => Promise<void>;
  onStatusFilter: (status: string) => void;
  onDateRangeFilter: (range: { start: string; end: string } | undefined) => void;
  onClearFilters: () => void;
  onApproveBooking: (bookingId: string) => Promise<void>;
  onOpenRejectDialog: (booking: BookingWithDetails) => void;
  onRejectBooking: (reason: string) => Promise<void>;
}

export interface BookingCardActions {
  onMessage: () => void;
  onCancel: () => void;
  onApprove?: () => void;
  onReject?: () => void;
}
