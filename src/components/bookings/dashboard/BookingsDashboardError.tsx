
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface BookingsDashboardErrorProps {
  onRefresh: () => void;
}

export const BookingsDashboardError = ({ onRefresh }: BookingsDashboardErrorProps) => {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="p-12 text-center">
        <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-900 mb-2">
          Errore nel caricamento
        </h3>
        <p className="text-red-600 mb-6">
          Si è verificato un errore durante il caricamento delle prenotazioni. 
          Riprova o contatta il supporto se il problema persiste.
        </p>
        <Button onClick={onRefresh} className="bg-red-600 hover:bg-red-700">
          <RefreshCw className="w-4 h-4 mr-2" />
          Riprova
        </Button>
      </CardContent>
    </Card>
  );
};
