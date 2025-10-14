import { z } from 'zod';

// Italian Tax ID (Codice Fiscale) validation: 16 alphanumeric characters
const CODICE_FISCALE_REGEX = /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/;

// Italian VAT Number (Partita IVA) validation: 11 digits
const PARTITA_IVA_REGEX = /^\d{11}$/;

// IBAN validation: Country code (2 letters) + check digits (2 digits) + account number
const IBAN_REGEX = /^[A-Z]{2}\d{2}[A-Z0-9]+$/;

// BIC/SWIFT validation: 8 or 11 alphanumeric characters
const BIC_SWIFT_REGEX = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;

export const taxDetailsSchema = z.object({
  entity_type: z.enum(['individual', 'business'], {
    errorMap: () => ({ message: 'Seleziona il tipo di entità (Persona fisica o Azienda)' })
  }),
  
  tax_id: z.string()
    .min(11, 'Il Codice Fiscale/P.IVA deve contenere almeno 11 caratteri')
    .max(16, 'Il Codice Fiscale/P.IVA non può superare 16 caratteri')
    .refine(
      (val) => CODICE_FISCALE_REGEX.test(val) || PARTITA_IVA_REGEX.test(val),
      'Formato non valido. Inserisci un Codice Fiscale (16 caratteri) o una Partita IVA (11 cifre)'
    ),
  
  vat_number: z.string()
    .optional()
    .refine(
      (val) => !val || PARTITA_IVA_REGEX.test(val),
      'La Partita IVA deve contenere esattamente 11 cifre'
    ),
  
  country_code: z.string()
    .length(2, 'Il codice paese deve contenere 2 caratteri (es. IT)')
    .regex(/^[A-Z]{2}$/, 'Il codice paese deve contenere solo lettere maiuscole'),
  
  address_line1: z.string()
    .min(5, 'L\'indirizzo deve contenere almeno 5 caratteri')
    .max(100, 'L\'indirizzo non può superare 100 caratteri'),
  
  address_line2: z.string()
    .max(100, 'L\'indirizzo aggiuntivo non può superare 100 caratteri')
    .optional(),
  
  city: z.string()
    .min(2, 'La città deve contenere almeno 2 caratteri')
    .max(50, 'La città non può superare 50 caratteri'),
  
  province: z.string()
    .length(2, 'La provincia deve contenere 2 caratteri (es. MI)')
    .regex(/^[A-Z]{2}$/, 'La provincia deve contenere solo lettere maiuscole')
    .optional(),
  
  postal_code: z.string()
    .min(5, 'Il CAP deve contenere almeno 5 caratteri')
    .max(10, 'Il CAP non può superare 10 caratteri'),
  
  iban: z.string()
    .min(15, 'L\'IBAN deve contenere almeno 15 caratteri')
    .max(34, 'L\'IBAN non può superare 34 caratteri')
    .regex(IBAN_REGEX, 'Formato IBAN non valido (es. IT60X0542811101000000123456)')
    .transform(val => val.replace(/\s/g, '').toUpperCase()),
  
  bic_swift: z.string()
    .optional()
    .refine(
      (val) => !val || BIC_SWIFT_REGEX.test(val),
      'Il codice BIC/SWIFT deve contenere 8 o 11 caratteri alfanumerici'
    )
    .transform(val => val?.toUpperCase())
});

export type TaxDetailsFormData = z.infer<typeof taxDetailsSchema>;

// Validation helpers
export const validateItalianTaxId = (taxId: string): boolean => {
  return CODICE_FISCALE_REGEX.test(taxId) || PARTITA_IVA_REGEX.test(taxId);
};

export const validateIBAN = (iban: string): boolean => {
  const cleanIban = iban.replace(/\s/g, '').toUpperCase();
  return IBAN_REGEX.test(cleanIban) && cleanIban.length >= 15 && cleanIban.length <= 34;
};

export const formatIBAN = (iban: string): string => {
  const cleanIban = iban.replace(/\s/g, '').toUpperCase();
  return cleanIban.match(/.{1,4}/g)?.join(' ') || cleanIban;
};
