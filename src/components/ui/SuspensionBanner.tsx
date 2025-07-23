import React from 'react';
import { AlertCircle, Mail } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface SuspensionBannerProps {
  suspendedAt: string;
  reason?: string;
  className?: string;
}

export const SuspensionBanner: React.FC<SuspensionBannerProps> = ({
  suspendedAt,
  reason,
  className = ""
}) => {
  const handleContactSupport = () => {
    window.location.href = 'mailto:support@workover.it?subject=Account sospeso - Richiesta di revisione';
  };

  const suspensionDate = new Date(suspendedAt).toLocaleDateString('it-IT', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <Alert className={`border-red-500 bg-red-50 ${className}`}>
      <AlertCircle className="h-4 w-4 text-red-600" />
      <AlertDescription className="text-red-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1">
            <p className="font-semibold">Account sospeso dal {suspensionDate}</p>
            {reason && (
              <p className="text-sm mt-1">Motivo: {reason}</p>
            )}
            <p className="text-sm mt-2">
              Non puoi creare nuovi spazi o modificare quelli esistenti durante la sospensione.
              Le prenotazioni attive continueranno normalmente.
            </p>
          </div>
          <div className="flex-shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={handleContactSupport}
              className="border-red-600 text-red-700 hover:bg-red-100"
            >
              <Mail className="w-4 h-4 mr-2" />
              Contatta Support
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
};