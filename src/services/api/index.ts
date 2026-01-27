/**
 * API Services Barrel Export
 */

// Booking Service
export {
  reserveSlot,
  createCheckoutSession,
  type ReserveSlotParams,
  type ReserveSlotResult,
  type CreateCheckoutSessionResult
} from './bookingService';

// Stripe Service
export {
  checkAccountStatus,
  createOnboardingLink,
  getPayouts,
  type StripeAccountStatus,
  type StripeOnboardingResult,
  type StripePayoutData
} from './stripeService';

// Admin Service
export {
  getAllBookings,
  getAllUsers,
  toggleUserStatus,
  getSystemMetrics,
  type GetBookingsParams,
  type GetBookingsResult
} from './adminService';

// Mapbox Service
export * as mapboxService from './mapboxService';
export type {
  AddressSuggestion,
  Coordinates,
  GeocodeResult,
  ReverseGeocodeResult,
  SearchAddressOptions
} from './mapboxService';

// Fiscal Service
export * as fiscalService from './fiscalService';
export type {
  DAC7ThresholdResult,
  GenerateInvoiceParams,
  GenerateInvoiceResult
} from './fiscalService';

// Privacy Service
export * as privacyService from './privacyService';
export type {
  GDPRRequest,
  ExportResult,
  DeletionResult
} from './privacyService';
