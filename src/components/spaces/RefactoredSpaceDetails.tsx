
import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { SpaceFormData } from "@/schemas/spaceSchema";

const WORK_ENVIRONMENTS = [
  { value: "controlled", label: "Controlled (Quiet, focused environment)" },
  { value: "shared", label: "Shared (Some background activity)" },
  { value: "open", label: "Open (Dynamic, social environment)" },
];

const CONFIRMATION_TYPES = [
  { value: "instant", label: "Instant Booking" },
  { value: "host_approval", label: "Host Approval Required" },
];

const WORKSPACE_FEATURES = [
  "High-Speed WiFi", "Printer Access", "Whiteboard", "Projector", 
  "Video Conferencing", "Adjustable Desk", "Monitor", "Natural Light"
];

const AMENITIES = [
  "Coffee/Tea", "Kitchen Access", "Parking", "Security", 
  "Air Conditioning", "Heating", "Phone Booth", "Reception"
];

const SEATING_TYPES = [
  "Desk Chair", "Standing Desk", "Lounge Chair", "Sofa", 
  "Bean Bag", "Conference Table", "Bar Stool", "Floor Cushions"
];

const IDEAL_GUEST_TAGS = [
  "Freelancer", "Startup", "Remote Worker", "Creative", 
  "Developer", "Designer", "Writer", "Consultant"
];

const EVENT_FRIENDLY_TAGS = [
  "Workshop", "Meetup", "Networking", "Training", 
  "Presentation", "Brainstorming", "Team Building", "Conference"
];

export const RefactoredSpaceDetails = () => {
  const form = useFormContext<SpaceFormData>();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Space Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="work_environment"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Work Environment <span className="text-red-500">*</span>
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select environment" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {WORK_ENVIRONMENTS.map((env) => (
                      <SelectItem key={env.value} value={env.value}>
                        {env.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="max_capacity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Maximum Capacity <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    {...field}
                    onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="confirmation_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                Booking Confirmation <span className="text-red-500">*</span>
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select confirmation type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CONFIRMATION_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="workspace_features"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Workspace Features</FormLabel>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {WORKSPACE_FEATURES.map((feature) => (
                  <FormItem key={feature} className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value?.includes(feature)}
                        onCheckedChange={(checked) => {
                          const updatedValue = checked
                            ? [...(field.value || []), feature]
                            : field.value?.filter((value) => value !== feature) || [];
                          field.onChange(updatedValue);
                        }}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal">
                      {feature}
                    </FormLabel>
                  </FormItem>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amenities"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amenities</FormLabel>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {AMENITIES.map((amenity) => (
                  <FormItem key={amenity} className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value?.includes(amenity)}
                        onCheckedChange={(checked) => {
                          const updatedValue = checked
                            ? [...(field.value || []), amenity]
                            : field.value?.filter((value) => value !== amenity) || [];
                          field.onChange(updatedValue);
                        }}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal">
                      {amenity}
                    </FormLabel>
                  </FormItem>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="seating_types"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Seating Types</FormLabel>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {SEATING_TYPES.map((seating) => (
                  <FormItem key={seating} className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value?.includes(seating)}
                        onCheckedChange={(checked) => {
                          const updatedValue = checked
                            ? [...(field.value || []), seating]
                            : field.value?.filter((value) => value !== seating) || [];
                          field.onChange(updatedValue);
                        }}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal">
                      {seating}
                    </FormLabel>
                  </FormItem>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="ideal_guest_tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ideal for</FormLabel>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {IDEAL_GUEST_TAGS.map((tag) => (
                  <FormItem key={tag} className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value?.includes(tag)}
                        onCheckedChange={(checked) => {
                          const updatedValue = checked
                            ? [...(field.value || []), tag]
                            : field.value?.filter((value) => value !== tag) || [];
                          field.onChange(updatedValue);
                        }}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal">
                      {tag}
                    </FormLabel>
                  </FormItem>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="event_friendly_tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Friendly</FormLabel>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {EVENT_FRIENDLY_TAGS.map((tag) => (
                  <FormItem key={tag} className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value?.includes(tag)}
                        onCheckedChange={(checked) => {
                          const updatedValue = checked
                            ? [...(field.value || []), tag]
                            : field.value?.filter((value) => value !== tag) || [];
                          field.onChange(updatedValue);
                        }}
                      />
                    </FormControl>
                    <FormLabel className="text-sm font-normal">
                      {tag}
                    </FormLabel>
                  </FormItem>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="rules"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Space Rules</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Any specific rules or guidelines for using this space..."
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};
