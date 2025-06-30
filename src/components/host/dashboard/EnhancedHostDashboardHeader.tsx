
import React from 'react';
import { Button } from '@/components/ui/button';
import { BarChart3, Building } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface EnhancedHostDashboardHeaderProps {
  firstName?: string;
}

export const EnhancedHostDashboardHeader: React.FC<EnhancedHostDashboardHeaderProps> = ({
  firstName
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Dashboard Host
        </h1>
        <p className="text-gray-600">
          Benvenuto, {firstName}! Gestisci i tuoi spazi e monitora le prenotazioni.
        </p>
      </div>
      
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => navigate('/bookings')}>
          <BarChart3 className="w-4 h-4 mr-2" />
          Prenotazioni
        </Button>
        <Button onClick={() => navigate('/space/new')}>
          <Building className="w-4 h-4 mr-2" />
          Nuovo Spazio
        </Button>
      </div>
    </div>
  );
};
