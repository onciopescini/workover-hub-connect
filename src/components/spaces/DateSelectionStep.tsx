import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { it } from "date-fns/locale";

interface DateSelectionStepProps {
  spaceId: string;
  onDateSelect: (date: string) => void;
  isProcessing?: boolean;
}

export function DateSelectionStep({ 
  spaceId, 
  onDateSelect, 
  isProcessing = false 
}: DateSelectionStepProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
      setCalendarOpen(false);
    }
  };

  const handleContinue = () => {
    if (selectedDate) {
      const dateString = selectedDate.toISOString().split('T')[0];
      if (dateString) {
        onDateSelect(dateString);
      }
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculate max date (e.g., 3 months in advance)
  const maxDate = new Date();
  maxDate.setMonth(maxDate.getMonth() + 3);

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-medium">Quando vuoi prenotare?</h3>
        <p className="text-sm text-gray-600">
          Seleziona la data per vedere gli orari disponibili
        </p>
      </div>

      {/* Calendar Selector */}
      <div className="space-y-4">
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal h-12",
                !selectedDate && "text-muted-foreground"
              )}
              disabled={isProcessing}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? (
                format(selectedDate, "PPP", { locale: it })
              ) : (
                <span>Seleziona una data</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={handleDateSelect}
              disabled={(date) =>
                date < today || date > maxDate
              }
              initialFocus
              className={cn("p-3 pointer-events-auto")}
              locale={it}
            />
          </PopoverContent>
        </Popover>

        {/* Date validation info */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Puoi prenotare fino a 3 mesi in anticipo</p>
          <p>• Le prenotazioni possono essere modificate fino a 24h prima</p>
        </div>
      </div>

      {/* Continue Button */}
      <Button 
        onClick={handleContinue}
        disabled={!selectedDate || isProcessing}
        className="w-full"
        size="lg"
      >
        Continua alla selezione orario
      </Button>

      {/* Selected date preview */}
      {selectedDate && (
        <div className="p-4 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 text-blue-800">
            <CalendarIcon className="w-4 h-4" />
            <span className="font-medium">
              Data selezionata: {format(selectedDate, "EEEE, d MMMM yyyy", { locale: it })}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}