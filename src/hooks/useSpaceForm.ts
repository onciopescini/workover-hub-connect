
import type { Space } from "@/types/space";
import { useSpaceFormState } from "./useSpaceFormState";
import { useSpaceFormValidation } from "./useSpaceFormValidation";
import { useSpaceFormSubmission } from "./useSpaceFormSubmission";

interface UseSpaceFormProps {
  initialData?: Space | undefined;
  isEdit?: boolean;
}

export const useSpaceForm = ({ initialData = undefined, isEdit = false }: UseSpaceFormProps) => {
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
  } = useSpaceFormState({ initialData });

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
    initialDataId: initialData?.id ?? ''
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
