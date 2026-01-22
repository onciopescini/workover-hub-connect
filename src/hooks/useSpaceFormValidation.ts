import { useState } from "react";
import type { AvailabilityData } from "@/types/availability";
import type { SpaceFormData } from "@/schemas/spaceSchema";

interface UseSpaceFormValidationProps {
  formData: SpaceFormData;
  availabilityData: AvailabilityData;
}

interface UseSpaceFormValidationResult {
  errors: Record<string, string>;
  validateForm: () => boolean;
  clearError: (field: keyof SpaceFormData) => void;
}

export const useSpaceFormValidation = ({
  formData,
  availabilityData
}: UseSpaceFormValidationProps): UseSpaceFormValidationResult => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title?.trim()) {
      newErrors['title'] = "Title is required";
    }

    if (!formData.description?.trim()) {
      newErrors['description'] = "Description is required";
    }

    if (!formData.address?.trim()) {
      newErrors['address'] = "Address is required";
    }

    if (formData.address?.trim() && (!formData.latitude || !formData.longitude)) {
      newErrors['address'] = "Seleziona un indirizzo valido dai suggerimenti della mappa per ottenere le coordinate GPS";
    }

    if (formData.max_capacity === undefined || formData.max_capacity < 1) {
      newErrors['max_capacity'] = "Capacity must be at least 1";
    }

    if (formData.price_per_hour === undefined || formData.price_per_hour < 0) {
      newErrors['price_per_hour'] = "Hourly price must be a valid number";
    }

    if (formData.price_per_day === undefined || formData.price_per_day < 0) {
      newErrors['price_per_day'] = "Daily price must be a valid number";
    }

    if (!formData.category) {
      newErrors['category'] = "Category is required";
    }

    if (!formData.work_environment) {
      newErrors['work_environment'] = "Work environment is required";
    }

    // Enhanced availability validation
    const hasAvailability = availabilityData?.recurring && 
      Object.values(availabilityData.recurring).some(day => day.enabled && day.slots.length > 0);
    
    if (!hasAvailability) {
      newErrors['availability'] = "Imposta almeno un giorno e una fascia oraria di disponibilità per lo spazio";
    }

    // Extra check for published spaces - must have availability
    if (formData.published && !hasAvailability) {
      newErrors['availability'] = "Devi impostare almeno un giorno e orario di disponibilità per pubblicare lo spazio";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const clearError = (field: keyof SpaceFormData) => {
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return {
    errors,
    validateForm,
    clearError
  };
};
