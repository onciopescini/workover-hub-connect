
import React from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import { SpaceEditForm } from "@/components/spaces/SpaceEditForm";
import { SpaceEditActions } from "@/components/spaces/SpaceEditActions";
import { SpaceEditLoadingStates } from "@/components/spaces/SpaceEditLoadingStates";
import { useSpaceEdit } from "@/hooks/useSpaceEdit";

const SpaceEdit = () => {
  const { id } = useParams<{ id: string }>();
  const { authState } = useAuth();
  
  const {
    space,
    isLoading,
    title,
    description,
    address,
    category,
    workEnvironment,
    pricePerDay,
    amenities,
    published,
    setTitle,
    setDescription,
    setAddress,
    setCategory,
    setWorkEnvironment,
    setPricePerDay,
    setPublished,
    handleUpdateSpace,
    handleDeleteSpace,
    handleAmenityChange
  } = useSpaceEdit(id);

  const loadingComponent = SpaceEditLoadingStates({
    isLoading,
    spaceNotFound: !space && !isLoading
  });

  if (loadingComponent) {
    return loadingComponent;
  }

  return (
    <AppLayout title="Edit Space">
      <div className="container mx-auto py-8">
        <SpaceEditForm
          title={title}
          description={description}
          address={address}
          category={category}
          workEnvironment={workEnvironment}
          pricePerDay={pricePerDay}
          amenities={amenities}
          published={published}
          isLoading={isLoading}
          onTitleChange={setTitle}
          onDescriptionChange={setDescription}
          onAddressChange={setAddress}
          onCategoryChange={setCategory}
          onWorkEnvironmentChange={setWorkEnvironment}
          onPricePerDayChange={setPricePerDay}
          onAmenityChange={handleAmenityChange}
          onPublishedChange={setPublished}
        />
        <div className="mt-4">
          <SpaceEditActions
            isLoading={isLoading}
            onUpdate={handleUpdateSpace}
            onDelete={handleDeleteSpace}
          />
        </div>
      </div>
    </AppLayout>
  );
};

export default SpaceEdit;
