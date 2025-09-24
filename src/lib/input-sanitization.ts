import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

// Security patterns
const SECURITY_PATTERNS = {
  // SQL injection patterns
  SQL_INJECTION: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)|[';]|(--)|(\*\/)/i,
  
  // XSS patterns
  XSS_SCRIPT: /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  XSS_EVENTS: /\bon\w+\s*=/gi,
  XSS_JAVASCRIPT: /javascript:/gi,
  
  // Path traversal
  PATH_TRAVERSAL: /\.\.[\/\\]/g,
  
  // Command injection
  COMMAND_INJECTION: /[;&|`$(){}[\]]/g,
  
  // Email validation (more strict)
  EMAIL: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
  
  // Phone number (international format)
  PHONE: /^\+?[1-9]\d{1,14}$/,
  
  // Safe filename
  SAFE_FILENAME: /^[a-zA-Z0-9._-]+$/,
  
  // URL validation
  SAFE_URL: /^https?:\/\/[^\s<>"'`]+$/i
};

// Security-first validation schemas
export const securitySchemas = {
  // User input schemas
  name: z.string()
    .trim()
    .min(1, 'Nome richiesto')
    .max(100, 'Nome troppo lungo')
    .refine(val => !SECURITY_PATTERNS.SQL_INJECTION.test(val), 'Caratteri non validi nel nome')
    .refine(val => !SECURITY_PATTERNS.XSS_SCRIPT.test(val), 'Contenuto non sicuro rilevato'),
  
  email: z.string()
    .trim()
    .email('Email non valida')
    .max(255, 'Email troppo lunga')
    .refine(val => SECURITY_PATTERNS.EMAIL.test(val), 'Formato email non valido'),
  
  phone: z.string()
    .trim()
    .optional()
    .refine(val => !val || SECURITY_PATTERNS.PHONE.test(val), 'Numero di telefono non valido'),
  
  message: z.string()
    .trim()
    .min(1, 'Messaggio richiesto')
    .max(2000, 'Messaggio troppo lungo')
    .refine(val => !SECURITY_PATTERNS.SQL_INJECTION.test(val), 'Caratteri non validi nel messaggio')
    .refine(val => !SECURITY_PATTERNS.XSS_SCRIPT.test(val), 'Contenuto non sicuro rilevato'),
  
  url: z.string()
    .trim()
    .optional()
    .refine(val => !val || SECURITY_PATTERNS.SAFE_URL.test(val), 'URL non valido'),
  
  filename: z.string()
    .trim()
    .max(255, 'Nome file troppo lungo')
    .refine(val => SECURITY_PATTERNS.SAFE_FILENAME.test(val), 'Nome file contiene caratteri non validi'),
  
  // Booking specific
  spaceTitle: z.string()
    .trim()
    .min(1, 'Titolo spazio richiesto')
    .max(200, 'Titolo troppo lungo')
    .refine(val => !SECURITY_PATTERNS.SQL_INJECTION.test(val), 'Caratteri non validi nel titolo'),
  
  description: z.string()
    .trim()
    .max(5000, 'Descrizione troppo lunga')
    .refine(val => !SECURITY_PATTERNS.SQL_INJECTION.test(val), 'Caratteri non validi nella descrizione')
    .refine(val => !SECURITY_PATTERNS.XSS_SCRIPT.test(val), 'Contenuto non sicuro rilevato'),
  
  // Search and filter
  searchQuery: z.string()
    .trim()
    .max(100, 'Ricerca troppo lunga')
    .refine(val => !SECURITY_PATTERNS.SQL_INJECTION.test(val), 'Caratteri non validi nella ricerca')
    .refine(val => !SECURITY_PATTERNS.COMMAND_INJECTION.test(val), 'Caratteri non sicuri rilevati'),
  
  // Location
  city: z.string()
    .trim()
    .max(100, 'Nome città troppo lungo')
    .refine(val => /^[a-zA-ZÀ-ÿ\s'-]+$/.test(val), 'Nome città contiene caratteri non validi'),
  
  address: z.string()
    .trim()
    .max(500, 'Indirizzo troppo lungo')
    .refine(val => !SECURITY_PATTERNS.SQL_INJECTION.test(val), 'Caratteri non validi nell\'indirizzo'),
  
  // Numeric inputs
  price: z.number()
    .min(0, 'Prezzo non può essere negativo')
    .max(10000, 'Prezzo troppo alto')
    .refine(val => Number.isFinite(val), 'Prezzo non valido'),
  
  rating: z.number()
    .min(1, 'Rating minimo 1')
    .max(5, 'Rating massimo 5')
    .int('Rating deve essere un numero intero'),
  
  // Date inputs
  futureDate: z.string()
    .refine(val => {
      const date = new Date(val);
      return date > new Date();
    }, 'La data deve essere futura'),
  
  // ID validation
  uuid: z.string()
    .uuid('ID non valido'),
  
  // Password (for forms, not for storage)
  password: z.string()
    .min(8, 'Password deve essere di almeno 8 caratteri')
    .max(128, 'Password troppo lunga')
    .refine(val => /[A-Z]/.test(val), 'Password deve contenere almeno una maiuscola')
    .refine(val => /[a-z]/.test(val), 'Password deve contenere almeno una minuscola')
    .refine(val => /[0-9]/.test(val), 'Password deve contenere almeno un numero')
    .refine(val => /[^A-Za-z0-9]/.test(val), 'Password deve contenere almeno un carattere speciale')
};

// HTML sanitization
export const sanitizeHtml = (html: string, allowedTags?: string[]): string => {
  const defaultAllowedTags = ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'];
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: allowedTags || defaultAllowedTags,
    ALLOWED_ATTR: ['class'],
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover']
  });
};

