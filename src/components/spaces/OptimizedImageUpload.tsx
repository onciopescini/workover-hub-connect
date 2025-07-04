
import React, { useState, useCallback } from 'react';
import { X, Image, Loader2, Check, AlertCircle } from 'lucide-react';
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { 
  startImageOptimization, 
  getImageProcessingJob, 
  subscribeToImageProcessingUpdates,
  generateOptimizedImageUrls,
  type ImageProcessingJob 
} from '@/lib/image-optimization';
import { frontendLogger } from '@/utils/frontend-logger';

interface OptimizedImageUploadProps {
  photoPreviewUrls: string[];
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: (index: number) => void;
  isSubmitting: boolean;
  uploadingPhotos: boolean;
  spaceId?: string;
}

interface ImageUploadState {
  file: File;
  previewUrl: string;
  uploadedPath?: string;
  processingJob?: ImageProcessingJob;
  optimizedUrls?: { original: string; optimized?: string };
}

export const OptimizedImageUpload: React.FC<OptimizedImageUploadProps> = ({
  photoPreviewUrls,
  onPhotoChange,
  onRemovePhoto,
  isSubmitting,
  uploadingPhotos,
  spaceId
}) => {
  const [imageStates, setImageStates] = useState<Map<string, ImageUploadState>>(new Map());

  const getImageStatus = (previewUrl: string): 'uploading' | 'processing' | 'optimized' | 'error' | 'completed' => {
    const state = imageStates.get(previewUrl);
    if (!state) return 'uploading';
    
    if (!state.uploadedPath) return 'uploading';
    if (!state.processingJob) return 'processing';
    
    switch (state.processingJob.status) {
      case 'pending':
      case 'processing':
        return 'processing';
      case 'completed':
        return state.processingJob.optimized_path ? 'optimized' : 'completed';
      case 'failed':
        return 'error';
      default:
        return 'processing';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploading':
        return <Loader2 className="w-3 h-3 animate-spin" />;
      case 'processing':
        return <Loader2 className="w-3 h-3 animate-spin" />;
      case 'optimized':
        return <Check className="w-3 h-3" />;
      case 'completed':
        return <Check className="w-3 h-3" />;
      case 'error':
        return <AlertCircle className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string, compressionRatio?: number) => {
    switch (status) {
      case 'uploading':
        return 'Caricamento...';
      case 'processing':
        return 'Ottimizzazione...';
      case 'optimized':
        return compressionRatio ? `Ottimizzata (-${compressionRatio.toFixed(1)}%)` : 'Ottimizzata';
      case 'completed':
        return 'Completata';
      case 'error':
        return 'Errore';
      default:
        return 'In elaborazione...';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'uploading':
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'optimized':
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleImageProcessingStart = useCallback(async (
    filePath: string, 
    previewUrl: string, 
    originalSize: number
  ) => {
    try {
      frontendLogger.imageProcessing('Starting image processing', { filePath, spaceId });
      
      const jobId = await startImageOptimization(filePath, spaceId, originalSize);
      
      // Subscribe to job updates
      const unsubscribe = subscribeToImageProcessingUpdates(jobId, (updatedJob) => {
        setImageStates(prev => {
          const newMap = new Map(prev);
          const state = newMap.get(previewUrl);
          if (state) {
            const updatedState = {
              ...state,
              processingJob: updatedJob
            };
            
            // Generate optimized URLs if completed
            if (updatedJob.status === 'completed' && updatedJob.optimized_path) {
              updatedState.optimizedUrls = generateOptimizedImageUrls(
                updatedJob.original_path,
                updatedJob.optimized_path
              );
            }
            
            newMap.set(previewUrl, updatedState);
          }
          return newMap;
        });
      });

      // Get initial job state
      const initialJob = await getImageProcessingJob(jobId);
      if (initialJob) {
        setImageStates(prev => {
          const newMap = new Map(prev);
          const state = newMap.get(previewUrl);
          if (state) {
            newMap.set(previewUrl, {
              ...state,
              processingJob: initialJob
            });
          }
          return newMap;
        });
      }

      // Clean up subscription when component unmounts or image is removed
      return unsubscribe;
    } catch (error) {
      frontendLogger.imageProcessing('Failed to start image processing', error, { 
        component: 'OptimizedImageUpload',
        filePath, 
        spaceId: spaceId || undefined 
      });
      return undefined;
    }
  }, [spaceId]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {photoPreviewUrls.map((url, index) => {
          const status = getImageStatus(url);
          const state = imageStates.get(url);
          const statusIcon = getStatusIcon(status);
          const statusText = getStatusText(status, state?.processingJob?.compression_ratio);
          const statusColor = getStatusColor(status);

          return (
            <div key={index} className="relative group">
              <div className="aspect-square bg-gray-100 rounded-md overflow-hidden border border-gray-200">
                <OptimizedImage
                  src={state?.optimizedUrls?.optimized || url}
                  alt={`Space photo ${index + 1}`}
                  className="h-full w-full object-cover"
                  enableWebP={true}
                  enableResponsive={true}
                  priority={index < 4}
                  onLoadComplete={() => frontendLogger.componentLoad(`Space photo ${index + 1}`, undefined, { component: 'OptimizedImageUpload' })}
                />
              </div>
              
              {/* Status Badge */}
              <div className="absolute top-2 left-2">
                <Badge className={cn("text-xs", statusColor)}>
                  <div className="flex items-center gap-1">
                    {statusIcon}
                    <span>{statusText}</span>
                  </div>
                </Badge>
              </div>

              {/* Remove Button */}
              <button
                type="button"
                onClick={() => onRemovePhoto(index)}
                className="absolute top-1 right-1 bg-black bg-opacity-50 rounded-full p-1
                          text-white hover:bg-opacity-70 transition-opacity"
                disabled={isSubmitting}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}

        {/* Upload Button */}
        <div className="aspect-square bg-gray-50 rounded-md border-2 border-dashed border-gray-200 
                   flex flex-col items-center justify-center p-4 hover:bg-gray-100 transition-colors">
          <label className="cursor-pointer text-center w-full h-full flex flex-col items-center justify-center">
            <Image className="w-8 h-8 mb-2 text-gray-400" />
            <span className="text-sm text-gray-500">Aggiungi Foto</span>
            <span className="text-xs text-gray-400 mt-1">Click per caricare</span>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={onPhotoChange}
              className="hidden"
              disabled={isSubmitting || uploadingPhotos}
            />
          </label>
        </div>
      </div>
      
      <div className="text-sm text-gray-500 space-y-1">
        <p>Aggiungi foto di alta qualità che mostrino bene il tuo spazio.</p>
        <p className="text-xs">
          • Le immagini verranno automaticamente ottimizzate in formato WebP per prestazioni migliori
          • Dimensione massima: 50MB per file
          • Formati supportati: JPEG, PNG, WebP, GIF
        </p>
      </div>
    </div>
  );
};
