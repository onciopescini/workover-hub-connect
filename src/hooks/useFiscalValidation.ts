import { useState, useEffect, useCallback } from 'react';
import { z } from 'zod';

// Italian Fiscal Code (Codice Fiscale) validation - 16 alphanumeric characters
const CODICE_FISCALE_REGEX = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/i;

// Italian VAT Number (Partita IVA) validation - IT + 11 digits
const PARTITA_IVA_REGEX = /^IT[0-9]{11}$/;

// Italian postal code - 5 digits
const CAP_REGEX = /^[0-9]{5}$/;

// Italian province code - 2 letters
const PROVINCE_REGEX = /^[A-Z]{2}$/i;

// PEC email regex
const PEC_EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.(pec|PEC)(\.[a-zA-Z]{2,})?$/;

export interface FiscalFieldValidation {
  isValid: boolean;
  error: string | null;
  isValidating: boolean;
}

export interface FiscalValidationState {
  tax_id: FiscalFieldValidation;
  pec_email: FiscalFieldValidation;
  sdi_code: FiscalFieldValidation;
  billing_address: FiscalFieldValidation;
  billing_city: FiscalFieldValidation;
  billing_province: FiscalFieldValidation;
  billing_postal_code: FiscalFieldValidation;
}

const initialFieldState: FiscalFieldValidation = {
  isValid: true,
  error: null,
  isValidating: false,
};

