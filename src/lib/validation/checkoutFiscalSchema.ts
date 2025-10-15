import { z } from 'zod';

// Italian Fiscal Code (Codice Fiscale) validation - 16 alphanumeric characters
const CODICE_FISCALE_REGEX = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/i;

// Italian VAT Number (Partita IVA) validation - IT + 11 digits
const PARTITA_IVA_REGEX = /^IT[0-9]{11}$/;

// Italian postal code - 5 digits
const CAP_REGEX = /^[0-9]{5}$/;

// Italian province code - 2 letters
const PROVINCE_REGEX = /^[A-Z]{2}$/i;

export const coworkerFiscalSchema = z.object({
  request_invoice: z.boolean(),
  
  fiscal_data: z.object({
    is_business: z.boolean(),
    
    tax_id: z.string()
      .min(1, "Campo obbligatorio")
      .refine((val) => {
        // Se privato: CF 16 caratteri, se business: P.IVA IT + 11 cifre
        return CODICE_FISCALE_REGEX.test(val) || PARTITA_IVA_REGEX.test(val);
      }, "Formato Codice Fiscale o Partita IVA non valido"),
    
    pec_email: z.string()
      .email("Formato email PEC non valido")
      .optional()
      .or(z.literal('')),
    
    sdi_code: z.string()
      .length(7, "Codice SDI deve essere di 7 caratteri")
      .optional()
      .or(z.literal('')),
    
    billing_address: z.string()
      .min(5, "Indirizzo troppo corto (minimo 5 caratteri)")
      .max(200, "Indirizzo troppo lungo"),
    
    billing_city: z.string()
      .min(2, "Città obbligatoria (minimo 2 caratteri)")
      .max(100, "Nome città troppo lungo"),
    
    billing_province: z.string()
      .regex(PROVINCE_REGEX, "Provincia deve essere di 2 lettere (es. MI, RM)")
      .toUpperCase(),
    
    billing_postal_code: z.string()
      .regex(CAP_REGEX, "CAP deve essere di 5 cifre"),
  }).optional(),
})
  .refine((data) => {
    // Se richiede fattura, fiscal_data è obbligatorio
    if (data.request_invoice) {
      return !!data.fiscal_data;
    }
    return true;
  }, {
    message: "Dati fiscali richiesti se si richiede fattura elettronica",
    path: ['fiscal_data']
  })
  .refine((data) => {
    // Se è business (P.IVA), almeno PEC o SDI è obbligatorio
    if (data.fiscal_data?.is_business) {
      const hasPec = data.fiscal_data.pec_email && data.fiscal_data.pec_email.length > 0;
      const hasSdi = data.fiscal_data.sdi_code && data.fiscal_data.sdi_code.length === 7;
      return hasPec || hasSdi;
    }
    return true;
  }, {
    message: "Per aziende/P.IVA è richiesto almeno PEC o Codice SDI",
    path: ['fiscal_data', 'pec_email']
  })
  .refine((data) => {
    // Se privato, il tax_id deve essere un CF valido
    if (data.fiscal_data && !data.fiscal_data.is_business) {
      return CODICE_FISCALE_REGEX.test(data.fiscal_data.tax_id);
    }
    return true;
  }, {
    message: "Per privati è richiesto un Codice Fiscale valido (16 caratteri)",
    path: ['fiscal_data', 'tax_id']
  })
  .refine((data) => {
    // Se business, il tax_id deve essere una P.IVA valida
    if (data.fiscal_data && data.fiscal_data.is_business) {
      return PARTITA_IVA_REGEX.test(data.fiscal_data.tax_id);
    }
    return true;
  }, {
    message: "Per aziende è richiesta una Partita IVA valida (formato: IT + 11 cifre)",
    path: ['fiscal_data', 'tax_id']
  });

export type CoworkerFiscalInput = z.infer<typeof coworkerFiscalSchema>;
