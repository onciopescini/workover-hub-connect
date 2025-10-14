import { useTaxDetails } from '@/hooks/fiscal/useTaxDetails';
import { useDAC7Reports } from '@/hooks/fiscal/useDAC7Reports';
import { useFiscalDashboard } from '@/hooks/fiscal/useFiscalDashboard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TaxDetailsDisplay } from '@/components/fiscal/TaxDetailsDisplay';
import { TaxDetailsForm } from './TaxDetailsForm';
import { DAC7ReportCard } from './DAC7ReportCard';
import { FiscalStatusBadge } from '@/components/fiscal/FiscalStatusBadge';
import { FileText, AlertTriangle, Plus } from 'lucide-react';
import { useState } from 'react';

export const FiscalDashboardContainer = () => {
  const { taxDetails, primaryTaxDetails, isLoading: taxLoading } = useTaxDetails();
  const { reports, isLoading: reportsLoading } = useDAC7Reports();
  const { getThresholdStatus } = useFiscalDashboard();
  const currentYear = new Date().getFullYear();
  const thresholdQuery = getThresholdStatus(undefined, currentYear);

  const [showTaxForm, setShowTaxForm] = useState(false);

  if (taxLoading || reportsLoading || thresholdQuery.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Caricamento dati fiscali...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Area Fiscale</h1>
        <p className="text-muted-foreground mt-2">
          Gestisci i tuoi dati fiscali, report DAC7 e guide fatturazione
        </p>
      </div>

      {thresholdQuery.data && (
        <Card className="border-l-4 border-l-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Stato DAC7 {currentYear}
              </CardTitle>
              <FiscalStatusBadge 
                type="dac7-threshold" 
                status={thresholdQuery.data.threshold_met} 
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Reddito Corrente</p>
                <p className="text-xl font-bold">
                  €{thresholdQuery.data.total_income.toLocaleString('it-IT')}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Transazioni</p>
                <p className="text-xl font-bold">{thresholdQuery.data.total_transactions}</p>
              </div>
            </div>
            
            {thresholdQuery.data.threshold_met && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-md">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-destructive">
                    Soglia DAC7 superata
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Il tuo reddito ha superato i €2.000 con almeno 25 transazioni. 
                    Sarà necessario generare un report DAC7.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="tax-details" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tax-details">Dati Fiscali</TabsTrigger>
          <TabsTrigger value="dac7-reports">Report DAC7</TabsTrigger>
        </TabsList>

        <TabsContent value="tax-details" className="space-y-4">
          {!primaryTaxDetails && !showTaxForm && (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle>Nessun dato fiscale configurato</CardTitle>
                <CardDescription>
                  Inserisci i tuoi dati fiscali per ricevere fatture e gestire i report DAC7
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setShowTaxForm(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Aggiungi Dati Fiscali
                </Button>
              </CardContent>
            </Card>
          )}

          {showTaxForm && <TaxDetailsForm />}

          {primaryTaxDetails && !showTaxForm && (
            <div className="space-y-4">
              <TaxDetailsDisplay taxDetails={primaryTaxDetails} />
              
              {taxDetails && taxDetails.length > 1 && (
                <div>
                  <h3 className="font-medium mb-3">Storico Dati Fiscali</h3>
                  <div className="space-y-3">
                    {taxDetails
                      .filter(td => !td.is_primary)
                      .map(td => (
                        <TaxDetailsDisplay key={td.id} taxDetails={td} />
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="dac7-reports" className="space-y-4">
          {!reports || reports.length === 0 ? (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle>Nessun report DAC7</CardTitle>
                <CardDescription>
                  I report DAC7 vengono generati automaticamente quando si superano le soglie fiscali
                </CardDescription>
              </CardHeader>
            </Card>
          ) : (
            <div className="grid gap-4">
              {reports.map(report => (
                <DAC7ReportCard key={report.id} report={report} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
