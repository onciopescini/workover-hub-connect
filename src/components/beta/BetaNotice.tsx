import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export const BetaNotice = () => {
  // Check if we're in Stripe test mode
  const isTestMode = import.meta.env['VITE_STRIPE_PUBLISHABLE_KEY']?.includes('pk_test_');
  
  if (!isTestMode) return null;
  
  return (
    <Alert variant="default" className="mb-6 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
      <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
      <AlertTitle className="text-amber-900 dark:text-amber-400 font-semibold">
        🧪 Versione Beta - Modalità Test
      </AlertTitle>
      <AlertDescription className="text-amber-800 dark:text-amber-300">
        Stai testando WorkOver in modalità beta. I pagamenti utilizzano{' '}
        <strong>carte di test Stripe</strong> e nessun addebito reale viene effettuato.
        <br />
        <span className="text-sm mt-1 block">
          Carta di test: <code className="bg-amber-100 dark:bg-amber-900 px-1 py-0.5 rounded">4242 4242 4242 4242</code> - Qualsiasi CVV e data futura
        </span>
      </AlertDescription>
    </Alert>
  );
};
