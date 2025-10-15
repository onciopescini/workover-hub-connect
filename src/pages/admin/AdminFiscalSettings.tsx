import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useFiscalMode } from '@/contexts/FiscalModeContext';
import { toast } from '@/hooks/use-toast';

const AdminFiscalSettings = () => {
  const { mode, setMode, isMockMode } = useFiscalMode();

  const handleToggle = (checked: boolean) => {
    const newMode = checked ? 'mock' : 'prod';
    setMode(newMode);
    toast({
      title: `Fiscal Mode: ${newMode.toUpperCase()}`,
      description: checked 
        ? '🧪 Mock mode attivata. Tutti i dati fiscali useranno MSW handlers.'
        : '✅ Produzione attivata. Tutti i dati fiscali useranno Supabase reale.',
    });
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          Fiscal Module Settings
          {isMockMode ? (
            <Badge variant="secondary" className="text-base">
              🧪 MOCK MODE
            </Badge>
          ) : (
            <Badge variant="default" className="text-base">
              ✅ PRODUCTION
            </Badge>
          )}
        </h1>
        <p className="text-muted-foreground mt-2">
          Gestisci la modalità operativa del modulo fiscale
        </p>
      </div>

      <Alert variant={isMockMode ? "default" : "destructive"}>
        {isMockMode ? (
          <>
            <Info className="h-4 w-4" />
            <AlertTitle>Mock Mode Attiva</AlertTitle>
            <AlertDescription>
              Tutti gli hooks fiscali stanno usando <strong>dati simulati (MSW handlers)</strong>.
              Nessuna query tocca il database Supabase reale.
            </AlertDescription>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Production Mode Attiva</AlertTitle>
            <AlertDescription>
              Tutti gli hooks fiscali stanno usando <strong>Supabase reale</strong>.
              Le query modificano il database di produzione.
            </AlertDescription>
          </>
        )}
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Toggle Fiscal Mode</CardTitle>
          <CardDescription>
            Attiva/disattiva la modalità mock per testare il modulo fiscale senza toccare dati reali
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <Label htmlFor="fiscal-mode-toggle" className="text-base">
              Mock Mode
            </Label>
            <Switch
              id="fiscal-mode-toggle"
              checked={isMockMode}
              onCheckedChange={handleToggle}
            />
          </div>

          <div className="rounded-lg border p-4 space-y-3">
            <h3 className="font-semibold">Cosa cambia?</h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5">MOCK</Badge>
                <p className="text-muted-foreground">
                  • Usa factory mock data (tests/factories/mockData.ts)<br />
                  • Handlers MSW intercettano tutte le query<br />
                  • Nessuna scrittura su DB reale<br />
                  • Ideale per testing E2E e sviluppo
                </p>
              </div>

              <div className="flex items-start gap-2">
                <Badge variant="outline" className="mt-0.5">PROD</Badge>
                <p className="text-muted-foreground">
                  • Query reali a Supabase<br />
                  • Scritture su DB produzione<br />
                  • Dati persistenti<br />
                  • Usa per ambiente live
                </p>
              </div>
            </div>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Attenzione</AlertTitle>
            <AlertDescription>
              Il cambio di modalità è <strong>immediato</strong> e persiste in localStorage.
              Tutti gli hooks fiscali reagiranno al cambio.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Hooks Affetti</CardTitle>
          <CardDescription>
            Questi hooks rispettano il fiscal mode:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li>✅ <code>useHostPendingInvoices</code></li>
            <li>✅ <code>useHostPendingCreditNotes</code></li>
            <li>✅ <code>useHostInvoiceHistory</code></li>
            <li>✅ <code>useCoworkerReceipts</code></li>
            <li>✅ <code>useCoworkerInvoices</code></li>
            <li>✅ <code>useConfirmInvoiceIssued</code> (mutation)</li>
            <li>✅ <code>useConfirmCreditNoteIssued</code> (mutation)</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminFiscalSettings;
