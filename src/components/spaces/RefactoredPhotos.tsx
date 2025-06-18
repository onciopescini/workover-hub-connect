
import { useFormContext } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Photos } from "./Photos";
import { SpaceFormData } from "@/schemas/spaceSchema";

interface RefactoredPhotosProps {
  photoPreviewUrls: string[];
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePhoto: (index: number) => void;
  uploadingPhotos: boolean;
  processingJobs: string[];
}

export const RefactoredPhotos = ({
  photoPreviewUrls,
  onPhotoChange,
  onRemovePhoto,
  uploadingPhotos,
  processingJobs
}: RefactoredPhotosProps) => {
  const form = useFormContext<SpaceFormData>();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Photos</CardTitle>
      </CardHeader>
      <CardContent>
        <FormField
          control={form.control}
          name="photos"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Space Photos</FormLabel>
              <Photos
                photoPreviewUrls={photoPreviewUrls}
                onPhotoChange={onPhotoChange}
                onRemovePhoto={onRemovePhoto}
                isSubmitting={false}
                uploadingPhotos={uploadingPhotos}
                processingJobs={processingJobs}
              />
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};
