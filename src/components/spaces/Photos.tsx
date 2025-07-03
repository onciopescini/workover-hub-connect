
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Image, Loader2, Check, AlertCircle } from "lucide-react";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState, useCallback, useEffect } from "react";
import { 
  getImageProcessingJob, 
  subscribeToImageProcessingUpdates,
  generateOptimizedImageUrls,
  type ImageProcessingJob 
} from '@/lib/image-optimization';

interface PhotosProps {
  photoPreviewUrls: string[];
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: (index: number) => void;
  isSubmitting: boolean;
  uploadingPhotos: boolean;
  processingJobs?: string[]; // Array of job IDs for tracking optimization
}

interface ImageState {
  url: string;
  processingJob?: ImageProcessingJob | undefined;
  optimizedUrls?: { original: string; optimized?: string } | undefined;
}

export const Photos = ({
  photoPreviewUrls,
  onPhotoChange,
  onRemovePhoto,
  isSubmitting,
  uploadingPhotos,
  processingJobs = []
}: PhotosProps) => {
  const [imageStates, setImageStates] = useState<Map<string, ImageState>>(new Map());

  // Initialize image states for existing URLs
  useEffect(() => {
    const newStates = new Map<string, ImageState>();
    
    photoPreviewUrls.forEach((url) => {
      newStates.set(url, {
        url,
        processingJob: imageStates.get(url)?.processingJob || undefined,
        optimizedUrls: imageStates.get(url)?.optimizedUrls || undefined
      });
    });
    
    setImageStates(newStates);
  }, [photoPreviewUrls]);

  // Subscribe to processing job updates
  useEffect(() => {
    const unsubscribeFunctions: (() => void)[] = [];

    processingJobs.forEach(async (jobId) => {
      try {
        // Get initial job state
        const job = await getImageProcessingJob(jobId);
        if (job) {
          // Find corresponding image URL
          const imageUrl = photoPreviewUrls.find(url => 
            url.includes(job.original_path.split('/').pop() || '')
          );
          
          if (imageUrl) {
            setImageStates(prev => {
              const newMap = new Map(prev);
              const state = newMap.get(imageUrl) || { url: imageUrl };
              
              newMap.set(imageUrl, {
                ...state,
                processingJob: job,
                optimizedUrls: job.optimized_path 
                  ? generateOptimizedImageUrls(job.original_path, job.optimized_path)
                  : state.optimizedUrls || undefined
              });
              
              return newMap;
            });

            // Subscribe to updates
            const unsubscribe = subscribeToImageProcessingUpdates(jobId, (updatedJob) => {
              setImageStates(prev => {
                const newMap = new Map(prev);
                const state = newMap.get(imageUrl);
                
                if (state) {
                  newMap.set(imageUrl, {
                    ...state,
                    processingJob: updatedJob,
                    optimizedUrls: updatedJob.optimized_path 
                      ? generateOptimizedImageUrls(updatedJob.original_path, updatedJob.optimized_path)
                      : state.optimizedUrls || undefined
                  });
                }
                
                return newMap;
              });
            });

            unsubscribeFunctions.push(unsubscribe);
          }
        }
      } catch (error) {
        console.error('Failed to subscribe to job updates:', error);
      }
    });

    return () => {
      unsubscribeFunctions.forEach(unsub => unsub());
    };
  }, [processingJobs, photoPreviewUrls]);

  const getImageStatus = useCallback((url: string): 'uploading' | 'processing' | 'optimized' | 'error' | 'completed' | 'ready' => {
    const state = imageStates.get(url);
    
    if (uploadingPhotos) return 'uploading';
    if (!state?.processingJob) return 'ready';
    
    switch (state.processingJob.status) {
      case 'pending':
      case 'processing':
        return 'processing';
      case 'completed':
        return state.processingJob.optimized_path ? 'optimized' : 'completed';
      case 'failed':
        return 'error';
      default:
        return 'ready';
    }
  }, [imageStates, uploadingPhotos]);

  const getStatusDisplay = useCallback((status: string, compressionRatio?: number) => {
    const displays = {
      uploading: {
        icon: <Loader2 className="w-3 h-3 animate-spin" />,
        text: 'Caricamento...',
        color: 'bg-blue-100 text-blue-800'
      },
      processing: {
        icon: <Loader2 className="w-3 h-3 animate-spin" />,
        text: 'Ottimizzazione...',
        color: 'bg-blue-100 text-blue-800'
      },
      optimized: {
        icon: <Check className="w-3 h-3" />,
        text: compressionRatio ? `Ottimizzata (-${compressionRatio.toFixed(1)}%)` : 'Ottimizzata',
        color: 'bg-green-100 text-green-800'
      },
      completed: {
        icon: <Check className="w-3 h-3" />,
        text: 'Completata',
        color: 'bg-green-100 text-green-800'
      },
      error: {
        icon: <AlertCircle className="w-3 h-3" />,
        text: 'Errore ottimizzazione',
        color: 'bg-red-100 text-red-800'
      },
      ready: {
        icon: null,
        text: null,
        color: ''
      }
    };

    return displays[status as keyof typeof displays] || displays.ready;
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Foto</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {photoPreviewUrls.map((url, index) => {
            const status = getImageStatus(url);
            const state = imageStates.get(url);
            const statusDisplay = getStatusDisplay(status, state?.processingJob?.compression_ratio);
            
            // Use optimized URL if available, otherwise use original
            const displayUrl = state?.optimizedUrls?.optimized || url;

            return (
              <div key={index} className="relative group">
                <div className="aspect-square bg-gray-100 rounded-md overflow-hidden border border-gray-200">
                  <OptimizedImage
                    src={displayUrl}
                    alt={`Space photo ${index + 1}`}
                    className="h-full w-full object-cover"
                    enableWebP={true}
                    enableResponsive={true}
                    priority={index < 4}
                    onLoadComplete={() => console.log(`Space photo ${index + 1} loaded`)}
                  />
                </div>
                
                {/* Status Badge */}
                {statusDisplay.text && (
                  <div className="absolute top-2 left-2 z-10">
                    <Badge className={cn("text-xs", statusDisplay.color)}>
                      <div className="flex items-center gap-1">
                        {statusDisplay.icon}
                        <span>{statusDisplay.text}</span>
                      </div>
                    </Badge>
                  </div>
                )}

                {/* Remove Button */}
                <button
                  type="button"
                  onClick={() => onRemovePhoto(index)}
                  className="absolute top-1 right-1 bg-black bg-opacity-50 rounded-full p-1
                            text-white hover:bg-opacity-70 transition-opacity z-10"
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
          <p>Aggiungi foto di alta qualità che mostrino bene il tuo spazio. Le immagini verranno automaticamente ottimizzate.</p>
          <div className="text-xs space-y-1">
            <p>• <strong>Ottimizzazione automatica:</strong> Le tue immagini saranno convertite in formato WebP per prestazioni migliori</p>
            <p>• <strong>Dimensione massima:</strong> 50MB per file</p>
            <p>• <strong>Formati supportati:</strong> JPEG, PNG, WebP, GIF</p>
            <p>• <strong>Compressione intelligente:</strong> Manteniamo la qualità riducendo le dimensioni del file</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
