import type { BookingStatus } from '@/types/booking';

export const BOOKING_ACTION_STATUS = {
  CANCEL: ['pending', 'pending_approval', 'pending_payment', 'confirmed'],
  MARK_NO_SHOW: ['confirmed'],
  ADMINISTRATIVE: ['cancelled', 'checked_out', 'no_show'],
} as const satisfies Record<string, readonly BookingStatus[]>;

export const canCancelBookingByStatus = (status: BookingStatus): boolean => {
  return BOOKING_ACTION_STATUS.CANCEL.includes(status);
};

export const canMarkNoShowByStatus = (status: BookingStatus): boolean => {
  return BOOKING_ACTION_STATUS.MARK_NO_SHOW.includes(status);
};

export const canUseAdministrativeBookingActionsByStatus = (status: BookingStatus): boolean => {
  return BOOKING_ACTION_STATUS.ADMINISTRATIVE.includes(status);
};
