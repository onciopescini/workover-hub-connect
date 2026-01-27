
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AvailabilityData } from "@/types/availability";
import { sreLogger } from '@/lib/sre-logger';
import { useRLSErrorHandler } from './useRLSErrorHandler';
import type { Database, Json } from "@/integrations/supabase/types";
import type { SpaceInsert } from "@/types/space";
import { toSpaceInsertPayload, toSpaceUpdatePayload } from "@/lib/space-mappers";

// Form data type that includes UI field names mapped to DB columns
interface SpaceFormDataInput {
  title?: string;
  description?: string;
  category?: string;
  work_environment?: string;
  max_capacity?: number;
  features?: string[];
  amenities?: string[];
  seating_types?: string[];
  price_per_hour?: number;
  price_per_day?: number;
  address?: string;
  latitude?: number;
  longitude?: number;
  rules?: string | null | undefined;
  cancellation_policy?: string | null | undefined;
  ideal_guest_tags?: string[];
  event_friendly_tags?: string[];
  confirmation_type?: string;
  published?: boolean;
}

interface UseSpaceFormSubmissionProps {
  formData: SpaceFormDataInput;
  availabilityData: AvailabilityData;
  photoPreviewUrls: string[];
  validateForm: () => boolean;
  isEdit?: boolean;
  initialDataId?: string;
  stripeOnboardingStatus?: 'none' | 'pending' | 'completed' | 'restricted';
  stripeConnected?: boolean;
}

export const useSpaceFormSubmission = ({
  formData,
  availabilityData,
  photoPreviewUrls,
  validateForm,
  isEdit = false,
  initialDataId,
  stripeOnboardingStatus = 'none',
  stripeConnected = false
}: UseSpaceFormSubmissionProps) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { handleError: handleRLSError } = useRLSErrorHandler();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }
    
    if (!formData.address) {
      toast.error("Address is required");
      return;
    }

    // Check if trying to publish without completed Stripe verification
    // SECURITY ENFORCED: Prevent publishing without Stripe
    if (formData.published && !stripeConnected && stripeOnboardingStatus !== 'completed') {
      toast.error("Non puoi pubblicare uno spazio senza completare la verifica Stripe.", {
        description: "Completa l'onboarding nella sezione Pagamenti prima di pubblicare."
      });
      return;
    }

    sreLogger.info('Submitting space form', {
      isEdit,
      spaceId: initialDataId,
      published: formData.published,
      title: formData.title
    });

    setIsSubmitting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("You must be logged in to create a space");
      }

      const photoUrls = photoPreviewUrls;
      
      // Normalize availability - ensure slots is always an array
      const normalizedAvailability = {
        ...availabilityData,
        exceptions: availabilityData.exceptions.map(ex => ({
          ...ex,
          slots: ex.slots || []
        }))
      };

      const spaceData = {
        title: formData.title || '',
        address: formData.address || '',
        features: formData.features || [],
        price_per_day: formData.price_per_day || 0,
        price_per_hour: formData.price_per_hour || 0,
        max_capacity: formData.max_capacity || 1,
        capacity: formData.max_capacity || 1,
        category: (formData.category as Database["public"]["Enums"]["space_category"]) || 'home',
        rules: formData.rules || null,
        cancellation_policy: (formData.cancellation_policy as Database["public"]["Enums"]["cancellation_policy"] | null) || null,
        availability: normalizedAvailability as unknown as Json,
        host_id: user.id,
        description: formData.description || "",
        photos: photoUrls,
        latitude: formData.latitude || 0,
        longitude: formData.longitude || 0,
        published: Boolean(formData.published),
        pending_approval: false,
        amenities: formData.amenities || [],
        seating_types: formData.seating_types || [],
        work_environment: (formData.work_environment as Database["public"]["Enums"]["work_environment"]) || 'silent',
        ideal_guest_tags: formData.ideal_guest_tags || [],
        event_friendly_tags: formData.event_friendly_tags || [],
        confirmation_type: (formData.confirmation_type as Database["public"]["Enums"]["confirmation_type"]) || 'host_approval'
      } as SpaceInsert;
      
      if (isEdit && initialDataId) {
        const spaceUpdate = toSpaceUpdatePayload(spaceData);
        const { error } = await supabase
          .from("spaces")
          .update(spaceUpdate)
          .eq("id", initialDataId);
          
        if (error) {
          // Remove legacy error handling: parseSpacePublishError
          const isRLSError = handleRLSError(error);
          if (!isRLSError) {
            toast.error("Failed to update space: " + error.message);
          }
          setIsSubmitting(false);
          return;
        }
        
        toast.success("Space updated successfully!");
      } else {
        const insertPayload = toSpaceInsertPayload(spaceData);
        const { error } = await supabase
          .from("spaces")
          .insert(insertPayload)
          .select("id")
          .single();
          
        if (error) {
           // Remove legacy error handling: parseSpacePublishError
          const isRLSError = handleRLSError(error);
          if (!isRLSError) {
            toast.error("Failed to create space: " + error.message);
          }
          setIsSubmitting(false);
          return;
        }
        
        toast.success("Space created successfully!");
      }
      
      navigate("/host/spaces");
    } catch (error) {
      sreLogger.error("Error saving space", { isEdit, spaceId: initialDataId }, error as Error);
      toast.error("Failed to save space");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    handleSubmit
  };
};
