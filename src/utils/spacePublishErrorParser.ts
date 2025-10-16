import type { PostgrestError } from '@supabase/supabase-js';

interface ParsedPublishError {
  type: 'stripe' | 'kyc' | 'fiscal_regime' | 'tax_details' | 'generic';
  title: string;
  message: string;
  action: { label: string; route: string } | null;
}

export function parseSpacePublishError(error: PostgrestError): ParsedPublishError {
  const errorMsg = error.message || '';
  
  if (errorMsg.includes('Stripe account not connected')) {
    return {
      type: 'stripe',
      title: 'Stripe Non Connesso',
      message: 'Devi completare la configurazione Stripe per pubblicare spazi e ricevere pagamenti.',
      action: { label: 'Completa Stripe Onboarding', route: '/host/onboarding' },
    };
  }
  
  if (errorMsg.includes('Identity verification required') || errorMsg.includes('KYC')) {
    return {
      type: 'kyc',
      title: 'Verifica Identità Richiesta',
      message: 'Devi caricare i documenti di identità (KYC) e attendere l\'approvazione di un amministratore per pubblicare spazi.',
      action: { label: 'Carica Documenti KYC', route: '/host/kyc' },
    };
  }
  
  if (errorMsg.includes('Fiscal regime') || errorMsg.includes('Regime Fiscale')) {
    return {
      type: 'fiscal_regime',
      title: 'Dati Fiscali Mancanti',
      message: 'Devi completare i dati fiscali (Regime Fiscale, IBAN, ecc.) per pubblicare spazi.',
      action: { label: 'Completa Dati Fiscali', route: '/host/fiscal' },
    };
  }
  
  if (errorMsg.includes('tax details') || errorMsg.includes('address') || errorMsg.includes('Complete address required')) {
    return {
      type: 'tax_details',
      title: 'Indirizzo Fiscale Incompleto',
      message: 'Devi completare l\'indirizzo strutturato (Via, Città, CAP, Provincia) nei dati fiscali per pubblicare spazi.',
      action: { label: 'Completa Indirizzo', route: '/host/fiscal' },
    };
  }
  
  return {
    type: 'generic',
    title: 'Errore di Pubblicazione',
    message: errorMsg || 'Si è verificato un errore durante la pubblicazione dello spazio. Riprova.',
    action: null,
  };
}
