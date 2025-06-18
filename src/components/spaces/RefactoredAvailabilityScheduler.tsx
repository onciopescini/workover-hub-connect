
import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AvailabilityScheduler } from "./AvailabilityScheduler";
import { SpaceFormData } from "@/schemas/spaceSchema";
import { type AvailabilityData, type DaySchedule, type WeeklySchedule, type TimeSlot } from "@/types/availability";

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
      available: Boolean(exception?.available ?? false),
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Availability Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        <FormField
          control={form.control}
          name="availability"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Set your availability <span className="text-red-500">*</span>
              </FormLabel>
              <AvailabilityScheduler
                availability={normalizeAvailabilityData(field.value)}
                onAvailabilityChange={(availability: AvailabilityData) => {
                  // The data is already properly typed from AvailabilityScheduler
                  // but we normalize again to be absolutely certain
                  const normalizedAvailability = normalizeAvailabilityData(availability);
                  field.onChange(normalizedAvailability);
                }}
                isSubmitting={false}
              />
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};
