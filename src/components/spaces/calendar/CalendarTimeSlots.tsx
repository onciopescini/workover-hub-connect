import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { type AvailabilityData } from "@/types/availability";
import { cn } from "@/lib/utils";

interface CalendarTimeSlotsProps {
  dates: Date[];
  availability: AvailabilityData;
  bookings: Array<{
    id: string;
    booking_date: string;
    start_time: string;
    end_time: string;
    status: string;
    user_id: string;
    guest_name?: string;
  }>;
  onBookingClick: (booking: any) => void;
  onDateSelect: (date: string) => void;
}

const TIME_SLOTS = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00'
];

export const CalendarTimeSlots = ({
  dates,
  availability,
  bookings,
  onBookingClick,
  onDateSelect
}: CalendarTimeSlotsProps) => {
  
  // Check if a time slot is available for a specific date
  const isSlotAvailable = (date: Date, timeSlot: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayOfWeek = format(date, 'EEEE').toLowerCase();
    const daySchedule = availability.recurring[dayOfWeek as keyof typeof availability.recurring];
    
    // Check if day is enabled
    if (!daySchedule?.enabled) return false;
    
    // Check if blocked
    const isBlocked = availability.exceptions.some(
      exception => exception.date === dateStr && !exception.enabled
    );
    if (isBlocked) return false;
    
    // Check if time slot is within available hours
    const timeSlotMinutes = timeToMinutes(timeSlot);
    const isWithinSchedule = daySchedule.slots.some(slot => {
      const startMinutes = timeToMinutes(slot.start);
      const endMinutes = timeToMinutes(slot.end);
      return timeSlotMinutes >= startMinutes && timeSlotMinutes < endMinutes;
    });
    
    return isWithinSchedule;
  };

  // Get booking for specific date and time slot
  const getBookingForSlot = (date: Date, timeSlot: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return bookings.find(booking => {
      if (booking.booking_date !== dateStr) return false;
      
      const slotMinutes = timeToMinutes(timeSlot);
      const startMinutes = timeToMinutes(booking.start_time);
      const endMinutes = timeToMinutes(booking.end_time);
      
      return slotMinutes >= startMinutes && slotMinutes < endMinutes;
    });
  };

  // Convert time string to minutes
  const timeToMinutes = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  };

  // Get status for a time slot
  const getSlotStatus = (date: Date, timeSlot: string) => {
    const booking = getBookingForSlot(date, timeSlot);
    if (booking) {
      return booking.status === 'confirmed' ? 'booked-confirmed' : 'booked-pending';
    }
    
    const isAvailable = isSlotAvailable(date, timeSlot);
    return isAvailable ? 'available' : 'unavailable';
  };

  return (
    <div className="overflow-x-auto">
      <div className="min-w-full">
        {/* Header with dates */}
        <div className="grid grid-cols-8 gap-1 mb-4 sticky top-0 bg-background z-10">
          <div className="p-3 text-sm font-medium text-muted-foreground">Orario</div>
          {dates.map(date => (
            <div
              key={date.toISOString()}
              className="p-3 text-center cursor-pointer hover:bg-muted/50 rounded-lg transition-colors"
              onClick={() => onDateSelect(format(date, 'yyyy-MM-dd'))}
            >
              <div className="text-sm font-medium">{format(date, 'EEE')}</div>
              <div className="text-lg font-semibold">{format(date, 'd')}</div>
              <div className="text-xs text-muted-foreground">{format(date, 'MMM')}</div>
            </div>
          ))}
        </div>

        {/* Time slots grid */}
        <div className="space-y-1">
          {TIME_SLOTS.map(timeSlot => (
            <div key={timeSlot} className="grid grid-cols-8 gap-1">
              {/* Time label */}
              <div className="p-2 text-sm font-medium text-muted-foreground text-right">
                {timeSlot}
              </div>
              
              {/* Slots for each day */}
              {dates.map(date => {
                const status = getSlotStatus(date, timeSlot);
                const booking = getBookingForSlot(date, timeSlot);
                
                return (
                  <div
                    key={`${date.toISOString()}-${timeSlot}`}
                    className={cn(
                      "p-2 h-12 border rounded-lg cursor-pointer transition-all",
                      "hover:shadow-sm",
                      status === 'available' && "bg-green-50 border-green-200 hover:bg-green-100",
                      status === 'unavailable' && "bg-gray-50 border-gray-200 opacity-50",
                      status === 'booked-confirmed' && "bg-blue-50 border-blue-200 hover:bg-blue-100",
                      status === 'booked-pending' && "bg-yellow-50 border-yellow-200 hover:bg-yellow-100"
                    )}
                    onClick={() => {
                      if (booking) {
                        onBookingClick(booking);
                      } else {
                        onDateSelect(format(date, 'yyyy-MM-dd'));
                      }
                    }}
                  >
                    {booking && (
                      <div className="h-full flex items-center justify-center">
                        <Badge 
                          variant={booking.status === 'confirmed' ? 'default' : 'secondary'}
                          className="text-xs px-1 py-0"
                        >
                          {booking.guest_name?.split(' ')[0] || 'Prenotato'}
                        </Badge>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};