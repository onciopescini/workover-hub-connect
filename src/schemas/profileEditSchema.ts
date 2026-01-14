import { z } from 'zod';

// Regex per validazione sicura
const NAME_REGEX = /^[a-zA-ZÀ-ÿ\s'-]{1,50}$/;
const PHONE_REGEX = /^\+?[0-9\s\-\(\)]{7,20}$/;
const URL_REGEX = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b/;

// Sanitizzazione HTML
const sanitizeHtml = (value: string) => {
  return value
    .replace(/<[^>]*>/g, '') // Rimuove tutti i tag HTML
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
};

// Domini autorizzati per immagini
const ALLOWED_IMAGE_DOMAINS = [
  'imgur.com',
  'cloudinary.com',
  'gravatar.com',
  'googleusercontent.com',
  'supabase.co',
  'amazonaws.com'
];

export const profileEditSchema = z.object({
  // Basic Info
  first_name: z.string()
    .min(1, 'Il nome è obbligatorio')
    .max(50, 'Il nome non può superare 50 caratteri')
    .regex(NAME_REGEX, 'Il nome contiene caratteri non validi')
    .transform(sanitizeHtml),
  
  last_name: z.string()
    .min(1, 'Il cognome è obbligatorio')
    .max(50, 'Il cognome non può superare 50 caratteri')
    .regex(NAME_REGEX, 'Il cognome contiene caratteri non validi')
    .transform(sanitizeHtml),
  
  nickname: z.string()
    .max(30, 'Il nickname non può superare 30 caratteri')
    .transform(val => val ? sanitizeHtml(val) : '')
    .optional()
    .or(z.literal('')),
  
  profile_photo_url: z.string()
    .refine(
      (val) => {
        if (!val) return true;
        try {
          const url = new URL(val);
          return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
          return false;
        }
      },
      { message: 'URL immagine non valido' }
    )
    .refine(
      (val) => {
        if (!val) return true;
        try {
          const url = new URL(val);
          return ALLOWED_IMAGE_DOMAINS.some(d => url.hostname.includes(d));
        } catch {
          return false;
        }
      },
      { message: 'Dominio immagine non autorizzato. Usa imgur.com, cloudinary.com o altri servizi supportati' }
    )
    .optional()
    .or(z.literal('')),
  
  phone: z.string()
    .refine(
      (val) => !val || PHONE_REGEX.test(val),
      { message: 'Formato telefono non valido (es: +39 123 456 7890)' }
    )
    .refine(
      (val) => !val || val.length <= 20,
      { message: 'Numero troppo lungo' }
    )
    .optional()
    .or(z.literal('')),
  
  bio: z.string()
    .max(500, 'La bio non può superare 500 caratteri')
    .transform(val => val ? sanitizeHtml(val) : '')
    .optional()
    .or(z.literal('')),
  
  location: z.string()
    .max(100, 'La località non può superare 100 caratteri')
    .transform(val => val ? sanitizeHtml(val) : '')
    .optional()
    .or(z.literal('')),
  
  // Professional Info
  job_title: z.string()
    .max(100, 'Il titolo non può superare 100 caratteri')
    .transform(val => val ? sanitizeHtml(val) : '')
    .optional()
    .or(z.literal('')),
  
  profession: z.string()
    .max(100, 'La professione non può superare 100 caratteri')
    .transform(val => val ? sanitizeHtml(val) : '')
    .optional()
    .or(z.literal('')),
  
  job_type: z.enum([
    'full_time', 'part_time', 'freelance', 'contract', 
    'intern', 'unemployed', 'student', ''
  ]).optional(),
  
  work_style: z.enum([
    'remote', 'hybrid', 'office', 'nomad', ''
  ]).optional(),
  
  skills: z.string()
    .max(1000, 'Le competenze non possono superare 1000 caratteri')
    .transform(val => val ? sanitizeHtml(val) : '')
    .optional()
    .or(z.literal('')),
  
  interests: z.string()
    .max(1000, 'Gli interessi non possono superare 1000 caratteri')
    .transform(val => val ? sanitizeHtml(val) : '')
    .optional()
    .or(z.literal('')),
  
  // Social Links con validazione dominio specifica
  website: z.string()
    .refine(
      (val) => !val || (URL_REGEX.test(val) && /^https?:\/\//.test(val)),
      { message: 'URL sito web non valido' }
    )
    .optional()
    .or(z.literal('')),

  portfolio_url: z.string()
    .refine(
      (val) => !val || (URL_REGEX.test(val) && /^https?:\/\//.test(val)),
      { message: 'URL portfolio non valido' }
    )
    .optional()
    .or(z.literal('')),
  
  linkedin_url: z.string()
    .refine(
      (val) => !val || /linkedin\.com\/(in|company)\//.test(val),
      { message: 'Inserisci un URL LinkedIn valido (es: https://linkedin.com/in/nome)' }
    )
    .optional()
    .or(z.literal('')),
  
  twitter_url: z.string()
    .refine(
      (val) => !val || /(twitter\.com|x\.com)\//.test(val),
      { message: 'Inserisci un URL Twitter/X valido' }
    )
    .optional()
    .or(z.literal('')),
  
  instagram_url: z.string()
    .refine(
      (val) => !val || /instagram\.com\//.test(val),
      { message: 'Inserisci un URL Instagram valido' }
    )
    .optional()
    .or(z.literal('')),
  
  facebook_url: z.string()
    .refine(
      (val) => !val || /facebook\.com\//.test(val),
      { message: 'Inserisci un URL Facebook valido' }
    )
    .optional()
    .or(z.literal('')),
  
  youtube_url: z.string()
    .refine(
      (val) => !val || /youtube\.com\/(channel|c|user|@)/.test(val),
      { message: 'Inserisci un URL YouTube valido' }
    )
    .optional()
    .or(z.literal('')),
  
  github_url: z.string()
    .refine(
      (val) => !val || /github\.com\//.test(val),
      { message: 'Inserisci un URL GitHub valido' }
    )
    .optional()
    .or(z.literal('')),
  
  // Collaboration
  collaboration_availability: z.enum([
    'available', 'busy', 'not_available', ''
  ]).optional(),
  
  collaboration_types: z.array(
    z.enum(['progetti', 'consulenza', 'freelancing', 'partnership', 'mentoring'])
  ).max(5, 'Puoi selezionare massimo 5 tipi di collaborazione')
    .optional(),
  
  preferred_work_mode: z.enum([
    'remoto', 'presenza', 'ibrido', 'flessibile', ''
  ]).optional(),
  
  collaboration_description: z.string()
    .max(500, 'La descrizione non può superare 500 caratteri')
    .transform(val => val ? sanitizeHtml(val) : '')
    .optional()
    .or(z.literal('')),
  
  // Settings
  networking_enabled: z.boolean().default(true)
});

export type ProfileEditData = z.infer<typeof profileEditSchema>;
