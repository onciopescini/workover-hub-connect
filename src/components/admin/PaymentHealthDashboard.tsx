import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PaymentAnomaly {
  payment_id: string;
  anomaly_type: string;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  detected_at: string;
}

export const PaymentHealthDashboard = () => {
  const { data: anomalies, isLoading, refetch } = useQuery<PaymentAnomaly[]>({
    queryKey: ['payment-anomalies'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('detect_payment_anomalies' as any);
      if (error) throw error;
      return (data || []) as PaymentAnomaly[];
    },
    refetchInterval: 30000
  });
  
  const criticalCount = anomalies?.filter(a => a.severity === 'critical').length || 0;
  const warningCount = anomalies?.filter(a => a.severity === 'warning').length || 0;
  const healthyCount = anomalies ? Math.max(0, 100 - anomalies.length) : 0;
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Payment Health Monitor</h2>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Aggiorna
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Healthy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{healthyCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Pagamenti senza problemi</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Warnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{warningCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Richiede attenzione</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Critical
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{criticalCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Azione immediata richiesta</p>
          </CardContent>
        </Card>
      </div>
      
      {anomalies && anomalies.length > 0 ? (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Anomalie Rilevate</h3>
          {anomalies.map((anomaly, index) => (
            <Alert 
              key={index} 
              variant={anomaly.severity === 'critical' ? 'destructive' : 'default'}
              className={anomaly.severity === 'warning' ? 'border-yellow-500' : ''}
            >
              <AlertTitle className="flex items-center gap-2">
                {anomaly.severity === 'critical' && <XCircle className="h-4 w-4" />}
                {anomaly.severity === 'warning' && <AlertTriangle className="h-4 w-4" />}
                {anomaly.anomaly_type.replace(/_/g, ' ').toUpperCase()}
              </AlertTitle>
              <AlertDescription>
                <div className="mt-2">
                  <p>{anomaly.description}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Payment ID: {anomaly.payment_id}
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Sistema Operativo</h3>
              <p className="text-muted-foreground">
                Nessuna anomalia rilevata nel sistema pagamenti
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
