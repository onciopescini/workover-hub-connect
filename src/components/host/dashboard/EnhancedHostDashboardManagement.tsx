
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { HostDashboardMetrics } from '@/hooks/queries/useEnhancedHostDashboard';

interface EnhancedHostDashboardManagementProps {
  metrics: HostDashboardMetrics;
}

export const EnhancedHostDashboardManagement: React.FC<EnhancedHostDashboardManagementProps> = ({
  metrics
}) => {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Valore Medio Prenotazione
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            €{metrics.averageBookingValue.toFixed(2)}
          </div>
          <p className="text-xs text-gray-600">
            Per prenotazione confermata
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Tasso di Conferma
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {metrics.totalBookings > 0 
              ? ((metrics.confirmedBookings / metrics.totalBookings) * 100).toFixed(1)
              : 0}%
          </div>
          <p className="text-xs text-gray-600">
            Prenotazioni confermate
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Richieste in Attesa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {metrics.pendingBookings}
          </div>
          <p className="text-xs text-gray-600">
            Richiedono attenzione
          </p>
          {metrics.pendingBookings > 0 && (
            <Button 
              size="sm" 
              className="mt-2 w-full"
              onClick={() => navigate('/bookings')}
            >
              Gestisci Ora
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
