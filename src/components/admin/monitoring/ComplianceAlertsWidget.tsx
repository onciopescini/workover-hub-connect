import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ComplianceIssue {
  id: string;
  first_name: string;
  last_name: string;
  bookings?: {
    id: string;
    payments?: {
      host_amount: number;
    }[];
  }[];
}

export const ComplianceAlertsWidget = () => {
  const navigate = useNavigate();
  
  const { data: complianceIssues, isLoading } = useQuery({
    queryKey: ['compliance-alerts'],
    queryFn: async () => {
      // Note: compliance_alert and invoice fields will be added in future migration
      // For now, return empty array as placeholder
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          first_name,
          last_name
        `)
        .eq('role', 'host')
        .limit(0); // Return empty for now

      if (error) throw error;
      return [] as ComplianceIssue[];
    },
    refetchInterval: 300000, // Refresh every 5 minutes
  });

  const totalIssues = complianceIssues?.reduce((sum, host) => {
    return sum + (host.bookings?.length || 0);
  }, 0) || 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Alert Compliance Fatture
          </span>
          {totalIssues > 0 && (
            <span className="text-sm font-normal text-muted-foreground">
              {totalIssues} fattura{totalIssues !== 1 ? 'e' : ''} mancante{totalIssues !== 1 ? 'i' : ''}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Caricamento...</p>
        ) : !complianceIssues || complianceIssues.length === 0 ? (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-5 w-5" />
            <p>Tutti gli host sono in regola</p>
          </div>
        ) : (
          <div className="space-y-3">
            {complianceIssues.map((host) => {
              const missingInvoices = host.bookings?.length || 0;

              return (
                <Alert key={host.id} variant="default" className="border-orange-500/50">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>
                    {host.first_name} {host.last_name}
                  </AlertTitle>
                  <AlertDescription className="text-xs mt-1">
                    <p className="mb-2">
                      {missingInvoices} fattura{missingInvoices !== 1 ? 'e' : ''} da emettere
                    </p>
                    <Button 
                      size="sm" 
                      variant="link" 
                      className="p-0 h-auto text-xs"
                      onClick={() => navigate(`/admin/users/${host.id}`)}
                    >
                      Vedi dettagli →
                    </Button>
                  </AlertDescription>
                </Alert>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
