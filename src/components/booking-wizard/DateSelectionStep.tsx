import React from 'react';
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { MAX_BOOKING_DAYS_AHEAD } from '@/schemas/bookingSchema';

interface DateSelectionStepProps {
  selectedDate: Date | null;
  onDateSelect: (date: Date) => void;
  spaceId: string;
  availability?: any;
}

export function DateSelectionStep({ 
  selectedDate, 
  onDateSelect,
  spaceId,
  availability
}: DateSelectionStepProps) {
  const [isCalendarOpen, setIsCalendarOpen] = React.useState(false);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      onDateSelect(date);
      setIsCalendarOpen(false);
    }
  };

  const isDateDisabled = (date: Date) => {
    // Disable past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return true;

    // Disable dates > MAX_BOOKING_DAYS_AHEAD (e.g., 365 days)
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + MAX_BOOKING_DAYS_AHEAD);
    if (date > maxDate) return true;
    
    // Check availability if configured
    if (!availability) return false;
    
    // Parse/normalize availability if needed
    let parsedAvailability = availability;
    try {
      if (typeof availability === 'string') {
        parsedAvailability = JSON.parse(availability);
      }
    } catch (e) {
      console.warn('Failed to parse availability in date selection:', e);
      return false; // Don't disable if parsing fails
    }
    
    if (!parsedAvailability || typeof parsedAvailability !== 'object') {
      return false; // Don't disable if invalid
    }
    
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayName = dayNames[date.getDay()];
    
    // Check exceptions first
    const dateStr = format(date, 'yyyy-MM-dd');
    const exception = parsedAvailability.exceptions?.find((ex: any) => ex.date === dateStr);
    if (exception) {
      // Support both 'enabled' and 'available' fields
      const isEnabled = exception.enabled !== undefined ? exception.enabled : exception.available;
      return !isEnabled;
    }
    
    // Check recurring schedule
    const daySchedule = dayName ? parsedAvailability.recurring?.[dayName] : null;
    if (!daySchedule) return true; // Disable if no schedule
    
    return !daySchedule.enabled || !daySchedule.slots || daySchedule.slots.length === 0;
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium mb-2">Seleziona la data</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Scegli la data per la tua prenotazione
        </p>
      </div>

      <div className="flex justify-center">
        <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full max-w-sm justify-start text-left font-normal",
                !selectedDate && "text-muted-foreground"
              )}
              data-testid="date-picker-trigger"
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? (
                format(selectedDate, "EEEE, dd MMMM yyyy", { locale: it })
              ) : (
                <span>Seleziona una data</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            <Calendar
              mode="single"
              selected={selectedDate || undefined}
              onSelect={handleDateSelect}
              disabled={isDateDisabled}
              initialFocus
              locale={it}
              className={cn("p-3 pointer-events-auto")}
              data-testid="date-picker-calendar"
            />
          </PopoverContent>
        </Popover>
      </div>

      {selectedDate && (
        <div 
          className="text-center p-4 bg-muted/50 rounded-lg"
          role="status"
          aria-live="polite"
        >
          <p className="text-sm font-medium">
            Data selezionata: {format(selectedDate, "EEEE, dd MMMM yyyy", { locale: it })}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Continua per vedere gli orari disponibili
          </p>
        </div>
      )}

      {!selectedDate && (
        <div className="text-center p-8 text-muted-foreground">
          <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">
            Seleziona una data per iniziare la prenotazione
          </p>
        </div>
      )}
    </div>
  );
}