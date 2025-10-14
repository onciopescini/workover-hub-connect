import { PostgrestError } from '@supabase/supabase-js';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface FriendlyError {
  title: string;
  message: string;
  action?: string;
  actionUrl?: string;
}

export type RLSContext = 'space_create' | 'space_publish' | 'booking_create';

/**
 * Hook per gestire errori RLS con messaggi user-friendly
 * 
 * @example
 * const { handleRLSError } = useRLSErrorHandler();
 * 
 * const { error } = await supabase.from('spaces').insert({ ... });
 * if (error) {
 *   const isRLS = handleRLSError(error, 'space_create');
 *   if (!isRLS) {
 *     toast.error('Errore generico');
 *   }
 * }
 */
export function useRLSErrorHandler() {
  const navigate = useNavigate();

  const handleRLSError = (
    error: PostgrestError | Error | null,
    context: RLSContext
  ): boolean => {
    if (!error) return false;

    const isRLSError = 
      ('code' in error && error.code === '42501') ||
      error.message?.toLowerCase().includes('row-level security') ||
      error.message?.toLowerCase().includes('policy');

    if (!isRLSError) return false;

    const friendlyError = mapRLSError(error, context);

    toast.error(friendlyError.title, {
      description: friendlyError.message,
      action: friendlyError.action && friendlyError.actionUrl ? {
        label: friendlyError.action,
        onClick: () => navigate(friendlyError.actionUrl!)
      } : undefined,
      duration: 6000
    });

    return true;
  };

  return { handleRLSError };
}

function mapRLSError(error: any, context: RLSContext): FriendlyError {
  switch (context) {
    case 'space_create':
      return {
        title: 'Email non verificata',
        message: 'Per creare uno spazio devi prima verificare la tua email. Controlla la tua casella di posta.',
        action: 'Vai alle impostazioni',
        actionUrl: '/profile'
      };
    
    case 'space_publish':
      return {
        title: 'Stripe non connesso',
        message: 'Per pubblicare uno spazio devi completare l\'onboarding Stripe e collegare il tuo conto.',
        action: 'Completa Stripe',
        actionUrl: '/host/stripe-onboarding'
      };
    
    case 'booking_create':
      if (error.message?.toLowerCase().includes('email')) {
        return {
          title: 'Email non verificata',
          message: 'Per prenotare uno spazio devi prima verificare la tua email.',
          action: 'Verifica email',
          actionUrl: '/profile'
        };
      }
      
      return {
        title: 'Spazio non disponibile',
        message: 'Lo spazio selezionato non è al momento prenotabile. L\'host potrebbe aver perso la connessione Stripe.',
        action: 'Scegli un altro spazio',
        actionUrl: '/spaces'
      };
    
    default:
      return {
        title: 'Azione non consentita',
        message: 'Non hai i permessi necessari per completare questa azione.',
      };
  }
}
