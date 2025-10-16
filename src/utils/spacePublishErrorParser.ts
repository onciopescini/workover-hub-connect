import type { PostgrestError } from '@supabase/supabase-js';

export interface ParsedPublishError {
  type: 'stripe' | 'kyc' | 'fiscal_regime' | 'tax_details' | 'email_verification' | 'generic';
  title: string;
  message: string;
  action?: {
    label: string;
    route: string;
  };
}

export function parseSpacePublishError(error: PostgrestError): ParsedPublishError {
  const message = error.message || '';
  
  // Email verification check
  if (message.includes('email not verified') || message.includes('email_confirmed_at')) {
    return {
      type: 'email_verification',
      title: 'Email Non Verificata',
      message: 'Prima di pubblicare uno spazio, devi verificare il tuo indirizzo email. Controlla la tua casella di posta per il link di verifica.',
      action: {
        label: 'Vai al Profilo',
        route: '/profile',
      },
    };
  }

  // Stripe connection check
  if (message.includes('Stripe account not connected') || message.includes('stripe onboarding') || message.toLowerCase().includes('stripe')) {
    return {
      type: 'stripe',
      title: 'Account Stripe Non Connesso',
      message: 'Per pubblicare uno spazio devi completare l\'onboarding Stripe (step 2). Questo è necessario per ricevere i pagamenti in modo sicuro e conforme alle normative.',
      action: {
        label: 'Completa Onboarding Stripe',
        route: '/host/onboarding',
      },
    };
  }
  
  // KYC verification check
  if (message.includes('Identity verification') || message.includes('kyc') || message.toLowerCase().includes('identity')) {
    return {
      type: 'kyc',
      title: 'Verifica Identità Richiesta',
      message: 'Prima di pubblicare uno spazio, devi completare la verifica KYC caricando un documento di identità valido. La verifica richiede 24-48 ore.',
      action: {
        label: 'Carica Documento KYC',
        route: '/host/kyc-verification',
      },
    };
  }
  
  // Fiscal regime check
  if (message.includes('Fiscal regime') || message.includes('fiscal_regime') || message.includes('Regime Fiscale')) {
    return {
      type: 'fiscal_regime',
      title: 'Regime Fiscale Mancante',
      message: 'Devi selezionare il tuo regime fiscale (Privato, Forfettario o Ordinario) per conformità alle normative fiscali italiane.',
      action: {
        label: 'Completa Dati Fiscali',
        route: '/host/fiscal',
      },
    };
  }
  
  // Tax details and IBAN check
  if (message.includes('tax details') || message.includes('IBAN') || message.includes('Complete address') || message.includes('payment')) {
    const missingFields: string[] = [];
    
    if (message.includes('IBAN')) missingFields.push('IBAN');
    if (message.includes('address')) missingFields.push('indirizzo completo');
    if (message.includes('tax')) missingFields.push('dati fiscali');
    
    const fieldsList = missingFields.length > 0 ? ` (${missingFields.join(', ')})` : '';
    
    return {
      type: 'tax_details',
      title: 'Dati Fiscali Incompleti',
      message: `Devi completare tutti i dati fiscali obbligatori${fieldsList} per poter pubblicare spazi e ricevere pagamenti.`,
      action: {
        label: 'Completa Dati Fiscali',
        route: '/host/fiscal',
      },
    };
  }
  
  // Generic fallback with actionable guidance
  return {
    type: 'generic',
    title: 'Requisiti Mancanti per la Pubblicazione',
    message: error.message || 'Completa tutti i passaggi di onboarding (Stripe, KYC, Dati Fiscali) prima di pubblicare spazi.',
    action: {
      label: 'Vai all\'Onboarding',
      route: '/host/onboarding',
    },
  };
}
