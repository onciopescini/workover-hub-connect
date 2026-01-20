import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, DollarSign, TrendingUp } from 'lucide-react';
import LoadingScreen from '@/components/LoadingScreen';

// Interfaces for the SQL Views
interface AdminPlatformRevenue {
  // Assuming a generic structure since schema is implicit
  // If the view returns raw transaction rows, we sum them.
  // If it returns pre-calculated aggregates, we use them.
  // For MVP, we will treat it as an object with potential amount fields
  // or just use 'any' if strict typing is blocked by lack of generation.
  amount?: number;
  total_amount?: number;
  gross_volume?: number;
  [key: string]: any;
}

interface AdminUsersView {
  count?: number;
  // potentially other fields
  [key: string]: any;
}

export const AdminDashboard = () => {
  // Fetch Platform Revenue
  const { data: revenueData, isLoading: isLoadingRevenue } = useQuery({
    queryKey: ['admin_platform_revenue'],
    queryFn: async () => {
      // Query the view directly
      const { data, error } = await supabase
        .from('admin_platform_revenue' as any)
        .select('*');

      if (error) throw error;
      return data as AdminPlatformRevenue[];
    }
  });

  // Fetch Total Users Count
  const { data: usersCount, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['admin_users_count'],
    queryFn: async () => {
      // Use count on the view
      const { count, error } = await supabase
        .from('admin_users_view' as any)
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      return count || 0;
    }
  });

  if (isLoadingRevenue || isLoadingUsers) {
    return <LoadingScreen />;
  }

  // Calculate Metrics
  const calculateGrossVolume = (data: AdminPlatformRevenue[] | null) => {
    if (!data || data.length === 0) return 0;

    // Sum up amount/gross_volume fields found in the data
    return data.reduce((acc, row) => {
      const val = row.gross_volume || row.total_amount || row.amount || 0;
      return acc + Number(val);
    }, 0);
  };

  const grossVolume = calculateGrossVolume(revenueData || null);
  const estimatedRevenue = grossVolume * 0.15; // 15% platform fee

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Admin Control Center</h1>
        <p className="text-gray-500 mt-2">Overview of platform performance.</p>
      </header>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usersCount}</div>
            <p className="text-xs text-gray-500 mt-1">
              Registered across platform
            </p>
          </CardContent>
        </Card>

        {/* Gross Volume */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Gross Volume
            </CardTitle>
            <DollarSign className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(grossVolume)}</div>
            <p className="text-xs text-gray-500 mt-1">
              Total transaction volume
            </p>
          </CardContent>
        </Card>

        {/* Estimated Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-600">
              Estimated Revenue
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(estimatedRevenue)}</div>
            <p className="text-xs text-gray-500 mt-1">
              15% Platform Commission
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
