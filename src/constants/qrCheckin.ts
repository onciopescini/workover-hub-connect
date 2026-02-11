export const QR_CHECKIN_RPC = {
  CHECKIN: 'host_scan_checkin',
  CHECKOUT: 'host_scan_checkout',
} as const;

export const QR_CHECKIN_ERRORS = {
  INVALID_BOOKING_STATUS: 'invalid_booking_status',
} as const;

export const QR_CHECKIN_INVALIDATION_KEYS = {
  BOOKINGS: 'bookings',
  HOST_BOOKINGS: 'host-bookings',
  COWORKER_BOOKINGS: 'coworker-bookings',
  TODAY_CHECKINS: 'today-checkins',
  ENHANCED_BOOKINGS: 'enhanced-bookings',
  HOST_DASHBOARD: 'hostDashboard',
} as const;
