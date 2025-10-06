
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp } from 'lucide-react';
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

  return (
    <div className="space-y-6">
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
