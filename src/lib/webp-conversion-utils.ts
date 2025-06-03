
import { createContextualLogger } from '@/lib/logger';

const webpLogger = createContextualLogger('WebPConversion');

// Check if browser supports WebP format
export const isWebPSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
};

// Convert image file to WebP format
export const convertToWebP = async (
  file: File, 
  quality: number = 0.8
): Promise<{ webpBlob: Blob; originalSize: number; webpSize: number }> => {
  const stopTimer = webpLogger.startTimer('convertToWebP');
  
  try {
    webpLogger.info('Starting WebP conversion', {
      action: 'webp_conversion_start',
      originalFileName: file.name,
      originalSize: file.size,
      quality
    });

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        try {
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          
          if (!ctx) {
            throw new Error('Canvas context not available');
          }

          ctx.drawImage(img, 0, 0);
          
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('WebP conversion failed'));
              return;
            }

            const originalSize = file.size;
            const webpSize = blob.size;
            const compressionRatio = ((originalSize - webpSize) / originalSize * 100).toFixed(2);

            webpLogger.info('WebP conversion successful', {
              action: 'webp_conversion_success',
              originalSize,
              webpSize,
              compressionRatio: `${compressionRatio}%`
            });

            resolve({
              webpBlob: blob,
              originalSize,
              webpSize
            });
          }, 'image/webp', quality);
        } catch (error) {
          webpLogger.error('Error during WebP conversion', error instanceof Error ? error : new Error('WebP conversion error'));
          reject(error);
        }
      };

      img.onerror = () => {
        const error = new Error('Failed to load image for WebP conversion');
        webpLogger.error('Image load failed for WebP conversion', error);
        reject(error);
      };

      img.src = URL.createObjectURL(file);
    });
  } catch (error) {
    webpLogger.error('WebP conversion exception', error instanceof Error ? error : new Error('WebP conversion exception'));
    throw error;
  } finally {
    stopTimer();
  }
};

// Generate WebP and fallback URLs
export const generateImageUrls = (
  baseUrl: string, 
  supportWebP: boolean = isWebPSupported()
): { primary: string; fallback: string } => {
  if (!baseUrl) {
    webpLogger.warn('Empty base URL provided for image generation');
    return { primary: '', fallback: '' };
  }

  // If URL already has format parameter, use as-is
  if (baseUrl.includes('format=')) {
    return { primary: baseUrl, fallback: baseUrl };
  }

  const separator = baseUrl.includes('?') ? '&' : '?';
  
  const webpUrl = `${baseUrl}${separator}format=webp`;
  const fallbackUrl = baseUrl;

  webpLogger.debug('Generated image URLs', {
    action: 'generate_urls',
    supportWebP,
    webpUrl,
    fallbackUrl
  });

  return {
    primary: supportWebP ? webpUrl : fallbackUrl,
    fallback: fallbackUrl
  };
};

// Create blur placeholder from image
export const createBlurPlaceholder = async (file: File): Promise<string> => {
  const stopTimer = webpLogger.startTimer('createBlurPlaceholder');
  
  try {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        try {
          // Create small blurred version
          const size = 20;
          canvas.width = size;
          canvas.height = size;

          if (!ctx) {
            throw new Error('Canvas context not available');
          }

          ctx.filter = 'blur(4px)';
          ctx.drawImage(img, 0, 0, size, size);
          
          const blurDataUrl = canvas.toDataURL('image/jpeg', 0.1);
          
          webpLogger.debug('Blur placeholder created', {
            action: 'blur_placeholder_created',
            originalFileName: file.name
          });

          resolve(blurDataUrl);
        } catch (error) {
          webpLogger.error('Error creating blur placeholder', error instanceof Error ? error : new Error('Blur placeholder error'));
          reject(error);
        }
      };

      img.onerror = () => {
        const error = new Error('Failed to load image for blur placeholder');
        webpLogger.error('Image load failed for blur placeholder', error);
        reject(error);
      };

      img.src = URL.createObjectURL(file);
    });
  } catch (error) {
    webpLogger.error('Blur placeholder exception', error instanceof Error ? error : new Error('Blur placeholder exception'));
    throw error;
  } finally {
    stopTimer();
  }
};
