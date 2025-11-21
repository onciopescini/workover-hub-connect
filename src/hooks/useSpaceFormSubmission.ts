
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { SpaceInsert } from "@/types/space";
import type { WorkspaceInsert } from "@/types/workspace";
import type { AvailabilityData } from "@/types/availability";
import { sreLogger } from '@/lib/sre-logger';
import { useRLSErrorHandler } from './useRLSErrorHandler';

interface UseSpaceFormSubmissionProps {
  formData: Omit<Partial<SpaceInsert>, 'availability'>;
  availabilityData: AvailabilityData;
  photoPreviewUrls: string[];
  validateForm: () => boolean;
  isEdit?: boolean;
  initialDataId?: string;
  stripeOnboardingStatus?: 'none' | 'pending' | 'completed' | 'restricted';
}

export const useSpaceFormSubmission = ({
  formData,
  availabilityData,
  photoPreviewUrls,
  validateForm,
  isEdit = false,
  initialDataId,
  stripeOnboardingStatus = 'none'
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
    if (formData.published && stripeOnboardingStatus !== 'completed') {
      toast.error("Non puoi pubblicare uno spazio senza completare la verifica Stripe. Completa l'onboarding prima di pubblicare.");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("You must be logged in to create a space");
      }

      const photoUrls = photoPreviewUrls;
      
      // Refactor: Map fields to new workspace schema
      const workspaceData: WorkspaceInsert = {
        name: formData.title!, // formData.title -> maps to DB column name
        address: formData.address!, // formData.address -> maps to DB column address
        features: formData.workspace_features || [], // formData.workspace_features -> maps to DB column features (array)
        price_per_day: formData.price_per_day!,
        price_per_hour: formData.price_per_hour!,
        max_capacity: formData.max_capacity!,
        category: formData.category!,
        rules: formData.rules || null,
        cancellation_policy: formData.cancellation_policy || null,
        availability: availabilityData, // availabilityData should be saved as json in the availability column
        host_id: user.id,
        // Additional fields that are likely needed
        description: formData.description || "",
        photos: photoUrls,
        latitude: formData.latitude || 0,
        longitude: formData.longitude || 0,
        published: formData.published ?? false,
        amenities: formData.amenities || [],
        seating_types: formData.seating_types || [],
        work_environment: formData.work_environment!,
        ideal_guest_tags: formData.ideal_guest_tags || [],
        event_friendly_tags: formData.event_friendly_tags || [],
        confirmation_type: formData.confirmation_type!
      };
      
      if (isEdit && initialDataId) {
        // Refactor: Insert/update into 'workspaces' table
        const { error } = await (supabase
          .from("workspaces" as any) as any)
          .update(workspaceData)
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
        // Refactor: Insert/update into 'workspaces' table
        const { error } = await (supabase
          .from("workspaces" as any) as any)
          .insert(workspaceData)
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
