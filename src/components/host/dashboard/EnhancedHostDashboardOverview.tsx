
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RecentActivityFeed } from '@/components/dashboard/RecentActivityFeed';
import { HostDashboardMetrics, RecentActivity } from '@/hooks/queries/useEnhancedHostDashboard';

interface EnhancedHostDashboardOverviewProps {
  metrics: HostDashboardMetrics;
  recentActivity: RecentActivity[];
}

export const EnhancedHostDashboardOverview: React.FC<EnhancedHostDashboardOverviewProps> = ({
  metrics,
  recentActivity
}) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Performance Highlights */}
      {metrics.topPerformingSpace && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <TrendingUp className="w-5 h-5 text-yellow-500" />
              Spazio Top Performer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg text-blue-900">
                  {metrics.topPerformingSpace.title}
                </h3>
                <p className="text-blue-700">
                  Ha generato €{metrics.topPerformingSpace.revenue.toFixed(2)} di fatturato
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => navigate(`/spaces/${metrics.topPerformingSpace?.id}`)}
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                Visualizza Spazio
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <QuickActions 
          pendingBookings={metrics.pendingBookings}
          unreadMessages={0}
        />
        <RecentActivityFeed 
          activities={recentActivity}
          onViewAll={() => navigate('/host/activity')}
        />
      </div>
    </div>
  );
};
