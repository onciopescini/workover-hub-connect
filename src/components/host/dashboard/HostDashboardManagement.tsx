
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { HostDashboardMetrics } from '@/hooks/queries/useEnhancedHostDashboard';

interface HostDashboardManagementProps {
  metrics: HostDashboardMetrics;
}

export const HostDashboardManagement: React.FC<HostDashboardManagementProps> = ({
  metrics
}) => {
  const navigate = useNavigate();
  
  // Check for unpaid confirmed bookings
  const unpaidConfirmedBookings = metrics.confirmedBookings - metrics.totalBookings;
  const hasUnpaidBookings = unpaidConfirmedBookings > 0;

  return (
    <div className="space-y-6">
      {/* Alert for data integrity issues */}
      {hasUnpaidBookings && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <span>
                <strong>Problema Integrità Dati:</strong> {unpaidConfirmedBookings} prenotazion{unpaidConfirmedBookings > 1 ? 'i' : 'e'} confermat{unpaidConfirmedBookings > 1 ? 'e' : 'a'} senza pagamento associato
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/host/dashboard?tab=payments')}
                className="ml-4"
              >
                Risolvi Ora
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}
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
              Per prenotazione pagata
            </p>
          </CardContent>
        </Card>

        <Card className={hasUnpaidBookings ? "border-yellow-500" : ""}>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Prenotazioni Pagate
              {hasUnpaidBookings && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.totalBookings}
            </div>
            <p className="text-xs text-gray-600">
              {hasUnpaidBookings ? (
                <span className="text-yellow-600 font-medium">
                  {unpaidConfirmedBookings} prenotazion{unpaidConfirmedBookings > 1 ? 'i' : 'e'} da verificare
                </span>
              ) : (
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Tutte pagate
                </span>
              )}
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
