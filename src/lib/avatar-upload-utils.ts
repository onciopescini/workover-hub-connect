import { supabase } from '@/integrations/supabase/client';
import { createContextualLogger } from '@/lib/logger';

const avatarLogger = createContextualLogger('AvatarUpload');

export interface AvatarUploadProgress {
  loaded: number;
  total: number;
  percentage: number;
  phase: 'preparing' | 'uploading' | 'processing' | 'complete';
}

export interface AvatarUploadResult {
  url: string;
  filePath: string;
  size: number;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

/**
 * Upload avatar with progress tracking
 */
export const uploadAvatarWithProgress = async (
  file: File,
  userId: string,
  onProgress?: (progress: AvatarUploadProgress) => void
): Promise<AvatarUploadResult> => {
  const stopTimer = avatarLogger.startTimer('uploadAvatar');
  
  try {
    avatarLogger.info('Starting avatar upload', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      userId
    });

    // Phase 1: Preparing (validation & compression)
    onProgress?.({
      loaded: 0,
      total: 100,
      percentage: 0,
      phase: 'preparing'
    });

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error('Tipo di file non supportato. Usa JPG, PNG o WEBP.');
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('Il file è troppo grande. Dimensione massima: 5MB.');
    }

    onProgress?.({
      loaded: 20,
      total: 100,
      percentage: 20,
      phase: 'preparing'
    });

    // Phase 2: Uploading
    onProgress?.({
      loaded: 30,
      total: 100,
      percentage: 30,
      phase: 'uploading'
    });

    // Generate unique file path
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`;

    avatarLogger.debug('Uploading to storage', { fileName });

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true, // Replace existing avatar
        metadata: {
          userId,
          uploadedAt: new Date().toISOString()
        }
      });

    if (uploadError) {
      avatarLogger.error('Upload failed', uploadError);
      throw new Error(`Errore durante l'upload: ${uploadError.message}`);
    }

    onProgress?.({
      loaded: 80,
      total: 100,
      percentage: 80,
      phase: 'processing'
    });

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);

    if (!urlData?.publicUrl) {
      throw new Error('Impossibile ottenere l\'URL pubblico');
    }

    // Update profile with new avatar URL
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ profile_photo_url: urlData.publicUrl })
      .eq('id', userId);

    if (updateError) {
      avatarLogger.error('Failed to update profile', updateError);
      throw new Error('Errore durante l\'aggiornamento del profilo');
    }

    onProgress?.({
      loaded: 100,
      total: 100,
      percentage: 100,
      phase: 'complete'
    });

    avatarLogger.info('Avatar upload completed successfully', {
      url: urlData.publicUrl,
      filePath: fileName,
      size: file.size
    });

    const result: AvatarUploadResult = {
      url: urlData.publicUrl,
      filePath: fileName,
      size: file.size
    };

    stopTimer();
    return result;
    
  } catch (error) {
    avatarLogger.error('Avatar upload failed', error instanceof Error ? error : new Error('Unknown error'));
    stopTimer();
    throw error;
  }
};

/**
 * Delete old avatar from storage
 */
export const deleteOldAvatar = async (userId: string): Promise<void> => {
  try {
    avatarLogger.debug('Deleting old avatars', { userId });

    const { data: files, error: listError } = await supabase.storage
      .from('avatars')
      .list(userId);

    if (listError) {
      avatarLogger.warn('Failed to list old avatars', listError);
      return;
    }

    if (!files || files.length === 0) {
      return;
    }

    // Delete all old avatar files
    const filePaths = files.map(f => `${userId}/${f.name}`);
    const { error: deleteError } = await supabase.storage
      .from('avatars')
      .remove(filePaths);

    if (deleteError) {
      avatarLogger.warn('Failed to delete old avatars', deleteError);
    } else {
      avatarLogger.info('Old avatars deleted successfully', {
        count: filePaths.length
      });
    }
  } catch (error) {
    avatarLogger.warn('Error during avatar cleanup', error instanceof Error ? error : new Error('Unknown error'));
  }
};

/**
 * Validate image dimensions (optional, for quality control)
 */
export const validateImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Impossibile leggere le dimensioni dell\'immagine'));
    };

    img.src = url;
  });
};
