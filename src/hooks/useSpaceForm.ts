
import type { Space } from "@/types/space";
import type { SpaceFormData } from "@/schemas/spaceSchema";
import type { AvailabilityData } from "@/types/availability";
import type { Dispatch, SetStateAction, FormEvent } from "react";
import { useSpaceFormState } from "./useSpaceFormState";
import { useSpaceFormValidation } from "./useSpaceFormValidation";
import { useSpaceFormSubmission } from "./useSpaceFormSubmission";
import { useHostProgress } from "./useHostProgress";

interface UseSpaceFormProps {
  initialData?: Space | undefined;
  isEdit?: boolean;
}

interface UseSpaceFormResult {
  formData: SpaceFormData;
  availabilityData: AvailabilityData;
  errors: Record<string, string>;
  photoFiles: File[];
  photoPreviewUrls: string[];
  isSubmitting: boolean;
  uploadingPhotos: boolean;
  processingJobs: string[];
  stripeOnboardingStatus: 'none' | 'pending' | 'completed' | 'restricted';
  stripeConnected: boolean;
  setUploadingPhotos: Dispatch<SetStateAction<boolean>>;
  setProcessingJobs: Dispatch<SetStateAction<string[]>>;
  setPhotoFiles: Dispatch<SetStateAction<File[]>>;
  setPhotoPreviewUrls: Dispatch<SetStateAction<string[]>>;
  handleInputChange: <K extends keyof SpaceFormData>(field: K, value: SpaceFormData[K]) => void;
  handleAddressChange: (address: string, coordinates?: { lat: number; lng: number }) => void;
  handleAvailabilityChange: (availability: AvailabilityData) => void;
  handleCheckboxArrayChange: (field: SpaceFormArrayKey, value: string, checked: boolean) => void;
  handleSubmit: (event: FormEvent) => Promise<void>;
  validateForm: () => boolean;
}

type SpaceFormArrayKey = {
  [K in keyof SpaceFormData]: SpaceFormData[K] extends string[] ? K : never
}[keyof SpaceFormData];

export const useSpaceForm = ({
  initialData = undefined,
  isEdit = false
}: UseSpaceFormProps): UseSpaceFormResult => {
  // Get host progress data including stripe verification status
  // Moved up to be passed to useSpaceFormState
  const { data: hostProgressData } = useHostProgress({
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000 // 30 seconds
  });

  const stripeOnboardingStatus = hostProgressData?.stripeOnboardingStatus || 'none';
  const stripeConnected = hostProgressData?.stripeConnected || false;

  const {
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
  } = useSpaceFormState({
    initialData,
    stripeOnboardingStatus, // Pass the status here
    stripeConnected
  });

  // Ensure availabilityData strictly matches AvailabilityData type
  const sanitizedAvailabilityData: import("@/types/availability").AvailabilityData = {
    ...availabilityData,
    exceptions: (availabilityData.exceptions || []).map(ex => ({
      ...ex,
      slots: ex.slots || []
    }))
  };

  const { errors, validateForm, clearError } = useSpaceFormValidation({
    formData,
    availabilityData: sanitizedAvailabilityData
  });

  const { isSubmitting, handleSubmit } = useSpaceFormSubmission({
    formData,
    availabilityData: sanitizedAvailabilityData,
    photoPreviewUrls,
    validateForm,
    isEdit,
    initialDataId: initialData?.id ?? '',
    stripeOnboardingStatus,
    stripeConnected
  });

  // Enhanced input change handler that clears errors
  const handleInputChangeWithErrorClear = <K extends keyof SpaceFormData>(
    field: K,
    value: SpaceFormData[K]
  ) => {
    handleInputChange(field, value);
    clearError(field);
  };

  // Enhanced address change handler that clears errors
  const handleAddressChangeWithErrorClear = (address: string, coordinates?: { lat: number; lng: number }) => {
    handleAddressChange(address, coordinates);
    if (coordinates) {
      clearError('address');
    }
  };

  // Enhanced availability change handler that clears errors
  const handleAvailabilityChangeWithErrorClear = (availability: AvailabilityData) => {
    // Ensure slots is always an array
    const sanitizedAvailability = {
      ...availability,
      exceptions: (availability.exceptions || []).map(ex => ({
        ...ex,
        slots: ex.slots || []
      }))
    };
    handleAvailabilityChange(sanitizedAvailability);
    clearError('availability');
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
    stripeOnboardingStatus,
    stripeConnected,
    setUploadingPhotos,
    setProcessingJobs,
    setPhotoFiles,
    setPhotoPreviewUrls,
    handleInputChange: handleInputChangeWithErrorClear,
    handleAddressChange: handleAddressChangeWithErrorClear,
    handleAvailabilityChange: handleAvailabilityChangeWithErrorClear,
    handleCheckboxArrayChange,
    handleSubmit,
    validateForm
  };
};
