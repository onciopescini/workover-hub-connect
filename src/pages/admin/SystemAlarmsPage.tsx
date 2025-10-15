// ONDATA 2: FIX 2.6 - System Alarms Dashboard
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle } from 'lucide-react';

export default function SystemAlarmsPage() {
  const { data: alarms = [], isLoading } = useQuery({
    queryKey: ['system-alarms'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_alarms')
        .select('*')
        .eq('resolved', false)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 30000, // Refresh every 30s
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      default: return 'secondary';
    }
  };

  if (isLoading) return <div>Caricamento allarmi...</div>;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Alarms</h1>
          <p className="text-muted-foreground">Monitoraggio allarmi di sistema</p>
        </div>
        {alarms.length === 0 && (
          <Badge variant="outline" className="text-green-600">
            <CheckCircle className="mr-1 h-4 w-4" />
            Nessun allarme attivo
          </Badge>
        )}
      </div>

      <div className="grid gap-4">
        {alarms.map((alarm) => (
          <Card key={alarm.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                  <div>
                    <CardTitle className="text-lg">{alarm.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {alarm.created_at ? new Date(alarm.created_at).toLocaleString('it-IT') : 'N/A'}
                    </p>
                  </div>
                </div>
                <Badge variant={getSeverityColor(alarm.severity)}>
                  {alarm.severity}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm mb-2">{alarm.message}</p>
              {alarm.source && (
                <p className="text-xs text-muted-foreground">Origine: {alarm.source}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
