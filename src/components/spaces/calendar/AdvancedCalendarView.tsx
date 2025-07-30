import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, addDays, subDays } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { type AvailabilityData } from "@/types/availability";
import { CalendarTimeSlots } from "./CalendarTimeSlots";
import { BlockingPanel } from "./BlockingPanel";
import { QuickActionsToolbar } from "./QuickActionsToolbar";
import { BookingDetailsModal } from "./BookingDetailsModal";
import { cn } from "@/lib/utils";

interface AdvancedCalendarViewProps {
  availability: AvailabilityData;
  onAvailabilityChange: (availability: AvailabilityData) => void;
  spaceId: string;
  bookings?: Array<{
    id: string;
    booking_date: string;
    start_time: string;
    end_time: string;
    status: string;
    user_id: string;
    guest_name?: string;
  }>;
}

type CalendarView = 'monthly' | 'weekly';

export const AdvancedCalendarView = ({
  availability,
  onAvailabilityChange,
  spaceId,
  bookings = []
}: AdvancedCalendarViewProps) => {
  const [view, setView] = useState<CalendarView>('monthly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [isBlockingPanelOpen, setIsBlockingPanelOpen] = useState(false);

  // Generate calendar dates based on view
  const calendarDates = useMemo(() => {
    if (view === 'monthly') {
      const start = startOfWeek(startOfMonth(currentDate));
      const end = endOfWeek(endOfMonth(currentDate));
      return eachDayOfInterval({ start, end });
    } else {
      // Weekly view (7 days)
      const start = startOfWeek(currentDate);
      const end = endOfWeek(currentDate);
      return eachDayOfInterval({ start, end });
    }
  }, [currentDate, view]);

  // Get blocked dates from exceptions
  const blockedDates = useMemo(() => {
    return availability.exceptions
      .filter(exception => !exception.enabled)
      .map(exception => exception.date);
  }, [availability.exceptions]);

  // Get bookings for a specific date
  const getBookingsForDate = (date: string) => {
    return bookings.filter(booking => booking.booking_date === date);
  };

  // Check if a date is available
  const isDateAvailable = (date: string) => {
    const dayOfWeek = format(new Date(date), 'EEEE').toLowerCase();
    const daySchedule = availability.recurring[dayOfWeek as keyof typeof availability.recurring];
    const isBlocked = blockedDates.includes(date);
    
    return daySchedule?.enabled && !isBlocked;
  };

  // Get day status for styling
  const getDayStatus = (date: string) => {
    const isBlocked = blockedDates.includes(date);
    const hasBookings = getBookingsForDate(date).length > 0;
    const isAvailable = isDateAvailable(date);

    if (isBlocked) return 'blocked';
    if (hasBookings && isAvailable) return 'partial';
    if (isAvailable) return 'available';
    return 'unavailable';
  };

  const navigateCalendar = (direction: 'prev' | 'next') => {
    if (view === 'monthly') {
      const newDate = direction === 'prev' 
        ? new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
        : new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
      setCurrentDate(newDate);
    } else {
      const newDate = direction === 'prev' 
        ? subDays(currentDate, 7)
        : addDays(currentDate, 7);
      setCurrentDate(newDate);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with View Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5" />
              Calendario Avanzato
            </CardTitle>
            
            {/* View Toggle */}
            <div className="flex items-center gap-2">
              <div className="flex bg-muted rounded-lg p-1">
                <Button
                  variant={view === 'monthly' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('monthly')}
                  className="relative"
                >
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  Mensile
                </Button>
                <Button
                  variant={view === 'weekly' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setView('weekly')}
                  className="relative"
                >
                  <CalendarDays className="w-4 h-4 mr-2" />
                  Settimanale
                </Button>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsBlockingPanelOpen(true)}
              >
                Gestisci Blocchi
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Quick Actions */}
      <QuickActionsToolbar
        availability={availability}
        onAvailabilityChange={onAvailabilityChange}
      />

      {/* Calendar Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => navigateCalendar('prev')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <h3 className="text-lg font-semibold">
              {view === 'monthly' 
                ? format(currentDate, 'MMMM yyyy')
                : `${format(startOfWeek(currentDate), 'dd MMM')} - ${format(endOfWeek(currentDate), 'dd MMM yyyy')}`
              }
            </h3>
            
            <Button variant="outline" size="sm" onClick={() => navigateCalendar('next')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {view === 'monthly' ? (
            // Monthly Grid View
            <div className="space-y-4">
              {/* Days of Week Header */}
              <div className="grid grid-cols-7 gap-2 text-center text-sm font-medium text-muted-foreground">
                {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
                  <div key={day} className="p-2">{day}</div>
                ))}
              </div>
              
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-2">
                {calendarDates.map(date => {
                  const dateStr = format(date, 'yyyy-MM-dd');
                  const status = getDayStatus(dateStr);
                  const bookingsCount = getBookingsForDate(dateStr).length;
                  const isCurrentMonth = isSameMonth(date, currentDate);
                  
                  return (
                    <div
                      key={dateStr}
                      onClick={() => setSelectedDate(dateStr)}
                      className={cn(
                        "relative p-2 h-16 border rounded-lg cursor-pointer transition-colors",
                        "hover:bg-muted/50",
                        !isCurrentMonth && "opacity-50",
                        selectedDate === dateStr && "ring-2 ring-primary",
                        status === 'available' && "bg-green-50 border-green-200",
                        status === 'partial' && "bg-yellow-50 border-yellow-200",
                        status === 'blocked' && "bg-red-50 border-red-200",
                        status === 'unavailable' && "bg-gray-50 border-gray-200"
                      )}
                    >
                      <div className="text-sm font-medium">
                        {format(date, 'd')}
                      </div>
                      
                      {bookingsCount > 0 && (
                        <Badge variant="secondary" className="absolute bottom-1 right-1 text-xs px-1">
                          {bookingsCount}
                        </Badge>
                      )}
                      
                      {status === 'blocked' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs">✕</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            // Weekly Time Slots View
            <CalendarTimeSlots
              dates={calendarDates}
              availability={availability}
              bookings={bookings}
              onBookingClick={setSelectedBooking}
              onDateSelect={setSelectedDate}
            />
          )}
        </CardContent>
      </Card>

      {/* Status Legend */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
              <span>Disponibile</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-50 border border-yellow-200 rounded"></div>
              <span>Parzialmente occupato</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-50 border border-red-200 rounded"></div>
              <span>Bloccato</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-50 border border-gray-200 rounded"></div>
              <span>Non disponibile</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <BlockingPanel
        isOpen={isBlockingPanelOpen}
        onClose={() => setIsBlockingPanelOpen(false)}
        availability={availability}
        onAvailabilityChange={onAvailabilityChange}
        selectedDate={selectedDate}
      />

      <BookingDetailsModal
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
        spaceId={spaceId}
      />
    </div>
  );
};