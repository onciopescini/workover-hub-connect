import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Clock3, Euro } from "lucide-react";
import { StripeConnectButton } from "@/components/stripe/StripeConnectButton";
import { useAuth } from "@/hooks/auth/useAuth";

const BecomeHost = () => {
  const { authState } = useAuth();

  if (authState.profile?.stripe_onboarding_status === "completed") {
    return <Navigate to="/host/dashboard" replace />;
  }

  return (
    <div className="container mx-auto max-w-5xl px-4 py-10 space-y-8">
      <header className="space-y-3 text-center">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Start earning with your space</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Attiva il tuo profilo Host in pochi minuti con Stripe e inizia a ricevere prenotazioni in sicurezza.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Security
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Pagamenti protetti e verifica identità tramite l&apos;infrastruttura Stripe.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock3 className="h-4 w-4" />
              Flexibility
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Gestisci disponibilità e prenotazioni con il pieno controllo del tuo tempo.
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Euro className="h-4 w-4" />
              Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Monetizza subito i tuoi spazi e ricevi i payout direttamente sul tuo conto.
            </CardDescription>
          </CardContent>
        </Card>
      </section>

      <section className="max-w-xl mx-auto">
        <StripeConnectButton />
      </section>
    </div>
  );
};

export default BecomeHost;
