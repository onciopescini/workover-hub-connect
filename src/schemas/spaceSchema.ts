
import { z } from 'zod';

// Availability slot schema
const AvailabilitySlotSchema = z.object({
  start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato orario non valido"),
  end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato orario non valido"),
});

// Day availability schema
const DayAvailabilitySchema = z.object({
  enabled: z.boolean(),
  slots: z.array(AvailabilitySlotSchema),
});

// Recurring availability schema
const RecurringAvailabilitySchema = z.object({
  monday: DayAvailabilitySchema,
  tuesday: DayAvailabilitySchema,
  wednesday: DayAvailabilitySchema,
  thursday: DayAvailabilitySchema,
  friday: DayAvailabilitySchema,
  saturday: DayAvailabilitySchema,
  sunday: DayAvailabilitySchema,
});

// Exception availability schema
const ExceptionAvailabilitySchema = z.object({
  date: z.string().min(1, "Data richiesta"),
  available: z.boolean(),
  slots: z.array(AvailabilitySlotSchema).optional(),
});

// Full availability schema
const AvailabilitySchema = z.object({
  recurring: RecurringAvailabilitySchema,
  exceptions: z.array(ExceptionAvailabilitySchema),
});

// Main space form schema
export const SpaceFormSchema = z.object({
  // Basic Information
  title: z.string().min(1, "Il titolo è obbligatorio").max(100, "Il titolo non può superare i 100 caratteri"),
  description: z.string().min(1, "La descrizione è obbligatoria").max(1000, "La descrizione non può superare i 1000 caratteri"),
  category: z.enum(['home', 'office', 'studio', 'cafe', 'coworking', 'meeting_room', 'other'], {
    errorMap: () => ({ message: "Seleziona una categoria valida" })
  }),

  // Space Details
  work_environment: z.enum(['controlled', 'shared', 'open'], {
    errorMap: () => ({ message: "Seleziona un ambiente di lavoro valido" })
  }),
  max_capacity: z.number().min(1, "La capacità deve essere almeno 1").max(100, "La capacità non può superare 100"),
  confirmation_type: z.enum(['instant', 'host_approval'], {
    errorMap: () => ({ message: "Seleziona un tipo di conferma valido" })
  }),
  workspace_features: z.array(z.string()).default([]),
  amenities: z.array(z.string()).default([]),
  seating_types: z.array(z.string()).default([]),
  ideal_guest_tags: z.array(z.string()).default([]),
  event_friendly_tags: z.array(z.string()).default([]),
  rules: z.string().optional(),

  // Location & Pricing
  address: z.string().min(1, "L'indirizzo è obbligatorio"),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  price_per_hour: z.number().min(0, "Il prezzo orario deve essere >= 0"),
  price_per_day: z.number().min(0, "Il prezzo giornaliero deve essere >= 0"),

  // Availability
  availability: AvailabilitySchema.refine(
    (data) => {
      // Check if at least one day has enabled slots
      return Object.values(data.recurring).some(day => day.enabled && day.slots.length > 0);
    },
    { message: "Devi impostare almeno un giorno e orario di disponibilità" }
  ),

  // Photos
  photos: z.array(z.string()).default([]),

  // Publishing
  published: z.boolean().default(false),
});

export type SpaceFormData = z.infer<typeof SpaceFormSchema>;
