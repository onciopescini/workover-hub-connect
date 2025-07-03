
import { useState, useEffect } from "react";
import type { Space, SpaceInsert } from "@/types/space";
import type { AvailabilityData } from "@/types/availability";

interface UseSpaceFormStateProps {
  initialData?: Space | undefined;
}

export const useSpaceFormState = ({ initialData }: UseSpaceFormStateProps) => {
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
    latitude: null,
    longitude: null,
    photos: [],
    rules: "",
    ideal_guest_tags: [],
    event_friendly_tags: [],
    confirmation_type: "host_approval",
    published: false
  });

  const [availabilityData, setAvailabilityData] = useState<AvailabilityData>(defaultAvailability);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [processingJobs, setProcessingJobs] = useState<string[]>([]);

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

  const handleInputChange = (field: string, value: string | number | boolean | string[] | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = (address: string, coordinates?: { lat: number; lng: number }) => {
    setFormData((prev) => ({
      ...prev,
      address,
      latitude: coordinates?.lat ?? null,
      longitude: coordinates?.lng ?? null
    }));
  };

  const handleAvailabilityChange = (availability: AvailabilityData) => {
    setAvailabilityData(availability);
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

  return {
    formData,
    availabilityData,
    photoFiles,
    photoPreviewUrls,
    uploadingPhotos,
    processingJobs,
    setUploadingPhotos,
    setProcessingJobs,
    setPhotoFiles,
    setPhotoPreviewUrls,
    handleInputChange,
    handleAddressChange,
    handleAvailabilityChange,
    handleCheckboxArrayChange
  };
};
