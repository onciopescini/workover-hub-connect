
import { z } from 'zod';

// LinkedIn URL validation regex
const linkedinRegex = /^https:\/\/(www\.)?linkedin\.com\/(in|pub|profile)\/[\w\-._~:/?#[\]@!$&'()*+,;=%]+$/i;

export const ProfileEditFormSchema = z.object({
  first_name: z.string().min(1, "Il nome è obbligatorio").max(50, "Il nome non può superare i 50 caratteri"),
  last_name: z.string().min(1, "Il cognome è obbligatorio").max(50, "Il cognome non può superare i 50 caratteri"),
  nickname: z.string().max(30, "Il nickname non può superare i 30 caratteri").optional(),
  job_title: z.string().max(100, "Il titolo di lavoro non può superare i 100 caratteri").optional(),
  job_type: z.enum(['full_time','part_time','freelance','contract','intern','unemployed','student']).optional(),
  work_style: z.enum(['remote','hybrid','office','nomad']).optional(),
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

// Onboarding step validation
export const OnboardingStepSchema = z.object({
  step: z.enum(['welcome', 'role', 'profile', 'preferences', 'complete'], {
    errorMap: () => ({ message: "Step non valido" })
  }),
  completed: z.boolean().default(false),
});

export const OnboardingRoleSchema = z.object({
  role: z.enum(['coworker', 'host'], {
    errorMap: () => ({ message: "Ruolo non valido" })
  }),
});

export const OnboardingProfileSchema = z.object({
  first_name: z.string().min(1, "Il nome è obbligatorio").max(50, "Il nome non può superare i 50 caratteri"),
  last_name: z.string().min(1, "Il cognome è obbligatorio").max(50, "Il cognome non può superare i 50 caratteri"),
  job_title: z.string().max(100, "Il titolo non può superare i 100 caratteri").optional(),
  location: z.string().max(100, "La località non può superare i 100 caratteri").optional(),
});

export const OnboardingPreferencesSchema = z.object({
  work_style: z.enum(['remote', 'hybrid', 'office', 'nomad'], {
    errorMap: () => ({ message: "Stile di lavoro non valido" })
  }).optional(),
  interests: z.string().max(300, "Gli interessi non possono superare i 300 caratteri").optional(),
});

// Tax information validation
export const TaxInfoSchema = z.object({
  tax_country: z.string()
    .length(2, "Codice paese ISO non valido (es: IT, FR, DE)")
    .regex(/^[A-Z]{2}$/, "Codice paese deve essere maiuscolo")
    .optional(),
  vat_number: z.string()
    .regex(/^[A-Z]{2}[0-9A-Z]{2,13}$/, "Partita IVA non valida (formato: IT12345678901)")
    .optional()
    .or(z.literal("")),
  tax_id: z.string()
    .max(50, "Codice fiscale troppo lungo")
    .optional()
    .or(z.literal("")),
}).refine(
  (data) => {
    // Se è specificato un VAT, deve esserci anche il paese
    if (data.vat_number && data.vat_number !== "") {
      return !!data.tax_country;
    }
    return true;
  },
  {
    message: "Specificare il paese per la partita IVA",
    path: ["tax_country"],
  }
);

// Stripe onboarding validation
export const StripeOnboardingSchema = z.object({
  return_url: z.string().url("URL non valido").optional(),
  refresh_url: z.string().url("URL non valido").optional(),
});

// Age confirmation
export const AgeConfirmationSchema = z.object({
  age_confirmed: z.boolean()
    .refine((val) => val === true, {
      message: "Devi confermare di avere almeno 18 anni"
    }),
});

// Export types
export type OnboardingStepData = z.infer<typeof OnboardingStepSchema>;
export type OnboardingRoleData = z.infer<typeof OnboardingRoleSchema>;
export type OnboardingProfileData = z.infer<typeof OnboardingProfileSchema>;
export type OnboardingPreferencesData = z.infer<typeof OnboardingPreferencesSchema>;
export type TaxInfoData = z.infer<typeof TaxInfoSchema>;
export type StripeOnboardingData = z.infer<typeof StripeOnboardingSchema>;
export type AgeConfirmationData = z.infer<typeof AgeConfirmationSchema>;
