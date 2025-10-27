import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Clock, FileText, AlertCircle } from 'lucide-react';

interface ComplianceMetrics {
  kyc_pending_count: number;
  kyc_pending_overdue: number;
  dac7_failed_count: number;
  dac7_retry_pending: number;
  csv_exports_24h: number;
  csv_rows_exported_24h: number;
  admin_actions_7d: number;
  active_admins_7d: number;
  last_refresh: string;
}

export function ComplianceMonitoring() {
  const navigate = useNavigate();
  
  const { data: metrics, isLoading, error } = useQuery({
    queryKey: ['compliance-monitoring'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('compliance_monitoring_metrics')
        .select('*')
        .single();

      if (error) throw error;
      return data as ComplianceMetrics;
    },
    refetchInterval: 60000 // Refresh every minute
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monitoring Compliance</CardTitle>
          <CardDescription>Caricamento metriche...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Errore</AlertTitle>
        <AlertDescription>
          Impossibile caricare le metriche di compliance: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  const hasKycIssues = (metrics?.kyc_pending_overdue || 0) > 0;
  const hasDac7Issues = (metrics?.dac7_failed_count || 0) > 0;
  const hasRetryPending = (metrics?.dac7_retry_pending || 0) > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Compliance Monitoring</h2>
          <p className="text-sm text-muted-foreground">
            Ultimo aggiornamento: {metrics ? new Date(metrics.last_refresh).toLocaleTimeString('it-IT') : '-'}
          </p>
        </div>
        {(!hasKycIssues && !hasDac7Issues && !hasRetryPending) && (
          <Badge variant="outline" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Sistema Conforme
          </Badge>
        )}
      </div>

      {/* KYC Alerts */}
      {hasKycIssues && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>KYC in Ritardo</AlertTitle>
          <AlertDescription>
            {metrics?.kyc_pending_overdue} documenti KYC in attesa da oltre 7 giorni. 
            Richiesta revisione urgente per conformità.
          </AlertDescription>
        </Alert>
      )}

      {/* DAC7 Alerts */}
      {hasDac7Issues && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Errori DAC7</AlertTitle>
          <AlertDescription>
            {metrics?.dac7_failed_count} report DAC7 falliti. Verifica i log per dettagli.
          </AlertDescription>
        </Alert>
      )}

      {hasRetryPending && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertTitle>Retry DAC7 Programmati</AlertTitle>
          <AlertDescription>
            {metrics?.dac7_retry_pending} report DAC7 in coda per retry automatico.
          </AlertDescription>
        </Alert>
      )}

      {/* Metrics Grid - Now clickable */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/admin/users?filter=kyc_pending')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">KYC Pendenti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.kyc_pending_count || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              di cui {metrics?.kyc_pending_overdue || 0} in ritardo
            </p>
            <p className="text-xs text-primary mt-2">Clicca per visualizzare →</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/admin/fiscal?tab=failed')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Report DAC7</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{metrics?.dac7_failed_count || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              falliti ({metrics?.dac7_retry_pending || 0} retry)
            </p>
            <p className="text-xs text-primary mt-2">Clicca per visualizzare →</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/admin/logs?filter=csv_export')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Export CSV (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.csv_exports_24h || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {(metrics?.csv_rows_exported_24h || 0).toLocaleString('it-IT')} righe
            </p>
            <p className="text-xs text-primary mt-2">Clicca per log →</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate('/admin/logs')}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Attività Admin (7gg)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.admin_actions_7d || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              da {metrics?.active_admins_7d || 0} admin attivi
            </p>
            <p className="text-xs text-primary mt-2">Clicca per log →</p>
          </CardContent>
        </Card>
      </div>

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Legenda Metriche</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="font-medium">KYC Pendenti</p>
              <p className="text-muted-foreground">Documenti in attesa di verifica. Ritardo: oltre 7 giorni.</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="font-medium">Report DAC7 Falliti</p>
              <p className="text-muted-foreground">Generazione fallita, retry automatico fino a 3 tentativi.</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
            <div>
              <p className="font-medium">Export CSV</p>
              <p className="text-muted-foreground">Tracciamento audit GDPR per tutti gli export admin.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}