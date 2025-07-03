
import { useSpaceForm } from "@/hooks/useSpaceForm";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { BasicInformation } from "./BasicInformation";
import { SpaceDetails } from "./SpaceDetails";
import { LocationPricing } from "./LocationPricing";
import { AvailabilityScheduler } from "./AvailabilityScheduler";
import { Photos } from "./Photos";
import { PublishingOptions } from "./PublishingOptions";
import { usePhotoUploadManager } from "@/hooks/usePhotoUploadManager";
import {
  type Space
} from "@/types/space";

interface SpaceFormProps {
  initialData?: Space;
  isEdit?: boolean;
}

const SpaceForm = ({ initialData, isEdit = false }: SpaceFormProps) => {
  const navigate = useNavigate();
  
  const {
    formData,
    availabilityData,
    errors,
    photoFiles,
    photoPreviewUrls,
    isSubmitting,
    uploadingPhotos,
    processingJobs,
    setUploadingPhotos,
    setProcessingJobs,
    setPhotoFiles,
    setPhotoPreviewUrls,
    handleInputChange,
    handleAddressChange,
    handleAvailabilityChange,
    handleCheckboxArrayChange,
    handleSubmit
  } = useSpaceForm({ initialData, isEdit });

  const { handlePhotoChange, removePhoto } = usePhotoUploadManager({
    photoFiles,
    photoPreviewUrls,
    uploadingPhotos,
    processingJobs,
    isSubmitting,
    initialDataId: initialData?.id,
    onUploadingChange: setUploadingPhotos,
    onProcessingJobsChange: setProcessingJobs,
    onPhotoFilesChange: setPhotoFiles,
    onPhotoPreviewUrlsChange: setPhotoPreviewUrls
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <BasicInformation
        title={formData.title || ""}
        description={formData.description || ""}
        category={formData.category || "home"}
        onInputChange={handleInputChange}
        errors={errors}
        isSubmitting={isSubmitting}
      />

      <SpaceDetails
        workEnvironment={formData.work_environment || "controlled"}
        maxCapacity={formData.max_capacity || 1}
        confirmationType={formData.confirmation_type || "host_approval"}
        workspaceFeatures={formData.workspace_features || []}
        amenities={formData.amenities || []}
        seatingTypes={formData.seating_types || []}
        idealGuestTags={formData.ideal_guest_tags || []}
        eventFriendlyTags={formData.event_friendly_tags || []}
        rules={formData.rules || ""}
        onInputChange={handleInputChange}
        onCheckboxArrayChange={handleCheckboxArrayChange}
        errors={errors}
        isSubmitting={isSubmitting}
      />

      <LocationPricing
        address={formData.address || ""}
        pricePerHour={formData.price_per_hour || 0}
        pricePerDay={formData.price_per_day || 0}
        onInputChange={handleInputChange}
        onAddressChange={handleAddressChange}
        errors={errors}
        isSubmitting={isSubmitting}
      />

      <AvailabilityScheduler
        availability={availabilityData}
        onAvailabilityChange={handleAvailabilityChange}
        isSubmitting={isSubmitting}
      />
      {errors['availability'] && (
        <p className="text-sm text-red-500 mt-2">{errors['availability']}</p>
      )}

      <Photos
        photoPreviewUrls={photoPreviewUrls}
        onPhotoChange={handlePhotoChange}
        onRemovePhoto={removePhoto}
        isSubmitting={isSubmitting}
        uploadingPhotos={uploadingPhotos}
        processingJobs={processingJobs}
      />

      <PublishingOptions
        published={formData.published || false}
        onInputChange={handleInputChange}
        isSubmitting={isSubmitting}
      />

      <div className="flex justify-end space-x-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => navigate("/spaces/manage")}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="bg-blue-500 hover:bg-blue-600"
          disabled={isSubmitting || uploadingPhotos}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isEdit ? "Updating..." : "Creating..."}
            </>
          ) : (
            <>{isEdit ? "Update Space" : "Create Space"}</>
          )}
        </Button>
      </div>
    </form>
  );
};

export default SpaceForm;
