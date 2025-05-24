
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CreditCard, AlertTriangle, CheckCircle, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function StripeSetup() {
  const { authState } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(
    authState.profile?.stripe_connected || false
  );

  const handleStripeConnect = async () => {
    setIsLoading(true);
    try {
      // Qui andrà l'integrazione con Stripe Connect
      // Per ora simuliamo il processo
      toast.success("Reindirizzamento a Stripe...");
      
      // Simulazione dell'aggiornamento dello stato
      setTimeout(() => {
        setStripeConnected(true);
        toast.success("Account Stripe collegato con successo!");
      }, 2000);
      
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
              <ul className="text-sm text-gray-600 space-y-1 ml-4">
                <li>• Verifica della tua identità</li>
                <li>• Configurazione dei metodi di pagamento</li>
                <li>• Setup dei conti bancari per i pagamenti</li>
                <li>• Configurazione delle commissioni</li>
              </ul>
            </div>

            <Button 
              onClick={handleStripeConnect}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? "Caricamento..." : "Configura Account Stripe"}
            </Button>
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

            <Button 
              variant="outline" 
              onClick={handleStripeManage}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              Gestisci Account Stripe
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
