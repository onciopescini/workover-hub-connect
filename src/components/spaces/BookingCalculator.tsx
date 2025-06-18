
import React, { useMemo, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle, Clock, Euro, Wifi, WifiOff } from 'lucide-react';
import { Space } from '@/types/space';
import { differenceInHours, format } from 'date-fns';
import { checkRealTimeConflicts, validateBookingSlotWithLock } from '@/lib/availability-utils';
import { AvailabilityFeedback } from './AvailabilityFeedback';

interface BookingCalculatorProps {
  space: Space | null;
  selectedDate: Date | undefined;
  selectedStartTime: string;
  selectedEndTime: string;
}

export const BookingCalculator: React.FC<BookingCalculatorProps> = ({
  space,
  selectedDate,
  selectedStartTime,
  selectedEndTime
}) => {
  const [conflictCheck, setConflictCheck] = useState<{
    checking: boolean;
    hasConflict: boolean;
    conflictDetails?: any[];
    validated?: boolean;
  }>({ checking: false, hasConflict: false });

  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Enhanced real-time conflict checking with server-side validation
  useEffect(() => {
    const checkConflicts = async () => {
      if (!space || !selectedDate || !selectedStartTime || !selectedEndTime || !isOnline) {
        setConflictCheck({ checking: false, hasConflict: false });
        return;
      }

      setConflictCheck({ checking: true, hasConflict: false });

      try {
        // Prima verifica con checkRealTimeConflicts
        const { hasConflict, conflictingBookings } = await checkRealTimeConflicts(
          space.id,
          format(selectedDate, 'yyyy-MM-dd'),
          selectedStartTime,
          selectedEndTime
        );

        if (hasConflict) {
          setConflictCheck({
            checking: false,
            hasConflict: true,
            conflictDetails: conflictingBookings
          });
          return;
        }

        // Se non ci sono conflitti, valida con lock server-side
        try {
          const validationResult = await validateBookingSlotWithLock(
            space.id,
            format(selectedDate, 'yyyy-MM-dd'),
            selectedStartTime,
            selectedEndTime,
            'temp-validation' // Validazione temporanea
          );

          setConflictCheck({
            checking: false,
            hasConflict: !validationResult.valid,
            conflictDetails: validationResult.conflicts || [],
            validated: validationResult.valid
          });
        } catch (validationError) {
          console.warn('Server validation failed, using client-side result:', validationError);
          setConflictCheck({
            checking: false,
            hasConflict: false,
            validated: false
          });
        }
      } catch (error) {
        console.error('Error checking conflicts:', error);
        setConflictCheck({ checking: false, hasConflict: false, validated: false });
      }
    };

    // Debounce per evitare troppe chiamate
    const timer = setTimeout(checkConflicts, 300);
    return () => clearTimeout(timer);
  }, [space, selectedDate, selectedStartTime, selectedEndTime, isOnline]);

  // Calculate booking details with enhanced validation
  const bookingDetails = useMemo(() => {
    if (!selectedDate || !selectedStartTime || !selectedEndTime || !space) {
      return null;
    }

    const startDateTime = new Date(`${selectedDate.toISOString().split('T')[0]}T${selectedStartTime}:00`);
    const endDateTime = new Date(`${selectedDate.toISOString().split('T')[0]}T${selectedEndTime}:00`);
    
    const hours = differenceInHours(endDateTime, startDateTime);
    
    // Enhanced price calculation
    let totalCost = 0;
    let priceBreakdown = '';
    
    if (hours >= 8 && space.price_per_day) {
      totalCost = space.price_per_day;
      priceBreakdown = `Giornata intera (${hours}h)`;
    } else {
      totalCost = hours * space.price_per_hour;
      priceBreakdown = `${hours}h × €${space.price_per_hour}`;
    }

    // Validation status
    const isValid = hours > 0 && 
                   !conflictCheck.hasConflict && 
                   isOnline &&
                   (conflictCheck.validated !== false);

    return {
      date: format(selectedDate, 'dd/MM/yyyy'),
      timeRange: `${selectedStartTime} - ${selectedEndTime}`,
      duration: hours,
      priceBreakdown,
      totalCost,
      isValid,
      validationStatus: conflictCheck.validated ? 'server-validated' : 'client-checked'
    };
  }, [selectedDate, selectedStartTime, selectedEndTime, space, conflictCheck, isOnline]);

  if (!selectedDate || !selectedStartTime || !selectedEndTime) {
    return (
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <AvailabilityFeedback
            type="warning"
            message="Seleziona data e orario per vedere il riepilogo"
            details="Completa la selezione per procedere con la prenotazione"
            showIcon={true}
          />
        </CardContent>
      </Card>
    );
  }

  if (!bookingDetails) {
    return null;
  }

  if (!isOnline) {
    return (
      <Card className="border-gray-200 bg-gray-50">
        <CardContent className="p-4">
          <AvailabilityFeedback
            type="offline"
            message="Connessione offline"
            details="Impossibile verificare la disponibilità. Controlla la connessione internet."
            showIcon={true}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "transition-all duration-200",
      conflictCheck.hasConflict ? 'border-red-200 bg-red-50' : 
      bookingDetails.isValid ? 'border-green-200 bg-green-50' : 'border-gray-200'
    )}>
      <CardContent className="p-4 space-y-4">
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
            ) : bookingDetails.isValid ? (
              <Badge variant="secondary" className="bg-green-100 text-green-700">
                <CheckCircle className="h-3 w-3 mr-1" />
                {bookingDetails.validationStatus === 'server-validated' ? 'Verificato' : 'Disponibile'}
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Data:</span>
            <span className="font-medium">{bookingDetails.date}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Orario:</span>
            <span className="font-medium">{bookingDetails.timeRange}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Durata:</span>
            <span className="font-medium">{bookingDetails.duration}h</span>
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">{bookingDetails.priceBreakdown}:</span>
            <span className="font-medium">€{bookingDetails.totalCost}</span>
          </div>
          
          <div className="flex justify-between text-lg font-semibold">
            <span>Totale:</span>
            <div className="flex items-center">
              <Euro className="h-4 w-4 mr-1" />
              <span>€{bookingDetails.totalCost}</span>
            </div>
          </div>
        </div>

        {/* Enhanced conflict warning */}
        {conflictCheck.hasConflict && (
          <AvailabilityFeedback
            type="error"
            message="Orario non disponibile"
            details="Questo slot è stato prenotato da un altro utente. Seleziona un orario diverso."
          />
        )}

        {/* Validation success */}
        {bookingDetails.isValid && !conflictCheck.checking && !conflictCheck.hasConflict && (
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>
              💡 Prezzo finale confermato al checkout
            </span>
            {bookingDetails.validationStatus === 'server-validated' && (
              <Badge variant="outline" className="text-xs h-4 text-green-600 border-green-200">
                Verificato server
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Helper function - move to utilities if needed elsewhere
function cn(...classes: (string | undefined | boolean)[]): string {
  return classes.filter(Boolean).join(' ');
}
