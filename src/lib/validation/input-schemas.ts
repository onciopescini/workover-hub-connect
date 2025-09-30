import { z } from 'zod';

// Security patterns for validation
const SQL_INJECTION_PATTERN = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)|(-{2}|\/\*|\*\/|;|'|"|`)/gi;
const XSS_PATTERN = /<script|javascript:|onerror=|onload=|<iframe/gi;

// Base validation function
const secureText = (maxLength = 500) => z.string()
  .trim()
  .min(1, 'Field cannot be empty')
  .max(maxLength, 'Text too long')
  .refine(
    (val) => !SQL_INJECTION_PATTERN.test(val),
    'Invalid characters detected'
  )
  .refine(
    (val) => !XSS_PATTERN.test(val),
    'Invalid content detected'
  );

export const secureEmailSchema = z.string()
  .email('Invalid email format')
  .max(255)
  .toLowerCase()
  .trim();

export const secureUUIDSchema = z.string()
  .uuid('Invalid ID format');

export const secureDateSchema = z.string()
  .datetime()
  .or(z.date());

export const secureNumberSchema = z.number()
  .int()
  .positive()
  .max(999999);

// Booking validation
export const bookingInsertSchema = z.object({
  space_id: secureUUIDSchema,
  user_id: secureUUIDSchema,
  booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  start_time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/, 'Invalid time format').optional(),
  end_time: z.string().regex(/^\d{2}:\d{2}:\d{2}$/, 'Invalid time format').optional(),
  guests_count: z.number().int().positive().max(100).default(1),
  status: z.enum(['pending', 'confirmed', 'cancelled']).default('pending')
});

// Space validation
export const spaceInsertSchema = z.object({
  host_id: secureUUIDSchema,
  title: secureText(200),
  description: secureText(2000),
  address: secureText(300),
  category: z.string(),
  work_environment: z.string(),
  price_per_hour: z.number().positive().max(9999),
  price_per_day: z.number().positive().max(99999),
  max_capacity: z.number().int().positive().max(500),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional()
});

// Message validation
export const messageInsertSchema = z.object({
  sender_id: secureUUIDSchema,
  content: secureText(2000),
  booking_id: secureUUIDSchema.optional(),
  conversation_id: secureUUIDSchema.optional()
}).refine(
  (data) => data.booking_id || data.conversation_id,
  'Either booking_id or conversation_id must be provided'
);

// Profile update validation
export const profileUpdateSchema = z.object({
  first_name: secureText(100).optional(),
  last_name: secureText(100).optional(),
  bio: secureText(1000).optional(),
  profession: secureText(100).optional(),
  city: secureText(100).optional(),
  phone: z.string().regex(/^[\+]?[0-9\s\-\(\)]{7,20}$/, 'Invalid phone format').optional()
});

// Helper function to validate data
export function validateInput<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: string[] } {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      };
    }
    return { success: false, errors: ['Validation failed'] };
  }
}
