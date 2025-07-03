
import React from 'react';
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { WORK_ENVIRONMENT_OPTIONS } from "@/types/space";

interface WorkEnvironmentSectionProps {
  workEnvironment: string;
  onInputChange: (field: string, value: any) => void;
  errors: Record<string, string>;
  isSubmitting: boolean;
}

export const WorkEnvironmentSection = ({
  workEnvironment,
  onInputChange,
  errors,
  isSubmitting
}: WorkEnvironmentSectionProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="work_environment">
        Work Environment <span className="text-red-500">*</span>
      </Label>
      <RadioGroup
        value={workEnvironment || "controlled"}
        onValueChange={(value) => onInputChange("work_environment", value)}
        className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2"
      >
        {WORK_ENVIRONMENT_OPTIONS.map((option) => (
          <div key={option.value} className="flex items-center space-x-2">
            <RadioGroupItem id={`env-${option.value}`} value={option.value} />
            <Label htmlFor={`env-${option.value}`} className="cursor-pointer">
              <div className="font-medium">{option.label}</div>
              <div className="text-sm text-gray-500">{option.description}</div>
            </Label>
          </div>
        ))}
      </RadioGroup>
      {errors['work_environment'] && (
        <p className="text-sm text-red-500">{errors['work_environment']}</p>
      )}
    </div>
  );
};
