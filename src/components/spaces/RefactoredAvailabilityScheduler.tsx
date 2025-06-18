
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
                onAvailabilityChange={(availability) => {
                  // Create properly typed normalized availability
                  const normalizedRecurring: WeeklySchedule = {
                    monday: {
                      enabled: Boolean(availability.recurring.monday?.enabled || false),
                      slots: availability.recurring.monday?.slots || []
                    },
                    tuesday: {
                      enabled: Boolean(availability.recurring.tuesday?.enabled || false),
                      slots: availability.recurring.tuesday?.slots || []
                    },
                    wednesday: {
                      enabled: Boolean(availability.recurring.wednesday?.enabled || false),
                      slots: availability.recurring.wednesday?.slots || []
                    },
                    thursday: {
                      enabled: Boolean(availability.recurring.thursday?.enabled || false),
                      slots: availability.recurring.thursday?.slots || []
                    },
                    friday: {
                      enabled: Boolean(availability.recurring.friday?.enabled || false),
                      slots: availability.recurring.friday?.slots || []
                    },
                    saturday: {
                      enabled: Boolean(availability.recurring.saturday?.enabled || false),
                      slots: availability.recurring.saturday?.slots || []
                    },
                    sunday: {
                      enabled: Boolean(availability.recurring.sunday?.enabled || false),
                      slots: availability.recurring.sunday?.slots || []
                    }
                  };

                  const normalizedAvailability: AvailabilityData = {
                    recurring: normalizedRecurring,
                    exceptions: availability.exceptions || []
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
