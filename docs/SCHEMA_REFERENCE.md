# 📋 Schema Reference (Zod)

Documentazione completa degli schemi di validazione Zod utilizzati nell'applicazione.

---

## 📚 Table of Contents

1. [Space Schemas](#space-schemas)
2. [Booking Schemas](#booking-schemas)
3. [Profile Schemas](#profile-schemas)
4. [Message Schemas](#message-schemas)
5. [Payment Schemas](#payment-schemas)
6. [Admin Schemas](#admin-schemas)
7. [Event Schemas](#event-schemas)
8. [Connection Schemas](#connection-schemas)
9. [Validation Utilities](#validation-utilities)

---

## Space Schemas

### SpaceFormSchema

Schema principale per creazione/modifica spazi.

```typescript
import { SpaceFormSchema } from '@/schemas/spaceSchema';

const schema = z.object({
  // Basic Info
  title: z.string()
    .min(5, 'Il titolo deve essere almeno 5 caratteri')
    .max(100, 'Il titolo non può superare 100 caratteri'),
  
  description: z.string()
    .min(20, 'La descrizione deve essere almeno 20 caratteri')
    .max(1000),
  
  space_type: z.enum(['desk', 'private_office', 'meeting_room', 'event_space']),
  
  // Location
  address: z.string().min(5),
  city: z.string().min(2),
  zip_code: z.string().regex(/^\d{5}$/, 'CAP non valido'),
  country: z.string().default('IT'),
  
  // Pricing
  price_per_hour: z.number()
    .positive('Il prezzo deve essere positivo')
    .max(1000, 'Prezzo massimo €1000/ora'),
  
  price_per_day: z.number().positive().optional(),
  
  // Capacity
  capacity: z.number()
    .int()
    .positive()
    .max(100, 'Capacità massima 100 persone'),
  
  // Features
  amenities: z.array(z.string()).optional(),
  
  // Media
  main_image_url: z.string().url().optional(),
  additional_images: z.array(z.string().url()).max(5).optional(),
});

// Usage
const result = SpaceFormSchema.safeParse(formData);
if (!result.success) {
  console.error(result.error.flatten());
}
```

**TypeScript Type:**
```typescript
type SpaceForm = z.infer<typeof SpaceFormSchema>;
```

---

### AvailabilitySchema

Schema per disponibilità ricorrente e eccezioni.

```typescript
const AvailabilitySchema = z.object({
  recurring: z.array(
    z.object({
      day: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
      slots: z.array(
        z.object({
          start: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
          end: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
        })
      ),
    })
  ).optional(),
  
  exceptions: z.array(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      available: z.boolean(),
      slots: z.array(
        z.object({
          start: z.string(),
          end: z.string(),
        })
      ).optional(),
    })
  ).optional(),
});
```

---

## Booking Schemas

### BookingFormSchema

Schema per creare una prenotazione.

```typescript
const BookingFormSchema = z.object({
  space_id: z.string().uuid(),
  booking_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((date) => new Date(date) >= new Date(), {
      message: 'La data deve essere futura'
    }),
  
  start_time: z.string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  
  end_time: z.string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  
  guests_count: z.number()
    .int()
    .positive()
    .max(50),
}).refine((data) => data.start_time < data.end_time, {
  message: 'L\'orario di inizio deve essere prima della fine',
  path: ['end_time'],
});
```

**Example:**
```typescript
const bookingData = {
  space_id: '123e4567-e89b-12d3-a456-426614174000',
  booking_date: '2025-02-15',
  start_time: '09:00',
  end_time: '17:00',
  guests_count: 2,
};

const result = BookingFormSchema.parse(bookingData);
```

---

### MultiDayBookingSchema

Schema per prenotazioni multi-giorno.

```typescript
const MultiDayBookingSchema = z.object({
  space_id: z.string().uuid(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  guests_count: z.number().int().positive(),
}).refine((data) => data.start_date < data.end_date, {
  message: 'La data di fine deve essere dopo quella di inizio',
});
```

---

### BookingCancellationSchema

Schema per cancellazione prenotazione.

```typescript
const BookingCancellationSchema = z.object({
  booking_id: z.string().uuid(),
  cancellation_reason: z.string()
    .min(10, 'Specifica il motivo della cancellazione')
    .max(500),
  cancelled_by_host: z.boolean().default(false),
});
```

---

## Profile Schemas

### ProfileEditFormSchema

Schema per modifica profilo utente.

```typescript
const ProfileEditFormSchema = z.object({
  // Personal Info
  first_name: z.string()
    .min(2, 'Nome troppo corto')
    .max(50),
  
  last_name: z.string()
    .min(2, 'Cognome troppo corto')
    .max(50),
  
  nickname: z.string().max(30).optional(),
  
  // Contact
  phone: z.string()
    .regex(/^[\d\s\+\-\(\)]+$/, 'Numero non valido')
    .optional(),
  
  city: z.string().min(2).optional(),
  location: z.string().max(100).optional(),
  
  // Professional
  bio: z.string().max(500).optional(),
  profession: z.string().max(100).optional(),
  job_title: z.string().max(100).optional(),
  skills: z.string().max(300).optional(),
  interests: z.string().max(300).optional(),
  
  // Social Links
  website: z.string().url('URL non valido').optional().or(z.literal('')),
  linkedin_url: z.string().url().optional().or(z.literal('')),
  github_url: z.string().url().optional().or(z.literal('')),
});
```

---

### OnboardingSchemas

Schemi per processo onboarding.

```typescript
// Step 1: Role Selection
const OnboardingRoleSchema = z.object({
  role: z.enum(['coworker', 'host']),
});

// Step 2: Profile Info
const OnboardingProfileSchema = z.object({
  first_name: z.string().min(2),
  last_name: z.string().min(2),
  city: z.string().min(2),
  profession: z.string().optional(),
});

// Step 3: Preferences
const OnboardingPreferencesSchema = z.object({
  networking_enabled: z.boolean().default(true),
  collaboration_types: z.array(z.string()).optional(),
});
```

---

### TaxInfoSchema

Schema per informazioni fiscali (host).

```typescript
const TaxInfoSchema = z.object({
  tax_country: z.string()
    .length(2, 'Codice paese ISO a 2 lettere')
    .toUpperCase(),
  
  vat_number: z.string()
    .regex(/^[A-Z]{2}[\dA-Z]{8,12}$/, 'Partita IVA non valida')
    .optional(),
  
  tax_id: z.string()
    .min(5)
    .max(20)
    .optional(),
}).refine(
  (data) => data.vat_number || data.tax_id,
  {
    message: 'Inserisci Partita IVA o Codice Fiscale',
    path: ['vat_number'],
  }
);
```

---

## Message Schemas

### MessageFormSchema

Schema per inviare messaggi.

```typescript
const MessageFormSchema = z.object({
  content: z.string()
    .min(1, 'Il messaggio non può essere vuoto')
    .max(2000, 'Messaggio troppo lungo'),
  
  booking_id: z.string().uuid().optional(),
  conversation_id: z.string().uuid().optional(),
  
  attachments: z.array(
    z.object({
      type: z.enum(['image', 'document']),
      url: z.string().url(),
      name: z.string(),
      size: z.number(),
    })
  ).max(3, 'Massimo 3 allegati').optional(),
}).refine(
  (data) => data.booking_id || data.conversation_id,
  {
    message: 'Specificare booking_id o conversation_id',
  }
);
```

---

### MessageTemplateSchema

Schema per template messaggi.

```typescript
const MessageTemplateSchema = z.object({
  name: z.string()
    .min(3)
    .max(100),
  
  type: z.enum(['confirmation', 'reminder', 'cancellation', 'custom']),
  
  content: z.string()
    .min(10)
    .max(1000),
  
  is_active: z.boolean().default(true),
  is_favorite: z.boolean().default(false),
});
```

---

## Payment Schemas

### CheckoutSessionSchema

Schema per creare sessione Stripe checkout.

```typescript
const CheckoutSessionSchema = z.object({
  booking_id: z.string().uuid(),
  amount: z.number().positive(),
  currency: z.string().default('EUR'),
  success_url: z.string().url(),
  cancel_url: z.string().url(),
});
```

---

### RefundRequestSchema

Schema per richiedere rimborso.

```typescript
const RefundRequestSchema = z.object({
  payment_id: z.string().uuid(),
  amount: z.number().positive().optional(),
  reason: z.enum([
    'duplicate',
    'fraudulent',
    'requested_by_customer'
  ]),
  description: z.string().max(500).optional(),
});
```

---

### PayoutConfigSchema

Schema per configurazione pagamenti host.

```typescript
const PayoutConfigSchema = z.object({
  stripe_account_id: z.string()
    .startsWith('acct_', 'ID account Stripe non valido'),
  
  payout_schedule: z.enum(['daily', 'weekly', 'monthly']),
  
  minimum_payout: z.number()
    .positive()
    .min(10, 'Pagamento minimo €10')
    .max(1000),
});
```

---

## Admin Schemas

### ReportReviewSchema

Schema per revisione segnalazioni.

```typescript
const ReportReviewSchema = z.object({
  report_id: z.string().uuid(),
  
  action: z.enum([
    'dismiss',
    'warn_user',
    'suspend_user',
    'remove_content'
  ]),
  
  admin_notes: z.string()
    .min(10, 'Aggiungi note sulla decisione')
    .max(1000),
  
  notify_reporter: z.boolean().default(true),
});
```

---

### UserSuspensionSchema

Schema per sospendere utente.

```typescript
const UserSuspensionSchema = z.object({
  user_id: z.string().uuid(),
  
  suspension_reason: z.string()
    .min(20, 'Specifica il motivo della sospensione')
    .max(500),
  
  duration_days: z.number()
    .int()
    .positive()
    .max(365)
    .optional(),
  
  notify_user: z.boolean().default(true),
});
```

---

### SpaceModerationSchema

Schema per moderazione spazi.

```typescript
const SpaceModerationSchema = z.object({
  space_id: z.string().uuid(),
  
  action: z.enum(['approve', 'reject', 'request_changes']),
  
  feedback: z.string()
    .min(10)
    .max(500)
    .optional(),
  
  required_changes: z.array(z.string()).optional(),
});
```

---

## Event Schemas

### EventFormSchema

Schema per creare eventi.

```typescript
const EventFormSchema = z.object({
  title: z.string()
    .min(5)
    .max(100),
  
  description: z.string()
    .min(20)
    .max(1000),
  
  space_id: z.string().uuid(),
  
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    .refine((date) => new Date(date) > new Date(), {
      message: 'La data deve essere futura'
    }),
  
  max_participants: z.number()
    .int()
    .positive()
    .min(2, 'Minimo 2 partecipanti')
    .max(100),
  
  city: z.string().min(2),
  
  image_url: z.string().url().optional(),
});
```

---

## Connection Schemas

### ConnectionRequestSchema

Schema per richieste di connessione.

```typescript
const ConnectionRequestSchema = z.object({
  receiver_id: z.string().uuid(),
  
  message: z.string()
    .max(200, 'Messaggio troppo lungo')
    .optional(),
});
```

---

### ConnectionResponseSchema

Schema per rispondere a richieste.

```typescript
const ConnectionResponseSchema = z.object({
  connection_id: z.string().uuid(),
  
  action: z.enum(['accept', 'reject']),
  
  message: z.string().max(200).optional(),
});
```

---

## Validation Utilities

### validateInput

Utility per validare input con gestione errori.

```typescript
import { validateInput } from '@/lib/validation/input-schemas';

function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    return {
      success: false,
      errors: result.error.errors.map(err => err.message)
    };
  }
  
  return {
    success: true,
    data: result.data
  };
}

// Usage
const result = validateInput(BookingFormSchema, formData);

if (!result.success) {
  toast.error(result.errors.join(', '));
  return;
}

// result.data è type-safe
const booking = result.data;
```

---

### sanitizeInput

Sanitizza input prima della validazione.

```typescript
import { sanitizeInput } from '@/lib/input-sanitization';

const sanitized = sanitizeInput(userInput, {
  stripHtml: true,
  maxLength: 1000,
  allowedTags: [],
});

const result = schema.parse(sanitized);
```

---

## Common Patterns

### Optional Fields with Transform

```typescript
const schema = z.object({
  phone: z.string()
    .optional()
    .transform(val => val?.trim() || undefined),
  
  website: z.string()
    .url()
    .optional()
    .or(z.literal('')),
});
```

### Custom Refinements

```typescript
const schema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Le password non corrispondono',
  path: ['confirmPassword'],
});
```

### Date Validation

```typescript
const schema = z.object({
  booking_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((date) => {
      const bookingDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return bookingDate >= today;
    }, {
      message: 'La data deve essere oggi o futura'
    }),
});
```

### Array Validation

```typescript
const schema = z.object({
  tags: z.array(z.string())
    .min(1, 'Seleziona almeno un tag')
    .max(5, 'Massimo 5 tag')
    .refine((tags) => new Set(tags).size === tags.length, {
      message: 'Tags duplicati non ammessi'
    }),
});
```

---

## Error Handling

### Flatten Errors

```typescript
const result = schema.safeParse(data);

if (!result.success) {
  const errors = result.error.flatten();
  
  // Field errors
  console.log(errors.fieldErrors);
  // { email: ['Email non valida'], password: ['Minimo 8 caratteri'] }
  
  // Form errors (top-level)
  console.log(errors.formErrors);
}
```

### Custom Error Messages

```typescript
const schema = z.object({
  email: z.string()
    .email({ message: 'Inserisci un\'email valida' })
    .min(1, { message: 'Email obbligatoria' }),
  
  age: z.number({
    required_error: 'Età richiesta',
    invalid_type_error: 'Età deve essere un numero',
  }),
});
```

---

## Best Practices

### 1. Colocation
Mantieni schemi vicino ai componenti che li usano.

```
src/
├── components/
│   └── spaces/
│       ├── SpaceForm.tsx
│       └── spaceFormSchema.ts  ← Schema locale
└── schemas/
    └── spaceSchema.ts  ← Schema condiviso
```

### 2. Reusability
Crea schemi base riutilizzabili.

```typescript
// Base schemas
const emailSchema = z.string().email().min(1);
const phoneSchema = z.string().regex(/^[\d\s\+\-\(\)]+$/);

// Compose in larger schemas
const ContactSchema = z.object({
  email: emailSchema,
  phone: phoneSchema.optional(),
});
```

### 3. Type Inference
Usa `z.infer` per TypeScript types.

```typescript
const UserSchema = z.object({
  name: z.string(),
  age: z.number(),
});

type User = z.infer<typeof UserSchema>;
// { name: string; age: number }
```

### 4. Form Integration
Integra con React Hook Form.

```typescript
import { zodResolver } from '@hookform/resolvers/zod';

const form = useForm({
  resolver: zodResolver(BookingFormSchema),
  defaultValues: { ... },
});
```

---

**Last Updated**: 2025-01-XX  
**Schema Version**: 2.0
