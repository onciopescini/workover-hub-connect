import React from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

interface DateRangePickerProps {
  dateRange: { start: string; end: string } | undefined;
  onDateRangeChange: (range: { start: string; end: string } | null | undefined) => void;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  dateRange,
  onDateRangeChange
}) => {
  const [date, setDate] = React.useState<DateRange | undefined>(
    dateRange ? {
      from: new Date(dateRange.start),
      to: new Date(dateRange.end)
    } : undefined
  );

  const handleSelect = (range: DateRange | undefined) => {
    setDate(range);
    if (range?.from && range?.to) {
      onDateRangeChange({
        start: range.from.toISOString(),
        end: range.to.toISOString()
      });
    } else {
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
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date?.from ? (
            date.to ? (
              <>
                {format(date.from, "d MMM", { locale: it })} -{" "}
                {format(date.to, "d MMM", { locale: it })}
              </>
            ) : (
              format(date.from, "d MMM", { locale: it })
            )
          ) : (
            <span>Seleziona date</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          initialFocus
          mode="range"
          defaultMonth={date?.from}
          selected={date}
          onSelect={handleSelect}
          numberOfMonths={2}
          locale={it}
        />
      </PopoverContent>
    </Popover>
  );
};
