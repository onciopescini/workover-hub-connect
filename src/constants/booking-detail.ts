export const BOOKING_DETAIL_ROUTE_PREFIX = '/bookings';
export const BOOKING_DETAIL_TABLE = 'bookings';

export const bookingDetailQueryKeys = {
  all: ['booking-detail'] as const,
  detail: (bookingId: string) => [...bookingDetailQueryKeys.all, bookingId] as const,
};
