
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { SpaceInsert } from "@/types/space";
import type { AvailabilityData } from "@/types/availability";

interface UseSpaceFormSubmissionProps {
  formData: Omit<Partial<SpaceInsert>, 'availability'>;
  availabilityData: AvailabilityData;
  photoPreviewUrls: string[];
  validateForm: () => boolean;
  isEdit?: boolean;
  initialDataId?: string;
}

export const useSpaceFormSubmission = ({
  formData,
  availabilityData,
  photoPreviewUrls,
  validateForm,
  isEdit = false,
  initialDataId
}: UseSpaceFormSubmissionProps) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Please fix the errors in the form");
      return;
    }
    
    if (!formData.address) {
      alert("Address is required");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("You must be logged in to create a space");
      }

      const photoUrls = photoPreviewUrls;
      
      const spaceData = {
        ...formData,
        title: formData.title!,
        description: formData.description!,
        category: formData.category!,
        max_capacity: formData.max_capacity!,
        workspace_features: formData.workspace_features || [],
        work_environment: formData.work_environment!,
        amenities: formData.amenities || [],
        seating_types: formData.seating_types || [],
        price_per_hour: formData.price_per_hour!,
        price_per_day: formData.price_per_day!,
        address: formData.address!,
        latitude: formData.latitude || 0,
        longitude: formData.longitude || 0,
        photos: photoUrls,
        rules: formData.rules || "",
        ideal_guest_tags: formData.ideal_guest_tags || [],
        event_friendly_tags: formData.event_friendly_tags || [],
        confirmation_type: formData.confirmation_type!,
        availability: JSON.parse(JSON.stringify(availabilityData)),
        published: formData.published ?? false,
        host_id: user.id,
      };
      
      if (isEdit && initialDataId) {
        const { error } = await supabase
          .from("spaces")
          .update(spaceData)
          .eq("id", initialDataId);
          
        if (error) {
          throw error;
        }
        
        toast.success("Space updated successfully!");
      } else {
        const { data, error } = await supabase
          .from("spaces")
          .insert(spaceData)
          .select("id")
          .single();
          
        if (error) {
          throw error;
        }
        
        toast.success("Space created successfully!");
      }
      
      navigate("/spaces/manage");
    } catch (error) {
      console.error("Error saving space:", error);
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
