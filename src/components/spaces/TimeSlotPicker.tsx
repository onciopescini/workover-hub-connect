import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, AlertCircle, RefreshCw, Keyboard } from 'lucide-react';
import { generateTimeSlots, TimeSlot, checkRealTimeConflicts } from '@/lib/availability-utils';
import { getAlternativeTimeSlots } from '@/lib/availability-rpc';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { AvailabilityFeedback } from './AvailabilityFeedback';
import { ConflictHandler } from './ConflictHandler';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { sreLogger } from '@/lib/sre-logger';

interface TimeSlotPickerProps {
  selectedDate: Date | undefined;
  availableSlots: TimeSlot[];
  selectedStartTime: string;
  selectedEndTime: string;
  onTimeSelection: (startTime: string, endTime: string) => void;
  loading?: boolean;
  spaceId: string;
  onRefresh?: () => void;
  timezone?: string;
}

export const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  selectedDate,
  availableSlots,
  selectedStartTime,
  selectedEndTime,
  onTimeSelection,
  loading = false,
  spaceId,
  onRefresh,
  timezone
}) => {
  const [dragStart, setDragStart] = React.useState<string | null>(null);
  const [dragEnd, setDragEnd] = React.useState<string | null>(null);
  const [conflictCheckLoading, setConflictCheckLoading] = React.useState(false);
  const [hasConflict, setHasConflict] = React.useState(false);
  const [conflictDetails, setConflictDetails] = React.useState<any[]>([]);
  const [alternativeSlots, setAlternativeSlots] = React.useState<string[]>([]);
  const [keyboardSelectedIndex, setKeyboardSelectedIndex] = React.useState(-1);
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

  const allTimeSlots = generateTimeSlots();

  // Keyboard navigation
  const { isNavigating } = useKeyboardNavigation({
    timeSlots: allTimeSlots,
    selectedIndex: keyboardSelectedIndex,
    onSlotSelect: setKeyboardSelectedIndex,
    onSlotActivate: handleKeyboardActivate,
    enabled: !!selectedDate && !loading
  });

  // Online/offline detection
  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  function handleKeyboardActivate(index: number) {
    if (index >= 0 && index < allTimeSlots.length - 1) {
      const time = allTimeSlots[index];
      if (time) {
        handleSlotClick(time);
      }
    }
  }

  const getSlotStatus = (time: string) => {
    // Legacy support strict time check
    if (selectedDate) {
      const now = new Date();
      const targetTimezone = timezone || 'Europe/Rome';
      let zonedNow: Date;
      try {
        zonedNow = toZonedTime(now, targetTimezone);
      } catch {
        zonedNow = now;
      }

      const isToday = format(selectedDate, 'yyyy-MM-dd') === format(zonedNow, 'yyyy-MM-dd');
      if (isToday) {
        const timeParts = time.split(':').map(Number);
        const slotHH = timeParts[0];
        const slotMM = timeParts[1];

        if (slotHH === undefined || slotMM === undefined) return 'occupied';

        const currentHH = zonedNow.getHours();
        const currentMM = zonedNow.getMinutes();

        if (slotHH < currentHH || (slotHH === currentHH && slotMM <= currentMM)) {
          return 'occupied'; // Treat past slots as occupied/unavailable
        }
      }
    }

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
      
      const startIndex = allTimeSlots.indexOf(start);
      const endIndex = allTimeSlots.indexOf(end) + 1;
      
      if (endIndex < allTimeSlots.length) {
        const actualEndTime = allTimeSlots[endIndex];
        if (actualEndTime) {
          await performConflictCheck(start, actualEndTime);
        }
      }
    }
    setDragStart(null);
    setDragEnd(null);
  };

  const handleSlotClick = async (time: string) => {
    if (getSlotStatus(time) !== 'available') {
      setHasConflict(true);
      setConflictDetails([]);
      return;
    }

    if (!selectedStartTime && selectedDate) {
      const startIndex = allTimeSlots.indexOf(time);
      if (startIndex < allTimeSlots.length - 1) {
        const endTime = allTimeSlots[startIndex + 1];
        if (endTime) {
          await performConflictCheck(time, endTime);
        }
      }
    } else {
      onTimeSelection('', '');
      setHasConflict(false);
      setConflictDetails([]);
    }
  };

  const performConflictCheck = async (startTime: string, endTime: string) => {
    if (!selectedDate || !isOnline) return;

    setConflictCheckLoading(true);
    setHasConflict(false);
    setConflictDetails([]);

    try {
      const { hasConflict, conflictingBookings } = await checkRealTimeConflicts(
        spaceId,
        format(selectedDate, 'yyyy-MM-dd'),
        startTime,
        endTime
      );

      if (hasConflict) {
        setHasConflict(true);
        setConflictDetails(conflictingBookings);
        
        // Fetch alternative slots
        const duration = allTimeSlots.indexOf(endTime) - allTimeSlots.indexOf(startTime);
        const alternatives = await getAlternativeTimeSlots(
          spaceId, 
          format(selectedDate, 'yyyy-MM-dd'), 
          duration * 0.5
        );
        setAlternativeSlots(alternatives);
        
        if (onRefresh) {
          onRefresh();
        }
      } else {
        onTimeSelection(startTime, endTime);
        setAlternativeSlots([]);
      }
    } catch (error) {
      sreLogger.error('Error checking conflicts', { 
        context: 'TimeSlotPicker',
        spaceId,
        date: selectedDate ? format(selectedDate, 'yyyy-MM-dd') : undefined,
        startTime,
        endTime
      }, error as Error);
      // In caso di errore, procedi comunque
      onTimeSelection(startTime, endTime);
    } finally {
      setConflictCheckLoading(false);
    }
  };

  if (!selectedDate) {
    return (
      <AvailabilityFeedback
        type="warning"
        message="Seleziona una data per vedere gli orari disponibili"
        details="Usa il calendario sopra per scegliere una data"
        className="py-8"
      />
    );
  }

  if (!isOnline) {
    return (
      <AvailabilityFeedback
        type="offline"
        message="Connessione offline"
        details="Verifica la tua connessione internet per vedere la disponibilità aggiornata"
        className="py-8"
      />
    );
  }

  if (loading) {
    return (
      <AvailabilityFeedback
        type="loading"
        message="Caricamento disponibilità..."
        details="Sto verificando gli orari disponibili per questa data"
        className="py-8"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">Seleziona orario</h3>
        <div className="flex items-center gap-2">
          {/* Keyboard navigation hint */}
          <div className="hidden sm:flex items-center gap-1 text-xs text-gray-500">
            <Keyboard className="h-3 w-3" />
            <span>Usa le frecce per navigare</span>
          </div>
          
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
        className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2"
        onMouseLeave={() => {
          setDragStart(null);
          setDragEnd(null);
        }}
        role="grid"
        aria-label="Selezione orario"
      >
        {allTimeSlots.slice(0, -1).map((time, index) => {
          const status = getSlotStatus(time);
          const isSelected = isSlotSelected(time);
          const isInDragRange = isSlotInDragRange(time);
          const isAvailable = status === 'available';
          const isKeyboardSelected = keyboardSelectedIndex === index;

          return (
            <Button
              key={time}
              variant="outline"
              size="sm"
              disabled={!isAvailable || conflictCheckLoading}
              className={cn(
                "h-10 text-xs transition-all duration-150 cursor-pointer select-none relative",
                "focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1",
                {
                  'bg-green-50 border-green-200 text-green-700 hover:bg-green-100': 
                    isAvailable && !isSelected && !isInDragRange && !isKeyboardSelected,
                  'bg-red-50 border-red-200 text-red-700 cursor-not-allowed': 
                    !isAvailable,
                  'bg-indigo-100 border-indigo-300 text-indigo-700': 
                    isSelected,
                  'bg-indigo-50 border-indigo-200 text-indigo-600': 
                    isInDragRange && !isSelected,
                  'ring-2 ring-indigo-500 ring-offset-1': 
                    isKeyboardSelected,
                }
              )}
              onMouseDown={() => handleSlotMouseDown(time)}
              onMouseEnter={() => handleSlotMouseEnter(time)}
              onMouseUp={handleSlotMouseUp}
              onClick={() => handleSlotClick(time)}
              role="gridcell"
              aria-selected={isSelected}
              aria-label={`Orario ${time}, ${isAvailable ? 'disponibile' : 'occupato'}`}
              tabIndex={isKeyboardSelected ? 0 : -1}
            >
              {time}
              {conflictCheckLoading && (isSelected || isInDragRange) && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                  <div className="w-3 h-3 border border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </Button>
          );
        })}
      </div>

      {/* Real-time conflict handler */}
      <ConflictHandler
        hasConflict={hasConflict}
        conflictDetails={conflictDetails}
        onRefresh={onRefresh}
        onTimeChange={() => {
          onTimeSelection('', '');
          setHasConflict(false);
          setConflictDetails([]);
        }}
        loading={conflictCheckLoading}
        alternativeSuggestions={alternativeSlots}
      />

      {selectedStartTime && selectedEndTime && !hasConflict && (
        <AvailabilityFeedback
          type="success"
          message={`Orario selezionato: ${selectedStartTime} - ${selectedEndTime}`}
          details="Orario confermato e disponibile"
        />
      )}

      {!loading && availableSlots.every(slot => !slot.available) && (
        <AvailabilityFeedback
          type="warning"
          message="Nessun orario disponibile per questa data"
          details="Prova a selezionare una data diversa o contatta l'host"
        />
      )}

      <div className="text-xs text-gray-500 space-y-1">
        <p>💡 Trascina per selezionare un intervallo di tempo, oppure clicca per slot singoli.</p>
        <p>🔄 La disponibilità viene verificata in tempo reale prima della conferma.</p>
        <p>⌨️ Usa le frecce direzionali per navigare e Invio per selezionare.</p>
      </div>
    </div>
  );
};
