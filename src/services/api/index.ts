/**
 * API Services Barrel Export
 */

// Booking Service
export {
  reserveSlot,
  createCheckoutSession,
  getBookingsForSpace,
  type ReserveSlotParams,
  type ReserveSlotResult,
  type CreateCheckoutSessionResult,
  type SpaceBooking,
  type GetSpaceBookingsResult
} from './bookingService';

// Chat Service
export * as chatService from './chatService';
export type {
  FetchConversationsResult,
  FetchMessagesResult,
  SendMessageParams,
  SendMessageResult
} from './chatService';

// Stripe Service
export {
  checkAccountStatus,
  createOnboardingLink,
  getPayouts,
  type CheckAccountStatusResult,
  type StripeAccountStatus,
  type StripeOnboardingResult,
  type StripePayoutData,
  type GetPayoutsResult
} from './stripeService';

// Profile Service
export * as profileService from './profileService';

// Payment Service
export * as paymentService from './paymentService';

// Report Service
export * as reportService from './reportService';

// KYC Service
export * as kycService from './kycService';

// Notification Service
export * as notificationService from './notificationService';

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
