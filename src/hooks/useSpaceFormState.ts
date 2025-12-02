
import { useState, useEffect } from "react";
import type { Space, SpaceInsert } from "@/types/space";
import type { AvailabilityData } from "@/types/availability";
import { sreLogger } from '@/lib/sre-logger';
import { WorkspaceInsert } from "@/types/workspace";

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
    work_environment: "silent",
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
      // Cast initialData to any to handle both Space and Workspace types safely
      const data = initialData as any;

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
          sreLogger.error("Error parsing availability", { spaceId: initialData?.id }, error as Error);
        }
      }

      // Explicitly map fields from Workspace schema (or Space schema) to Form State
      const mappedFormData: Partial<SpaceInsert> = {
        // Text fields
        title: data.name || data.title || "",
        description: data.description || "",
        address: data.address || "",
        rules: data.rules || "",

        // Numerical fields
        max_capacity: data.max_capacity || 1,
        price_per_hour: data.price_per_hour || 0,
        price_per_day: data.price_per_day || 0,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,

        // Arrays
        // Handle 'features' (Workspace) vs 'workspace_features' (Space)
        workspace_features: data.features || data.workspace_features || [],
        amenities: data.amenities || [],
        seating_types: data.seating_types || [],
        ideal_guest_tags: data.ideal_guest_tags || [],
        event_friendly_tags: data.event_friendly_tags || [],
        photos: [], // We handle photos separately below to avoid mixing blobs and strings

        // Enums and Booleans - Explicit Mapping
        category: data.category || "home",
        work_environment: data.work_environment || "silent",
        confirmation_type: data.confirmation_type || "host_approval",
        published: Boolean(data.published),
      };

      setFormData(prev => ({ ...prev, ...mappedFormData }));
      setAvailabilityData(parsedAvailability);
      
      // Image Handling Logic:
      // 1. If we have photos strings, use them for previews directly.
      // 2. Do NOT create ObjectURLs for these strings.
      // 3. Clear photoFiles so the uploader doesn't try to process them as Files.
      if (data.photos && Array.isArray(data.photos) && data.photos.length > 0) {
        const existingUrls = data.photos.filter((p: any) => typeof p === 'string');
        setPhotoPreviewUrls(existingUrls);
        setPhotoFiles([]); // Ensure empty to prevent blob errors
      } else {
        setPhotoPreviewUrls([]);
        setPhotoFiles([]);
      }

      console.log("Form State Initialized:", { ...mappedFormData, photos: data.photos });
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
