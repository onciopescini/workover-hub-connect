
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Image } from "lucide-react";

interface PhotosProps {
  photoPreviewUrls: string[];
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: (index: number) => void;
  isSubmitting: boolean;
  uploadingPhotos: boolean;
}

export const Photos = ({
  photoPreviewUrls,
  onPhotoChange,
  onRemovePhoto,
  isSubmitting,
  uploadingPhotos
}: PhotosProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Photos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {photoPreviewUrls.map((url, index) => (
            <div key={index} className="relative group">
              <div className="aspect-square bg-gray-100 rounded-md overflow-hidden border border-gray-200">
                <img
                  src={url}
                  alt={`Space photo ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => onRemovePhoto(index)}
                className="absolute top-1 right-1 bg-black bg-opacity-50 rounded-full p-1
                          text-white hover:bg-opacity-70 transition-opacity"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}

          <div className="aspect-square bg-gray-50 rounded-md border-2 border-dashed border-gray-200 
                     flex flex-col items-center justify-center p-4 hover:bg-gray-100 transition-colors">
            <label className="cursor-pointer text-center w-full h-full flex flex-col items-center justify-center">
              <Image className="w-8 h-8 mb-2 text-gray-400" />
              <span className="text-sm text-gray-500">Add Photo</span>
              <span className="text-xs text-gray-400 mt-1">Click to upload</span>
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
        <p className="text-sm text-gray-500">
          Add high-quality photos that showcase your space well. You can upload multiple photos.
        </p>
      </CardContent>
    </Card>
  );
};
