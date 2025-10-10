import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TrendingUp, DollarSign, CreditCard, Users } from "lucide-react";

export function FinancialReportsWidget() {
  const { data: stats } = useQuery({
    queryKey: ['admin-financial-stats'],
    queryFn: async () => {
      const { data: payments, error } = await supabase
        .from('payments')
        .select('amount, payment_status, platform_fee, host_amount, created_at')
        .eq('payment_status', 'completed');

      if (error) throw error;

      const totalRevenue = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
      const platformFees = payments?.reduce((sum, p) => sum + Number(p.platform_fee || 0), 0) || 0;
      const hostPayouts = payments?.reduce((sum, p) => sum + Number(p.host_amount || 0), 0) || 0;
      
      // Get current month data
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyPayments = payments?.filter(p => {
        if (!p.created_at) return false;
        const date = new Date(p.created_at);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      }) || [];
      
      const monthlyRevenue = monthlyPayments.reduce((sum, p) => sum + Number(p.amount), 0);

      return {
        totalRevenue,
        platformFees,
        hostPayouts,
        monthlyRevenue,
        totalTransactions: payments?.length || 0
      };
    }
  });

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Revenue Totale</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">€{stats?.totalRevenue.toFixed(2) || '0.00'}</div>
          <p className="text-xs text-muted-foreground">
            {stats?.totalTransactions || 0} transazioni
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Platform Fees</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">€{stats?.platformFees.toFixed(2) || '0.00'}</div>
          <p className="text-xs text-muted-foreground">
            Fee raccolte
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Host Payouts</CardTitle>
          <CreditCard className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">€{stats?.hostPayouts.toFixed(2) || '0.00'}</div>
          <p className="text-xs text-muted-foreground">
            Pagamenti host
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Mese Corrente</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">€{stats?.monthlyRevenue.toFixed(2) || '0.00'}</div>
          <p className="text-xs text-muted-foreground">
            Revenue mensile
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
