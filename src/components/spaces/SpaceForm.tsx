
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Upload, X, Plus, Image } from "lucide-react";
import {
  WORKSPACE_FEATURES_OPTIONS,
  AMENITIES_OPTIONS,
  SEATING_TYPES_OPTIONS,
  WORK_ENVIRONMENT_OPTIONS,
  CATEGORY_OPTIONS,
  CONFIRMATION_TYPE_OPTIONS,
  EVENT_FRIENDLY_OPTIONS,
  IDEAL_GUEST_OPTIONS,
  type Space,
  type SpaceInsert
} from "@/types/space";

interface SpaceFormProps {
  initialData?: Space;
  isEdit?: boolean;
}

const SpaceForm = ({ initialData, isEdit = false }: SpaceFormProps) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [formData, setFormData] = useState<Partial<SpaceInsert>>({
    title: "",
    description: "",
    category: "home",
    max_capacity: 1,
    workspace_features: [],
    work_environment: "controlled",
    amenities: [],
    seating_types: [],
    price_per_hour: 0,
    price_per_day: 0,
    address: "",
    photos: [],
    rules: "",
    ideal_guest_tags: [],
    event_friendly_tags: [],
    confirmation_type: "host_approval",
    published: false
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
      });
      
      // If we have photos in the initial data, set up preview URLs
      if (initialData.photos && initialData.photos.length > 0) {
        setPhotoPreviewUrls(initialData.photos as string[]);
      }
    }
  }, [initialData]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = "Title is required";
    }

    if (!formData.description?.trim()) {
      newErrors.description = "Description is required";
    }

    if (!formData.address?.trim()) {
      newErrors.address = "Address is required";
    }

    if (formData.max_capacity === undefined || formData.max_capacity < 1) {
      newErrors.max_capacity = "Capacity must be at least 1";
    }

    if (formData.price_per_hour === undefined || formData.price_per_hour < 0) {
      newErrors.price_per_hour = "Hourly price must be a valid number";
    }

    if (formData.price_per_day === undefined || formData.price_per_day < 0) {
      newErrors.price_per_day = "Daily price must be a valid number";
    }

    if (!formData.category) {
      newErrors.category = "Category is required";
    }

    if (!formData.work_environment) {
      newErrors.work_environment = "Work environment is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
    // Clear error when field is edited
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleCheckboxArrayChange = (field: string, value: string, checked: boolean) => {
    setFormData((prev) => {
      const currentArray = prev[field as keyof typeof prev] as string[] || [];
      const newArray = checked
        ? [...currentArray, value]
        : currentArray.filter(item => item !== value);
      
      return { ...prev, [field]: newArray };
    });
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Convert FileList to array and add to existing files
    const newFiles = Array.from(files);
    setPhotoFiles(prev => [...prev, ...newFiles]);
    
    // Create preview URLs for new files
    const newPreviewUrls = newFiles.map(file => URL.createObjectURL(file));
    setPhotoPreviewUrls(prev => [...prev, ...newPreviewUrls]);
  };

  const removePhoto = (index: number) => {
    // If it's a preview URL from a file we're about to upload
    if (index < photoFiles.length) {
      URL.revokeObjectURL(photoPreviewUrls[index]);
      setPhotoFiles(prev => prev.filter((_, i) => i !== index));
    }
    
    setPhotoPreviewUrls(prev => prev.filter((_, i) => i !== index));
    
    // If it's an existing photo from the database
    if (isEdit && initialData?.photos && index >= photoFiles.length) {
      const dbPhotoIndex = index - photoFiles.length;
      setFormData(prev => ({
        ...prev,
        photos: (prev.photos || []).filter((_, i) => i !== dbPhotoIndex)
      }));
    }
  };

  const uploadPhotos = async (userId: string): Promise<string[]> => {
    if (photoFiles.length === 0) {
      return formData.photos as string[] || [];
    }
    
    setUploadingPhotos(true);
    const uploadedUrls: string[] = [];
    
    try {
      for (const file of photoFiles) {
        const fileExt = file.name.split('.').pop();
  
        const fileName = `${userId}/${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { data, error } = await supabase.storage
          .from('space_photos')
          .upload(filePath, file, {
            upsert: true,
          });

        if (error) {
          throw error;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('space_photos')
          .getPublicUrl(filePath);

        uploadedUrls.push(urlData.publicUrl);
      }
      
      // Combine with existing photos if in edit mode
      return [...(formData.photos as string[] || []), ...uploadedUrls];
    } catch (error) {
      console.error("Error uploading photos:", error);
      throw error;
    } finally {
      setUploadingPhotos(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }
    
    if (!formData.address) {
      alert("Address is required");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("You must be logged in to create a space");
      }

      // Upload photos if there are any
      const photoUrls = await uploadPhotos(user.id);
      
      const spaceData = {
        ...formData,
        title: formData.title!,
        description: formData.description!,
        category: formData.category!,
        max_capacity: formData.max_capacity!,
        workspace_features: formData.workspace_features || [],
        work_environment: formData.work_environment!,
        amenities: formData.amenities || [],
        seating_types: formData.seating_types || [],
        price_per_hour: formData.price_per_hour!,
        price_per_day: formData.price_per_day!,
        address: formData.address!,
        latitude: formData.latitude || 0, // se il campo esiste, altrimenti rimuovi
        longitude: formData.longitude || 0, // idem
        photos: photoUrls,
        rules: formData.rules || "",
        ideal_guest_tags: formData.ideal_guest_tags || [],
        event_friendly_tags: formData.event_friendly_tags || [],
        confirmation_type: formData.confirmation_type!,
        availability: formData.availability || { recurring: [], exceptions: [] },
        published: formData.published ?? false,
        host_id: user.id,
      };
      
      if (isEdit && initialData) {
        // Update existing space
        const { error } = await supabase
          .from("spaces")
          .update(spaceData)
          .eq("id", initialData.id);
          
        if (error) {
          throw error;
        }
        
        toast.success("Space updated successfully!");
      } else {
        // Create new space
        const { data, error } = await supabase
          .from("spaces")
          .insert(spaceData)
          .select("id")
          .single();
          
        if (error) {
          throw error;
        }
        
        toast.success("Space created successfully!");
      }
      
      // Redirect back to manage spaces
      navigate("/spaces/manage");
    } catch (error) {
      console.error("Error saving space:", error);
      toast.error("Failed to save space");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              Space Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              value={formData.title || ""}
              onChange={(e) => handleInputChange("title", e.target.value)}
              placeholder="E.g., Bright Home Office in Downtown"
              disabled={isSubmitting}
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">
              Description <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) => handleInputChange("description", e.target.value)}
              placeholder="Describe your space, amenities, and the work atmosphere"
              className="min-h-[100px]"
              disabled={isSubmitting}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">
              Category <span className="text-red-500">*</span>
            </Label>
            <RadioGroup
              value={formData.category || "home"}
              onValueChange={(value) => handleInputChange("category", value)}
              className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2"
            >
              {CATEGORY_OPTIONS.map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <RadioGroupItem id={`category-${option.value}`} value={option.value} />
                  <Label htmlFor={`category-${option.value}`} className="cursor-pointer">
                    <div className="font-medium">{option.label}</div>
                    <div className="text-sm text-gray-500">{option.description}</div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
            {errors.category && (
              <p className="text-sm text-red-500">{errors.category}</p>
            )}
          </div>
        </CardContent>
      </Card>

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
              value={formData.work_environment || "controlled"}
              onValueChange={(value) => handleInputChange("work_environment", value)}
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
                value={formData.max_capacity || "1"}
                onChange={(e) => handleInputChange("max_capacity", parseInt(e.target.value))}
                disabled={isSubmitting}
              />
              {errors.max_capacity && (
                <p className="text-sm text-red-500">{errors.max_capacity}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmation_type">Booking Confirmation</Label>
              <RadioGroup
                value={formData.confirmation_type || "host_approval"}
                onValueChange={(value) => handleInputChange("confirmation_type", value)}
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
                      checked={(formData.workspace_features || []).includes(feature)}
                      onCheckedChange={(checked) => 
                        handleCheckboxArrayChange("workspace_features", feature, checked === true)
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
                      checked={(formData.amenities || []).includes(amenity)}
                      onCheckedChange={(checked) => 
                        handleCheckboxArrayChange("amenities", amenity, checked === true)
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
                      checked={(formData.seating_types || []).includes(seating)}
                      onCheckedChange={(checked) => 
                        handleCheckboxArrayChange("seating_types", seating, checked === true)
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
                      checked={(formData.ideal_guest_tags || []).includes(tag)}
                      onCheckedChange={(checked) => 
                        handleCheckboxArrayChange("ideal_guest_tags", tag, checked === true)
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
                      checked={(formData.event_friendly_tags || []).includes(tag)}
                      onCheckedChange={(checked) => 
                        handleCheckboxArrayChange("event_friendly_tags", tag, checked === true)
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
              value={formData.rules || ""}
              onChange={(e) => handleInputChange("rules", e.target.value)}
              placeholder="Any specific rules guests should follow?"
              className="min-h-[100px]"
              disabled={isSubmitting}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Location & Pricing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="address">
              Full Address <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="address"
              value={formData.address || ""}
              onChange={(e) => handleInputChange("address", e.target.value)}
              placeholder="Full address including street, city, state, and zip code"
              className="min-h-[80px]"
              disabled={isSubmitting}
            />
            {errors.address && (
              <p className="text-sm text-red-500">{errors.address}</p>
            )}
            <p className="text-sm text-gray-500">
              This address will be used to show the location on a map. 
              For privacy, we'll only show the approximate location to guests.
            </p>
          </div>

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
                value={formData.price_per_hour || ""}
                onChange={(e) => handleInputChange("price_per_hour", parseFloat(e.target.value))}
                disabled={isSubmitting}
              />
              {errors.price_per_hour && (
                <p className="text-sm text-red-500">{errors.price_per_hour}</p>
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
                value={formData.price_per_day || ""}
                onChange={(e) => handleInputChange("price_per_day", parseFloat(e.target.value))}
                disabled={isSubmitting}
              />
              {errors.price_per_day && (
                <p className="text-sm text-red-500">{errors.price_per_day}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Photos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {photoPreviewUrls.map((url, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square bg-gray-100 rounded-md overflow-hidden border border-gray-200">
                  <img
                    src={url}
                    alt={`Space photo ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  className="absolute top-1 right-1 bg-black bg-opacity-50 rounded-full p-1
                            text-white hover:bg-opacity-70 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}

            <div className="aspect-square bg-gray-50 rounded-md border-2 border-dashed border-gray-200 
                       flex flex-col items-center justify-center p-4 hover:bg-gray-100 transition-colors">
              <label className="cursor-pointer text-center w-full h-full flex flex-col items-center justify-center">
                <Image className="w-8 h-8 mb-2 text-gray-400" />
                <span className="text-sm text-gray-500">Add Photo</span>
                <span className="text-xs text-gray-400 mt-1">Click to upload</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoChange}
                  className="hidden"
                  disabled={isSubmitting || uploadingPhotos}
                />
              </label>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Add high-quality photos that showcase your space well. You can upload multiple photos.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Publishing Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label htmlFor="published" className="text-base">Publish this space</Label>
              <p className="text-sm text-gray-500">
                When published, your space will be visible to coworkers for booking
              </p>
            </div>
            <Switch
              id="published"
              checked={!!formData.published}
              onCheckedChange={(checked) => handleInputChange("published", checked)}
              disabled={isSubmitting}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate("/spaces/manage")}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="bg-blue-500 hover:bg-blue-600"
          disabled={isSubmitting || uploadingPhotos}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isEdit ? "Updating..." : "Creating..."}
            </>
          ) : (
            <>{isEdit ? "Update Space" : "Create Space"}</>
          )}
        </Button>
      </div>
    </form>
  );
};

export default SpaceForm;
