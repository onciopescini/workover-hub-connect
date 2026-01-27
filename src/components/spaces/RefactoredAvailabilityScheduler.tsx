import { useState, useMemo } from "react";
import { useFormContext } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AvailabilityScheduler } from "./AvailabilityScheduler";
import { AdvancedCalendarView, ConflictManagementSystem } from "./calendar";
import { SpaceFormData } from "@/schemas/spaceSchema";
import { type AvailabilityData, type DaySchedule, type WeeklySchedule, type TimeSlot } from "@/types/availability";
import { Calendar, Settings, AlertTriangle } from "lucide-react";
import { sreLogger } from '@/lib/sre-logger';
import { getBookingsForSpace } from "@/services/api/bookingService";

// Robust normalization function that ensures strict AvailabilityData compliance
const normalizeAvailabilityData = (data: any): AvailabilityData => {
  // Normalize a single day schedule
  const normalizeDaySchedule = (dayData: any): DaySchedule => {
    return {
      enabled: Boolean(dayData?.enabled ?? false),
      slots: Array.isArray(dayData?.slots) 
        ? dayData.slots.map((slot: any): TimeSlot => ({
            start: String(slot?.start ?? '09:00'),
            end: String(slot?.end ?? '17:00')
          }))
        : []
    };
  };

  // Normalize the weekly schedule
  const normalizeWeeklySchedule = (recurring: any): WeeklySchedule => {
    return {
      monday: normalizeDaySchedule(recurring?.monday),
      tuesday: normalizeDaySchedule(recurring?.tuesday),
      wednesday: normalizeDaySchedule(recurring?.wednesday),
      thursday: normalizeDaySchedule(recurring?.thursday),
      friday: normalizeDaySchedule(recurring?.friday),
      saturday: normalizeDaySchedule(recurring?.saturday),
      sunday: normalizeDaySchedule(recurring?.sunday)
    };
  };

  // Return fully normalized AvailabilityData
  return {
    recurring: normalizeWeeklySchedule(data?.recurring),
    exceptions: Array.isArray(data?.exceptions) ? data.exceptions.map((exception: any) => ({
      date: String(exception?.date ?? ''),
      enabled: Boolean(exception?.enabled ?? false),
      slots: Array.isArray(exception?.slots)
        ? exception.slots.map((slot: any): TimeSlot => ({
            start: String(slot?.start ?? '09:00'),
            end: String(slot?.end ?? '17:00')
          }))
        : undefined
    })) : []
  };
};

interface RefactoredAvailabilitySchedulerProps {
  spaceId?: string | undefined; // Optional - undefined for new spaces
}

export const RefactoredAvailabilityScheduler = ({ spaceId }: RefactoredAvailabilitySchedulerProps) => {
  const form = useFormContext<SpaceFormData>();
  const [viewMode, setViewMode] = useState<'basic' | 'advanced'>('basic');

  // Fetch real bookings for the space (only in edit mode with advanced view)
  const { data: bookingsData } = useQuery({
    queryKey: ['space-bookings-scheduler', spaceId],
    queryFn: async () => {
      if (!spaceId) return [];
      const result = await getBookingsForSpace(spaceId);
      if (!result.success || !result.bookings) return [];
      
      // Transform to match the expected interface for conflict detection
      return result.bookings.map(b => ({
        id: b.id,
        booking_date: b.booking_date,
        start_time: b.start_time || '00:00',
        end_time: b.end_time || '23:59',
        status: b.status || 'pending',
        user_id: b.user_id || ''
      }));
    },
    enabled: !!spaceId && viewMode === 'advanced',
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const spaceBookings = bookingsData || [];

  // Check if at least one day is enabled with time slots
  const hasAtLeastOneDay = useMemo(() => {
    const availability = form.watch('availability');
    if (!availability?.recurring) return false;
    
    return Object.values(availability.recurring).some(
      day => day.enabled && day.slots && day.slots.length > 0
    );
  }, [form.watch('availability')]);

  // Check if space is published
  const isPublished = form.watch('published');

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Gestione Disponibilità</CardTitle>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'basic' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('basic')}
            >
              <Settings className="w-4 h-4 mr-2" />
              Base
            </Button>
            <Button
              variant={viewMode === 'advanced' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('advanced')}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Avanzato
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!hasAtLeastOneDay && (
          <Alert variant="destructive" className="border-red-500 bg-red-50">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-800">
              <strong>Attenzione:</strong> Devi abilitare almeno un giorno con una fascia oraria.
              {isPublished && " Questo è obbligatorio per pubblicare lo spazio."}
            </AlertDescription>
          </Alert>
        )}
        
        <FormField
          control={form.control}
          name="availability"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Imposta la tua disponibilità <span className="text-red-500">*</span>
              </FormLabel>
              
              {viewMode === 'basic' ? (
                <AvailabilityScheduler
                  availability={normalizeAvailabilityData(field.value)}
                  onAvailabilityChange={(availability: AvailabilityData) => {
                    const normalizedAvailability = normalizeAvailabilityData(availability);
                    field.onChange(normalizedAvailability);
                  }}
                  isSubmitting={false}
                />
              ) : (
                <div className="space-y-6">
                  <ConflictManagementSystem
                    availability={normalizeAvailabilityData(field.value)}
                    bookings={spaceBookings}
                    onConflictResolved={(bookingId, action) => {
                      sreLogger.info('Conflict resolved', { 
                        context: 'RefactoredAvailabilityScheduler',
                        bookingId, 
                        action 
                      });
                    }}
                  />
                  
                  <AdvancedCalendarView
                    availability={normalizeAvailabilityData(field.value)}
                    onAvailabilityChange={(availability: AvailabilityData) => {
                      const normalizedAvailability = normalizeAvailabilityData(availability);
                      field.onChange(normalizedAvailability);
                    }}
                    spaceId={spaceId || 'new-space'}
                    bookings={spaceBookings}
                  />
                </div>
              )}
              
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};
