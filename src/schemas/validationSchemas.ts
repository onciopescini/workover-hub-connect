// =====================================================
// ONDATA 2: FIX 2.7 - CENTRALIZED VALIDATION SCHEMAS (ZOD)
// =====================================================
// Centralized Zod schemas for consistent validation across the app

import { z } from 'zod';

// =====================================================
// FISCAL / TAX VALIDATION
// =====================================================

// Italian Codice Fiscale validation (basic)
const codiceFiscaleRegex = /^[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]$/i;

// Italian P.IVA validation (11 digits)
const pIvaRegex = /^\d{11}$/;

// IBAN validation (basic format check - full validation on server)
const ibanRegex = /^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/i;

// PEC email validation
const pecEmailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]*pec\.[a-zA-Z]{2,}$/i;

// SDI Code validation (7 characters)
const sdiCodeRegex = /^[A-Z0-9]{7}$/i;

// BIC/SWIFT validation (8 or 11 characters)
const bicSwiftRegex = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/i;

export const taxDetailsValidation = {
  taxId: z.string()
    .min(1, 'Codice fiscale obbligatorio')
    .regex(codiceFiscaleRegex, 'Formato codice fiscale non valido (es: RSSMRA80A01H501U)'),
  
  vatNumber: z.string()
    .optional()
    .refine((val) => !val || pIvaRegex.test(val), {
      message: 'P.IVA deve contenere esattamente 11 cifre'
    }),
  
  iban: z.string()
    .min(1, 'IBAN obbligatorio')
    .regex(ibanRegex, 'Formato IBAN non valido (es: IT60X0542811101000000123456)'),
  
  bicSwift: z.string()
    .optional()
    .refine((val) => !val || bicSwiftRegex.test(val), {
      message: 'BIC/SWIFT deve essere 8 o 11 caratteri alfanumerici'
    }),
  
  pecEmail: z.string()
    .optional()
    .refine((val) => !val || pecEmailRegex.test(val), {
      message: 'Indirizzo PEC non valido (deve terminare con @pec.it o contenere "pec")'
    }),
  
  sdiCode: z.string()
    .optional()
    .refine((val) => !val || sdiCodeRegex.test(val), {
      message: 'Codice SDI deve essere esattamente 7 caratteri alfanumerici'
    }),
};

// =====================================================
// BOOKING VALIDATION
// =====================================================

export const bookingValidation = {
  guestsCount: z.number()
    .int('Il numero di ospiti deve essere un numero intero')
    .min(1, 'Minimo 1 ospite')
    .max(100, 'Massimo 100 ospiti'),
  
  bookingDate: z.date()
    .refine((date) => date >= new Date(), {
      message: 'La data di prenotazione non può essere nel passato'
    }),
  
  startTime: z.string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato orario non valido (HH:MM)'),
  
  endTime: z.string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato orario non valido (HH:MM)'),
  
  durationHours: z.number()
    .min(0.5, 'Durata minima: 30 minuti')
    .max(24, 'Durata massima: 24 ore'),
};

// =====================================================
// SPACE VALIDATION
// =====================================================

export const spaceValidation = {
  title: z.string()
    .min(5, 'Il titolo deve contenere almeno 5 caratteri')
    .max(100, 'Il titolo non può superare i 100 caratteri'),
  
  description: z.string()
    .min(50, 'La descrizione deve contenere almeno 50 caratteri')
    .max(2000, 'La descrizione non può superare i 2000 caratteri'),
  
  pricePerHour: z.number()
    .min(5, 'Prezzo minimo per ora: €5')
    .max(1000, 'Prezzo massimo per ora: €1000'),
  
  pricePerDay: z.number()
    .min(20, 'Prezzo minimo per giorno: €20')
    .max(5000, 'Prezzo massimo per giorno: €5000'),
  
  capacity: z.number()
    .int('La capacità deve essere un numero intero')
    .min(1, 'Capacità minima: 1 persona')
    .max(1000, 'Capacità massima: 1000 persone'),
};

// =====================================================
// PAYMENT VALIDATION
// =====================================================

export const paymentValidation = {
  amount: z.number()
    .min(1, 'Importo minimo: €1')
    .max(50000, 'Importo massimo: €50000'),
  
  stripeSessionId: z.string()
    .startsWith('cs_', 'Session ID Stripe non valido'),
  
  stripePaymentIntentId: z.string()
    .startsWith('pi_', 'Payment Intent ID Stripe non valido'),
};

