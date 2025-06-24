
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock, Wifi, WifiOff } from 'lucide-react';

interface BookingCalculatorHeaderProps {
  isOnline: boolean;
  conflictCheck: {
    checking: boolean;
    hasConflict: boolean;
    validated?: boolean;
  };
  isValid: boolean;
  validationStatus: 'server-validated' | 'client-checked';
}

export const BookingCalculatorHeader: React.FC<BookingCalculatorHeaderProps> = ({
  isOnline,
  conflictCheck,
  isValid,
  validationStatus
}) => {
  return (
    <div className="flex items-center justify-between">
      <h3 className="font-medium text-gray-900">Riepilogo Prenotazione</h3>
      <div className="flex items-center gap-2">
        {/* Connection status */}
        {isOnline ? (
          <Wifi className="h-3 w-3 text-green-600" />
        ) : (
          <WifiOff className="h-3 w-3 text-gray-600" />
        )}
        
        {/* Validation status */}
        {conflictCheck.checking ? (
          <Badge variant="secondary" className="animate-pulse">
            <Clock className="h-3 w-3 mr-1" />
            Verifica...
          </Badge>
        ) : conflictCheck.hasConflict ? (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Conflitto
          </Badge>
        ) : isValid ? (
          <Badge variant="secondary" className="bg-green-100 text-green-700">
            <CheckCircle className="h-3 w-3 mr-1" />
            {validationStatus === 'server-validated' ? 'Verificato' : 'Disponibile'}
          </Badge>
        ) : null}
      </div>
    </div>
  );
};
