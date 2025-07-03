
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddressAutocomplete } from "./AddressAutocomplete";

interface LocationPricingProps {
  address: string;
  pricePerHour: number;
  pricePerDay: number;
  onInputChange: (field: string, value: any) => void;
  onAddressChange: (address: string, coordinates?: { lat: number; lng: number }) => void;
  errors: Record<string, string>;
  isSubmitting: boolean;
}

export const LocationPricing = ({
  address,
  pricePerHour,
  pricePerDay,
  onInputChange,
  onAddressChange,
  errors,
  isSubmitting
}: LocationPricingProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Location & Pricing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <AddressAutocomplete
          value={address || ""}
          onChange={onAddressChange}
          error={errors['address'] ?? ''}
          disabled={isSubmitting}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="price_per_hour">
              Hourly Rate ($) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="price_per_hour"
              type="number"
              min="0"
              step="0.01"
              value={pricePerHour || ""}
              onChange={(e) => onInputChange("price_per_hour", parseFloat(e.target.value))}
              disabled={isSubmitting}
            />
            {errors['price_per_hour'] && (
              <p className="text-sm text-red-500">{errors['price_per_hour']}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="price_per_day">
              Daily Rate ($) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="price_per_day"
              type="number"
              min="0"
              step="0.01"
              value={pricePerDay || ""}
              onChange={(e) => onInputChange("price_per_day", parseFloat(e.target.value))}
              disabled={isSubmitting}
            />
            {errors['price_per_day'] && (
              <p className="text-sm text-red-500">{errors['price_per_day']}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
