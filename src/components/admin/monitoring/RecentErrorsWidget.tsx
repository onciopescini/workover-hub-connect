import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, CheckCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

interface ErrorMetric {
  id: string;
  created_at: string;
  metadata: {
    job_name?: string;
    error?: string;
    [key: string]: any;
  };
}

export const RecentErrorsWidget = () => {
  const { data: recentErrors, isLoading } = useQuery({
    queryKey: ['recent-errors'],
    queryFn: async () => {
      const timeLimit = new Date();
      timeLimit.setHours(timeLimit.getHours() - 72);

      const { data, error } = await supabase
        .from('performance_metrics')
        .select('*')
        .eq('metric_type', 'cron_error')
        .gte('created_at', timeLimit.toISOString())
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as ErrorMetric[];
    },
    refetchInterval: 60000, // Refresh every minute
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-destructive" />
          Errori Recenti (72h)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Caricamento...</p>
        ) : !recentErrors || recentErrors.length === 0 ? (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <p>Nessun errore nelle ultime 72 ore</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentErrors.map((error) => (
              <Alert key={error.id} variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>
                  {error.metadata.job_name || 'Errore sconosciuto'}
                </AlertTitle>
                <AlertDescription className="text-xs mt-1">
                  <p className="line-clamp-2 mb-1">
                    {error.metadata.error || 'Nessun dettaglio disponibile'}
                  </p>
                  <span className="text-muted-foreground">
                    {formatDistanceToNow(new Date(error.created_at), { 
                      addSuffix: true, 
                      locale: it 
                    })}
                  </span>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
