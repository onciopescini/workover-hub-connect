
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
    initialData: initialData as any,
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
