import React from 'react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface DateRangePickerProps {
  dateRange?: { start: string; end: string } | undefined;
  onDateRangeChange: (range: { start: string; end: string } | null | undefined) => void;
  className?: string;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  dateRange,
  onDateRangeChange,
  className
}) => {
  const [date, setDate] = React.useState<DateRange | undefined>(() => {
    if (dateRange) {
      return {
        from: new Date(dateRange.start),
        to: new Date(dateRange.end)
      };
    }
    return undefined;
  });

  const handleSelect = (selectedDate: DateRange | undefined) => {
    setDate(selectedDate);
    
    if (selectedDate?.from && selectedDate?.to) {
      onDateRangeChange({
        start: format(selectedDate.from, 'yyyy-MM-dd'),
        end: format(selectedDate.to, 'yyyy-MM-dd')
      });
    } else if (!selectedDate) {
      onDateRangeChange(null);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="h-4 w-4 mr-2" />
          {date?.from ? (
            date.to ? (
              <>
                {format(date.from, 'dd MMM', { locale: it })} -{' '}
                {format(date.to, 'dd MMM yyyy', { locale: it })}
              </>
            ) : (
              format(date.from, 'dd MMM yyyy', { locale: it })
            )
          ) : (
            <span>Seleziona periodo</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          {...(date?.from && { defaultMonth: date.from })}
          selected={date}
          onSelect={handleSelect}
          numberOfMonths={2}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
          locale={it}
        />
      </PopoverContent>
    </Popover>
  );
};
