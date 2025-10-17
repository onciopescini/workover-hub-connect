import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertCircle } from "lucide-react";

interface SupportMetrics {
  total_tickets: number;
  open_tickets: number;
  avg_response_time_hours: number;
  sla_breach_rate: number;
  sla_target_hours: number;
  tickets_by_category: Array<{ category: string; count: number }>;
}

export function SupportAnalytics() {
  const { data: metricsData, isLoading } = useQuery({
    queryKey: ['support-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_support_metrics', {
          days_back: 30
        });
      if (error) throw error;
      return data as unknown as SupportMetrics;
    },
    refetchInterval: 60000 // Refresh every minute
  });

  if (isLoading) {
    return <div className="text-center py-8">Caricamento metriche...</div>;
  }

  const metrics = metricsData;
  const ticketsByCategory = metrics?.tickets_by_category || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Analytics Supporto</h2>
        <p className="text-muted-foreground">Metriche e statistiche degli ultimi 30 giorni</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Totale Ticket
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics?.total_tickets || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Ultimi 30 giorni</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Tempo Medio Risposta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {metrics?.avg_response_time_hours || 0}h
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              SLA target: {metrics?.sla_target_hours || 24}h
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              SLA Breach Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${
              (metrics?.sla_breach_rate || 0) > 10 ? 'text-destructive' : 'text-green-600'
            }`}>
              {metrics?.sla_breach_rate || 0}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Target: &lt;5%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ticket Aperti
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{metrics?.open_tickets || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Da gestire</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart: Tickets per Category */}
      <Card>
        <CardHeader>
          <CardTitle>Ticket per Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          {ticketsByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ticketsByCategory}>
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
              <div className="text-center">
                <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nessun dato disponibile</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
