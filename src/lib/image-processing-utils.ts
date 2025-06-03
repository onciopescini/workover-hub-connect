
import { createContextualLogger } from '@/lib/logger';

const imageLogger = createContextualLogger('ImageProcessing');

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ResizeOptions {
  width?: number;
  height?: number;
  quality?: number;
  maintainAspectRatio?: boolean;
}

export interface ResponsiveBreakpoint {
  width: number;
  density?: number;
}

// Default responsive breakpoints
export const DEFAULT_BREAKPOINTS: ResponsiveBreakpoint[] = [
  { width: 320, density: 1 },
  { width: 480, density: 1 },
  { width: 768, density: 1 },
  { width: 1024, density: 1 },
  { width: 1440, density: 1 },
  { width: 640, density: 2 }, // 2x for mobile
  { width: 1536, density: 2 }, // 2x for desktop
];

// Get image dimensions from file
export const getImageDimensions = async (file: File): Promise<ImageDimensions> => {
  const stopTimer = imageLogger.startTimer('getImageDimensions');
  
  try {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        const dimensions = {
          width: img.naturalWidth,
          height: img.naturalHeight
        };
        
        imageLogger.debug('Image dimensions retrieved', {
          action: 'dimensions_retrieved',
          fileName: file.name,
          ...dimensions
        });
        
        resolve(dimensions);
      };
      
      img.onerror = () => {
        const error = new Error('Failed to load image for dimension calculation');
        imageLogger.error('Image load failed for dimensions', error);
        reject(error);
      };
      
      img.src = URL.createObjectURL(file);
    });
  } catch (error) {
    imageLogger.error('Get dimensions exception', error instanceof Error ? error : new Error('Dimensions exception'));
    throw error;
  } finally {
    stopTimer();
  }
};

// Resize image file
export const resizeImage = async (
  file: File, 
  options: ResizeOptions
): Promise<{ resizedBlob: Blob; originalDimensions: ImageDimensions; newDimensions: ImageDimensions }> => {
  const stopTimer = imageLogger.startTimer('resizeImage');
  
  try {
    const originalDimensions = await getImageDimensions(file);
    
    imageLogger.info('Starting image resize', {
      action: 'resize_start',
      fileName: file.name,
      originalDimensions,
      targetOptions: options
    });

    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        try {
          let { width: targetWidth, height: targetHeight } = options;
          const { width: originalWidth, height: originalHeight } = originalDimensions;

          // Calculate dimensions maintaining aspect ratio
          if (options.maintainAspectRatio !== false) {
            if (targetWidth && !targetHeight) {
              targetHeight = (originalHeight * targetWidth) / originalWidth;
            } else if (targetHeight && !targetWidth) {
              targetWidth = (originalWidth * targetHeight) / originalHeight;
            } else if (targetWidth && targetHeight) {
              const aspectRatio = originalWidth / originalHeight;
              const targetAspectRatio = targetWidth / targetHeight;
              
              if (aspectRatio > targetAspectRatio) {
                targetHeight = targetWidth / aspectRatio;
              } else {
                targetWidth = targetHeight * aspectRatio;
              }
            }
          }

          // Use original dimensions if no targets specified
          const finalWidth = targetWidth || originalWidth;
          const finalHeight = targetHeight || originalHeight;

          canvas.width = finalWidth;
          canvas.height = finalHeight;

          if (!ctx) {
            throw new Error('Canvas context not available');
          }

          // High quality rendering
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          ctx.drawImage(img, 0, 0, finalWidth, finalHeight);
          
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Image resize failed'));
              return;
            }

            const newDimensions = { width: finalWidth, height: finalHeight };
            
            imageLogger.info('Image resize successful', {
              action: 'resize_success',
              originalDimensions,
              newDimensions,
              originalSize: file.size,
              newSize: blob.size
            });

            resolve({
              resizedBlob: blob,
              originalDimensions,
              newDimensions
            });
          }, file.type, options.quality || 0.9);
        } catch (error) {
          imageLogger.error('Error during image resize', error instanceof Error ? error : new Error('Image resize error'));
          reject(error);
        }
      };

      img.onerror = () => {
        const error = new Error('Failed to load image for resizing');
        imageLogger.error('Image load failed for resize', error);
        reject(error);
      };

      img.src = URL.createObjectURL(file);
    });
  } catch (error) {
    imageLogger.error('Resize image exception', error instanceof Error ? error : new Error('Resize exception'));
    throw error;
  } finally {
    stopTimer();
  }
};

// Generate srcSet string for responsive images
export const generateSrcSet = (
  baseUrl: string, 
  breakpoints: ResponsiveBreakpoint[] = DEFAULT_BREAKPOINTS
): string => {
  if (!baseUrl) {
    imageLogger.warn('Empty base URL provided for srcSet generation');
    return '';
  }

  const srcSetEntries = breakpoints.map(bp => {
    const separator = baseUrl.includes('?') ? '&' : '?';
    const url = `${baseUrl}${separator}w=${bp.width}`;
    const descriptor = bp.density ? `${bp.width}w ${bp.density}x` : `${bp.width}w`;
    return `${url} ${descriptor}`;
  });

  const srcSet = srcSetEntries.join(', ');
  
  imageLogger.debug('Generated srcSet', {
    action: 'srcset_generated',
    baseUrl,
    breakpointsCount: breakpoints.length,
    srcSet
  });

  return srcSet;
};

// Generate sizes attribute for responsive images
export const generateSizes = (
  breakpoints: { maxWidth: string; size: string }[] = [
    { maxWidth: '768px', size: '100vw' },
    { maxWidth: '1024px', size: '50vw' },
    { maxWidth: '1440px', size: '33vw' }
  ]
): string => {
  const sizeEntries = breakpoints.map(bp => `(max-width: ${bp.maxWidth}) ${bp.size}`);
  sizeEntries.push('25vw'); // Default size
  
  return sizeEntries.join(', ');
};

// Validate image file
export const validateImageFile = (file: File): { isValid: boolean; error?: string } => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!allowedTypes.includes(file.type)) {
    const error = `Invalid file type: ${file.type}. Allowed types: ${allowedTypes.join(', ')}`;
    imageLogger.warn('Invalid image file type', { fileName: file.name, fileType: file.type });
    return { isValid: false, error };
  }

  if (file.size > maxSize) {
    const error = `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Maximum size: ${maxSize / 1024 / 1024}MB`;
    imageLogger.warn('Image file too large', { fileName: file.name, fileSize: file.size });
    return { isValid: false, error };
  }

  imageLogger.debug('Image file validated successfully', { fileName: file.name, fileSize: file.size });
  return { isValid: true };
};
