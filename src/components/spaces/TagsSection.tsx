
import React from 'react';
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  IDEAL_GUEST_OPTIONS,
  EVENT_FRIENDLY_OPTIONS,
} from "@/types/space";

interface TagsSectionProps {
  idealGuestTags: string[];
  eventFriendlyTags: string[];
  onCheckboxArrayChange: (field: string, value: string, checked: boolean) => void;
}

export const TagsSection = ({
  idealGuestTags,
  eventFriendlyTags,
  onCheckboxArrayChange
}: TagsSectionProps) => {
  return (
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
  );
};
