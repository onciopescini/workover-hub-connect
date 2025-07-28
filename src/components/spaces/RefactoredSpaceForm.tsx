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
import { useLogger } from "@/hooks/useLogger";
import type { Space } from "@/types/space";

interface RefactoredSpaceFormProps {
  initialData?: Space;
  isEdit?: boolean;
}

const RefactoredSpaceForm = ({ initialData, isEdit = false }: RefactoredSpaceFormProps) => {
  const navigate = useNavigate();
  const { info, warn, error } = useLogger({ context: 'RefactoredSpaceForm' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [processingJobs, setProcessingJobs] = useState<string[]>([]);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);

  // Default availability data with required enabled property
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

  // Initialize form with react-hook-form - use correct default values that match database types
  const form = useForm<SpaceFormData>({
    resolver: zodResolver(SpaceFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "home", // Must be one of: home, outdoor, professional
      max_capacity: 1,
      workspace_features: [],
      work_environment: "silent", // Must be one of: silent, controlled, dynamic
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
        } catch (parseError) {
          error("Error parsing availability", parseError as Error, { 
            spaceId: initialData.id,
            availabilityData: initialData.availability 
          });
        }
      }

      // Reset form with initial data
      form.reset({
        title: initialData.title || "",
        description: initialData.description || "",
        category: initialData.category || "home",
        max_capacity: initialData.max_capacity || 1,
        workspace_features: initialData.workspace_features || [],
        work_environment: initialData.work_environment || "silent",
        amenities: initialData.amenities || [],
        seating_types: initialData.seating_types || [],
        price_per_hour: initialData.price_per_hour || 0,
        price_per_day: initialData.price_per_day || 0,
        address: initialData.address || "",
        latitude: initialData.latitude ?? undefined,
        longitude: initialData.longitude ?? undefined,
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
          
          const { data, error: uploadError } = await supabase.storage
            .from('space_photos')
            .upload(fileName, file, {
              upsert: true,
            });

          if (uploadError) {
            error("Upload error", uploadError, { 
              fileName,
              fileSize: file.size,
              fileType: file.type 
            });
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
            warn('Failed to start optimization', { 
              optimizationError,
              fileName,
              spaceId: initialData?.id,
              fileSize: file.size 
            });
          }

          // Replace preview URL with actual URL
          const urlIndex = newPreviewUrls.indexOf(previewUrl);
          if (urlIndex !== -1) {
            newPreviewUrls[urlIndex] = urlData.publicUrl;
            URL.revokeObjectURL(previewUrl);
          }
        } catch (fileError) {
          error("Error processing file", fileError as Error, { 
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type 
          });
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
      
    } catch (uploadingError) {
      error("Error uploading photos", uploadingError as Error, { 
        spaceId: initialData?.id 
      });
      toast.error("Errore nel caricamento delle foto");
    } finally {
      setUploadingPhotos(false);
    }
  };

  const removePhoto = (index: number) => {
    // If it's a preview URL from a file we're about to upload
    if (index < photoFiles.length && photoPreviewUrls[index]) {
      URL.revokeObjectURL(photoPreviewUrls[index]);
      setPhotoFiles(prev => prev.filter((_, i) => i !== index));
    }
    
    const updatedUrls = photoPreviewUrls.filter((_, i) => i !== index);
    setPhotoPreviewUrls(updatedUrls);
    form.setValue('photos', updatedUrls);
  };

  const onSubmit = async (data: SpaceFormData) => {
    console.log('🚀 Form submission started', { data, isEdit });
    
    // Add detailed form validation logging
    const formErrors = form.formState.errors;
    if (Object.keys(formErrors).length > 0) {
      console.error('❌ Form validation errors:', formErrors);
      toast.error("Please fix the errors in the form");
      return;
    }
    
    // Special validation for published spaces
    if (data.published && data.availability) {
      const hasAvailability = Object.values(data.availability.recurring).some(day => day.enabled && day.slots.length > 0);
      if (!hasAvailability) {
        console.error('❌ No availability set for published space');
        toast.error("Devi impostare almeno un giorno e orario di disponibilità per pubblicare lo spazio");
        return;
      }
    }
    
    console.log('✅ Form validation passed, proceeding with submission');
    setIsSubmitting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("You must be logged in to create a space");
      }

      // Prepare data for database insertion - ensure proper typing and structure
      const spaceData = {
        title: data.title,
        description: data.description,
        category: data.category,
        max_capacity: data.max_capacity,
        workspace_features: data.workspace_features,
        work_environment: data.work_environment,
        amenities: data.amenities,
        seating_types: data.seating_types,
        price_per_hour: data.price_per_hour,
        price_per_day: data.price_per_day,
        address: data.address,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        photos: photoPreviewUrls,
        rules: data.rules ?? null,
        ideal_guest_tags: data.ideal_guest_tags,
        event_friendly_tags: data.event_friendly_tags,
        confirmation_type: data.confirmation_type,
        availability: JSON.stringify(data.availability || defaultAvailability), // Convert to JSON string for database
        published: data.published,
        host_id: user.id,
      };
      
      if (isEdit && initialData) {
        // Update existing space
        console.log('📝 Updating existing space:', initialData.id);
        const { error } = await supabase
          .from("spaces")
          .update(spaceData)
          .eq("id", initialData.id);
          
        if (error) {
          console.error('❌ Update error:', error);
          throw error;
        }
        
        console.log('✅ Space updated successfully');
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
      console.log('🔄 Navigating to /host/spaces');
      navigate("/host/spaces");
    } catch (saveError) {
      error("Error saving space", saveError as Error, { 
        isEdit,
        spaceId: initialData?.id,
        spaceTitle: data.title 
      });
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
            onClick={() => navigate("/host/spaces")}
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
