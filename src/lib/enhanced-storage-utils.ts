
import { supabase } from '@/integrations/supabase/client';
import { createContextualLogger } from '@/lib/logger';
import { startImageOptimization, getBestImageUrl } from '@/lib/image-optimization';

const storageLogger = createContextualLogger('EnhancedStorage');

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface OptimizedUploadResult {
  originalUrl: string;
  filePath: string;
  optimizationJobId?: string;
  size: number;
}

// Enhanced upload with automatic optimization
export const uploadSpacePhotoWithOptimization = async (
  file: File,
  userId: string,
  spaceId?: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<OptimizedUploadResult> => {
  const stopTimer = storageLogger.startTimer('uploadSpacePhotoWithOptimization');
  
  try {
    storageLogger.info('Starting enhanced photo upload', {
      action: 'upload_start',
      fileName: file.name,
      fileSize: file.size,
      spaceId
    });

    // Validate file
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      throw new Error('File size must be less than 50MB');
    }

    // Generate unique file path
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    storageLogger.debug('Generated file path', {
      action: 'file_path_generated',
      fileName,
      originalName: file.name
    });

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('space_photos')
      .upload(fileName, file, {
        upsert: false,
        metadata: {
          originalName: file.name,
          spaceId: spaceId || '',
          uploadedAt: new Date().toISOString()
        }
      });

    if (uploadError) {
      storageLogger.error('Upload failed', uploadError);
      throw new Error(`Upload failed: ${uploadError.message}`);
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('space_photos')
      .getPublicUrl(fileName);

    const result: OptimizedUploadResult = {
      originalUrl: urlData.publicUrl,
      filePath: fileName,
      size: file.size
    };

    // Start optimization process
    try {
      const optimizationJobId = await startImageOptimization(
        fileName,
        spaceId,
        file.size
      );
      
      result.optimizationJobId = optimizationJobId;
      
      storageLogger.info('Image optimization started', {
        action: 'optimization_started',
        fileName,
        jobId: optimizationJobId
      });
    } catch (optimizationError) {
      storageLogger.warn('Failed to start optimization, continuing with original', {
        action: 'optimization_failed',
        error: optimizationError instanceof Error ? optimizationError.message : 'Unknown error'
      });
    }

    storageLogger.info('Enhanced upload completed successfully', {
      action: 'upload_completed',
      fileName,
      originalUrl: result.originalUrl,
      hasOptimization: !!result.optimizationJobId
    });

    return result;
  } catch (error) {
    storageLogger.error('Enhanced upload failed', error instanceof Error ? error : new Error('Unknown error'));
    throw error;
  } finally {
    stopTimer();
  }
};

// Initialize storage bucket with proper configuration
export const initializeSpacePhotosBucket = async (): Promise<boolean> => {
  try {
    storageLogger.info('Checking space_photos bucket initialization');

    // Check if bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      storageLogger.error('Failed to list buckets', listError);
      throw listError;
    }
    
    const spacePhotosBucket = buckets.find(bucket => bucket.id === 'space_photos');
    
    if (!spacePhotosBucket) {
      storageLogger.warn('space_photos bucket does not exist');
      return false;
    }
    
    storageLogger.info('space_photos bucket is properly configured');
    return true;
  } catch (error) {
    storageLogger.error('Error checking space_photos bucket', error instanceof Error ? error : new Error('Unknown error'));
    return false;
  }
};

// Delete image and cleanup optimization data
export const deleteSpacePhoto = async (filePath: string): Promise<boolean> => {
  try {
    storageLogger.info('Deleting space photo', {
      action: 'delete_start',
      filePath
    });

    // Delete from storage
    const { error: deleteError } = await supabase.storage
      .from('space_photos')
      .remove([filePath]);

    if (deleteError) {
      storageLogger.error('Failed to delete from storage', deleteError);
      throw deleteError;
    }

    // Check for optimized version and delete it too
    const optimizedPath = filePath.replace(/\.[^.]+$/, '.optimized.webp');
    
    try {
      await supabase.storage
        .from('space_photos')
        .remove([optimizedPath]);
      
      storageLogger.debug('Deleted optimized version', {
        action: 'optimized_deleted',
        optimizedPath
      });
    } catch (error) {
      // Optimized version might not exist, continue
      storageLogger.debug('No optimized version to delete');
    }

    storageLogger.info('Space photo deleted successfully', {
      action: 'delete_completed',
      filePath
    });

    return true;
  } catch (error) {
    storageLogger.error('Failed to delete space photo', error instanceof Error ? error : new Error('Unknown error'));
    return false;
  }
};

// Get optimized image URL with fallback
export const getOptimizedImageUrl = (
  originalPath: string,
  optimizedPath?: string
): string => {
  return getBestImageUrl(originalPath, optimizedPath);
};

// Bulk upload with progress tracking
export const uploadMultipleSpacePhotos = async (
  files: File[],
  userId: string,
  spaceId?: string,
  onProgress?: (fileIndex: number, progress: UploadProgress) => void,
  onComplete?: (fileIndex: number, result: OptimizedUploadResult) => void
): Promise<OptimizedUploadResult[]> => {
  const results: OptimizedUploadResult[] = [];
  
  storageLogger.info('Starting bulk photo upload', {
    action: 'bulk_upload_start',
    fileCount: files.length,
    spaceId
  });

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    
    try {
      const file = files[i];
      if (!file) continue;
      
      const result = await uploadSpacePhotoWithOptimization(
        file,
        userId,
        spaceId,
        (progress) => onProgress?.(i, progress)
      );
      
      results.push(result);
      onComplete?.(i, result);
      
      storageLogger.debug('Individual upload completed in bulk', {
        action: 'bulk_item_completed',
        fileIndex: i,
        fileName: file?.name ?? 'unknown'
      });
    } catch (error) {
      storageLogger.error('Failed to upload file in bulk', {
        action: 'bulk_item_failed',
        fileIndex: i,
        fileName: file?.name ?? 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  storageLogger.info('Bulk upload completed successfully', {
    action: 'bulk_upload_completed',
    uploadedCount: results.length
  });

  return results;
};
