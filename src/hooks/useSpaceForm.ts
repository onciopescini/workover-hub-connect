
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { v4 as uuidv4 } from 'uuid';
import { startImageOptimization } from "@/lib/image-optimization";
import {
  type Space,
  type SpaceInsert
} from "@/types/space";
import { type AvailabilityData } from "@/types/availability";

interface UseSpaceFormProps {
  initialData?: Space;
  isEdit?: boolean;
}

export const useSpaceForm = ({ initialData, isEdit = false }: UseSpaceFormProps) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [processingJobs, setProcessingJobs] = useState<string[]>([]);
  
  const defaultAvailability: AvailabilityData = {
    recurring: {
      monday: { enabled: false, slots: [] },
      tuesday: { enabled: false, slots: [] },
      wednesday: { enabled: false, slots: [] },
      thursday: { enabled: false, slots: [] },
      friday: { enabled: false, slots: [] },
      saturday: { enabled: false, slots: [] },
      sunday: { enabled: false, slots: [] }
    },
    exceptions: []
  };

  const [formData, setFormData] = useState<Omit<Partial<SpaceInsert>, 'availability'>>({
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

  const [availabilityData, setAvailabilityData] = useState<AvailabilityData>(defaultAvailability);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    if (initialData) {
      let parsedAvailability = defaultAvailability;
      if (initialData.availability) {
        try {
          const availabilityJson = typeof initialData.availability === 'string' 
            ? JSON.parse(initialData.availability)
            : initialData.availability;
          
          if (availabilityJson && typeof availabilityJson === 'object' && availabilityJson.recurring) {
            parsedAvailability = availabilityJson as AvailabilityData;
          }
        } catch (error) {
          console.error("Error parsing availability:", error);
        }
      }

      const { availability, ...restData } = initialData;
      setFormData(restData);
      setAvailabilityData(parsedAvailability);
      
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

    const hasAvailability = availabilityData?.recurring && 
      Object.values(availabilityData.recurring).some(day => day.enabled && day.slots.length > 0);
    
    if (!hasAvailability) {
      newErrors.availability = "Devi impostare almeno un giorno e orario di disponibilità";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    
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
    
    if (coordinates && errors.address) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.address;
        return newErrors;
      });
    }
  };

  const handleAvailabilityChange = (availability: AvailabilityData) => {
    setAvailabilityData(availability);
    
    if (errors.availability) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.availability;
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

      const photoUrls = photoPreviewUrls;
      
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
        availability: JSON.parse(JSON.stringify(availabilityData)),
        published: formData.published ?? false,
        host_id: user.id,
      };
      
      if (isEdit && initialData) {
        const { error } = await supabase
          .from("spaces")
          .update(spaceData)
          .eq("id", initialData.id);
          
        if (error) {
          throw error;
        }
        
        toast.success("Space updated successfully!");
      } else {
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
      
      navigate("/spaces/manage");
    } catch (error) {
      console.error("Error saving space:", error);
      toast.error("Failed to save space");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    formData,
    availabilityData,
    errors,
    photoFiles,
    photoPreviewUrls,
    isSubmitting,
    uploadingPhotos,
    processingJobs,
    setUploadingPhotos,
    setProcessingJobs,
    setPhotoFiles,
    setPhotoPreviewUrls,
    handleInputChange,
    handleAddressChange,
    handleAvailabilityChange,
    handleCheckboxArrayChange,
    handleSubmit,
    validateForm
  };
};
