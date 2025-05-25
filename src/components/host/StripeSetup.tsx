
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CreditCard, AlertTriangle, CheckCircle, ExternalLink, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function StripeSetup() {
  const { authState } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  
  // Leggi lo stato direttamente dal profilo autenticato
  const stripeConnected = authState.profile?.stripe_connected || false;
  const stripeAccountId = authState.profile?.stripe_account_id;

  console.log("🔵 StripeSetup - Stato corrente:", {
    userId: authState.user?.id,
    stripeConnected,
    stripeAccountId
  });

  // Auto-refresh status quando la pagina viene ricaricata o focus
  useEffect(() => {
    const handleFocus = () => {
      if (authState.user && !stripeConnected) {
        console.log("🔵 Page focus - checking Stripe status");
        handleRefreshStatus();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [authState.user, stripeConnected]);

  // Check URL parameters per redirect da Stripe
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('stripe_setup') === 'success') {
      console.log("🔵 Detected Stripe setup success from URL");
      toast.success("Setup Stripe completato! Controllo stato...");
      handleRefreshStatus();
      // Pulisci l'URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleStripeConnect = async () => {
    setIsLoading(true);
    try {
      console.log("🔵 Iniziando connessione Stripe...");
      
      const { data, error } = await supabase.functions.invoke('stripe-connect', {
        body: {
          return_url: `${window.location.origin}/host/dashboard?stripe_setup=success`,
          refresh_url: `${window.location.origin}/host/dashboard`
        }
      });

      if (error) {
        console.error("🔴 Errore Stripe Connect:", error);
        throw error;
      }

      if (data?.url) {
        console.log("🔵 URL Stripe ricevuto:", data.url);
        // Apri Stripe Connect in una nuova finestra
        window.open(data.url, '_blank');
        toast.success("Reindirizzamento a Stripe Connect...");
      } else {
        throw new Error("URL di reindirizzamento non ricevuto");
      }
      
    } catch (error) {
      console.error("🔴 Errore nel collegamento Stripe:", error);
      toast.error("Errore nel collegamento con Stripe");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStripeManage = () => {
    // Reindirizza al dashboard Stripe
    window.open("https://dashboard.stripe.com", "_blank");
  };

  const handleRefreshStatus = async () => {
    setIsCheckingStatus(true);
    try {
      console.log("🔵 Refreshing profile status...");
      
      // Forza refresh del profilo dal server
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error("🔴 Errore fetch profilo:", error);
          throw error;
        }

        console.log("🔵 Profilo aggiornato:", {
          stripeConnected: profile?.stripe_connected,
          stripeAccountId: profile?.stripe_account_id
        });

        if (profile?.stripe_connected && !stripeConnected) {
          toast.success("Stato Stripe aggiornato!");
          // Trigger refresh del context
          window.location.reload();
        } else if (!profile?.stripe_connected) {
          toast.info("Setup Stripe ancora in corso...");
        }
      }
    } catch (error) {
      console.error("🔴 Errore nel refresh dello stato:", error);
      toast.error("Errore nel controllo dello stato");
    } finally {
      setIsCheckingStatus(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Configurazione Pagamenti
          {stripeConnected ? (
            <Badge variant="default" className="bg-green-100 text-green-700">
              <CheckCircle className="h-3 w-3 mr-1" />
              Configurato
            </Badge>
          ) : (
            <Badge variant="destructive">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Richiesto
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!stripeConnected ? (
          <div className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Setup richiesto:</strong> Prima di poter pubblicare spazi e ricevere pagamenti, 
                devi configurare il tuo account Stripe per gestire i pagamenti.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-3">
              <h4 className="font-medium">Cosa include la configurazione Stripe:</h4>
              <ul className="text-sm text-gray-600 space-y-1 ml-4" role="list">
                <li>• Verifica della tua identità</li>
                <li>• Configurazione dei metodi di pagamento</li>
                <li>• Setup dei conti bancari per i pagamenti</li>
                <li>• Configurazione delle commissioni</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button 
                onClick={handleStripeConnect}
                disabled={isLoading || isCheckingStatus}
                className="flex-1"
                aria-label="Configura il tuo account Stripe"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Caricamento...
                  </>
                ) : (
                  "Configura Account Stripe"
                )}
              </Button>
              
              <Button 
                variant="outline" 
                onClick={handleRefreshStatus}
                disabled={isLoading || isCheckingStatus}
                aria-label="Controlla stato della configurazione"
              >
                {isCheckingStatus ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Ricontrolla"
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Account Stripe configurato correttamente</span>
            </div>
            
            <p className="text-sm text-gray-600">
              Il tuo account Stripe è collegato e configurato. Puoi ora pubblicare spazi 
              e ricevere pagamenti dai coworker.
            </p>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={handleStripeManage}
                className="flex items-center gap-2"
                aria-label="Gestisci il tuo account Stripe"
              >
                <ExternalLink className="h-4 w-4" />
                Gestisci Account Stripe
              </Button>
              
              <Button 
                variant="ghost" 
                onClick={handleRefreshStatus}
                disabled={isCheckingStatus}
                size="sm"
                aria-label="Aggiorna stato Stripe"
              >
                {isCheckingStatus ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Aggiorna"
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
