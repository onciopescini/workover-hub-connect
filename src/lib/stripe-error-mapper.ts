/**
 * Maps Stripe error codes or messages to user-friendly Italian messages.
 *
 * @param error - The error code or message from Stripe/Backend
 * @returns A localized, user-friendly error message
 */
export const mapStripeError = (error: string | null | undefined): string => {
  if (!error) return "Si è verificato un errore sconosciuto.";

  const normalizedError = error.toLowerCase();

  // Direct Code Mapping
  const errorMap: Record<string, string> = {
    'card_declined': 'La carta è stata rifiutata. Controlla i dati o contatta la tua banca.',
    'expired_card': 'La carta è scaduta. Per favore utilizza un\'altra carta.',
    'incorrect_cvc': 'Il codice di sicurezza (CVC) non è corretto.',
    'processing_error': 'Errore durante l\'elaborazione della carta. Riprova più tardi.',
    'insufficient_funds': 'Fondi insufficienti sulla carta. Ricarica o usa un\'altra carta.',
    'authentication_required': 'È richiesta l\'autenticazione per completare il pagamento.',
    'rate_limit': 'Troppi tentativi. Attendi qualche minuto e riprova.',
    'api_connection_error': 'Errore di connessione. Controlla la tua rete e riprova.',
    'payment_intent_authentication_failure': 'Autenticazione fallita. Riprova o usa un\'altra carta.',
  };

  if (errorMap[normalizedError]) {
    return errorMap[normalizedError];
  }

  // Keyword/Phrase Matching (if the input is a full message)
  // AGGRESSIVE FIX: Use non-null assertion or provide fallback
  if (normalizedError.includes('decline') || normalizedError.includes('rifiuta')) {
    return errorMap['card_declined'] ?? 'La carta è stata rifiutata.';
  }
  if (normalizedError.includes('expired') || normalizedError.includes('scaduta')) {
    return errorMap['expired_card'] ?? 'La carta è scaduta.';
  }
  if (normalizedError.includes('insufficient') || normalizedError.includes('fondi')) {
    return errorMap['insufficient_funds'] ?? 'Fondi insufficienti.';
  }
  if (normalizedError.includes('cvc') || normalizedError.includes('security code')) {
    return errorMap['incorrect_cvc'] ?? 'Codice CVC non corretto.';
  }

  // Fallback for generic errors
  return "Si è verificato un errore col pagamento. Riprova o contatta il supporto.";
};
