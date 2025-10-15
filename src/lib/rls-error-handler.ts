/**
 * RLS Error Handler - Fix B.4
 * Provides user-friendly error messages for Row-Level Security violations
 */

export interface RLSErrorResult {
  isRLSError: boolean;
  userMessage: string;
  shouldShowToast: boolean;
}

/**
 * Detects and handles RLS policy violations with user-friendly messages
 */
export const handleRLSError = (error: any): RLSErrorResult => {
  // Check for RLS policy violations
  if (
    error?.code === '42501' || 
    error?.code === 'PGRST301' ||
    error?.message?.toLowerCase().includes('row-level security') ||
    error?.message?.toLowerCase().includes('permission denied') ||
    error?.message?.toLowerCase().includes('policy')
  ) {
    return {
      isRLSError: true,
      userMessage: 'Non hai i permessi per accedere a questa risorsa. Verifica di essere autenticato con il ruolo corretto.',
      shouldShowToast: true,
    };
  }

  // Check for JWT/authentication errors
  if (
    error?.message?.toLowerCase().includes('jwt') ||
    error?.message?.toLowerCase().includes('unauthorized') ||
    error?.code === '401'
  ) {
    return {
      isRLSError: true,
      userMessage: 'Devi effettuare il login per accedere a questa funzionalità.',
      shouldShowToast: true,
    };
  }

  // Check for email verification requirements
  if (error?.message?.toLowerCase().includes('email not verified')) {
    return {
      isRLSError: true,
      userMessage: 'Verifica la tua email per continuare.',
      shouldShowToast: true,
    };
  }

  // Check for Stripe connection requirements
  if (error?.message?.toLowerCase().includes('stripe')) {
    return {
      isRLSError: true,
      userMessage: 'È necessario collegare il tuo account Stripe per completare questa azione.',
      shouldShowToast: true,
    };
  }

  // Not an RLS error
  return {
    isRLSError: false,
    userMessage: 'Si è verificato un errore. Riprova più tardi.',
    shouldShowToast: false,
  };
};

/**
 * Enhanced error message for specific operations
 */
export const getRLSErrorMessage = (error: any, operation: string): string => {
  const result = handleRLSError(error);
  
  if (!result.isRLSError) {
    return `Errore durante ${operation}: ${error?.message || 'Errore sconosciuto'}`;
  }
  
  return result.userMessage;
};
