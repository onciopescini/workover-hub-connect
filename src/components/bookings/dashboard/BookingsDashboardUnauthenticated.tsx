
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const BookingsDashboardUnauthenticated = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardContent className="p-12 text-center">
          <Lock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Accesso Richiesto
          </h3>
          <p className="text-gray-600 mb-6">
            Effettua il login per visualizzare e gestire le tue prenotazioni.
          </p>
          <div className="flex justify-center space-x-4">
            <Button onClick={() => navigate('/login')}>
              Accedi
            </Button>
            <Button variant="outline" onClick={() => navigate('/register')}>
              Registrati
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
