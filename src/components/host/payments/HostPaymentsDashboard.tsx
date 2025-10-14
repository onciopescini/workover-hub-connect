import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, FileText, DollarSign, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { useHostPayments, useHostPaymentStats } from '@/hooks/useHostPayments';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export const HostPaymentsDashboard = () => {
  const { data: payments, isLoading } = useHostPayments();
  const stats = useHostPaymentStats(payments);
  const [filter, setFilter] = useState<'all' | 'completed'>('completed');

  const exportToCSV = () => {
    if (!payments || payments.length === 0) return;

    const headers = ['Data', 'Spazio', 'Coworker', 'Importo Lordo', 'Importo Netto', 'Fee Piattaforma', 'Ricevuta'];
    const rows = payments.map(p => [
      format(new Date(p.created_at), 'dd/MM/yyyy', { locale: it }),
      p.booking?.space?.title || 'N/A',
      p.booking?.coworker 
        ? `${p.booking.coworker.first_name} ${p.booking.coworker.last_name}`
        : 'N/A',
      `€${p.amount.toFixed(2)}`,
      `€${(p.host_amount || 0).toFixed(2)}`,
      `€${(p.platform_fee || 0).toFixed(2)}`,
      p.non_fiscal_receipt?.[0]?.receipt_number || 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pagamenti_host_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Clock className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incasso Lordo Totale</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.totalGross.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">{stats.paymentsCount} pagamenti</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Incasso Netto</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">€{stats.totalNet.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Importo che riceverai</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fee Piattaforma</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.platformFees.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalGross > 0 
                ? `${((stats.platformFees / stats.totalGross) * 100).toFixed(1)}% del totale`
                : '0%'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagamenti Completati</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.paymentsCount}</div>
            <p className="text-xs text-muted-foreground">Transazioni completate</p>
          </CardContent>
        </Card>
      </div>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Storico Pagamenti</CardTitle>
              <CardDescription>Lista completa dei pagamenti ricevuti</CardDescription>
            </div>
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Esporta CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Spazio</TableHead>
                <TableHead>Coworker</TableHead>
                <TableHead className="text-right">Importo Lordo</TableHead>
                <TableHead className="text-right">Importo Netto</TableHead>
                <TableHead className="text-right">Fee</TableHead>
                <TableHead>Ricevuta</TableHead>
                <TableHead>Stato</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments && payments.length > 0 ? (
                payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {format(new Date(payment.created_at), 'dd MMM yyyy', { locale: it })}
                    </TableCell>
                    <TableCell>{payment.booking?.space?.title || 'N/A'}</TableCell>
                    <TableCell>
                      {payment.booking?.coworker 
                        ? `${payment.booking.coworker.first_name} ${payment.booking.coworker.last_name}`
                        : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">€{payment.amount.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-semibold text-green-600">
                      €{(payment.host_amount || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      €{(payment.platform_fee || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {payment.non_fiscal_receipt?.[0]?.receipt_number ? (
                        <Button variant="ghost" size="sm" className="h-8">
                          <FileText className="h-4 w-4 mr-1" />
                          {payment.non_fiscal_receipt[0].receipt_number}
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-sm">In elaborazione</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        Completato
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground h-24">
                    Nessun pagamento trovato
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
