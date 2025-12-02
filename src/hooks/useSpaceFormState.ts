import { useState, useEffect } from 'react';
import { Space, SpaceInsert } from '@/types/space';
import { AvailabilityData } from '@/types/availability';
import { defaultAvailability } from '@/utils/availabilityUtils';

interface UseSpaceFormStateProps {
  initialData?: Space | undefined;
}

export const useSpaceFormState = ({ initialData }: UseSpaceFormStateProps) => {
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [processingJobs, setProcessingJobs] = useState<string[]>([]);
  
  const [formData, setFormData] = useState<Partial<SpaceInsert>>({
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
    confirmation_type: 'instant', // Default
    published: false, // Default
  });

  const [availabilityData, setAvailabilityData] = useState<AvailabilityData>(defaultAvailability);

  // Initialization Logic - REWRITTEN
  useEffect(() => {
    if (initialData) {
      console.log('Initializing form with data:', initialData);

      // 1. Map DB fields to Form State correctly
      setFormData({
        title: initialData.title || initialData.name || '', // Handle name/title mapping
        description: initialData.description || '',
        category: initialData.category || '',
        work_environment: initialData.work_environment || '',
        address: initialData.address || '',
        max_capacity: initialData.max_capacity || 1,
        price_per_hour: initialData.price_per_hour || 0,
        price_per_day: initialData.price_per_day || 0,
        workspace_features: initialData.workspace_features || initialData.features || [],
        amenities: initialData.amenities || [],
        seating_types: initialData.seating_types || [],
        rules: initialData.rules || '',
        confirmation_type: initialData.confirmation_type || 'instant',
        published: Boolean(initialData.published), // Ensure boolean
        latitude: initialData.latitude,
        longitude: initialData.longitude,
      });

      // 2. Handle Availability
      if (initialData.availability) {
        // Ensure availability is treated as the correct type
        setAvailabilityData(initialData.availability as unknown as AvailabilityData);
      }

      // 3. Handle Photos - CRITICAL FIX
      // Load existing URL strings directly into previews without creating blobs
      if (initialData.photos && Array.isArray(initialData.photos) && initialData.photos.length > 0) {
        console.log('Loading existing photos:', initialData.photos);
        setPhotoPreviewUrls(initialData.photos);
      }
    }
  }, [initialData]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddressChange = (address: string, coordinates?: { lat: number; lng: number }) => {
    setFormData((prev) => ({
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
    setFormData((prev) => {
      const currentArray = (prev[field as keyof typeof prev] as string[]) || [];
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