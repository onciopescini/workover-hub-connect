import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { Loader2 } from "lucide-react";

import { RefactoredBasicInformation } from "./RefactoredBasicInformation";
import { RefactoredSpaceDetails } from "./RefactoredSpaceDetails";
import { RefactoredLocationPricing } from "./RefactoredLocationPricing";
import { RefactoredAvailabilityScheduler } from "./RefactoredAvailabilityScheduler";
import { RefactoredPhotos } from "./RefactoredPhotos";
import { RefactoredPublishingOptions } from "./RefactoredPublishingOptions";
import { useSpaceFormState } from "@/hooks/useSpaceFormState";
import { useHostProgress } from "@/hooks/useHostProgress";
import type { Space } from "@/types/space";

interface RefactoredSpaceFormProps {
  initialData?: Space;
  isEdit?: boolean;
}

const RefactoredSpaceForm = ({ initialData, isEdit = false }: RefactoredSpaceFormProps) => {
  const navigate = useNavigate();

  // Get Stripe onboarding status
  const { data: hostProgressData } = useHostProgress({
    refetchOnWindowFocus: true,
    staleTime: 30 * 1000 // 30 seconds
  });
  const stripeOnboardingStatus = hostProgressData?.stripeOnboardingStatus || 'none';
  const stripeConnected = hostProgressData?.stripeConnected || false;

  // Initialize the hook as the single source of truth
  const {
    form,
    submitSpace,
    handlePhotoChange,
    removePhoto,
    photoPreviewUrls,
    isSubmitting,
    uploadingPhotos,
    processingJobs
  } = useSpaceFormState({ initialData, isEdit, stripeOnboardingStatus, stripeConnected });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submitSpace)} className="space-y-8">
        <RefactoredBasicInformation />
        <RefactoredSpaceDetails />
        <RefactoredLocationPricing />
        <RefactoredAvailabilityScheduler spaceId={initialData?.id} />
        <RefactoredPhotos 
          photoPreviewUrls={photoPreviewUrls}
          onPhotoChange={handlePhotoChange}
          onRemovePhoto={removePhoto}
          uploadingPhotos={uploadingPhotos}
          processingJobs={processingJobs}
        />
        <RefactoredPublishingOptions />

        <div className="flex justify-end space-x-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/host/spaces")}
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
    </Form>
  );
};

export default RefactoredSpaceForm;
