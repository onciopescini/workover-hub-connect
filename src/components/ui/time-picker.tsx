import * as React from "react";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TimePickerProps {
  value: string | null;
  onChange: (time: string | null) => void;
  placeholder?: string;
  className?: string;
  minTime?: string | undefined;
  disabled?: boolean;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  placeholder = "Seleziona orario",
  className,
  minTime,
  disabled = false,
}) => {
  const [open, setOpen] = React.useState(false);

  // Generate 30-minute time slots from 00:00 to 23:30
  const generateTimeSlots = () => {
    const slots: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeStr);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  const handleTimeSelect = (time: string) => {
    onChange(time);
    setOpen(false);
  };

  const isTimeDisabled = (time: string) => {
    if (!minTime) return false;
    return time <= minTime;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <Clock className="mr-2 h-4 w-4" />
          {value || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
        <ScrollArea className="h-[300px]">
          <div className="p-2">
            {timeSlots.map((time) => {
              const disabled = isTimeDisabled(time);
              return (
                <Button
                  key={time}
                  variant={value === time ? "default" : "ghost"}
                  disabled={disabled}
                  className={cn(
                    "w-full justify-start font-normal mb-1",
                    disabled && "opacity-50 cursor-not-allowed"
                  )}
                  onClick={() => handleTimeSelect(time)}
                >
                  {time}
                </Button>
              );
            })}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};