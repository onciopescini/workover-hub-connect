import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PlayCircle, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { it } from 'date-fns/locale';

interface CronJob {
  name: string;
  last_run: string | null;
  next_run: string | null;
  status: 'healthy' | 'warning' | 'critical';
  last_result: string | null;
}

export const CronJobsStatusWidget = () => {
  const { data: cronJobs, refetch, isLoading } = useQuery({
    queryKey: ['cron-jobs-status'],
    queryFn: async () => {
      // Note: get_cron_jobs_status RPC function will be available after migration
      // For now, return mock data
      try {
        const { data, error } = await supabase.rpc('get_cron_jobs_status' as any);
        if (error) throw error;
        return data as CronJob[];
      } catch (error) {
        console.warn('Cron jobs status not available yet:', error);
        return [] as CronJob[];
      }
    },
    refetchInterval: 60000, // Refresh every minute
  });

  const triggerCron = async (jobName: string) => {
    try {
      await supabase.rpc('trigger_cron_manual' as any, { job_name: jobName });
      refetch();
    } catch (error) {
      console.error('Error triggering cron:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-3 w-3" />;
      case 'warning':
        return <Clock className="h-3 w-3" />;
      case 'critical':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'healthy':
        return 'default';
      case 'warning':
        return 'secondary';
      case 'critical':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlayCircle className="h-5 w-5" />
          Stato Cron Jobs
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Caricamento...</p>
        ) : !cronJobs || cronJobs.length === 0 ? (
          <p className="text-muted-foreground">Nessun cron job configurato</p>
        ) : (
          <div className="space-y-4">
            {cronJobs.map((job) => (
              <div key={job.name} className="flex items-center justify-between border-b pb-3 last:border-0">
                <div className="flex-1">
                  <p className="font-medium">{job.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {job.last_run 
                      ? `Ultima esecuzione: ${formatDistanceToNow(new Date(job.last_run), { 
                          addSuffix: true, 
                          locale: it 
                        })}`
                      : 'Mai eseguito'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusVariant(job.status)}>
                    {getStatusIcon(job.status)}
                    <span className="ml-1 capitalize">{job.status}</span>
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => triggerCron(job.name)}
                  >
                    Esegui
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
