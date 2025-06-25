
import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download } from 'lucide-react';

interface BookingsDashboardHeaderProps {
  onRefresh: () => void;
  isLoading: boolean;
}

export const BookingsDashboardHeader = ({ onRefresh, isLoading }: BookingsDashboardHeaderProps) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Gestione Prenotazioni</h1>
        <p className="text-gray-600">Monitora e gestisci tutte le tue prenotazioni</p>
      </div>
      
      <div className="flex gap-2">
        <Button variant="outline" onClick={onRefresh} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Aggiorna
        </Button>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Esporta
        </Button>
      </div>
    </div>
  );
};
