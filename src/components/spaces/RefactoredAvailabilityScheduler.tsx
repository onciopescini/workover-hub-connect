
import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AvailabilityScheduler } from "./AvailabilityScheduler";
import { SpaceFormData } from "@/schemas/spaceSchema";

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
                  // Ensure enabled is always a boolean for each day
                  const normalizedAvailability = {
                    ...availability,
                    recurring: Object.fromEntries(
                      Object.entries(availability.recurring).map(([day, schedule]) => [
                        day,
                        {
                          enabled: Boolean(schedule.enabled),
                          slots: schedule.slots || []
                        }
                      ])
                    )
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
