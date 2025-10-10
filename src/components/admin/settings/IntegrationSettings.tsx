import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle } from "lucide-react";

const IntegrationSettings = () => {
  const integrations = [
    {
      name: "Stripe",
      status: "connected",
      description: "Pagamenti e gestione transazioni",
    },
    {
      name: "Supabase",
      status: "connected",
      description: "Database e autenticazione",
    },
    {
      name: "Resend",
      status: "not_configured",
      description: "Servizio email transazionali",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Servizi Esterni</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Stato connessioni con servizi di terze parti
        </p>
      </div>

      <div className="space-y-3">
        {integrations.map((integration) => (
          <Card key={integration.name} className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{integration.name}</h4>
                  {integration.status === "connected" ? (
                    <Badge variant="default" className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Connesso
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <XCircle className="h-3 w-3" />
                      Non Configurato
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {integration.description}
                </p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default IntegrationSettings;
