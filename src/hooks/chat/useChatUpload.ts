/**
 * useChatUpload - Hook for uploading chat attachments
 * 
 * Uploads files to Supabase Storage following the path format:
 * {user_id}/{conversation_id}/{filename}
 */

import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { sreLogger } from '@/lib/sre-logger';
import { toast } from 'sonner';
import type { MessageAttachment } from '@/types/chat';

const BUCKET_NAME = 'chat-attachments';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_FILE_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

interface UseChatUploadOptions {
  userId: string;
  conversationId: string;
}

interface UploadResult {
  success: boolean;
  attachment?: MessageAttachment;
  error?: string;
}

export function useChatUpload({ userId, conversationId }: UseChatUploadOptions) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const validateFile = useCallback((file: File): string | null => {
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      return 'Tipo di file non supportato. Usa immagini, PDF o documenti Word.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'Il file è troppo grande. Massimo 10MB.';
    }
    return null;
  }, []);

  const getFileType = useCallback((mimeType: string): 'image' | 'file' => {
    return ALLOWED_IMAGE_TYPES.includes(mimeType) ? 'image' : 'file';
  }, []);

  const uploadFile = useCallback(async (file: File): Promise<UploadResult> => {
    // Validate
    const validationError = validateFile(file);
    if (validationError) {
      toast.error(validationError);
      return { success: false, error: validationError };
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Generate unique filename to prevent collisions
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const fileName = `${timestamp}_${sanitizedName}`;
      
      // Path format: {user_id}/{conversation_id}/{filename}
      const filePath = `${userId}/${conversationId}/${fileName}`;

      sreLogger.info('Uploading chat attachment', { 
        component: 'useChatUpload', 
        filePath,
        fileSize: file.size,
        fileType: file.type 
      });

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        sreLogger.error('Upload failed', { component: 'useChatUpload' }, uploadError);
        throw new Error(uploadError.message);
      }

      setUploadProgress(100);

      // Get signed URL for private bucket
      const { data: signedUrlData, error: urlError } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(filePath, 60 * 60 * 24 * 7); // 7 days expiry

      if (urlError) {
        sreLogger.error('Failed to get signed URL', { component: 'useChatUpload' }, urlError);
        throw new Error('Impossibile generare URL per il file');
      }

      const attachment: MessageAttachment = {
        url: signedUrlData.signedUrl,
        type: getFileType(file.type),
        name: file.name,
        size: file.size
      };

      sreLogger.info('Upload completed', { component: 'useChatUpload', filePath });
      
      return { success: true, attachment };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload fallito';
      sreLogger.error('Exception during upload', { component: 'useChatUpload' }, err as Error);
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [userId, conversationId, validateFile, getFileType]);

  const uploadMultipleFiles = useCallback(async (files: File[]): Promise<MessageAttachment[]> => {
    const attachments: MessageAttachment[] = [];
    
    for (const file of files) {
      const result = await uploadFile(file);
      if (result.success && result.attachment) {
        attachments.push(result.attachment);
      }
    }
    
    return attachments;
  }, [uploadFile]);

  return {
    uploadFile,
    uploadMultipleFiles,
    isUploading,
    uploadProgress,
    validateFile,
    maxFileSize: MAX_FILE_SIZE,
    allowedTypes: ALLOWED_FILE_TYPES
  };
}
