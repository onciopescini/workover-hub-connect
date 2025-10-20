
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, Clock, CheckCircle, XCircle, Euro } from 'lucide-react';
import { useRoleAccess } from '@/hooks/useRoleAccess';

interface BookingStats {
  total: number;
  pending: number;
  confirmed: number;
  cancelled: number;
  totalRevenue: number;
}

interface BookingsDashboardStatsProps {
  stats: BookingStats;
}

export const BookingsDashboardStats = ({ stats }: BookingsDashboardStatsProps) => {
  const { hasAnyRole } = useRoleAccess();
  const isHost = hasAnyRole(['host', 'admin']);
  
  // Role-specific labels
  const revenueLabel = isHost ? 'Fatturato' : 'Speso';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Totale</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <Calendar className="w-8 h-8 text-blue-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">In Attesa</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Confermate</p>
              <p className="text-2xl font-bold text-green-600">{stats.confirmed}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Cancellate</p>
              <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-500" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{revenueLabel}</p>
              <p className="text-2xl font-bold text-green-600">€{stats.totalRevenue.toFixed(2)}</p>
            </div>
            <Euro className="w-8 h-8 text-green-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
