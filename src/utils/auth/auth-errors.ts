/**
 * Centralized authentication error messages in Italian
 * Provides consistent, localized error messages across the app
 */

export const AUTH_ERRORS = {
  // Login errors
  INVALID_CREDENTIALS: 'Email o password non validi. Riprova.',
  WEAK_PASSWORD: 'La password deve contenere almeno 8 caratteri, una lettera maiuscola, una minuscola, un numero e un carattere speciale.',
  PASSWORD_MISMATCH: 'Le password non corrispondono.',
  EMAIL_NOT_CONFIRMED: 'Verifica la tua email prima di effettuare il login.',
  USER_NOT_FOUND: 'Utente non trovato. Verifica l\'indirizzo email.',
  
  // Signup errors
  EMAIL_ALREADY_REGISTERED: 'Questa email è già registrata. Prova ad effettuare il login.',
  INVALID_EMAIL_FORMAT: 'Formato email non valido.',
  
  // Rate limiting
  TOO_MANY_REQUESTS: 'Troppi tentativi. Riprova tra qualche minuto.',
  RATE_LIMIT_EXCEEDED: (seconds: number) => `Troppi tentativi di accesso. Riprova tra ${seconds} secondi.`,
  
  // Network errors
  NETWORK_ERROR: 'Errore di connessione. Verifica la tua connessione internet.',
  SERVICE_UNAVAILABLE: 'Servizio temporaneamente non disponibile. Riprova più tardi.',
  
  // OAuth errors
  OAUTH_CANCELLED: 'Autenticazione Google annullata.',
  OAUTH_FAILED: 'Errore durante l\'autenticazione con Google. Riprova.',
  OAUTH_POPUP_BLOCKED: 'Popup bloccato dal browser. Consenti i popup per questo sito.',
  
  // Session errors
  SESSION_EXPIRED: 'Sessione scaduta. Effettua nuovamente il login.',
  PROFILE_LOAD_FAILED: 'Impossibile caricare il profilo. Riprova più tardi.',
  PROFILE_UPDATE_FAILED: 'Impossibile aggiornare il profilo. Riprova.',
  
  // Generic
  UNKNOWN_ERROR: 'Si è verificato un errore imprevisto. Riprova.',
  PERMISSION_DENIED: 'Non hai i permessi necessari per questa operazione.',
} as const;

/**
 * Maps Supabase error codes to localized messages
 */
export const mapSupabaseError = (error: any): string => {
  if (!error) return AUTH_ERRORS.UNKNOWN_ERROR;
  
  const message = error.message?.toLowerCase() || '';
  const code = error.code?.toLowerCase() || '';
  
  // Email already registered
  if (message.includes('user already registered') || code === '23505') {
    return AUTH_ERRORS.EMAIL_ALREADY_REGISTERED;
  }
  
  // Email not confirmed - MUST check BEFORE invalid credentials
  if (message.includes('email not confirmed')) {
    return AUTH_ERRORS.EMAIL_NOT_CONFIRMED;
  }
  
  // Invalid credentials
  if (message.includes('invalid login credentials')) {
    return AUTH_ERRORS.INVALID_CREDENTIALS;
  }
  
  // User not found
  if (message.includes('user not found')) {
    return AUTH_ERRORS.USER_NOT_FOUND;
  }
  
  // Weak password
  if (message.includes('password') && (message.includes('weak') || message.includes('short'))) {
    return AUTH_ERRORS.WEAK_PASSWORD;
  }
  
  // Network errors
  if (message.includes('network') || message.includes('fetch')) {
    return AUTH_ERRORS.NETWORK_ERROR;
  }
  
  // Rate limiting
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return AUTH_ERRORS.TOO_MANY_REQUESTS;
  }
  
  // OAuth errors
  if (message.includes('oauth') && message.includes('cancel')) {
    return AUTH_ERRORS.OAUTH_CANCELLED;
  }
  
  if (message.includes('oauth')) {
    return AUTH_ERRORS.OAUTH_FAILED;
  }
  
  // Session errors
  if (message.includes('session') || message.includes('token') || message.includes('jwt')) {
    return AUTH_ERRORS.SESSION_EXPIRED;
  }
  
  // Default
  return AUTH_ERRORS.UNKNOWN_ERROR;
};
