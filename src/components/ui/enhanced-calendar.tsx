
import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, DayModifiers } from "react-day-picker";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { DayAvailability } from "@/lib/availability-utils";

export type EnhancedCalendarProps = React.ComponentProps<typeof DayPicker> & {
  availability?: Record<string, DayAvailability>;
  loading?: boolean;
};

function EnhancedCalendar({
  className,
  classNames,
  showOutsideDays = true,
  availability = {},
  loading = false,
  ...props
}: EnhancedCalendarProps) {
  
  const getDayAvailability = (date: Date): DayAvailability['status'] | null => {
    const dateStr = date.toISOString().split('T')[0];
    return availability[dateStr]?.status || null;
  };

  const dayModifiers: DayModifiers = {
    available: (date) => getDayAvailability(date) === 'available',
    partial: (date) => getDayAvailability(date) === 'partial', 
    unavailable: (date) => getDayAvailability(date) === 'unavailable',
    hostDisabled: (date) => getDayAvailability(date) === 'disabled',
  };

  const dayClassNames = {
    available: "bg-green-50 text-green-700 hover:bg-green-100 border-green-200",
    partial: "bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border-yellow-200", 
    unavailable: "bg-red-50 text-red-700 hover:bg-red-100 border-red-200 cursor-not-allowed",
    hostDisabled: "bg-gray-100 text-gray-400 cursor-not-allowed line-through",
  };

  return (
    <div className="relative">
      {loading && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10 rounded-md">
          <div className="animate-spin h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full"></div>
        </div>
      )}
      
      <DayPicker
        showOutsideDays={showOutsideDays}
        className={cn("p-3 pointer-events-auto", className)}
        modifiers={dayModifiers}
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-4",
          caption: "flex justify-center pt-1 relative items-center",
          caption_label: "text-sm font-medium",
          nav: "space-x-1 flex items-center",
          nav_button: cn(
            buttonVariants({ variant: "outline" }),
            "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
          ),
          nav_button_previous: "absolute left-1",
          nav_button_next: "absolute right-1",
          table: "w-full border-collapse space-y-1",
          head_row: "flex",
          head_cell:
            "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
          row: "flex w-full mt-2",
          cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
          day: cn(
            buttonVariants({ variant: "ghost" }),
            "h-9 w-9 p-0 font-normal aria-selected:opacity-100 relative"
          ),
          day_range_end: "day-range-end",
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          day_today: "bg-accent text-accent-foreground font-semibold",
          day_outside:
            "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
          day_disabled: "text-muted-foreground opacity-50",
          day_range_middle:
            "aria-selected:bg-accent aria-selected:text-accent-foreground",
          day_hidden: "invisible",
          ...classNames,
        }}
        modifiersClassNames={{
          available: dayClassNames.available,
          partial: dayClassNames.partial,
          unavailable: dayClassNames.unavailable,
          hostDisabled: dayClassNames.hostDisabled,
        }}
        components={{
          IconLeft: ({ ..._props }) => <ChevronLeft className="h-4 w-4" />,
          IconRight: ({ ..._props }) => <ChevronRight className="h-4 w-4" />,
        }}
        disabled={(date) => {
          const availability = getDayAvailability(date);
          return availability === 'unavailable' || availability === 'disabled' || date < new Date();
        }}
        {...props}
      />
      
      {/* Legenda */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-50 border border-green-200 rounded"></div>
          <span>Disponibile</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-yellow-50 border border-yellow-200 rounded"></div>
          <span>Parzialmente occupato</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-50 border border-red-200 rounded"></div>
          <span>Non disponibile</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded"></div>
          <span>Chiuso</span>
        </div>
      </div>
    </div>
  );
}

EnhancedCalendar.displayName = "EnhancedCalendar";

export { EnhancedCalendar };
