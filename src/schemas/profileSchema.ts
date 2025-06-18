
import { z } from 'zod';

// LinkedIn URL validation regex
const linkedinRegex = /^https:\/\/(www\.)?linkedin\.com\/(in|pub|profile)\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+$/i;

export const ProfileEditFormSchema = z.object({
  first_name: z.string().min(1, "Il nome è obbligatorio").max(50, "Il nome non può superare i 50 caratteri"),
  last_name: z.string().min(1, "Il cognome è obbligatorio").max(50, "Il cognome non può superare i 50 caratteri"),
  nickname: z.string().max(30, "Il nickname non può superare i 30 caratteri").optional(),
  job_title: z.string().max(100, "Il titolo di lavoro non può superare i 100 caratteri").optional(),
  job_type: z.string().optional(),
  work_style: z.string().optional(),
  bio: z.string().max(500, "La bio non può superare i 500 caratteri").optional(),
  location: z.string().max(100, "La località non può superare i 100 caratteri").optional(),
  skills: z.string().max(300, "Le competenze non possono superare i 300 caratteri").optional(),
  interests: z.string().max(300, "Gli interessi non possono superare i 300 caratteri").optional(),
  linkedin_url: z.string()
    .optional()
    .refine((val) => !val || val.trim() === '' || linkedinRegex.test(val), {
      message: "Inserisci un URL LinkedIn valido (es: https://linkedin.com/in/nomeutente)"
    }),
  website: z.string().url("URL sito web non valido").optional().or(z.literal("")),
  networking_enabled: z.boolean().default(true),
});

export type ProfileEditFormData = z.infer<typeof ProfileEditFormSchema>;
