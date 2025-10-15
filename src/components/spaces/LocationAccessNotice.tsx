import React from 'react';
import { MapPin, Lock, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface LocationAccessNoticeProps {
  hasAccess: boolean;
  hasConfirmedBooking?: boolean;
}

/**
 * Notice shown to users about location privacy
 * - Before booking: Shows only city-level location
 * - After confirmed booking: Shows precise GPS coordinates and full address
 */
export const LocationAccessNotice: React.FC<LocationAccessNoticeProps> = ({ 
  hasAccess, 
  hasConfirmedBooking 
}) => {
  if (hasAccess) {
    return (
      <Alert className="bg-green-50 border-green-200">
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertDescription className="text-green-800">
          <strong>Indirizzo completo visibile:</strong> Hai accesso all'indirizzo preciso e alle coordinate GPS perché {hasConfirmedBooking ? 'hai una prenotazione confermata' : 'sei il proprietario dello spazio'}.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="bg-blue-50 border-blue-200">
      <Lock className="h-4 w-4 text-blue-600" />
      <AlertDescription className="text-blue-800">
        <strong>Privacy dell'host protetta:</strong> Per motivi di sicurezza, l'indirizzo preciso e le coordinate GPS vengono mostrate solo dopo la conferma della prenotazione. Al momento vedi solo la città.
      </AlertDescription>
    </Alert>
  );
};
