
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { startImageOptimization } from "@/lib/image-optimization";
import { sreLogger } from '@/lib/sre-logger';

interface UsePhotoUploadManagerProps {
  photoFiles: File[];
  photoPreviewUrls: string[];
  uploadingPhotos: boolean;
  processingJobs: string[];
  isSubmitting: boolean;
  initialDataId?: string | undefined;
  onUploadingChange: (uploading: boolean) => void;
  onProcessingJobsChange: (jobs: string[]) => void;
  onPhotoFilesChange: (files: File[]) => void;
  onPhotoPreviewUrlsChange: (urls: string[]) => void;
}

export const usePhotoUploadManager = ({
  photoFiles,
  photoPreviewUrls,
  uploadingPhotos,
  processingJobs,
  isSubmitting,
  initialDataId,
  onUploadingChange,
  onProcessingJobsChange,
  onPhotoFilesChange,
  onPhotoPreviewUrlsChange
}: UsePhotoUploadManagerProps) => {

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    onUploadingChange(true);
    
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
          const previewUrl = URL.createObjectURL(file);
          newPreviewUrls.push(previewUrl);
          
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
          
          const { data, error } = await supabase.storage
            .from('space_photos')
            .upload(fileName, file, {
              upsert: true,
            });

          if (error) {
            sreLogger.error('Upload error', { fileName }, error);
            continue;
          }

          const { data: urlData } = supabase.storage
            .from('space_photos')
            .getPublicUrl(fileName);

          try {
            const optimizationJobId = await startImageOptimization(
              fileName,
              initialDataId ?? '',
              file.size
            );
            
            newProcessingJobs.push(optimizationJobId);
            sreLogger.info('Started optimization job', { optimizationJobId, fileName });
          } catch (optimizationError) {
            sreLogger.warn('Failed to start optimization', { fileName }, optimizationError as Error);
          }

          const urlIndex = newPreviewUrls.indexOf(previewUrl);
          if (urlIndex !== -1) {
            newPreviewUrls[urlIndex] = urlData.publicUrl;
            URL.revokeObjectURL(previewUrl);
          }
        } catch (error) {
          sreLogger.error('Error processing file', { fileName: file.name }, error as Error);
        }
      }
      
      onPhotoFilesChange([...photoFiles, ...newFiles]);
      onPhotoPreviewUrlsChange([...photoPreviewUrls, ...newPreviewUrls]);
      onProcessingJobsChange([...processingJobs, ...newProcessingJobs]);
      
    } catch (error) {
      sreLogger.error('Error uploading photos', {}, error as Error);
      toast.error("Errore nel caricamento delle foto");
    } finally {
      onUploadingChange(false);
    }
  };

  const removePhoto = (index: number) => {
    if (index < photoFiles.length) {
      const url = photoPreviewUrls[index];
      if (url) {
        URL.revokeObjectURL(url);
      }
      onPhotoFilesChange(photoFiles.filter((_, i) => i !== index));
    }
    
    onPhotoPreviewUrlsChange(photoPreviewUrls.filter((_, i) => i !== index));
  };

  return {
    handlePhotoChange,
    removePhoto
  };
};
