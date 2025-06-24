
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { WorkEnvironmentSection } from "./WorkEnvironmentSection";
import { CapacityConfirmationSection } from "./CapacityConfirmationSection";
import { FeaturesSection } from "./FeaturesSection";
import { TagsSection } from "./TagsSection";
import { RulesSection } from "./RulesSection";

interface SpaceDetailsProps {
  workEnvironment: string;
  maxCapacity: number;
  confirmationType: string;
  workspaceFeatures: string[];
  amenities: string[];
  seatingTypes: string[];
  idealGuestTags: string[];
  eventFriendlyTags: string[];
  rules: string;
  onInputChange: (field: string, value: any) => void;
  onCheckboxArrayChange: (field: string, value: string, checked: boolean) => void;
  errors: Record<string, string>;
  isSubmitting: boolean;
}

export const SpaceDetails = ({
  workEnvironment,
  maxCapacity,
  confirmationType,
  workspaceFeatures,
  amenities,
  seatingTypes,
  idealGuestTags,
  eventFriendlyTags,
  rules,
  onInputChange,
  onCheckboxArrayChange,
  errors,
  isSubmitting
}: SpaceDetailsProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Space Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <WorkEnvironmentSection
          workEnvironment={workEnvironment}
          onInputChange={onInputChange}
          errors={errors}
          isSubmitting={isSubmitting}
        />

        <CapacityConfirmationSection
          maxCapacity={maxCapacity}
          confirmationType={confirmationType}
          onInputChange={onInputChange}
          errors={errors}
          isSubmitting={isSubmitting}
        />

        <Separator />

        <FeaturesSection
          workspaceFeatures={workspaceFeatures}
          amenities={amenities}
          seatingTypes={seatingTypes}
          onCheckboxArrayChange={onCheckboxArrayChange}
        />

        <Separator />

        <TagsSection
          idealGuestTags={idealGuestTags}
          eventFriendlyTags={eventFriendlyTags}
          onCheckboxArrayChange={onCheckboxArrayChange}
        />

        <Separator />

        <RulesSection
          rules={rules}
          onInputChange={onInputChange}
          isSubmitting={isSubmitting}
        />
      </CardContent>
    </Card>
  );
};
