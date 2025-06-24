
import React from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface RulesSectionProps {
  rules: string;
  onInputChange: (field: string, value: any) => void;
  isSubmitting: boolean;
}

export const RulesSection = ({
  rules,
  onInputChange,
  isSubmitting
}: RulesSectionProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="rules">
        House Rules (Optional)
      </Label>
      <Textarea
        id="rules"
        value={rules || ""}
        onChange={(e) => onInputChange("rules", e.target.value)}
        placeholder="Any specific rules guests should follow?"
        className="min-h-[100px]"
        disabled={isSubmitting}
      />
    </div>
  );
};
