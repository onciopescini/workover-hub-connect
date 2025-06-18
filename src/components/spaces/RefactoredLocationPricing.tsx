
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { AddressAutocomplete } from "./AddressAutocomplete";
import { SpaceFormData } from "@/schemas/spaceSchema";

export const RefactoredLocationPricing = () => {
  const form = useFormContext<SpaceFormData>();

  const handleAddressChange = (address: string, coordinates?: { lat: number; lng: number }) => {
    form.setValue("address", address);
    if (coordinates) {
      form.setValue("latitude", coordinates.lat);
      form.setValue("longitude", coordinates.lng);
    }
    // Clear any address validation errors
    form.clearErrors("address");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Location & Pricing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Address <span className="text-red-500">*</span>
              </FormLabel>
              <FormControl>
                <AddressAutocomplete
                  value={field.value || ""}
                  onChange={handleAddressChange}
                  error={form.formState.errors.address?.message}
                  disabled={false}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="price_per_hour"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Hourly Rate ($) <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="price_per_day"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Daily Rate ($) <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </CardContent>
    </Card>
  );
};
