import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { SpaceFormSchema, SpaceFormData } from '@/schemas/spaceSchema';
import { Space } from '@/types/space';
import { WorkspaceInsert } from '@/types/workspace';
import { startImageOptimization } from '@/lib/image-optimization';
import { useLogger } from '@/hooks/useLogger';
import { sreLogger } from '@/lib/sre-logger';

interface UseSpaceFormStateProps {
  initialData?: Space | WorkspaceInsert | undefined;
  isEdit?: boolean;
  stripeOnboardingStatus?: 'none' | 'pending' | 'completed' | 'restricted';
}

export const useSpaceFormState = ({ initialData, isEdit = false, stripeOnboardingStatus = 'none' }: UseSpaceFormStateProps) => {
  const navigate = useNavigate();
  const { info, warn, error } = useLogger({ context: 'useSpaceFormState' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [processingJobs, setProcessingJobs] = useState<string[]>([]);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  
  // Single Unified List for UI: contains both 'blob:...' and 'https://...' URLs
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

  const form = useForm<SpaceFormData>({
    resolver: zodResolver(SpaceFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "home",
      max_capacity: 1,
      workspace_features: [],
      work_environment: "silent",
      amenities: [],
      seating_types: [],
      price_per_hour: 0,
      price_per_day: 0,
      address: "",
      latitude: 0,
      longitude: 0,
      photos: [],
      rules: "",
      ideal_guest_tags: [],
      event_friendly_tags: [],
      confirmation_type: "host_approval",
      availability: defaultAvailability,
      published: false
    }
  });

  // Initialization Logic
  useEffect(() => {
    if (initialData) {
      const dbData = initialData as any;
      console.log('Initializing form with DB data:', dbData);

      // Parse availability
      let parsedAvailability = defaultAvailability;
      if (dbData.availability) {
        try {
          const availabilityJson = typeof dbData.availability === 'string'
            ? JSON.parse(dbData.availability)
            : dbData.availability;

          if (availabilityJson && typeof availabilityJson === 'object' && availabilityJson.recurring) {
            parsedAvailability = availabilityJson;
          }
        } catch (parseError) {
          error("Error parsing availability", parseError as Error, {
            spaceId: initialData.id,
            availabilityData: dbData.availability
          });
        }
      }

      // Reset form
      form.reset({
        title: dbData.title || dbData.name || "",
        description: dbData.description || "",
        category: dbData.category || "home",
        max_capacity: dbData.max_capacity || 1,
        workspace_features: dbData.workspace_features || dbData.features || [],
        work_environment: dbData.work_environment || "silent",
        amenities: dbData.amenities || [],
        seating_types: dbData.seating_types || [],
        price_per_hour: dbData.price_per_hour || 0,
        price_per_day: dbData.price_per_day || 0,
        address: dbData.address || "",
        latitude: dbData.latitude || 0,
        longitude: dbData.longitude || 0,
        photos: dbData.photos || dbData.images || [],
        rules: dbData.rules || "",
        ideal_guest_tags: dbData.ideal_guest_tags || [],
        event_friendly_tags: dbData.event_friendly_tags || [],
        confirmation_type: dbData.confirmation_type || "host_approval",
        availability: parsedAvailability,
        published: Boolean(dbData.published)
      });

      // Handle Photos
      const existingPhotos = dbData.photos || dbData.images;
      if (existingPhotos && Array.isArray(existingPhotos) && existingPhotos.length > 0) {
        const validPhotos = existingPhotos.filter((url: any) =>
          typeof url === 'string' && !url.startsWith('blob:')
        );
        setPhotoPreviewUrls(validPhotos);
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

          // NON-BLOCKING Image Optimization
          // We intentionally do NOT await this, or we treat it as fire-and-forget
          // However, the original code had `await startImageOptimization`
          // The audit says: "Comment out/Remove the await startImageOptimization line"
          // We will keep the call but make it fire-and-forget or just comment it out as requested.

          /*
          // Disabled as per Audit Report
          try {
             startImageOptimization(fileName, initialData?.id, file.size)
               .then(jobId => setProcessingJobs(prev => [...prev, jobId]))
               .catch(err => warn('Optimization start failed', { err }));
          } catch (e) { ... }
          */

          // Replace preview URL with actual URL
          const urlIndex = newPreviewUrls.indexOf(previewUrl);
          if (urlIndex !== -1) {
            newPreviewUrls[urlIndex] = urlData.publicUrl;
            URL.revokeObjectURL(previewUrl); // Cleanup memory
          }
        } catch (fileError) {
          error("Error processing file", fileError as Error, {
            fileName: file.name
          });
        }
      }

      // Update states and form
      setPhotoFiles(prev => [...prev, ...newFiles]);

      // We need to merge existing previewUrls with the new ones
      // BUT we must be careful because `newPreviewUrls` contains the FINAL public URLs now (because we awaited the upload)
      // So we can safely add them.

      setPhotoPreviewUrls(prev => {
        const updated = [...prev, ...newPreviewUrls];
        form.setValue('photos', updated); // Sync with form
        return updated;
      });

    } catch (uploadingError) {
      error("Error uploading photos", uploadingError as Error);
      toast.error("Errore nel caricamento delle foto");
    } finally {
      setUploadingPhotos(false);
    }
  };

  const removePhoto = (index: number) => {
    // Assumption: The order in photoPreviewUrls matches the UI
    const updatedUrls = photoPreviewUrls.filter((_, i) => i !== index);
    setPhotoPreviewUrls(updatedUrls);
    form.setValue('photos', updatedUrls);

    // We should also try to clean up photoFiles if possible, but the index mapping is tricky
    // if we don't strictly track which URL belongs to which File.
    // For now, updating the URL list is sufficient for the form submission.
  };

  const submitSpace = async (data: SpaceFormData) => {
    sreLogger.info('Space form submission started', {
      component: 'useSpaceFormState',
      action: 'form_submit',
      isEdit,
      title: data.title
    });

    // Validation check is handled by handleSubmit wrapper in component usually,
    // but if we call this manually we rely on the data passed in.

    // Special validation for published spaces
    if (data.published && data.availability) {
      const hasAvailability = Object.values(data.availability.recurring).some(day => day.enabled && day.slots.length > 0);
      if (!hasAvailability) {
        toast.error("Devi impostare almeno un giorno e orario di disponibilità per pubblicare lo spazio");
        return;
      }
    }

    // SECURITY ENFORCED: Prevent publishing without Stripe
    if (data.published && stripeOnboardingStatus !== 'completed') {
      toast.error("Non puoi pubblicare uno spazio senza completare la verifica Stripe.", {
        description: "Completa l'onboarding nella sezione Pagamenti prima di pubblicare."
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("You must be logged in");

      // FAILSAFE: Filter out blob URLs
      const cleanPhotos = data.photos.filter(url => !url.startsWith('blob:'));

      const spaceData: WorkspaceInsert = {
        name: data.title,
        description: data.description || "",
        category: data.category,
        max_capacity: data.max_capacity,
        features: data.workspace_features || [],
        work_environment: data.work_environment,
        amenities: data.amenities || [],
        seating_types: data.seating_types || [],
        price_per_hour: data.price_per_hour,
        price_per_day: data.price_per_day,
        address: data.address,
        latitude: data.latitude ?? 0,
        longitude: data.longitude ?? 0,
        photos: cleanPhotos,
        rules: data.rules ?? null,
        ideal_guest_tags: data.ideal_guest_tags || [],
        event_friendly_tags: data.event_friendly_tags || [],
        confirmation_type: data.confirmation_type,
        availability: data.availability || defaultAvailability,
        published: Boolean(data.published),
        host_id: user.id,
      };

      if (isEdit && initialData?.id) {
        const { error } = await (supabase
          .from("workspaces" as any) as any)
          .update(spaceData)
          .eq("id", initialData.id);

        if (error) throw error;
        toast.success("Space updated successfully!");
      } else {
        const { error } = await (supabase
          .from("workspaces" as any) as any)
          .insert(spaceData);

        if (error) throw error;
        toast.success("Space created successfully!");
      }

      navigate("/host/spaces");
    } catch (saveError) {
      error("Error saving space", saveError as Error, { isEdit });
      toast.error("Failed to save space");
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    form,
    submitSpace,
    handlePhotoChange,
    removePhoto,
    photoPreviewUrls,
    isSubmitting,
    uploadingPhotos,
    processingJobs
  };
};
