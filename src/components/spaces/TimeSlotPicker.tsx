
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, AlertCircle, RefreshCw } from 'lucide-react';
import { generateTimeSlots, TimeSlot, checkRealTimeConflicts } from '@/lib/availability-utils';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface TimeSlotPickerProps {
  selectedDate: Date | undefined;
  availableSlots: TimeSlot[];
  selectedStartTime: string;
  selectedEndTime: string;
  onTimeSelection: (startTime: string, endTime: string) => void;
  loading?: boolean;
  spaceId: string;
  onRefresh?: () => void;
}

export const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  selectedDate,
  availableSlots,
  selectedStartTime,
  selectedEndTime,
  onTimeSelection,
  loading = false,
  spaceId,
  onRefresh
}) => {
  const [dragStart, setDragStart] = React.useState<string | null>(null);
  const [dragEnd, setDragEnd] = React.useState<string | null>(null);
  const [conflictCheckLoading, setConflictCheckLoading] = React.useState(false);

  const allTimeSlots = generateTimeSlots();

  const getSlotStatus = (time: string) => {
    const slot = availableSlots.find(s => s.start === time);
    return slot?.available ? 'available' : 'occupied';
  };

  const isSlotSelected = (time: string) => {
    if (!selectedStartTime || !selectedEndTime) return false;
    return time >= selectedStartTime && time < selectedEndTime;
  };

  const isSlotInDragRange = (time: string) => {
    if (!dragStart || !dragEnd) return false;
    const start = dragStart < dragEnd ? dragStart : dragEnd;
    const end = dragStart < dragEnd ? dragEnd : dragStart;
    return time >= start && time < end;
  };

  const canStartDragFromSlot = (time: string) => {
    return getSlotStatus(time) === 'available';
  };

  const handleSlotMouseDown = (time: string) => {
    if (!canStartDragFromSlot(time)) {
      return;
    }
    setDragStart(time);
    setDragEnd(time);
  };

  const handleSlotMouseEnter = (time: string) => {
    if (dragStart && getSlotStatus(time) === 'available') {
      setDragEnd(time);
    }
  };

  const handleSlotMouseUp = async () => {
    if (dragStart && dragEnd && selectedDate) {
      const start = dragStart < dragEnd ? dragStart : dragEnd;
      const end = dragStart < dragEnd ? dragEnd : dragStart;
      
      // Trova l'orario di fine (prossimo slot)
      const startIndex = allTimeSlots.indexOf(start);
      const endIndex = allTimeSlots.indexOf(end) + 1;
      
      if (endIndex < allTimeSlots.length) {
        const actualEndTime = allTimeSlots[endIndex];
        
        // Real-time conflict check prima della selezione
        setConflictCheckLoading(true);
        try {
          const { hasConflict } = await checkRealTimeConflicts(
            spaceId,
            format(selectedDate, 'yyyy-MM-dd'),
            start,
            actualEndTime
          );

          if (hasConflict) {
            // Mostra notifica di conflitto
            alert('Questo slot è stato appena prenotato da un altro utente. Aggiorna la disponibilità.');
            if (onRefresh) {
              onRefresh();
            }
          } else {
            onTimeSelection(start, actualEndTime);
          }
        } catch (error) {
          console.error('Error checking conflicts:', error);
          // Procedi comunque con la selezione
          onTimeSelection(start, actualEndTime);
        } finally {
          setConflictCheckLoading(false);
        }
      }
    }
    setDragStart(null);
    setDragEnd(null);
  };

  const handleSlotClick = async (time: string) => {
    if (getSlotStatus(time) !== 'available') {
      return;
    }

    // Se non c'è selezione, seleziona uno slot di 1 ora con conflict check
    if (!selectedStartTime && selectedDate) {
      const startIndex = allTimeSlots.indexOf(time);
      if (startIndex < allTimeSlots.length - 1) {
        const endTime = allTimeSlots[startIndex + 1];
        
        setConflictCheckLoading(true);
        try {
          const { hasConflict } = await checkRealTimeConflicts(
            spaceId,
            format(selectedDate, 'yyyy-MM-dd'),
            time,
            endTime
          );

          if (hasConflict) {
            alert('Questo slot è stato appena prenotato. Aggiorna la disponibilità.');
            if (onRefresh) {
              onRefresh();
            }
          } else {
            onTimeSelection(time, endTime);
          }
        } catch (error) {
          console.error('Error checking conflicts:', error);
          onTimeSelection(time, endTime);
        } finally {
          setConflictCheckLoading(false);
        }
      }
    } else {
      // Se c'è già una selezione, resetta
      onTimeSelection('', '');
    }
  };

  if (!selectedDate) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Seleziona una data per vedere gli orari disponibili</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin h-6 w-6 border-2 border-indigo-600 border-t-transparent rounded-full mx-auto mb-2"></div>
        <p className="text-gray-600">Caricamento disponibilità...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Seleziona orario</h3>
        <div className="flex items-center gap-2">
          {/* Refresh button for real-time updates */}
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              className="h-8 w-8 p-0"
              disabled={loading || conflictCheckLoading}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          )}
          
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-200 border border-green-300 rounded"></div>
              <span>Disponibile</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-200 border border-red-300 rounded"></div>
              <span>Occupato</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 bg-indigo-200 border border-indigo-300 rounded"></div>
              <span>Selezionato</span>
            </div>
          </div>
        </div>
      </div>

      <div 
        className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2"
        onMouseLeave={() => {
          setDragStart(null);
          setDragEnd(null);
        }}
      >
        {allTimeSlots.slice(0, -1).map((time) => {
          const status = getSlotStatus(time);
          const isSelected = isSlotSelected(time);
          const isInDragRange = isSlotInDragRange(time);
          const isAvailable = status === 'available';

          return (
            <Button
              key={time}
              variant="outline"
              size="sm"
              disabled={!isAvailable || conflictCheckLoading}
              className={cn(
                "h-10 text-xs transition-all duration-150 cursor-pointer select-none relative",
                {
                  'bg-green-50 border-green-200 text-green-700 hover:bg-green-100': 
                    isAvailable && !isSelected && !isInDragRange,
                  'bg-red-50 border-red-200 text-red-700 cursor-not-allowed': 
                    !isAvailable,
                  'bg-indigo-100 border-indigo-300 text-indigo-700': 
                    isSelected,
                  'bg-indigo-50 border-indigo-200 text-indigo-600': 
                    isInDragRange && !isSelected,
                }
              )}
              onMouseDown={() => handleSlotMouseDown(time)}
              onMouseEnter={() => handleSlotMouseEnter(time)}
              onMouseUp={handleSlotMouseUp}
              onClick={() => handleSlotClick(time)}
            >
              {time}
              {conflictCheckLoading && isSelected && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                  <div className="w-3 h-3 border border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </Button>
          );
        })}
      </div>

      {selectedStartTime && selectedEndTime && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-indigo-600" />
            <span className="font-medium text-indigo-900">
              Orario selezionato: {selectedStartTime} - {selectedEndTime}
            </span>
          </div>
        </div>
      )}

      {!loading && availableSlots.every(slot => !slot.available) && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <span className="text-yellow-800">
              Nessun orario disponibile per questa data
            </span>
          </div>
        </div>
      )}

      <div className="text-xs text-gray-500">
        💡 Trascina per selezionare un intervallo di tempo, oppure clicca per slot singoli.
        <br />
        🔄 La disponibilità viene verificata in tempo reale prima della conferma.
      </div>
    </div>
  );
};
