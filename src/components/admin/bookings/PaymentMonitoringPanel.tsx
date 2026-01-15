import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAdminPayments } from "@/hooks/admin/useAdminPayments";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { AlertCircle, TrendingUp, TrendingDown } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

export function PaymentMonitoringPanel() {
  const { payments, anomalies, isLoading } = useAdminPayments();

  const getPaymentStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      completed: "default",
      failed: "destructive",
      refunded: "default",
      refund_pending: "secondary"
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Anomalies Alert */}
      {anomalies && anomalies.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Anomalie Rilevate</AlertTitle>
          <AlertDescription>
            Trovate {anomalies.length} transazioni con anomalie. Controlla i dettagli sotto.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagamenti In Attesa</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <Skeleton className="h-8 w-16" /> : (payments?.filter(p => p.payment_status === 'pending').length || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Transazioni da processare
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagamenti Falliti</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <Skeleton className="h-8 w-16" /> : (payments?.filter(p => p.payment_status === 'failed').length || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Richiede attenzione
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rimborsi Pending</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? <Skeleton className="h-8 w-16" /> : (payments?.filter(p => p.payment_status === 'refund_pending').length || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Da processare
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transazioni Recenti</CardTitle>
          <CardDescription>Ultimi pagamenti della piattaforma</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Utente</TableHead>
                  <TableHead>Importo</TableHead>
                  <TableHead>Host Amount</TableHead>
                  <TableHead>Platform Fee</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead>Metodo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                    </TableRow>
                  ))
                ) : payments?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nessun pagamento trovato
                    </TableCell>
                  </TableRow>
                ) : (
                  payments?.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {payment.created_at ? format(new Date(payment.created_at), "dd/MM/yy HH:mm", { locale: it }) : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {payment.booking?.coworker?.[0]?.first_name} {payment.booking?.coworker?.[0]?.last_name}
                      </TableCell>
                      <TableCell className="font-medium">
                        €{payment.amount.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {payment.host_amount ? `€${payment.host_amount.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell>
                        {payment.platform_fee ? `€${payment.platform_fee.toFixed(2)}` : '-'}
                      </TableCell>
                      <TableCell>
                        {getPaymentStatusBadge(payment.payment_status)}
                      </TableCell>
                      <TableCell>{payment.method || 'N/A'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Anomalies Table */}
      {anomalies && anomalies.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Anomalie Pagamento</CardTitle>
            <CardDescription>Transazioni con importi o fee incongruenti</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {anomalies.map((anomaly) => (
                <Alert key={anomaly.id} variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Anomalia: {anomaly.reason}</AlertTitle>
                  <AlertDescription>
                    Payment ID: {anomaly.id} - Importo: €{anomaly.amount.toFixed(2)}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
