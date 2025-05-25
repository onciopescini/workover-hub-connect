
import { useState } from "react";
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
  
  // Leggi lo stato direttamente dal profilo autenticato
  const stripeConnected = authState.profile?.stripe_connected || false;

  const handleStripeConnect = async () => {
    setIsLoading(true);
    try {
      // Crea una sessione di onboarding Stripe Connect
      const { data, error } = await supabase.functions.invoke('stripe-connect', {
        body: {
          return_url: `${window.location.origin}/host/dashboard`,
          refresh_url: `${window.location.origin}/host/dashboard`
        }
      });

      if (error) throw error;

      if (data?.url) {
        // Apri Stripe Connect in una nuova finestra
        window.open(data.url, '_blank');
        toast.success("Reindirizzamento a Stripe Connect...");
      } else {
        throw new Error("URL di reindirizzamento non ricevuto");
      }
      
    } catch (error) {
      console.error("Errore nel collegamento Stripe:", error);
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
    setIsLoading(true);
    try {
      // Ricarica i dati del profilo
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Questo trigger un refresh del context
        window.location.reload();
      }
    } catch (error) {
      console.error("Errore nel refresh dello stato:", error);
      toast.error("Errore nel controllo dello stato");
    } finally {
      setIsLoading(false);
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
                disabled={isLoading}
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
                disabled={isLoading}
                aria-label="Controlla stato della configurazione"
              >
                {isLoading ? (
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
                disabled={isLoading}
                size="sm"
                aria-label="Aggiorna stato Stripe"
              >
                {isLoading ? (
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
