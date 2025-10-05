import { v4 as uuidv4 } from 'uuid';

/**
 * Mock Data Factory per Testing
 * Genera dati validi per tutti gli schema Zod
 */

// ============= Space Mock Data =============
export const createMockAvailabilitySlot = (overrides?: Partial<any>) => ({
  start: '09:00',
  end: '18:00',
  ...overrides,
});

export const createMockDayAvailability = (overrides?: Partial<any>) => ({
  enabled: true,
  slots: [createMockAvailabilitySlot()],
  ...overrides,
});

export const createMockRecurringAvailability = (overrides?: Partial<any>) => ({
  monday: createMockDayAvailability(),
  tuesday: createMockDayAvailability(),
  wednesday: createMockDayAvailability(),
  thursday: createMockDayAvailability(),
  friday: createMockDayAvailability(),
  saturday: createMockDayAvailability({ enabled: false, slots: [] }),
  sunday: createMockDayAvailability({ enabled: false, slots: [] }),
  ...overrides,
});

export const createMockSpaceForm = (overrides?: Partial<any>) => ({
  title: 'Spazio Test',
  description: 'Una descrizione di test per lo spazio coworking',
  category: 'professional' as const,
  work_environment: 'controlled' as const,
  max_capacity: 10,
  confirmation_type: 'instant' as const,
  workspace_features: ['wifi', 'desk'],
  amenities: ['coffee', 'parking'],
  seating_types: ['standing_desk', 'ergonomic_chair'],
  ideal_guest_tags: ['developer', 'designer'],
  event_friendly_tags: ['workshop', 'meeting'],
  rules: 'Regole dello spazio',
  address: 'Via Test 123, Milano',
  latitude: 45.4642,
  longitude: 9.1900,
  price_per_hour: 15,
  price_per_day: 100,
  availability: {
    recurring: createMockRecurringAvailability(),
    exceptions: [],
  },
  photos: ['https://example.com/photo1.jpg'],
  published: false,
  ...overrides,
});

// ============= Booking Mock Data =============
export const createMockBookingSlot = (overrides?: Partial<any>) => ({
  id: uuidv4(),
  date: '2025-12-01',
  startTime: '09:00',
  endTime: '12:00',
  hasConflict: false,
  ...overrides,
});

export const createMockBookingForm = (overrides?: Partial<any>) => ({
  space_id: uuidv4(),
  booking_date: '2025-12-01',
  start_time: '09:00',
  end_time: '12:00',
  guests_count: 2,
  ...overrides,
});

export const createMockBookingCancellation = (overrides?: Partial<any>) => ({
  booking_id: uuidv4(),
  cancelled_by_host: false,
  cancellation_reason: 'Motivo di cancellazione valido con almeno 10 caratteri',
  ...overrides,
});

// ============= Message Mock Data =============
export const createMockMessageAttachment = (overrides?: Partial<any>) => ({
  url: 'https://example.com/file.pdf',
  type: 'document' as const,
  name: 'documento.pdf',
  size: 1024 * 1024, // 1MB
  ...overrides,
});

export const createMockMessageForm = (overrides?: Partial<any>) => ({
  content: 'Messaggio di test',
  booking_id: uuidv4(),
  attachments: [],
  ...overrides,
});

export const createMockMessageTemplate = (overrides?: Partial<any>) => ({
  name: 'Template Conferma',
  content: 'Ciao! Questa è una conferma della tua prenotazione.',
  type: 'confirmation' as const,
  is_active: true,
  is_favorite: false,
  ...overrides,
});

// ============= Connection Mock Data =============
export const createMockConnectionRequest = (overrides?: Partial<any>) => ({
  receiver_id: uuidv4(),
  message: 'Vorrei connettermi con te per collaborare',
  ...overrides,
});

export const createMockConnectionResponse = (overrides?: Partial<any>) => ({
  connection_id: uuidv4(),
  status: 'accepted' as const,
  response_message: 'Felice di connettermi!',
  ...overrides,
});

