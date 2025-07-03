import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AdminDashboardErrorProps {
  onRefresh: () => void;
}

export function AdminDashboardError({ onRefresh }: AdminDashboardErrorProps) {
  return (
    <div className="text-center py-12">
      <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        Errore nel caricamento della dashboard
      </h3>
      <p className="text-gray-600 mb-6">
        Si è verificato un errore durante il caricamento delle statistiche amministrative.
      </p>
      <Button 
        onClick={onRefresh}
        className="flex items-center gap-2"
      >
        <RefreshCw className="w-4 h-4" />
        Riprova
      </Button>
    </div>
  );
}