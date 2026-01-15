import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { API_ENDPOINTS } from "@/constants";
import { useAuth } from '@/hooks/auth/useAuth';

export const StripeConnectButton = () => {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);
  const { authState } = useAuth();
  const user = authState.user;

  // Check if user has Stripe account via Profile (Source of Truth)
  // We rely on authState.profile for immediate status, but can refresh if needed.
  const isConnected = authState.profile?.stripe_connected;
  const stripeAccountId = authState.profile?.stripe_account_id;

  const handleConnect = async () => {
    setIsConnecting(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-connect-onboarding-link');

      if (error) throw error;

      if (data.error) {
         throw new Error(data.error);
      }

      if (!data.url) {
        throw new Error('Failed to generate onboarding link');
      }

      // Open Stripe onboarding in new tab or redirect
      // For better UX on mobile, redirecting might be better, but new tab preserves app state
      window.location.href = data.url;

      toast({
        title: "Reindirizzamento a Stripe",
        description: "Completa la configurazione del tuo account Stripe per ricevere pagamenti.",
      });

    } catch (error: any) {
      console.error('Stripe Connect error:', error);
      toast({
        title: "Errore connessione Stripe",
        description: error.message || "Si è verificato un errore. Riprova.",
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  };

  const handleLoginLink = async () => {
     setIsConnecting(true);
     try {
         // In a real scenario, you'd call a function to get a login link.
         // For Express, the onboarding link acts as a login link if onboarding is complete.
         const { data, error } = await supabase.functions.invoke('create-connect-onboarding-link');
         if (error) throw error;
         if (data.url) window.location.href = data.url;
     } catch(e: any) {
         toast({
             title: "Impossibile accedere alla dashboard",
             description: e.message,
             variant: "destructive"
         });
     } finally {
         setIsConnecting(false);
     }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Account Stripe
        </CardTitle>
        <CardDescription>
          {isConnected
            ? "Il tuo account Stripe è attivo e collegato."
            : "Connetti il tuo account Stripe per ricevere pagamenti dai coworker"
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <div className="space-y-4">
            <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-green-900 dark:text-green-100">
                    Account Stripe Connesso
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    Il tuo account è configurato e puoi ricevere pagamenti.
                  </p>
                  {stripeAccountId && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-2 font-mono">
                      ID: {stripeAccountId}
                    </p>
                  )}
                </div>
              </div>
            </div>

             <Button
              onClick={handleLoginLink}
              disabled={isConnecting}
              variant="outline"
              className="w-full"
            >
              {isConnecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Gestisci su Stripe
            </Button>
          </div>
        ) : (
          <>
            <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                    Connessione Stripe Richiesta
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Devi connettere un account Stripe per pubblicare spazi e ricevere pagamenti.
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full"
              size="lg"
            >
              {isConnecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CreditCard className="h-4 w-4 mr-2" />}
              {isConnecting ? 'Reindirizzamento...' : 'Connetti Stripe'}
            </Button>

            <div className="space-y-2 text-xs text-muted-foreground">
              <p className="font-medium">Cosa ti serve:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Documento di identità valido</li>
                <li>Codice fiscale o Partita IVA</li>
                <li>Coordinate bancarie (IBAN)</li>
                <li>Indirizzo di residenza</li>
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
