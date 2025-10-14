import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const InvoiceGuideViewer = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Guida alla Fatturazione
        </CardTitle>
        <CardDescription>
          Informazioni su come gestire le fatture per i tuoi pagamenti
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="w-4 h-4" />
          <AlertDescription>
            Le fatture vengono generate automaticamente per ogni pagamento ricevuto dai coworker.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <div className="border-l-4 border-primary pl-4 py-2">
            <h4 className="font-semibold text-sm mb-1">Fatture Automatiche</h4>
            <p className="text-sm text-muted-foreground">
              Il sistema genera automaticamente le fatture in formato PDF e XML per ogni prenotazione completata.
            </p>
          </div>

          <div className="border-l-4 border-primary pl-4 py-2">
            <h4 className="font-semibold text-sm mb-1">Download e Archiviazione</h4>
            <p className="text-sm text-muted-foreground">
              Puoi scaricare le fatture dalla sezione "Dati Fiscali" del tuo dashboard. 
              Conserva le fatture per almeno 10 anni come richiesto dalla normativa italiana.
            </p>
          </div>

          <div className="border-l-4 border-primary pl-4 py-2">
            <h4 className="font-semibold text-sm mb-1">Formato XML SDI</h4>
            <p className="text-sm text-muted-foreground">
              Le fatture in formato XML sono pronte per l'invio al Sistema di Interscambio (SDI) dell'Agenzia delle Entrate.
            </p>
          </div>

          <div className="border-l-4 border-primary pl-4 py-2">
            <h4 className="font-semibold text-sm mb-1">IVA e Ritenuta d'Acconto</h4>
            <p className="text-sm text-muted-foreground">
              L'IVA viene calcolata automaticamente al 22%. Se applicabile, viene gestita anche la ritenuta d'acconto del 20%.
            </p>
          </div>
        </div>

        <Button variant="outline" className="w-full" disabled>
          <Download className="w-4 h-4 mr-2" />
          Scarica Guida Completa (PDF)
        </Button>
      </CardContent>
    </Card>
  );
};
