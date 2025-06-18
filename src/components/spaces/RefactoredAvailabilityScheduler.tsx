
import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AvailabilityScheduler } from "./AvailabilityScheduler";
import { SpaceFormData } from "@/schemas/spaceSchema";
import { type AvailabilityData, type DaySchedule, type WeeklySchedule } from "@/types/availability";

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
                availability={field.value}
                onAvailabilityChange={(availability: AvailabilityData) => {
                  // Create properly typed normalized availability ensuring required properties
                  const createDaySchedule = (dayData: DaySchedule | undefined): DaySchedule => ({
                    enabled: Boolean(dayData?.enabled ?? false),
                    slots: dayData?.slots ?? []
                  });

                  const normalizedRecurring: WeeklySchedule = {
                    monday: createDaySchedule(availability.recurring?.monday),
                    tuesday: createDaySchedule(availability.recurring?.tuesday),
                    wednesday: createDaySchedule(availability.recurring?.wednesday),
                    thursday: createDaySchedule(availability.recurring?.thursday),
                    friday: createDaySchedule(availability.recurring?.friday),
                    saturday: createDaySchedule(availability.recurring?.saturday),
                    sunday: createDaySchedule(availability.recurring?.sunday)
                  };

                  const normalizedAvailability: AvailabilityData = {
                    recurring: normalizedRecurring,
                    exceptions: availability.exceptions ?? []
                  };

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
