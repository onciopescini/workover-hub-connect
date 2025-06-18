
import React, { useMemo, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CheckCircle, Clock, Euro } from 'lucide-react';
import { Space } from '@/types/space';
import { differenceInHours, format } from 'date-fns';
import { checkRealTimeConflicts } from '@/lib/availability-utils';

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
  }>({ checking: false, hasConflict: false });

  // Real-time conflict checking
  useEffect(() => {
    const checkConflicts = async () => {
      if (!space || !selectedDate || !selectedStartTime || !selectedEndTime) {
        setConflictCheck({ checking: false, hasConflict: false });
        return;
      }

      setConflictCheck({ checking: true, hasConflict: false });

      try {
        const { hasConflict, conflictingBookings } = await checkRealTimeConflicts(
          space.id,
          format(selectedDate, 'yyyy-MM-dd'),
          selectedStartTime,
          selectedEndTime
        );

        setConflictCheck({
          checking: false,
          hasConflict,
          conflictDetails: conflictingBookings
        });
      } catch (error) {
        console.error('Error checking conflicts:', error);
        setConflictCheck({ checking: false, hasConflict: false });
      }
    };

    // Debounce per evitare troppe chiamate
    const timer = setTimeout(checkConflicts, 500);
    return () => clearTimeout(timer);
  }, [space, selectedDate, selectedStartTime, selectedEndTime]);

  // Calculate booking details
  const bookingDetails = useMemo(() => {
    if (!selectedDate || !selectedStartTime || !selectedEndTime || !space) {
      return null;
    }

    const startDateTime = new Date(`${selectedDate.toISOString().split('T')[0]}T${selectedStartTime}:00`);
    const endDateTime = new Date(`${selectedDate.toISOString().split('T')[0]}T${selectedEndTime}:00`);
    
    const hours = differenceInHours(endDateTime, startDateTime);
    
    // Calcolo prezzo
    let totalCost = 0;
    let priceBreakdown = '';
    
    if (hours >= 8 && space.price_per_day) {
      totalCost = space.price_per_day;
      priceBreakdown = `Giornata intera (${hours}h)`;
    } else {
      totalCost = hours * space.price_per_hour;
      priceBreakdown = `${hours}h × €${space.price_per_hour}`;
    }

    return {
      date: format(selectedDate, 'dd/MM/yyyy'),
      timeRange: `${selectedStartTime} - ${selectedEndTime}`,
      duration: hours,
      priceBreakdown,
      totalCost,
      isValid: hours > 0 && !conflictCheck.hasConflict
    };
  }, [selectedDate, selectedStartTime, selectedEndTime, space, conflictCheck.hasConflict]);

  if (!selectedDate || !selectedStartTime || !selectedEndTime) {
    return (
      <Card className="bg-gray-50">
        <CardContent className="p-4">
          <div className="text-center text-gray-500">
            <Clock className="h-6 w-6 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Seleziona data e orario per vedere il riepilogo</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!bookingDetails) {
    return null;
  }

  return (
    <Card className={`transition-all duration-200 ${
      conflictCheck.hasConflict ? 'border-red-200 bg-red-50' : 
      bookingDetails.isValid ? 'border-green-200 bg-green-50' : 'border-gray-200'
    }`}>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900">Riepilogo Prenotazione</h3>
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
              Disponibile
            </Badge>
          ) : null}
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

        {/* Real-time conflict warning */}
        {conflictCheck.hasConflict && (
          <div className="bg-red-100 border border-red-200 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-red-800">Orario non disponibile</p>
                <p className="text-red-700">
                  Questo slot è stato prenotato da un altro utente. Seleziona un orario diverso.
                </p>
                {conflictCheck.conflictDetails && conflictCheck.conflictDetails.length > 0 && (
                  <div className="mt-2 text-xs text-red-600">
                    Conflitti: {conflictCheck.conflictDetails.map((booking, index) => (
                      <span key={booking.id}>
                        {booking.start_time}-{booking.end_time}
                        {index < conflictCheck.conflictDetails!.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {bookingDetails.isValid && !conflictCheck.checking && !conflictCheck.hasConflict && (
          <div className="text-xs text-gray-500 text-center">
            💡 Prezzo finale confermato al checkout
          </div>
        )}
      </CardContent>
    </Card>
  );
};
