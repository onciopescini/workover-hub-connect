
import React from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { CONFIRMATION_TYPE_OPTIONS } from "@/types/space";

interface CapacityConfirmationSectionProps {
  maxCapacity: number;
  confirmationType: string;
  onInputChange: (field: string, value: any) => void;
  errors: Record<string, string>;
  isSubmitting: boolean;
}

export const CapacityConfirmationSection = ({
  maxCapacity,
  confirmationType,
  onInputChange,
  errors,
  isSubmitting
}: CapacityConfirmationSectionProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-2">
        <Label htmlFor="max_capacity">
          Maximum Capacity <span className="text-red-500">*</span>
        </Label>
        <Input
          id="max_capacity"
          type="number"
          min="1"
          value={maxCapacity || "1"}
          onChange={(e) => onInputChange("max_capacity", parseInt(e.target.value))}
          disabled={isSubmitting}
        />
        {errors.max_capacity && (
          <p className="text-sm text-red-500">{errors.max_capacity}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmation_type">Booking Confirmation</Label>
        <RadioGroup
          value={confirmationType || "host_approval"}
          onValueChange={(value) => onInputChange("confirmation_type", value)}
          className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2"
        >
          {CONFIRMATION_TYPE_OPTIONS.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <RadioGroupItem id={`conf-${option.value}`} value={option.value} />
              <Label htmlFor={`conf-${option.value}`} className="cursor-pointer">
                <div className="font-medium">{option.label}</div>
                <div className="text-xs text-gray-500">{option.description}</div>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </div>
    </div>
  );
};