export const createMockNetworkingPreferences = (overrides?: Partial<any>) => ({
  networking_enabled: true,
  collaboration_availability: 'available' as const,
  collaboration_types: ['progetti', 'consulenza'],
  preferred_work_mode: 'ibrido' as const,
  collaboration_description: 'Disponibile per progetti interessanti',
  ...overrides,
});

// ============= Profile Mock Data =============
export const createMockProfileEdit = (overrides?: Partial<any>) => ({
  full_name: 'Mario Rossi',
  job_title: 'Software Developer',
  bio: 'Sviluppatore appassionato di tecnologia',
  location: 'Milano, Italia',
  skills: ['JavaScript', 'React', 'Node.js'],
  linkedin_url: 'https://linkedin.com/in/mariorossi',
  website_url: 'https://mariorossi.dev',
  networking_enabled: true,
  ...overrides,
});

export const createMockOnboardingProfile = (overrides?: Partial<any>) => ({
  full_name: 'Mario Rossi',
  job_title: 'Developer',
  bio: 'Bio breve',
  location: 'Milano',
  ...overrides,
});

export const createMockTaxInfo = (overrides?: Partial<any>) => ({
  tax_id: 'RSSMRA80A01F205X',
  ...overrides,
});

// ============= Payment Mock Data =============
export const createMockCheckoutSession = (overrides?: Partial<any>) => ({
  booking_id: uuidv4(),
  ...overrides,
});

export const createMockRefundRequest = (overrides?: Partial<any>) => ({
  payment_id: uuidv4(),
  reason: 'requested_by_customer' as const,
  notes: 'Cliente ha richiesto il rimborso',
  ...overrides,
});

export const createMockPayoutConfig = (overrides?: Partial<any>) => ({
  currency: 'EUR' as const,
  minimum_payout: 50,
  payout_frequency: 'weekly' as const,
  ...overrides,
});

// ============= Admin Mock Data =============
export const createMockReportReview = (overrides?: Partial<any>) => ({
  report_id: uuidv4(),
  new_status: 'under_review' as const,
  admin_notes: 'Segnalazione presa in carico',
  ...overrides,
});

export const createMockUserSuspension = (overrides?: Partial<any>) => ({
  target_user_id: uuidv4(),
  suspension_reason: 'Violazione delle policy della piattaforma ripetuta',
  duration_days: 7,
  permanent: false,
  notify_user: true,
  ...overrides,
});

export const createMockSpaceModeration = (overrides?: Partial<any>) => ({
  space_id: uuidv4(),
  approve: true,
  admin_notes: 'Spazio approvato dopo verifica',
  ...overrides,
});

// ============= Event Mock Data =============
export const createMockEventForm = (overrides?: Partial<any>) => ({
  title: 'Workshop React',
  description: 'Un workshop introduttivo su React e TypeScript per sviluppatori',
  space_id: uuidv4(),
  event_date: '2025-12-15',
  start_time: '14:00',
  end_time: '18:00',
  max_participants: 20,
  min_participants: 5,
  city: 'Milano',
  image_url: 'https://example.com/event.jpg',
  event_status: 'active' as const,
  ...overrides,
});

export const createMockEventCancellation = (overrides?: Partial<any>) => ({
  event_id: uuidv4(),
  cancellation_reason: 'Impossibilità organizzativa improvvisa richiede cancellazione',
  ...overrides,
});

// ============= Review & Report Mock Data =============
export const createMockReviewForm = (overrides?: Partial<any>) => ({
  rating: 5,
  content: 'Esperienza fantastica!',
  ...overrides,
});

export const createMockReportForm = (overrides?: Partial<any>) => ({
  reason: 'inappropriate_content',
  description: 'Contenuto inappropriato rilevato',
  ...overrides,
});

// ============= Invalid Data Generators (for testing validation) =============
export const createInvalidEmail = () => 'not-an-email';
export const createInvalidUrl = () => 'not-a-url';
export const createInvalidUuid = () => 'not-a-uuid';
export const createInvalidDate = () => '2025-13-45'; // Invalid date
export const createInvalidTime = () => '25:99'; // Invalid time
export const createTooLongString = (maxLength: number) => 'x'.repeat(maxLength + 1);
export const createEmptyString = () => '';
