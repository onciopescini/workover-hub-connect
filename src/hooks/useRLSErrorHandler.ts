import { toast } from "sonner";

export const useRLSErrorHandler = () => {
  const handleError = (error: any): boolean => {
    // Check for RLS-related errors
    if (
      error?.code === 'PGRST301' || 
      error?.code === '42501' ||
      error?.message?.toLowerCase().includes('row-level security') ||
      error?.message?.toLowerCase().includes('permission denied') ||
      error?.message?.toLowerCase().includes('policy')
    ) {
      toast.error('Accesso negato', {
        description: 'Non hai i permessi per accedere a questa risorsa. Verifica di essere autenticato con il ruolo corretto.',
        duration: 5000,
      });
      return true; // Error handled
    }

    // Check for missing authentication
    if (
      error?.message?.toLowerCase().includes('jwt') ||
      error?.message?.toLowerCase().includes('unauthorized')
    ) {
      toast.error('Autenticazione richiesta', {
        description: 'Devi effettuare il login per accedere a questa funzionalità.',
        duration: 5000,
      });
      return true; // Error handled
    }

    return false; // Not an RLS/auth error
  };

  return { handleError };
};
