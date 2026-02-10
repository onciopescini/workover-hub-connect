import { AlertTriangle, ReceiptText, ShieldX, Ticket, Wallet } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingScreen from '@/components/LoadingScreen';
import { formatCurrency } from '@/lib/format';
import {
  ADMIN_KYC_FAILED_STATUS,
  ADMIN_REFUND_REQUESTED_STATUS,
  ADMIN_TICKET_OPEN_STATUSES,
} from '@/constants/admin';

interface AdminStatsRpcRow {
  gmv_month: number;
  net_revenue: number;
  pending_payouts: number;
}

interface AdminActionItem {
  id: string;
  type: 'ticket' | 'kyc' | 'refund';
  title: string;
  createdAt: string;
}

interface AdminAuditLogItem {
  id: string;
  eventType: string;
  eventMessage: string;
  createdAt: string;
}

const AdminMissionControlDashboard = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'mission-control'],
    queryFn: async () => {
      const [statsResult, ticketsResult, kycResult, refundsResult, logsResult] = await Promise.all([
        supabase.rpc('get_admin_stats'),
        supabase
          .from('support_tickets')
          .select('id, subject, created_at')
          .in('status', [...ADMIN_TICKET_OPEN_STATUSES])
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('kyc_documents')
          .select('id, document_type, created_at')
          .eq('verification_status', ADMIN_KYC_FAILED_STATUS)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('payments')
          .select('id, booking_id, created_at')
          .or(`status.eq.${ADMIN_REFUND_REQUESTED_STATUS},payment_status.eq.${ADMIN_REFUND_REQUESTED_STATUS}`)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase.rpc('get_recent_admin_audit_logs', { p_limit: 5 }),
      ]);

      if (statsResult.error) throw statsResult.error;
      if (ticketsResult.error) throw ticketsResult.error;
      if (kycResult.error) throw kycResult.error;
      if (refundsResult.error) throw refundsResult.error;
      if (logsResult.error) throw logsResult.error;

      const statsRow = (statsResult.data?.[0] ?? {
        gmv_month: 0,
        net_revenue: 0,
        pending_payouts: 0,
      }) as AdminStatsRpcRow;

      const actionRequired: AdminActionItem[] = [
        ...(ticketsResult.data ?? []).map((ticket) => ({
          id: ticket.id,
          type: 'ticket' as const,
          title: `Ticket aperto: ${ticket.subject}`,
          createdAt: ticket.created_at ?? new Date(0).toISOString(),
        })),
        ...(kycResult.data ?? []).map((doc) => ({
          id: doc.id,
          type: 'kyc' as const,
          title: `KYC fallito: ${doc.document_type}`,
          createdAt: doc.created_at,
        })),
        ...(refundsResult.data ?? []).map((payment) => ({
          id: payment.id,
          type: 'refund' as const,
          title: `Refund richiesto: booking ${payment.booking_id}`,
          createdAt: payment.created_at ?? new Date(0).toISOString(),
        })),
      ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      const recentLogs: AdminAuditLogItem[] = (logsResult.data ?? []).map((log) => ({
        id: log.id,
        eventType: log.event_type,
        eventMessage: log.event_message,
        createdAt: log.created_at,
      }));

      return {
        stats: statsRow,
        actionRequired,
        recentLogs,
      };
    },
  });

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <div className="p-8 text-center text-destructive bg-destructive/10 rounded-lg">
        <h3 className="text-lg font-bold mb-2">Errore caricamento Mission Control</h3>
        <p>{String(error)}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-foreground">Mission Control</h1>
        <p className="text-muted-foreground mt-2">Vista operativa per Solopreneur.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">GMV Mese</CardTitle>
            <ReceiptText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data?.stats.gmv_month ?? 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Revenue</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data?.stats.net_revenue ?? 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Payouts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(data?.stats.pending_payouts ?? 0)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Action Required</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.actionRequired.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Nessuna azione urgente.</p>
            ) : (
              data?.actionRequired.slice(0, 10).map((item) => (
                <div key={`${item.type}-${item.id}`} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center gap-2 font-medium">
                    {item.type === 'ticket' && <Ticket className="h-4 w-4" />}
                    {item.type === 'kyc' && <ShieldX className="h-4 w-4" />}
                    {item.type === 'refund' && <ReceiptText className="h-4 w-4" />}
                    <span>{item.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(item.createdAt).toLocaleString('it-IT')}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Logs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(data?.recentLogs.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">Nessun log critico disponibile.</p>
            ) : (
              data?.recentLogs.map((log) => (
                <div key={log.id} className="rounded-md border p-3 text-sm">
                  <p className="font-medium">{log.eventType}</p>
                  <p className="text-muted-foreground">{log.eventMessage}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(log.createdAt).toLocaleString('it-IT')}
                  </p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminMissionControlDashboard;
