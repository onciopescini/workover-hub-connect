import { useFormContext } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { SpaceFormData } from "@/schemas/spaceSchema";
import { 
  WORKSPACE_FEATURES_OPTIONS, 
  AMENITIES_OPTIONS, 
  SEATING_TYPES_OPTIONS,
  IDEAL_GUEST_OPTIONS,
  EVENT_FRIENDLY_OPTIONS,
  WORK_ENVIRONMENT_OPTIONS,
  CONFIRMATION_TYPE_OPTIONS
} from "@/types/space";

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
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>
                  Work Environment <span className="text-red-500">*</span>
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className={fieldState.error ? "border-red-500 focus:ring-red-500" : ""}>
                      <SelectValue placeholder="Select work environment" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {WORK_ENVIRONMENT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-sm text-gray-500">{option.description}</div>
                        </div>
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
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>
                  Maximum Capacity <span className="text-red-500">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    className={fieldState.error ? "border-red-500 focus-visible:ring-red-500" : ""}
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
          render={({ field, fieldState }) => (
            <FormItem>
              <FormLabel>
                Booking Confirmation <span className="text-red-500">*</span>
              </FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger className={fieldState.error ? "border-red-500 focus:ring-red-500" : ""}>
                    <SelectValue placeholder="Select confirmation type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {CONFIRMATION_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div>
                        <div className="font-medium">{option.label}</div>
                        <div className="text-sm text-gray-500">{option.description}</div>
                      </div>
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
                {WORKSPACE_FEATURES_OPTIONS.map((feature) => (
                  <FormField
                    key={feature}
                    control={form.control}
                    name="workspace_features"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(feature)}
                            onCheckedChange={(checked) => {
                              return checked
                                ? field.onChange([...field.value, feature])
                                : field.onChange(
                                    field.value?.filter((value) => value !== feature)
                                  );
                            }}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal">
                          {feature}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
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
                {AMENITIES_OPTIONS.map((amenity) => (
                  <FormField
                    key={amenity}
                    control={form.control}
                    name="amenities"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(amenity)}
                            onCheckedChange={(checked) => {
                              return checked
                                ? field.onChange([...field.value, amenity])
                                : field.onChange(
                                    field.value?.filter((value) => value !== amenity)
                                  );
                            }}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal">
                          {amenity}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
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
                {SEATING_TYPES_OPTIONS.map((seating) => (
                  <FormField
                    key={seating}
                    control={form.control}
                    name="seating_types"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(seating)}
                            onCheckedChange={(checked) => {
                              return checked
                                ? field.onChange([...field.value, seating])
                                : field.onChange(
                                    field.value?.filter((value) => value !== seating)
                                  );
                            }}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal">
                          {seating}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="ideal_guest_tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Ideal Guest Types</FormLabel>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {IDEAL_GUEST_OPTIONS.map((guest) => (
                  <FormField
                    key={guest}
                    control={form.control}
                    name="ideal_guest_tags"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(guest)}
                            onCheckedChange={(checked) => {
                              return checked
                                ? field.onChange([...field.value, guest])
                                : field.onChange(
                                    field.value?.filter((value) => value !== guest)
                                  );
                            }}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal">
                          {guest}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="event_friendly_tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Event Friendly Tags</FormLabel>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {EVENT_FRIENDLY_OPTIONS.map((event) => (
                  <FormField
                    key={event}
                    control={form.control}
                    name="event_friendly_tags"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(event)}
                            onCheckedChange={(checked) => {
                              return checked
                                ? field.onChange([...field.value, event])
                                : field.onChange(
                                    field.value?.filter((value) => value !== event)
                                  );
                            }}
                          />
                        </FormControl>
                        <FormLabel className="text-sm font-normal">
                          {event}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="rules"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Space Rules (Optional)</FormLabel>
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
