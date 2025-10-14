import { KYCUploadForm } from '@/components/kyc/KYCUploadForm';
import { StripeConnectButton } from '@/components/stripe/StripeConnectButton';

const KYCVerificationPage = () => {
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Verifica Identità & Pagamenti</h1>
          <p className="text-muted-foreground mt-2">
            Completa la verifica della tua identità e connetti Stripe per iniziare a ricevere prenotazioni
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <KYCUploadForm />
          <StripeConnectButton />
        </div>

        <div className="bg-muted/50 border border-border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-3">Perché serve la verifica?</h2>
          <div className="space-y-3 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">🔐 Sicurezza</p>
              <p>Proteggiamo la community verificando l'identità di tutti gli host</p>
            </div>
            <div>
              <p className="font-medium text-foreground">📜 Conformità Fiscale</p>
              <p>Rispettiamo le normative DAC7 e fiscali italiane</p>
            </div>
            <div>
              <p className="font-medium text-foreground">💳 Pagamenti Sicuri</p>
              <p>Stripe gestisce i pagamenti in modo sicuro e conforme PSD2</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KYCVerificationPage;
