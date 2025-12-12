
import type { Space } from "@/types/space";
import { useSpaceFormState } from "./useSpaceFormState";
import { useSpaceFormValidation } from "./useSpaceFormValidation";
import { useSpaceFormSubmission } from "./useSpaceFormSubmission";
import { useHostProgress } from "./useHostProgress";

interface UseSpaceFormProps {
  initialData?: Space | undefined;
  isEdit?: boolean;
}

export const useSpaceForm = ({ initialData = undefined, isEdit = false }: UseSpaceFormProps) => {
  // Get host progress data including stripe verification status
  // Moved up to be passed to useSpaceFormState
  const { data: hostProgressData } = useHostProgress({
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000 // 30 seconds
  });

  const stripeOnboardingStatus = hostProgressData?.stripeOnboardingStatus || 'none';

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
    stripeOnboardingStatus // Pass the status here
  });

  const { errors, validateForm, clearError } = useSpaceFormValidation({
    formData,
    availabilityData
  });

  const { isSubmitting, handleSubmit } = useSpaceFormSubmission({
    formData,
    availabilityData,
    photoPreviewUrls,
    validateForm,
    isEdit,
    initialDataId: initialData?.id ?? '',
    stripeOnboardingStatus
  });

  // Enhanced input change handler that clears errors
  const handleInputChangeWithErrorClear = (field: string, value: string | number | boolean | string[]) => {
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
  const handleAvailabilityChangeWithErrorClear = (availability: import("@/types/availability").AvailabilityData) => {
    handleAvailabilityChange(availability);
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
