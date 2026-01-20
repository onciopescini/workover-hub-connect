import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminPlatformRevenue } from '@/types/admin';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingScreen from '@/components/LoadingScreen';
import { format } from 'date-fns';

const AdminRevenue = () => {
  const { data: revenueData, isLoading, error } = useQuery({
    queryKey: ['admin_platform_revenue'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_platform_revenue' as any)
        .select('*')
        .order('month', { ascending: false }); // Most recent first

      if (error) throw error;
      return data as AdminPlatformRevenue[];
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    // Handling date string to avoid timezone issues when just displaying Month/Year
    // 'month' comes as YYYY-MM-DD timestamp (start of month usually)
    try {
      return format(new Date(dateString), 'MMMM yyyy');
    } catch (e) {
      return dateString;
    }
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <div className="p-4 text-red-500">
        Error loading revenue data: {(error as Error).message}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Revenue History</h1>
        <p className="text-gray-500 mt-2">Monthly breakdown of platform performance.</p>
      </header>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Monthly Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Total Payments</TableHead>
                  <TableHead className="text-right">Gross Volume</TableHead>
                  <TableHead className="text-right text-green-600">Estimated Revenue (15%)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {revenueData && revenueData.length > 0 ? (
                  revenueData.map((row) => (
                    <TableRow key={row.month}>
                      <TableCell className="font-medium">
                        {formatDate(row.month)}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.total_payments}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(row.gross_volume)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-green-600">
                        {formatCurrency(row.estimated_revenue)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center">
                      No revenue data available.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminRevenue;
