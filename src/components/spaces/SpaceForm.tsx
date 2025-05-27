
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';
import { BasicInformation } from "./BasicInformation";
import { SpaceDetails } from "./SpaceDetails";
import { LocationPricing } from "./LocationPricing";
import { Photos } from "./Photos";
import { PublishingOptions } from "./PublishingOptions";
import {
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
    latitude: undefined,
    longitude: undefined,
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

    // Validate coordinates if address is provided
    if (formData.address?.trim() && (!formData.latitude || !formData.longitude)) {
      newErrors.address = "Seleziona un indirizzo dai suggerimenti per ottenere le coordinate GPS";
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

  const handleAddressChange = (address: string, coordinates?: { lat: number; lng: number }) => {
    setFormData((prev) => ({
      ...prev,
      address,
      latitude: coordinates?.lat,
      longitude: coordinates?.lng
    }));
    
    // Clear address error when coordinates are provided
    if (coordinates && errors.address) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.address;
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
  
        const fileName = `${userId}/${uuidv4()}.${fileExt}`;
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
        latitude: formData.latitude || 0,
        longitude: formData.longitude || 0,
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
      <BasicInformation
        title={formData.title || ""}
        description={formData.description || ""}
        category={formData.category || "home"}
        onInputChange={handleInputChange}
        errors={errors}
        isSubmitting={isSubmitting}
      />

      <SpaceDetails
        workEnvironment={formData.work_environment || "controlled"}
        maxCapacity={formData.max_capacity || 1}
        confirmationType={formData.confirmation_type || "host_approval"}
        workspaceFeatures={formData.workspace_features || []}
        amenities={formData.amenities || []}
        seatingTypes={formData.seating_types || []}
        idealGuestTags={formData.ideal_guest_tags || []}
        eventFriendlyTags={formData.event_friendly_tags || []}
        rules={formData.rules || ""}
        onInputChange={handleInputChange}
        onCheckboxArrayChange={handleCheckboxArrayChange}
        errors={errors}
        isSubmitting={isSubmitting}
      />

      <LocationPricing
        address={formData.address || ""}
        pricePerHour={formData.price_per_hour || 0}
        pricePerDay={formData.price_per_day || 0}
        onInputChange={handleInputChange}
        onAddressChange={handleAddressChange}
        errors={errors}
        isSubmitting={isSubmitting}
      />

      <Photos
        photoPreviewUrls={photoPreviewUrls}
        onPhotoChange={handlePhotoChange}
        onRemovePhoto={removePhoto}
        isSubmitting={isSubmitting}
        uploadingPhotos={uploadingPhotos}
      />

      <PublishingOptions
        published={formData.published || false}
        onInputChange={handleInputChange}
        isSubmitting={isSubmitting}
      />

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
