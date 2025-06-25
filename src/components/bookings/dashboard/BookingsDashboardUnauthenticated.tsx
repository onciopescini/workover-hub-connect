
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

export const BookingsDashboardUnauthenticated = () => {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardContent className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-4">Accesso Richiesto</h2>
          <p className="text-gray-600 mb-4">Devi effettuare l'accesso per vedere le tue prenotazioni.</p>
        </CardContent>
      </Card>
    </div>
  );
};
