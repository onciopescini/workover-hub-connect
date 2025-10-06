
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import type { HostDashboardMetrics } from '@/hooks/queries/useEnhancedHostDashboard';

interface HostDashboardManagementProps {
  metrics: HostDashboardMetrics;
}

export const HostDashboardManagement: React.FC<HostDashboardManagementProps> = ({
  metrics
}) => {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Button 
          variant="default" 
          className="h-20"
          onClick={() => navigate('/bookings')}
        >
          <div className="text-center">
            <div className="font-semibold">Gestisci Prenotazioni</div>
            {metrics.pendingBookings > 0 && (
              <div className="text-xs mt-1 opacity-90">{metrics.pendingBookings} in attesa</div>
            )}
          </div>
        </Button>
        
        <Button 
          variant="outline" 
          className="h-20"
          onClick={() => navigate('/host/space/new')}
        >
          <div className="text-center">
            <div className="font-semibold">Aggiungi Spazio</div>
            <div className="text-xs mt-1 opacity-70">Crea nuovo spazio</div>
          </div>
        </Button>

        <Button 
          variant="outline" 
          className="h-20"
          onClick={() => navigate('/host/spaces')}
        >
          <div className="text-center">
            <div className="font-semibold">I Miei Spazi</div>
            <div className="text-xs mt-1 opacity-70">Gestisci tutti gli spazi</div>
          </div>
        </Button>

        <Button 
          variant="outline" 
          className="h-20"
          onClick={() => navigate('/host/dashboard?tab=payments')}
        >
          <div className="text-center">
            <div className="font-semibold">Pagamenti</div>
            <div className="text-xs mt-1 opacity-70">Vedi transazioni</div>
          </div>
        </Button>
      </div>

      {/* Operational Metrics */}
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
                : '0.0'}%
            </div>
            <p className="text-xs text-gray-600">
              {metrics.confirmedBookings} su {metrics.totalBookings} prenotazioni
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
    </div>
  );
};
