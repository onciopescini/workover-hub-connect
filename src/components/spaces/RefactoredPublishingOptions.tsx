
import { useFormContext } from "react-hook-form";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { SpaceFormData } from "@/schemas/spaceSchema";

export const RefactoredPublishingOptions = () => {
  const form = useFormContext<SpaceFormData>();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Publishing Options</CardTitle>
      </CardHeader>
      <CardContent>
        <FormField
          control={form.control}
          name="published"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between">
              <div className="space-y-1">
                <FormLabel className="text-base">Publish this space</FormLabel>
                <p className="text-sm text-gray-500">
                  When published, your space will be visible to coworkers for booking
                </p>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};
