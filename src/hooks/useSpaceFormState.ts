import { useState, useEffect } from 'react';
import { Space } from '@/types/space';
import { WorkspaceInsert } from '@/types/workspace';
import { AvailabilityData } from '@/types/availability';
import { defaultAvailability } from '@/utils/availabilityUtils';

interface UseSpaceFormStateProps {
  initialData?: Space | WorkspaceInsert | undefined;
}

export const useSpaceFormState = ({ initialData }: UseSpaceFormStateProps) => {
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [processingJobs, setProcessingJobs] = useState<string[]>([]);
  
  // Use 'any' to avoid type blocking if types are not fully aligned with DB
  const [formData, setFormData] = useState<any>({
    title: '',
    description: '',
    category: '',
    work_environment: '',
    address: '',
    max_capacity: 1,
    price_per_hour: 0,
    price_per_day: 0,
    workspace_features: [],
    amenities: [],
    seating_types: [],
    rules: '',
    confirmation_type: 'instant',
    published: false,
  });

  const [availabilityData, setAvailabilityData] = useState<AvailabilityData>(defaultAvailability);

  // Initialization Logic
  useEffect(() => {
    if (initialData) {
      // Cast to any to access all fields from DB regardless of strict type (Space vs Workspace)
      const dbData = initialData as any;
      
      console.log('Initializing form with DB data:', dbData);

      setFormData({
        // Data Mapping: Map DB fields to form state
        title: dbData.title || dbData.name || '', 
        description: dbData.description || '',
        category: dbData.category || '', // Mapped correctly
        work_environment: dbData.work_environment || '', // Mapped correctly
        address: dbData.address || '',
        max_capacity: dbData.max_capacity || 1,
        price_per_hour: dbData.price_per_hour || 0,
        price_per_day: dbData.price_per_day || 0,
        workspace_features: dbData.workspace_features || dbData.features || [],
        amenities: dbData.amenities || [],
        seating_types: dbData.seating_types || [],
        rules: dbData.rules || '',
        confirmation_type: dbData.confirmation_type || 'instant',
        published: Boolean(dbData.published), // Ensure boolean type
        latitude: dbData.latitude,
        longitude: dbData.longitude,
      });

      if (dbData.availability) {
        setAvailabilityData(dbData.availability as unknown as AvailabilityData);
      }

      // Handle Photos: Ensure they are treated as URL strings, not blobs
      // Check both 'photos' (new schema) and 'images' (legacy schema)
      const existingPhotos = dbData.photos || dbData.images;
      if (existingPhotos && Array.isArray(existingPhotos) && existingPhotos.length > 0) {
        // Filter out non-string values to prevent errors, and exclude 'blob:' URLs that shouldn't be in DB
        const validPhotoUrls = existingPhotos.filter((photo: any) =>
          typeof photo === 'string' && !photo.startsWith('blob:')
        );

        setPhotoPreviewUrls(validPhotoUrls);
      }
    }
  }, [initialData]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = (address: string, coordinates?: { lat: number; lng: number }) => {
    setFormData((prev: any) => ({
      ...prev,
      address,
      latitude: coordinates?.lat,
      longitude: coordinates?.lng,
    }));
  };

  const handleAvailabilityChange = (newAvailability: AvailabilityData) => {
    setAvailabilityData(newAvailability);
  };

  const handleCheckboxArrayChange = (field: string, item: string, checked: boolean) => {
    setFormData((prev: any) => {
      const currentArray = (prev[field] as string[]) || [];
      const newArray = checked
        ? [...currentArray, item]
        : currentArray.filter((i) => i !== item);
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
    handleCheckboxArrayChange,
  };
};
