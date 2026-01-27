
import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Space } from '@/types/space';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useBookingConflictCheck } from '@/hooks/useBookingConflictCheck';
import { calculateBookingDetails } from '@/lib/booking-calculator-utils';
import { cn } from '@/lib/utils';
import { BookingCalculatorHeader } from './BookingCalculatorHeader';
import { BookingCalculatorDetails } from './BookingCalculatorDetails';
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
  const isOnline = useOnlineStatus();
  const conflictCheck = useBookingConflictCheck(
    space,
    selectedDate,
    selectedStartTime,
    selectedEndTime,
    isOnline
  );

  // Calculate booking details with enhanced validation
  const bookingDetails = useMemo(() => {
    if (!selectedDate || !selectedStartTime || !selectedEndTime || !space) {
      return null;
    }

    return calculateBookingDetails(
      selectedDate,
      selectedStartTime,
      selectedEndTime,
      space,
      conflictCheck,
      isOnline
    );
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
        <BookingCalculatorHeader
          isOnline={isOnline}
          conflictCheck={conflictCheck}
          isValid={bookingDetails.isValid}
          validationStatus={bookingDetails.validationStatus}
        />

        <BookingCalculatorDetails bookingDetails={bookingDetails} />

        {/* Enhanced conflict warning */}
        {conflictCheck.hasConflict && (
          <AvailabilityFeedback
            type="error"
            message="Orario non disponibile"
            details="Questo slot è stato prenotato da un altro utente. Seleziona un orario diverso."
          />
        )}
      </CardContent>
    </Card>
  );
};