// =====================================================
// USER PROFILE VALIDATION
// =====================================================

export const profileValidation = {
  firstName: z.string()
    .min(2, 'Il nome deve contenere almeno 2 caratteri')
    .max(50, 'Il nome non può superare i 50 caratteri')
    .regex(/^[a-zA-ZàèéìòùÀÈÉÌÒÙ\s'-]+$/, 'Il nome contiene caratteri non validi'),
  
  lastName: z.string()
    .min(2, 'Il cognome deve contenere almeno 2 caratteri')
    .max(50, 'Il cognome non può superare i 50 caratteri')
    .regex(/^[a-zA-ZàèéìòùÀÈÉÌÒÙ\s'-]+$/, 'Il cognome contiene caratteri non validi'),
  
  email: z.string()
    .email('Indirizzo email non valido'),
  
  phone: z.string()
    .optional()
    .refine((val) => !val || /^(\+39)?[\s]?[0-9]{6,13}$/.test(val), {
      message: 'Numero di telefono non valido (formato italiano)'
    }),
  
  bio: z.string()
    .max(500, 'La biografia non può superare i 500 caratteri')
    .optional(),
};

// =====================================================
// MESSAGE VALIDATION
// =====================================================

export const messageValidation = {
  content: z.string()
    .min(1, 'Il messaggio non può essere vuoto')
    .max(2000, 'Il messaggio non può superare i 2000 caratteri'),
};

// =====================================================
// REVIEW VALIDATION
// =====================================================

export const reviewValidation = {
  rating: z.number()
    .int('Il voto deve essere un numero intero')
    .min(1, 'Voto minimo: 1 stella')
    .max(5, 'Voto massimo: 5 stelle'),
  
  content: z.string()
    .min(10, 'La recensione deve contenere almeno 10 caratteri')
    .max(1000, 'La recensione non può superare i 1000 caratteri')
    .optional(),
};

// =====================================================
// HELPERS
// =====================================================

/**
 * Client-side IBAN validation with checksum
 * Returns true if IBAN format and checksum are valid
 */
export const validateIBAN = (iban?: string): boolean => {
  if (!iban) return false;
  
  // Remove spaces and convert to uppercase
  const cleanIban = iban.replace(/\s/g, '').toUpperCase();
  
  // Check basic format
  if (!ibanRegex.test(cleanIban)) return false;
  
  // Move first 4 chars to end
  const rearranged = cleanIban.slice(4) + cleanIban.slice(0, 4);
  
  // Replace letters with numbers (A=10, B=11, ..., Z=35)
  const numeric = rearranged.replace(/[A-Z]/g, (char: string) => (char.charCodeAt(0) - 55).toString());
  
  // Perform mod-97 checksum
  let remainder = numeric;
  while (remainder.length > 2) {
    const block = remainder.slice(0, 9);
    remainder = (parseInt(block, 10) % 97).toString() + remainder.slice(block.length);
  }
  
  return parseInt(remainder, 10) % 97 === 1;
};

/**
 * Format IBAN with spaces for display
 */
export const formatIBAN = (iban?: string): string => {
  if (!iban) return '';
  const clean = iban.replace(/\s/g, '').toUpperCase();
  return clean.match(/.{1,4}/g)?.join(' ') || clean;
};

/**
 * Validate Italian P.IVA with Luhn algorithm
 */
export const validatePIVA = (piva?: string): boolean => {
  if (!piva || !pIvaRegex.test(piva)) return false;
  
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    let digit = parseInt(piva[i], 10);
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  
  return sum % 10 === 0;
};

/**
 * Validate Italian Codice Fiscale checksum
 */
export const validateCodiceFiscale = (cf?: string): boolean => {
  if (!cf || !codiceFiscaleRegex.test(cf)) return false;
  
  const cfUpper = cf.toUpperCase();
  const evenMap = '0123456789';
  const oddMap = '1AB89CD6EF4GH2IJ0KLMN3OP5QRST7UV9WXYZabcdefghijklmnopqrstuvwxyz';
  const checkMap = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    const char = cfUpper[i];
    if (i % 2 === 0) {
      sum += oddMap.indexOf(char);
    } else {
      sum += evenMap.indexOf(char);
    }
  }
  
  const expectedCheck = checkMap[sum % 26];
  return cfUpper[15] === expectedCheck;
};
