
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface BookingsDashboardErrorProps {
  onRefresh: () => void;
}

export const BookingsDashboardError = ({ onRefresh }: BookingsDashboardErrorProps) => {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardContent className="p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-4">Errore nel Caricamento</h2>
          <p className="text-gray-600 mb-4">
            Si è verificato un errore nel caricamento delle prenotazioni.
          </p>
          <Button onClick={onRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Riprova
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
