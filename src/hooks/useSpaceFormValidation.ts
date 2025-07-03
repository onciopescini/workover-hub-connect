
import { useState } from "react";
import type { SpaceInsert } from "@/types/space";
import type { AvailabilityData } from "@/types/availability";

interface UseSpaceFormValidationProps {
  formData: Omit<Partial<SpaceInsert>, 'availability'>;
  availabilityData: AvailabilityData;
}

export const useSpaceFormValidation = ({ formData, availabilityData }: UseSpaceFormValidationProps) => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    const data = formData as any;
    
    if (!data['title']?.trim()) {
      newErrors.title = "Title is required";
    }

    if (!data['description']?.trim()) {
      newErrors.description = "Description is required";
    }

    if (!data['address']?.trim()) {
      newErrors.address = "Address is required";
    }

    if (data['address']?.trim() && (!data['latitude'] || !data['longitude'])) {
      newErrors.address = "Seleziona un indirizzo dai suggerimenti per ottenere le coordinate GPS";
    }

    if (data['max_capacity'] === undefined || data['max_capacity'] < 1) {
      newErrors.max_capacity = "Capacity must be at least 1";
    }

    if (data['price_per_hour'] === undefined || data['price_per_hour'] < 0) {
      newErrors.price_per_hour = "Hourly price must be a valid number";
    }

    if (data['price_per_day'] === undefined || data['price_per_day'] < 0) {
      newErrors.price_per_day = "Daily price must be a valid number";
    }

    if (!data['category']) {
      newErrors.category = "Category is required";
    }

    if (!data['work_environment']) {
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

  const clearError = (field: string) => {
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
