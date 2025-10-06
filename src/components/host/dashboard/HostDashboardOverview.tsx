
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RecentActivityFeed } from '@/components/dashboard/RecentActivityFeed';
import type { HostDashboardMetrics, RecentActivity } from '@/hooks/queries/useEnhancedHostDashboard';

interface HostDashboardOverviewProps {
  metrics: HostDashboardMetrics;
  recentActivity: RecentActivity[];
}

export const HostDashboardOverview: React.FC<HostDashboardOverviewProps> = ({
  metrics,
  recentActivity
}) => {
  const navigate = useNavigate();

  // Check for bookings without payment (data integrity issue)
  const unpaidConfirmedBookings = metrics.confirmedBookings - metrics.totalBookings;
  const hasUnpaidBookings = unpaidConfirmedBookings > 0;

  return (
    <div className="space-y-6">
      {/* Alert for unpaid confirmed bookings */}
      {hasUnpaidBookings && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Attenzione:</strong> {unpaidConfirmedBookings} prenotazione{unpaidConfirmedBookings > 1 ? 'i' : ''} confermat{unpaidConfirmedBookings > 1 ? 'e' : 'a'} richied{unpaidConfirmedBookings > 1 ? 'ono' : 'e'} verifica - manca il pagamento associato.{' '}
            <Button 
              variant="link" 
              size="sm" 
              className="p-0 h-auto text-destructive underline"
              onClick={() => navigate('/host/dashboard?tab=payments')}
            >
              Vai ai Pagamenti
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Performance Highlights */}
      {metrics.topPerformingSpace && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 min-h-[120px]">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="flex items-center gap-2 text-blue-900 text-base">
              <TrendingUp className="w-4 h-4 text-yellow-500" />
              Spazio Top Performer
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-base text-blue-900">
                  {metrics.topPerformingSpace.title}
                </h3>
                <p className="text-sm text-blue-700">
                  Ha generato €{metrics.topPerformingSpace.revenue.toFixed(2)} di fatturato
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate(`/spaces/${metrics.topPerformingSpace?.id}`)}
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                Visualizza
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <QuickActions 
          pendingBookings={metrics.pendingBookings}
          unreadMessages={0}
        />
        <RecentActivityFeed 
          activities={recentActivity}
        />
      </div>
    </div>
  );
};
