
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface DateRange {
  start: Date;
  end: Date;
}

interface DatePickerWithRangeProps {
  onDateChange: (range: DateRange | undefined) => void;
  placeholder?: string;
}

export function DatePickerWithRange({ onDateChange, placeholder = "Seleziona periodo" }: DatePickerWithRangeProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [isOpen, setIsOpen] = useState(false);

  const handleDateSelect = (range: { from?: Date | undefined; to?: Date | undefined } | undefined) => {
    if (range?.from && range?.to) {
      const newRange = { start: range.from, end: range.to };
      setDateRange(newRange);
      onDateChange(newRange);
      setIsOpen(false);
    } else if (range?.from) {
      // Single date selected, treat as start date
      setDateRange({ start: range.from, end: range.from });
    }
  };

  const handleClear = () => {
    setDateRange(undefined);
    onDateChange(undefined);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {dateRange ? (
            <>
              {format(dateRange.start, "dd MMM", { locale: it })} -{" "}
              {format(dateRange.end, "dd MMM yyyy", { locale: it })}
            </>
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={dateRange?.start ?? new Date()}
            selected={{
              from: dateRange?.start,
              to: dateRange?.end,
            }}
            onSelect={handleDateSelect}
            numberOfMonths={2}
          />
          <div className="flex justify-between pt-3">
            <Button variant="outline" size="sm" onClick={handleClear}>
              Cancella
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
