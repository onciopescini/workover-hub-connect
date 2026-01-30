import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, DollarSign, TrendingUp, Clock, AlertTriangle, XCircle, Wallet } from 'lucide-react';
import LoadingScreen from '@/components/LoadingScreen';
import { formatCurrency } from '@/lib/format';
import { useAdminDashboardStats } from '@/hooks/admin/useAdminDashboardStats';
import { UserGrowthChart } from '@/components/admin/UserGrowthChart';
import { AdminActionCenter } from '@/components/admin/AdminActionCenter';

export const AdminDashboard = () => {
  const { data: stats, isLoading, error } = useAdminDashboardStats();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <div className="p-8 text-center text-destructive bg-destructive/10 rounded-lg">
        <h3 className="text-lg font-bold mb-2">Error Loading Dashboard</h3>
        <p>{String(error)}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold text-foreground">Admin Control Center</h1>
        <p className="text-muted-foreground mt-2">Overview of platform performance.</p>
      </header>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.totalHosts || 0} hosts registered
            </p>
          </CardContent>
        </Card>

        {/* Gross Volume */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gross Volume
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats?.grossVolume || 0)}</div>
            <p className="text-xs text-muted-foreground mt-1">
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
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats?.estimatedRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on platform fees
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPI Grid - Operational Health */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Pending Escrow */}
        <Card className="border-amber-200/50 bg-gradient-to-br from-amber-50/30 to-background">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-700">
              Pending Escrow
            </CardTitle>
            <Wallet className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">
              {formatCurrency(stats?.pendingEscrow || 0, { cents: true })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.pendingEscrowCount || 0} bookings awaiting payout
            </p>
          </CardContent>
        </Card>

        {/* Pending Approval */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Approval
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingApproval || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting host response
            </p>
          </CardContent>
        </Card>

        {/* Disputed */}
        <Card className={stats?.disputed ? 'border-destructive/30' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Disputed
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats?.disputed ? 'text-destructive' : ''}`}>
              {stats?.disputed || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active disputes
            </p>
          </CardContent>
        </Card>

        {/* Cancelled Today */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cancelled Today
            </CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.cancelledToday || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Cancellations in 24h
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Action Center */}
      <AdminActionCenter />

      {/* User Growth Chart */}
      <UserGrowthChart />
    </div>
  );
};

export default AdminDashboard;
