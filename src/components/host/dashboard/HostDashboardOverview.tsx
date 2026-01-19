
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TrendingUp, AlertCircle, Euro, CalendarClock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { RecentActivityFeed } from '@/components/dashboard/RecentActivityFeed';
import { TodayCheckinsCard } from '@/components/host/dashboard/TodayCheckinsCard';
import type { HostDashboardMetrics, RecentActivity } from '@/hooks/queries/useEnhancedHostDashboard';
import { useStripePayouts } from '@/hooks/useStripePayouts';
import { useAuth } from '@/hooks/auth/useAuth';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface HostDashboardOverviewProps {
  metrics: HostDashboardMetrics;
  recentActivity: RecentActivity[];
}

export const HostDashboardOverview: React.FC<HostDashboardOverviewProps> = ({
  metrics,
  recentActivity
}) => {
  const navigate = useNavigate();
  const { authState } = useAuth();
  const { data: payoutData } = useStripePayouts(authState.user?.id || '');

  // Check for bookings without payment (data integrity issue)
  const unpaidConfirmedBookings = metrics.confirmedBookings - metrics.totalBookings;
  const hasUnpaidBookings = unpaidConfirmedBookings > 0;

  return (
    <div className="space-y-6">
      {/* Today's Check-ins */}
      <TodayCheckinsCard />

      {/* Payout Visibility */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Euro className="w-5 h-5 text-primary" />
            Payout
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <p className="text-sm text-gray-500">Prossimo Payout</p>
              {payoutData?.next_payout?.date ? (
                <div>
                  <div className="text-2xl font-bold">
                    €{payoutData.next_payout.amount.toFixed(2)}
                  </div>
                  <div className="text-sm text-green-600 flex items-center gap-1">
                    <CalendarClock className="w-3 h-3" />
                    In arrivo il {format(new Date(payoutData.next_payout.date), 'dd MMMM yyyy', { locale: it })}
                  </div>
                </div>
              ) : (
                <p className="text-lg font-medium text-gray-700">Nessun payout programmato</p>
              )}
            </div>
            {payoutData?.pending_balance !== undefined && payoutData.pending_balance > 0 && (
               <div className="text-right">
                  <p className="text-xs text-gray-500">Saldo in sospeso</p>
                  <p className="font-semibold text-gray-700">€{payoutData.pending_balance.toFixed(2)}</p>
               </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/host/dashboard?tab=payments')}
            >
              Dettagli Pagamenti
            </Button>
          </div>
        </CardContent>
      </Card>

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

      {/* Recent Activity */}
      <RecentActivityFeed
        activities={recentActivity}
      />
    </div>
  );
};
