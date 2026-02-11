export const QR_CHECKIN_RPC = {
  CHECKIN: 'host_scan_checkin',
  CHECKOUT: 'host_scan_checkout',
} as const;

export const QR_CHECKIN_ERRORS = {
  TOO_EARLY_FOR_CHECKIN: 'too_early_for_checkin',
  INVALID_BOOKING_STATUS: 'invalid_booking_status',
  BOOKING_NOT_FOUND_OR_FORBIDDEN: 'booking_not_found_or_forbidden',
  INVALID_QR_FORMAT: 'invalid_qr_format',
  MISSING_REQUIRED_PARAMS: 'missing_required_params',
} as const;

export const QR_SCAN_OPERATION = {
  CHECKIN: 'checkin',
  CHECKOUT: 'checkout',
} as const;

export const QR_CHECKIN_ERROR_MESSAGES: Record<string, string> = {
  [QR_CHECKIN_ERRORS.TOO_EARLY_FOR_CHECKIN]: 'È troppo presto per fare il check-in di questa prenotazione.',
  [QR_CHECKIN_ERRORS.INVALID_BOOKING_STATUS]: 'Stato prenotazione non valido per questa operazione.',
  [QR_CHECKIN_ERRORS.BOOKING_NOT_FOUND_OR_FORBIDDEN]: 'Prenotazione non trovata o non autorizzata per questo host.',
  [QR_CHECKIN_ERRORS.INVALID_QR_FORMAT]: 'Il QR scansionato non è valido.',
  [QR_CHECKIN_ERRORS.MISSING_REQUIRED_PARAMS]: 'Parametri mancanti nella richiesta di scansione.',
};

export const QR_CHECKIN_INVALIDATION_KEYS = {
  BOOKINGS: 'bookings',
  HOST_BOOKINGS: 'host-bookings',
  COWORKER_BOOKINGS: 'coworker-bookings',
  TODAY_CHECKINS: 'today-checkins',
  ENHANCED_BOOKINGS: 'enhanced-bookings',
  HOST_DASHBOARD: 'hostDashboard',
} as const;

export const QR_BOOKINGS_REALTIME = {
  CHANNEL_PREFIX: 'guest-booking-status',
  SCHEMA: 'public',
  TABLE: 'bookings',
  EVENT: 'UPDATE',
} as const;
