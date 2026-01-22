import React, { useState } from 'react';
import { useAuth } from '@/hooks/auth/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Wallet, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const HostWalletPage = () => {
  const { authState } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const stripeAccountId = authState.profile?.stripe_account_id;

  const handleConnectStripe = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('connect-stripe', {
        body: {
          return_url: window.location.href, // User comes back here after success
          refresh_url: window.location.href, // User comes back here if they cancel/fail
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No redirection URL returned from Stripe');
      }
    } catch (error) {
      console.error('Error connecting to Stripe:', error);
      toast.error('Si è verificato un errore durante la connessione a Stripe. Riprova più tardi.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Wallet & Payouts</h1>
        <p className="text-muted-foreground mt-2">
          Gestisci i tuoi metodi di pagamento e visualizza i tuoi guadagni.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-1">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <CardTitle>Stripe Connect</CardTitle>
            </div>
            <CardDescription>
              {stripeAccountId
                ? "Il tuo account Stripe è connesso. Puoi gestire le impostazioni e visualizzare i payout direttamente su Stripe."
                : "Connetti il tuo account bancario per ricevere i pagamenti delle prenotazioni in modo sicuro e veloce."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stripeAccountId ? (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 p-4 rounded-lg border border-green-100">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-medium">Wallet connesso correttamente</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-4 rounded-lg border border-amber-100">
                <AlertCircle className="h-5 w-5" />
                <span className="font-medium">Azione richiesta: Connetti il tuo conto per ricevere pagamenti</span>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleConnectStripe}
              disabled={isLoading}
              variant={stripeAccountId ? "outline" : "default"}
              className="w-full sm:w-auto"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Elaborazione...
                </span>
              ) : stripeAccountId ? (
                <span className="flex items-center gap-2">
                  Gestisci Account Stripe
                  <ExternalLink className="h-4 w-4" />
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Connetti con Stripe
                  <ExternalLink className="h-4 w-4" />
                </span>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default HostWalletPage;
