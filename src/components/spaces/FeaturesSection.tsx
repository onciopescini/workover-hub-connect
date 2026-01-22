
import React from 'react';
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  SPACE_FEATURES_OPTIONS,
  AMENITIES_OPTIONS,
  SEATING_TYPES_OPTIONS,
} from "@/types/space";

interface FeaturesSectionProps {
  features: string[];
  amenities: string[];
  seatingTypes: string[];
  onCheckboxArrayChange: (field: string, value: string, checked: boolean) => void;
}

export const FeaturesSection = ({
  features,
  amenities,
  seatingTypes,
  onCheckboxArrayChange
}: FeaturesSectionProps) => {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium mb-2">Space Features</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {SPACE_FEATURES_OPTIONS.map((feature) => (
            <div key={feature} className="flex items-center space-x-2">
              <Checkbox
                id={`feature-${feature}`}
                checked={(features || []).includes(feature)}
                onCheckedChange={(checked) => 
                  onCheckboxArrayChange("features", feature, checked === true)
                }
              />
              <Label htmlFor={`feature-${feature}`} className="cursor-pointer">
                {feature}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-medium mb-2">Amenities</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {AMENITIES_OPTIONS.map((amenity) => (
            <div key={amenity} className="flex items-center space-x-2">
              <Checkbox
                id={`amenity-${amenity}`}
                checked={(amenities || []).includes(amenity)}
                onCheckedChange={(checked) => 
                  onCheckboxArrayChange("amenities", amenity, checked === true)
                }
              />
              <Label htmlFor={`amenity-${amenity}`} className="cursor-pointer">
                {amenity}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-medium mb-2">Seating Options</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {SEATING_TYPES_OPTIONS.map((seating) => (
            <div key={seating} className="flex items-center space-x-2">
              <Checkbox
                id={`seating-${seating}`}
                checked={(seatingTypes || []).includes(seating)}
                onCheckedChange={(checked) => 
                  onCheckboxArrayChange("seating_types", seating, checked === true)
                }
              />
              <Label htmlFor={`seating-${seating}`} className="cursor-pointer">
                {seating}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
