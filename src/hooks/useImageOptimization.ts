
import { useState, useCallback, useEffect } from 'react';
import { isWebPSupported, convertToWebP, generateImageUrls, createBlurPlaceholder } from '@/lib/webp-conversion-utils';
import { resizeImage, validateImageFile, getImageDimensions } from '@/lib/image-processing-utils';
import { createContextualLogger } from '@/lib/logger';
import type { ResizeOptions } from '@/lib/image-processing-utils';

const optimizationLogger = createContextualLogger('ImageOptimization');

interface ImageOptimizationState {
  isProcessing: boolean;
  error: string | null;
  webpSupported: boolean;
  originalFile: File | null;
  optimizedBlob: Blob | null;
  blurPlaceholder: string | null;
  compressionRatio: number | null;
}

interface UseImageOptimizationOptions {
  enableWebP?: boolean;
  enableResize?: boolean;
  resizeOptions?: ResizeOptions;
  webpQuality?: number;
  generateBlurPlaceholder?: boolean;
  autoOptimize?: boolean;
}

const defaultOptions: UseImageOptimizationOptions = {
  enableWebP: true,
  enableResize: false,
  webpQuality: 0.8,
  generateBlurPlaceholder: true,
  autoOptimize: false
};

export const useImageOptimization = (options: UseImageOptimizationOptions = {}) => {
  const config = { ...defaultOptions, ...options };
  
  const [state, setState] = useState<ImageOptimizationState>({
    isProcessing: false,
    error: null,
    webpSupported: false,
    originalFile: null,
    optimizedBlob: null,
    blurPlaceholder: null,
    compressionRatio: null
  });

  // Check WebP support on mount
  useEffect(() => {
    const supported = isWebPSupported();
    setState(prev => ({ ...prev, webpSupported: supported }));
    
    optimizationLogger.info('WebP support checked', {
      action: 'webp_support_check',
      supported
    });
  }, []);

  const processImage = useCallback(async (file: File): Promise<{
    optimizedBlob: Blob;
    blurPlaceholder?: string;
    compressionRatio: number;
    originalSize: number;
    optimizedSize: number;
  }> => {
    const stopTimer = optimizationLogger.startTimer('processImage');
    
    try {
      setState(prev => ({ ...prev, isProcessing: true, error: null }));
      
      optimizationLogger.info('Starting image processing', {
        action: 'process_start',
        fileName: file.name,
        fileSize: file.size,
        config
      });

      // Validate file
      const validation = validateImageFile(file);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      let processedBlob: Blob = file;
      let blurPlaceholder: string | undefined;
      const originalSize = file.size;

      // Generate blur placeholder if enabled
      if (config.generateBlurPlaceholder) {
        try {
          blurPlaceholder = await createBlurPlaceholder(file);
        } catch (error) {
          optimizationLogger.warn('Failed to create blur placeholder', {
            fileName: file.name,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Resize if enabled
      if (config.enableResize && config.resizeOptions) {
        const resizeResult = await resizeImage(file, config.resizeOptions);
        processedBlob = resizeResult.resizedBlob;
        
        optimizationLogger.info('Image resized', {
          action: 'image_resized',
          originalDimensions: resizeResult.originalDimensions,
          newDimensions: resizeResult.newDimensions
        });
      }

      // Convert to WebP if enabled and supported
      if (config.enableWebP && state.webpSupported) {
        try {
          const webpResult = await convertToWebP(
            processedBlob instanceof File ? processedBlob : new File([processedBlob], file.name),
            config.webpQuality
          );
          processedBlob = webpResult.webpBlob;
          
          optimizationLogger.info('WebP conversion completed', {
            action: 'webp_converted',
            originalSize: webpResult.originalSize,
            webpSize: webpResult.webpSize
          });
        } catch (error) {
          optimizationLogger.warn('WebP conversion failed, using original', {
            fileName: file.name,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      const optimizedSize = processedBlob.size;
      const compressionRatio = ((originalSize - optimizedSize) / originalSize) * 100;

      const result = {
        optimizedBlob: processedBlob,
        ...(blurPlaceholder && { blurPlaceholder }),
        compressionRatio,
        originalSize,
        optimizedSize
      };

      setState(prev => ({
        ...prev,
        isProcessing: false,
        originalFile: file,
        optimizedBlob: processedBlob,
        blurPlaceholder: blurPlaceholder || null,
        compressionRatio
      }));

      optimizationLogger.info('Image processing completed', {
        action: 'process_complete',
        fileName: file.name,
        originalSize,
        optimizedSize,
        compressionRatio: `${compressionRatio.toFixed(2)}%`
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Image processing failed';
      
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage
      }));

      const normalizedError = error instanceof Error ? error : new Error(errorMessage);
      optimizationLogger.error('Image processing failed', {
        action: 'process_error',
        fileName: file.name
      }, normalizedError);

      throw error;
    } finally {
      stopTimer();
    }
  }, [config, state.webpSupported]);

  const generateUrls = useCallback((baseUrl: string) => {
    return generateImageUrls(baseUrl, state.webpSupported);
  }, [state.webpSupported]);

  const reset = useCallback(() => {
    setState({
      isProcessing: false,
      error: null,
      webpSupported: state.webpSupported,
      originalFile: null,
      optimizedBlob: null,
      blurPlaceholder: null,
      compressionRatio: null
    });
    
    optimizationLogger.debug('Image optimization state reset');
  }, [state.webpSupported]);

  // Auto-optimize when file is set and autoOptimize is enabled
  useEffect(() => {
    if (config.autoOptimize && state.originalFile && !state.isProcessing && !state.optimizedBlob) {
      processImage(state.originalFile).catch((error) => {
        optimizationLogger.error('Auto-optimization failed', {}, error);
      });
    }
  }, [config.autoOptimize, state.originalFile, state.isProcessing, state.optimizedBlob, processImage]);

  return {
    // State
    ...state,
    
    // Actions
    processImage,
    generateUrls,
    reset,
    
    // Utils
    webpSupported: state.webpSupported,
    canOptimize: !state.isProcessing && !!state.originalFile
  };
};
