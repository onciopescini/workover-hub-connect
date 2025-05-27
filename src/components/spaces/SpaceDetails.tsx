
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  WORKSPACE_FEATURES_OPTIONS,
  AMENITIES_OPTIONS,
  SEATING_TYPES_OPTIONS,
  WORK_ENVIRONMENT_OPTIONS,
  CONFIRMATION_TYPE_OPTIONS,
  EVENT_FRIENDLY_OPTIONS,
  IDEAL_GUEST_OPTIONS,
} from "@/types/space";

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
          {errors.work_environment && (
            <p className="text-sm text-red-500">{errors.work_environment}</p>
          )}
        </div>

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

        <Separator />

        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Workspace Features</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {WORKSPACE_FEATURES_OPTIONS.map((feature) => (
                <div key={feature} className="flex items-center space-x-2">
                  <Checkbox
                    id={`feature-${feature}`}
                    checked={(workspaceFeatures || []).includes(feature)}
                    onCheckedChange={(checked) => 
                      onCheckboxArrayChange("workspace_features", feature, checked === true)
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

        <Separator />

        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Ideal For (Optional)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {IDEAL_GUEST_OPTIONS.map((tag) => (
                <div key={tag} className="flex items-center space-x-2">
                  <Checkbox
                    id={`ideal-${tag}`}
                    checked={(idealGuestTags || []).includes(tag)}
                    onCheckedChange={(checked) => 
                      onCheckboxArrayChange("ideal_guest_tags", tag, checked === true)
                    }
                  />
                  <Label htmlFor={`ideal-${tag}`} className="cursor-pointer">
                    {tag}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">Event-Friendly For (Optional)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {EVENT_FRIENDLY_OPTIONS.map((tag) => (
                <div key={tag} className="flex items-center space-x-2">
                  <Checkbox
                    id={`event-${tag}`}
                    checked={(eventFriendlyTags || []).includes(tag)}
                    onCheckedChange={(checked) => 
                      onCheckboxArrayChange("event_friendly_tags", tag, checked === true)
                    }
                  />
                  <Label htmlFor={`event-${tag}`} className="cursor-pointer">
                    {tag}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <Separator />

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
      </CardContent>
    </Card>
  );
};
