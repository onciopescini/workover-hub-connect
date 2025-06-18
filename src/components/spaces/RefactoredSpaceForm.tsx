
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';

import { SpaceFormSchema, SpaceFormData } from "@/schemas/spaceSchema";
import { RefactoredBasicInformation } from "./RefactoredBasicInformation";
import { RefactoredSpaceDetails } from "./RefactoredSpaceDetails";
import { RefactoredLocationPricing } from "./RefactoredLocationPricing";
import { RefactoredAvailabilityScheduler } from "./RefactoredAvailabilityScheduler";
import { RefactoredPhotos } from "./RefactoredPhotos";
import { RefactoredPublishingOptions } from "./RefactoredPublishingOptions";
import { startImageOptimization } from "@/lib/image-optimization";
import type { Space } from "@/types/space";

interface RefactoredSpaceFormProps {
  initialData?: Space;
  isEdit?: boolean;
}

const RefactoredSpaceForm = ({ initialData, isEdit = false }: RefactoredSpaceFormProps) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [processingJobs, setProcessingJobs] = useState<string[]>([]);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);

  // Default availability data
  const defaultAvailability = {
    recurring: {
      monday: { enabled: false, slots: [] },
      tuesday: { enabled: false, slots: [] },
      wednesday: { enabled: false, slots: [] },
      thursday: { enabled: false, slots: [] },
      friday: { enabled: false, slots: [] },
      saturday: { enabled: false, slots: [] },
      sunday: { enabled: false, slots: [] }
    },
    exceptions: []
  };

  // Initialize form with react-hook-form
  const form = useForm<SpaceFormData>({
    resolver: zodResolver(SpaceFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "home",
      max_capacity: 1,
      workspace_features: [],
      work_environment: "controlled",
      amenities: [],
      seating_types: [],
      price_per_hour: 0,
      price_per_day: 0,
      address: "",
      latitude: undefined,
      longitude: undefined,
      photos: [],
      rules: "",
      ideal_guest_tags: [],
      event_friendly_tags: [],
      confirmation_type: "host_approval",
      availability: defaultAvailability,
      published: false
    }
  });

  // Load initial data if editing
  useEffect(() => {
    if (initialData) {
      // Parse availability if it exists
      let parsedAvailability = defaultAvailability;
      if (initialData.availability) {
        try {
          const availabilityJson = typeof initialData.availability === 'string' 
            ? JSON.parse(initialData.availability)
            : initialData.availability;
          
          if (availabilityJson && typeof availabilityJson === 'object' && availabilityJson.recurring) {
            parsedAvailability = availabilityJson;
          }
        } catch (error) {
          console.error("Error parsing availability:", error);
        }
      }

      // Reset form with initial data
      form.reset({
        title: initialData.title || "",
        description: initialData.description || "",
        category: initialData.category || "home",
        max_capacity: initialData.max_capacity || 1,
        workspace_features: initialData.workspace_features || [],
        work_environment: initialData.work_environment || "controlled",
        amenities: initialData.amenities || [],
        seating_types: initialData.seating_types || [],
        price_per_hour: initialData.price_per_hour || 0,
        price_per_day: initialData.price_per_day || 0,
        address: initialData.address || "",
        latitude: initialData.latitude,
        longitude: initialData.longitude,
        photos: initialData.photos || [],
        rules: initialData.rules || "",
        ideal_guest_tags: initialData.ideal_guest_tags || [],
        event_friendly_tags: initialData.event_friendly_tags || [],
        confirmation_type: initialData.confirmation_type || "host_approval",
        availability: parsedAvailability,
        published: initialData.published || false
      });
      
      // Set up preview URLs for existing photos
      if (initialData.photos && initialData.photos.length > 0) {
        setPhotoPreviewUrls(initialData.photos as string[]);
      }
    }
  }, [initialData, form]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setUploadingPhotos(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("You must be logged in to upload photos");
      }

      const newFiles = Array.from(files);
      const newPreviewUrls: string[] = [];
      const newProcessingJobs: string[] = [];
      
      for (const file of newFiles) {
        try {
          // Create preview URL
          const previewUrl = URL.createObjectURL(file);
          newPreviewUrls.push(previewUrl);
          
          // Upload file
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          
          const { data, error } = await supabase.storage
            .from('space_photos')
            .upload(fileName, file, {
              upsert: true,
            });

          if (error) {
            console.error("Upload error:", error);
            continue;
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('space_photos')
            .getPublicUrl(fileName);

          // Start image optimization
          try {
            const optimizationJobId = await startImageOptimization(
              fileName,
              initialData?.id,
              file.size
            );
            
            newProcessingJobs.push(optimizationJobId);
          } catch (optimizationError) {
            console.warn('Failed to start optimization:', optimizationError);
          }

          // Replace preview URL with actual URL
          const urlIndex = newPreviewUrls.indexOf(previewUrl);
          if (urlIndex !== -1) {
            newPreviewUrls[urlIndex] = urlData.publicUrl;
            URL.revokeObjectURL(previewUrl);
          }
        } catch (error) {
          console.error("Error processing file:", file.name, error);
        }
      }
      
      // Update states and form
      setPhotoFiles(prev => [...prev, ...newFiles]);
      setPhotoPreviewUrls(prev => {
        const updatedUrls = [...prev, ...newPreviewUrls];
        form.setValue('photos', updatedUrls);
        return updatedUrls;
      });
      setProcessingJobs(prev => [...prev, ...newProcessingJobs]);
      
    } catch (error) {
      console.error("Error uploading photos:", error);
      toast.error("Errore nel caricamento delle foto");
    } finally {
      setUploadingPhotos(false);
    }
  };

  const removePhoto = (index: number) => {
    // If it's a preview URL from a file we're about to upload
    if (index < photoFiles.length) {
      URL.revokeObjectURL(photoPreviewUrls[index]);
      setPhotoFiles(prev => prev.filter((_, i) => i !== index));
    }
    
    const updatedUrls = photoPreviewUrls.filter((_, i) => i !== index);
    setPhotoPreviewUrls(updatedUrls);
    form.setValue('photos', updatedUrls);
  };

  const onSubmit = async (data: SpaceFormData) => {
    setIsSubmitting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("You must be logged in to create a space");
      }

      // Prepare data for database insertion
      const spaceData = {
        ...data,
        photos: photoPreviewUrls,
        availability: JSON.parse(JSON.stringify(data.availability)),
        host_id: user.id,
      };
      
      if (isEdit && initialData) {
        // Update existing space
        const { error } = await supabase
          .from("spaces")
          .update(spaceData)
          .eq("id", initialData.id);
          
        if (error) {
          throw error;
        }
        
        toast.success("Space updated successfully!");
      } else {
        // Create new space
        const { data: newSpace, error } = await supabase
          .from("spaces")
          .insert(spaceData)
          .select("id")
          .single();
          
        if (error) {
          throw error;
        }
        
        toast.success("Space created successfully!");
      }
      
      // Redirect back to manage spaces
      navigate("/spaces/manage");
    } catch (error) {
      console.error("Error saving space:", error);
      toast.error("Failed to save space");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <RefactoredBasicInformation />
        <RefactoredSpaceDetails />
        <RefactoredLocationPricing />
        <RefactoredAvailabilityScheduler />
        <RefactoredPhotos 
          photoPreviewUrls={photoPreviewUrls}
          onPhotoChange={handlePhotoChange}
          onRemovePhoto={removePhoto}
          uploadingPhotos={uploadingPhotos}
          processingJobs={processingJobs}
        />
        <RefactoredPublishingOptions />

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/spaces/manage")}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="bg-blue-500 hover:bg-blue-600"
            disabled={isSubmitting || uploadingPhotos}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEdit ? "Updating..." : "Creating..."}
              </>
            ) : (
              <>{isEdit ? "Update Space" : "Create Space"}</>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default RefactoredSpaceForm;
