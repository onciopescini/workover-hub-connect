
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { checkRealTimeConflicts, validateBookingSlotWithLock } from '@/lib/availability-utils';
import { Space } from '@/types/space';
import { sreLogger } from '@/lib/sre-logger';

interface BookingConflict {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  user_id: string;
  [key: string]: unknown;
}

interface ConflictCheckState {
  checking: boolean;
  hasConflict: boolean;
  conflictDetails?: BookingConflict[];
  validated?: boolean;
}

export const useBookingConflictCheck = (
  space: Space | null,
  selectedDate: Date | undefined,
  selectedStartTime: string,
  selectedEndTime: string,
  isOnline: boolean
) => {
  const [conflictCheck, setConflictCheck] = useState<ConflictCheckState>({ 
    checking: false, 
    hasConflict: false 
  });

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
             conflictDetails: (validationResult.conflicts || []) as BookingConflict[],
             validated: validationResult.valid
           });
        } catch (validationError) {
          sreLogger.warn('Server validation failed, using client-side result', {}, validationError as Error);
          setConflictCheck({
            checking: false,
            hasConflict: false,
            validated: false
          });
        }
      } catch (error) {
        sreLogger.error('Error checking conflicts', {}, error as Error);
        setConflictCheck({ checking: false, hasConflict: false, validated: false });
      }
    };

    // Debounce per evitare troppe chiamate
    const timer = setTimeout(checkConflicts, 300);
    return () => clearTimeout(timer);
  }, [space, selectedDate, selectedStartTime, selectedEndTime, isOnline]);

  return conflictCheck;
};
