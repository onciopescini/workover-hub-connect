import React, { useState, useRef } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Camera, Upload, X, Check } from 'lucide-react';
import { uploadAvatarWithProgress, type AvatarUploadProgress } from '@/lib/avatar-upload-utils';
import { useAuth } from '@/hooks/auth/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface AvatarUploaderProps {
  currentPhotoUrl?: string;
  onUploadComplete?: (url: string) => void;
  className?: string;
}

export const AvatarUploader: React.FC<AvatarUploaderProps> = ({
  currentPhotoUrl,
  onUploadComplete,
  className
}) => {
  const auth = useAuth();
  const userId = auth.authState.user?.id;
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<AvatarUploadProgress | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  const getUserInitials = () => {
    const firstName = auth.authState.profile?.first_name || '';
    const lastName = auth.authState.profile?.last_name || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'U';
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    // Create preview
    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
    setUploadSuccess(false);

    try {
      setUploading(true);

      const result = await uploadAvatarWithProgress(
        file,
        userId,
        (progressInfo) => {
          setProgress(progressInfo);
        }
      );

      // Success!
      setUploadSuccess(true);
      toast.success('Avatar caricato con successo!');
      
      // Call parent callback
      onUploadComplete?.(result.url);

      // Refresh auth to get new avatar URL
      await auth.refreshProfile?.();

      // Clear preview after success
      setTimeout(() => {
        URL.revokeObjectURL(preview);
        setPreviewUrl(null);
        setProgress(null);
        setUploadSuccess(false);
      }, 2000);

    } catch (error) {
      console.error('Avatar upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Errore durante il caricamento');
      URL.revokeObjectURL(preview);
      setPreviewUrl(null);
      setProgress(null);
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleCancel = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setProgress(null);
    setUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getPhaseLabel = (phase?: string) => {
    switch (phase) {
      case 'preparing':
        return 'Preparazione...';
      case 'uploading':
        return 'Caricamento...';
      case 'processing':
        return 'Elaborazione...';
      case 'complete':
        return 'Completato!';
      default:
        return 'In corso...';
    }
  };

  const displayUrl = previewUrl || currentPhotoUrl;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex flex-col items-center gap-4">
        {/* Avatar Preview */}
        <div className="relative group">
          <Avatar className="h-32 w-32 border-4 border-border transition-all">
            <AvatarImage src={displayUrl || undefined} alt="Avatar" />
            <AvatarFallback className="text-2xl bg-muted">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>

          {/* Success Indicator */}
          {uploadSuccess && (
            <div className="absolute inset-0 bg-green-500/20 rounded-full flex items-center justify-center">
              <div className="bg-green-500 rounded-full p-2">
                <Check className="w-8 h-8 text-white" />
              </div>
            </div>
          )}

          {/* Upload Button Overlay */}
          {!uploading && !uploadSuccess && (
            <button
              onClick={handleClick}
              className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
            >
              <Camera className="w-8 h-8 text-white" />
            </button>
          )}
        </div>

        {/* Progress Bar */}
        {progress && uploading && (
          <div className="w-full max-w-xs space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {getPhaseLabel(progress.phase)}
              </span>
              <span className="font-medium">{Math.round(progress.percentage)}%</span>
            </div>
            <Progress value={progress.percentage} className="h-2" />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          {!uploading ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClick}
              className="gap-2"
            >
              <Upload className="w-4 h-4" />
              Carica Avatar
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="gap-2"
            >
              <X className="w-4 h-4" />
              Annulla
            </Button>
          )}
        </div>

        {/* File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />

        {/* Helper Text */}
        <p className="text-xs text-muted-foreground text-center max-w-xs">
          Formati supportati: JPG, PNG, WEBP<br />
          Dimensione massima: 5MB
        </p>
      </div>
    </div>
  );
};
