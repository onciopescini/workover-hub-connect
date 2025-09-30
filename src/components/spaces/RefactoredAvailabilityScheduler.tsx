import { useState } from "react";
import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AvailabilityScheduler } from "./AvailabilityScheduler";
import { AdvancedCalendarView, ConflictManagementSystem } from "./calendar";
import { SpaceFormData } from "@/schemas/spaceSchema";
import { type AvailabilityData, type DaySchedule, type WeeklySchedule, type TimeSlot } from "@/types/availability";
import { Calendar, Settings } from "lucide-react";
import { sreLogger } from '@/lib/sre-logger';

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

export const RefactoredAvailabilityScheduler = () => {
  const form = useFormContext<SpaceFormData>();
  const [viewMode, setViewMode] = useState<'basic' | 'advanced'>('basic');

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
      <CardContent>
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
                    bookings={[]} // TODO: Pass real bookings
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
                    spaceId="calendar-space"
                    bookings={[]} // TODO: Pass real bookings
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
