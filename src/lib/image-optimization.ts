
import { supabase } from "@/integrations/supabase/client";
import { createContextualLogger } from '@/lib/logger';

const imageLogger = createContextualLogger('ImageOptimization');

export interface ImageProcessingJob {
  id: string;
  user_id: string;
  space_id?: string;
  original_path: string;
  optimized_path?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  original_size?: number;
  optimized_size?: number;
  compression_ratio?: number;
  error_message?: string;
  created_at: string;
  completed_at?: string;
  updated_at: string;
}

export interface OptimizedImageUrls {
  original: string;
  optimized?: string;
  thumbnail?: string;
}

// Start image optimization process
export const startImageOptimization = async (
  filePath: string,
  spaceId?: string,
  originalSize?: number
): Promise<string> => {
  const stopTimer = imageLogger.startTimer('startImageOptimization');
  
  try {
    imageLogger.info('Starting image optimization', {
      action: 'optimization_start',
      filePath,
      spaceId,
      originalSize
    });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('User not authenticated');
    }

    const response = await fetch('/functions/v1/image-optimizer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        filePath,
        spaceId,
        originalSize
      })
    });

    if (!response.ok) {
      throw new Error(`Optimization request failed: ${response.statusText}`);
    }

    // Handle case where response might not be JSON (e.g. HTML 404/500)
    let result;
    try {
      result = await response.json();
    } catch (parseError) {
      const text = await response.text().catch(() => 'No body');
      imageLogger.error('Failed to parse optimization response', {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        bodyPreview: text.substring(0, 200)
      });
      throw new Error(`Invalid response from optimization service: ${response.statusText}`);
    }
    
    if (!result.success) {
      throw new Error(result.error || 'Unknown optimization error');
    }

    imageLogger.info('Image optimization started successfully', {
      action: 'optimization_started',
      jobId: result.jobId
    });

    return result.jobId;
  } catch (error) {
    imageLogger.error('Failed to start image optimization', error instanceof Error ? error : new Error('Unknown error'));
    throw error;
  } finally {
    stopTimer();
  }
};

// Get processing job status
export const getImageProcessingJob = async (jobId: string): Promise<ImageProcessingJob | null> => {
  try {
    const { data, error } = await supabase
      .from('image_processing_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Job not found
      }
      throw error;
    }

    // Cast the status to the correct type
    return {
      ...data,
      status: data.status as 'pending' | 'processing' | 'completed' | 'failed'
    } as ImageProcessingJob;
  } catch (error) {
    imageLogger.error('Failed to get image processing job', error instanceof Error ? error : new Error('Unknown error'));
    return null;
  }
};

// Get all processing jobs for a space
export const getSpaceImageJobs = async (spaceId: string): Promise<ImageProcessingJob[]> => {
  try {
    const { data, error } = await supabase
      .from('image_processing_jobs')
      .select('*')
      .eq('space_id', spaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Cast the status to the correct type for each item
    return (data || []).map(item => ({
      ...item,
      status: item.status as 'pending' | 'processing' | 'completed' | 'failed'
    })) as ImageProcessingJob[];
  } catch (error) {
    imageLogger.error('Failed to get space image jobs', error instanceof Error ? error : new Error('Unknown error'));
    return [];
  }
};

// Generate optimized image URLs
export const generateOptimizedImageUrls = (
  originalPath: string,
  optimizedPath?: string
): OptimizedImageUrls => {
  const originalUrl = supabase.storage
    .from('space_photos')
    .getPublicUrl(originalPath).data.publicUrl;

  const optimizedUrl = optimizedPath 
    ? supabase.storage
        .from('space_photos')
        .getPublicUrl(optimizedPath).data.publicUrl
    : undefined;

  const result: OptimizedImageUrls = {
    original: originalUrl
  };

  if (optimizedUrl) {
    result.optimized = optimizedUrl;
  }

  return result;
};

// Check if image is optimized
export const isImageOptimized = (filePath: string): boolean => {
  return filePath.includes('.optimized.webp');
};

// Get best available image URL (prefer optimized)
export const getBestImageUrl = (
  originalPath: string,
  optimizedPath?: string
): string => {
  const urls = generateOptimizedImageUrls(originalPath, optimizedPath);
  return urls.optimized || urls.original;
};

// Subscribe to processing job updates
export const subscribeToImageProcessingUpdates = (
  jobId: string,
  callback: (job: ImageProcessingJob) => void
) => {
  const channel = supabase
    .channel(`image-job-${jobId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'image_processing_jobs',
        filter: `id=eq.${jobId}`
      },
      (payload) => {
        imageLogger.debug('Image processing job updated', {
          action: 'job_update',
          jobId,
          status: payload.new['status']
        });
        
        // Cast the status to the correct type
        const updatedJob = {
          ...payload.new,
          status: payload.new['status'] as 'pending' | 'processing' | 'completed' | 'failed'
        } as ImageProcessingJob;
        
        callback(updatedJob);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