// Text sanitization for plain text fields
export const sanitizeText = (text: string): string => {
  return text
    .trim()
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .substring(0, 10000); // Limit length
};

// URL sanitization for external links
export const sanitizeUrl = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    
    // Only allow http/https
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    
    // Block suspicious domains
    const suspiciousDomains = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];
    if (suspiciousDomains.some(domain => parsed.hostname.includes(domain))) {
      return null;
    }
    
    return parsed.toString();
  } catch {
    return null;
  }
};

// File name sanitization
export const sanitizeFilename = (filename: string): string => {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .substring(0, 255)
    .replace(/^\.+/, '') // Remove leading dots
    .replace(/\.+$/, ''); // Remove trailing dots
};

// Phone number sanitization
export const sanitizePhoneNumber = (phone: string): string => {
  return phone
    .replace(/[^\d+]/g, '')
    .substring(0, 20);
};

// Input validation helper
export const validateInput = <T>(schema: z.ZodSchema<T>, data: unknown): 
  { success: true; data: T } | { success: false; errors: string[] } => {
  
  try {
    const result = schema.parse(data);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      };
    }
    return { success: false, errors: ['Errore di validazione sconosciuto'] };
  }
};

// Composite validation schemas for common forms
export const formSchemas = {
  contact: z.object({
    name: securitySchemas.name,
    email: securitySchemas.email,
    phone: securitySchemas.phone,
    message: securitySchemas.message,
    subject: z.string().trim().max(200, 'Oggetto troppo lungo').optional()
  }),
  
  spaceBooking: z.object({
    spaceId: securitySchemas.uuid,
    startDate: securitySchemas.futureDate,
    endDate: securitySchemas.futureDate,
    guests: z.number().min(1).max(50),
    message: securitySchemas.message.optional()
  }),
  
  spaceCreation: z.object({
    title: securitySchemas.spaceTitle,
    description: securitySchemas.description,
    city: securitySchemas.city,
    address: securitySchemas.address,
    price: securitySchemas.price,
    capacity: z.number().min(1).max(1000)
  }),
  
  userProfile: z.object({
    firstName: securitySchemas.name,
    lastName: securitySchemas.name,
    email: securitySchemas.email,
    phone: securitySchemas.phone,
    bio: securitySchemas.description.optional(),
    website: securitySchemas.url
  }),
  
  search: z.object({
    query: securitySchemas.searchQuery,
    city: securitySchemas.city.optional(),
    priceMin: z.number().min(0).optional(),
    priceMax: z.number().min(0).optional(),
    capacity: z.number().min(1).optional()
  })
};

// Rate limiting helper
export const createRateLimitKey = (identifier: string, endpoint: string): string => {
  return `${endpoint}:${identifier}`;
};

// Security headers helper
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
};

export default {
  securitySchemas,
  formSchemas,
  sanitizeHtml,
  sanitizeText,
  sanitizeUrl,
  sanitizeFilename,
  sanitizePhoneNumber,
  validateInput,
  createRateLimitKey,
  securityHeaders
};