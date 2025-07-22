import React from 'react';

interface PhotoUploaderProps {
  photoFiles: File[];
  photoPreviewUrls: string[];
  setPhotoFiles: (files: File[]) => void;
  setPhotoPreviewUrls: (urls: string[]) => void;
  uploadingPhotos: boolean;
  setUploadingPhotos: (uploading: boolean) => void;
  processingJobs: string[];
  setProcessingJobs: (jobs: string[]) => void;
}

export const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  photoFiles,
  photoPreviewUrls,
  setPhotoFiles,
  setPhotoPreviewUrls,
  uploadingPhotos,
  setUploadingPhotos,
  processingJobs,
  setProcessingJobs
}) => {
  return (
    <div className="p-4 border rounded-lg">
      <p className="text-muted-foreground">Photo Uploader - Coming Soon</p>
    </div>
  );
};