import { BookingWithDetails } from "@/types/booking";
import { BookingFilter } from '@/hooks/queries/bookings/useBookingFilters';

export type BookingTabType = "all" | "pending" | "confirmed" | "cancelled";

export interface BookingsDashboardState {
  activeTab: BookingTabType;
  searchTerm: string;
  dateFilter: string;
  filters: BookingFilter;
  selectedBooking: BookingWithDetails | null;
  dialogStates: {
    messageDialog: boolean;
    cancelDialog: boolean;
    messageBookingId: string;
    messageSpaceTitle: string;
  };
}

export interface BookingsStats {
  total: number;
  pending: number;
  confirmed: number;
  cancelled: number;
  totalRevenue: number;
}