export const useFiscalValidation = (isBusiness: boolean) => {
  const [validationState, setValidationState] = useState<FiscalValidationState>({
    tax_id: { ...initialFieldState },
    pec_email: { ...initialFieldState },
    sdi_code: { ...initialFieldState },
    billing_address: { ...initialFieldState },
    billing_city: { ...initialFieldState },
    billing_province: { ...initialFieldState },
    billing_postal_code: { ...initialFieldState },
  });

  const validateTaxId = useCallback((value: string): FiscalFieldValidation => {
    if (!value || value.length === 0) {
      return { isValid: false, error: 'Campo obbligatorio', isValidating: false };
    }

    const upperValue = value.toUpperCase();

    if (isBusiness) {
      if (!PARTITA_IVA_REGEX.test(upperValue)) {
        return { 
          isValid: false, 
          error: 'Formato Partita IVA non valido (es: IT12345678901)', 
          isValidating: false 
        };
      }
    } else {
      if (!CODICE_FISCALE_REGEX.test(upperValue)) {
        return { 
          isValid: false, 
          error: 'Formato Codice Fiscale non valido (16 caratteri)', 
          isValidating: false 
        };
      }
    }

    return { isValid: true, error: null, isValidating: false };
  }, [isBusiness]);

  const validatePecEmail = useCallback((value: string, pecValue: string, sdiValue: string): FiscalFieldValidation => {
    if (!isBusiness) {
      return { isValid: true, error: null, isValidating: false };
    }

    // Almeno uno tra PEC o SDI deve essere fornito
    const hasSdi = sdiValue && sdiValue.length === 7;
    const hasPec = value && value.length > 0;

    if (!hasPec && !hasSdi) {
      return { 
        isValid: false, 
        error: 'Richiesto almeno uno tra PEC o Codice SDI', 
        isValidating: false 
      };
    }

    if (hasPec) {
      // Validate email format
      const emailSchema = z.string().email();
      const emailResult = emailSchema.safeParse(value);
      
      if (!emailResult.success) {
        return { 
          isValid: false, 
          error: 'Formato email non valido', 
          isValidating: false 
        };
      }

      // Check if it's a PEC email
      if (!PEC_EMAIL_REGEX.test(value)) {
        return { 
          isValid: false, 
          error: 'Deve essere un indirizzo PEC (es: nome@azienda.pec.it)', 
          isValidating: false 
        };
      }
    }

    return { isValid: true, error: null, isValidating: false };
  }, [isBusiness]);

  const validateSdiCode = useCallback((value: string, pecValue: string): FiscalFieldValidation => {
    if (!isBusiness) {
      return { isValid: true, error: null, isValidating: false };
    }

    const hasPec = pecValue && pecValue.length > 0;
    const hasSdi = value && value.length > 0;

    // Almeno uno tra PEC o SDI deve essere fornito
    if (!hasPec && !hasSdi) {
      return { 
        isValid: false, 
        error: 'Richiesto almeno uno tra PEC o Codice SDI', 
        isValidating: false 
      };
    }

    if (hasSdi) {
      if (value.length !== 7) {
        return { 
          isValid: false, 
          error: 'Il Codice SDI deve essere di 7 caratteri', 
          isValidating: false 
        };
      }

      if (!/^[A-Z0-9]{7}$/i.test(value)) {
        return { 
          isValid: false, 
          error: 'Il Codice SDI deve contenere solo lettere e numeri', 
          isValidating: false 
        };
      }
    }

    return { isValid: true, error: null, isValidating: false };
  }, [isBusiness]);

  const validateBillingAddress = useCallback((value: string): FiscalFieldValidation => {
    if (!value || value.trim().length === 0) {
      return { isValid: false, error: 'Campo obbligatorio', isValidating: false };
    }

    if (value.trim().length < 5) {
      return { 
        isValid: false, 
        error: 'Indirizzo troppo corto (minimo 5 caratteri)', 
        isValidating: false 
      };
    }

    if (value.length > 200) {
      return { 
        isValid: false, 
        error: 'Indirizzo troppo lungo (massimo 200 caratteri)', 
        isValidating: false 
      };
    }

    return { isValid: true, error: null, isValidating: false };
  }, []);

  const validateBillingCity = useCallback((value: string): FiscalFieldValidation => {
    if (!value || value.trim().length === 0) {
      return { isValid: false, error: 'Campo obbligatorio', isValidating: false };
    }

    if (value.trim().length < 2) {
      return { 
        isValid: false, 
        error: 'Città troppo corta (minimo 2 caratteri)', 
        isValidating: false 
      };
    }

    if (value.length > 100) {
      return { 
        isValid: false, 
        error: 'Nome città troppo lungo (massimo 100 caratteri)', 
        isValidating: false 
      };
    }

    return { isValid: true, error: null, isValidating: false };
  }, []);

  const validateBillingProvince = useCallback((value: string): FiscalFieldValidation => {
    if (!value || value.trim().length === 0) {
      return { isValid: false, error: 'Campo obbligatorio', isValidating: false };
    }

    const upperValue = value.toUpperCase();

    if (!PROVINCE_REGEX.test(upperValue)) {
      return { 
        isValid: false, 
        error: 'Provincia deve essere di 2 lettere (es: MI, RM)', 
        isValidating: false 
      };
    }

    return { isValid: true, error: null, isValidating: false };
  }, []);

  const validateBillingPostalCode = useCallback((value: string): FiscalFieldValidation => {
    if (!value || value.trim().length === 0) {
      return { isValid: false, error: 'Campo obbligatorio', isValidating: false };
    }

    if (!CAP_REGEX.test(value)) {
      return { 
        isValid: false, 
        error: 'CAP deve essere di 5 cifre', 
        isValidating: false 
      };
    }

    return { isValid: true, error: null, isValidating: false };
  }, []);

  const validateField = useCallback((
    fieldName: keyof FiscalValidationState,
    value: string,
    allValues?: {
      pec_email?: string;
      sdi_code?: string;
    }
  ) => {
    let result: FiscalFieldValidation = { ...initialFieldState };

    switch (fieldName) {
      case 'tax_id':
        result = validateTaxId(value);
        break;
      case 'pec_email':
        result = validatePecEmail(value, allValues?.pec_email || '', allValues?.sdi_code || '');
        break;
      case 'sdi_code':
        result = validateSdiCode(value, allValues?.pec_email || '');
        break;
      case 'billing_address':
        result = validateBillingAddress(value);
        break;
      case 'billing_city':
        result = validateBillingCity(value);
        break;
      case 'billing_province':
        result = validateBillingProvince(value);
        break;
      case 'billing_postal_code':
        result = validateBillingPostalCode(value);
        break;
    }

    setValidationState(prev => ({
      ...prev,
      [fieldName]: result,
    }));

    return result;
  }, [
    validateTaxId,
    validatePecEmail,
    validateSdiCode,
    validateBillingAddress,
    validateBillingCity,
    validateBillingProvince,
    validateBillingPostalCode,
  ]);

  const clearFieldError = useCallback((fieldName: keyof FiscalValidationState) => {
    setValidationState(prev => ({
      ...prev,
      [fieldName]: { ...initialFieldState },
    }));
  }, []);

  const resetValidation = useCallback(() => {
    setValidationState({
      tax_id: { ...initialFieldState },
      pec_email: { ...initialFieldState },
      sdi_code: { ...initialFieldState },
      billing_address: { ...initialFieldState },
      billing_city: { ...initialFieldState },
      billing_province: { ...initialFieldState },
      billing_postal_code: { ...initialFieldState },
    });
  }, []);

  const hasErrors = useCallback(() => {
    return Object.values(validationState).some(field => !field.isValid);
  }, [validationState]);

  return {
    validationState,
    validateField,
    clearFieldError,
    resetValidation,
    hasErrors,
  };
};
