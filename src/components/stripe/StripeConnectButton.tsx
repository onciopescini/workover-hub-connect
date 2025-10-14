import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export const StripeConnectButton = () => {
  const { toast } = useToast();
  const [isConnecting, setIsConnecting] = useState(false);

  // Check if user has Stripe account
  const { data: stripeAccount, isLoading } = useQuery({
    queryKey: ['stripe-account'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data, error } = await supabase
        .from('stripe_accounts')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const handleConnect = async () => {
    setIsConnecting(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-stripe-connect-account');

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Failed to create Stripe account');
      }

      // Open Stripe onboarding in new tab
      window.open(data.url, '_blank');

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
    } finally {
      setIsConnecting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Caricamento...</div>
        </CardContent>
      </Card>
    );
  }

  const isConnected = stripeAccount?.onboarding_completed && stripeAccount?.charges_enabled;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Account Stripe
        </CardTitle>
        <CardDescription>
          Connetti il tuo account Stripe per ricevere pagamenti dai coworker
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
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
                {stripeAccount && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                    ID Account: {stripeAccount.stripe_account_id}
                  </p>
                )}
              </div>
            </div>
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
              <CreditCard className="h-4 w-4 mr-2" />
              {isConnecting ? 'Connessione...' : 'Connetti Stripe'}
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
