
import React from 'react';
import SpaceForm from "@/components/spaces/SpaceForm";
import { SpaceCreationHeader } from "@/components/spaces/SpaceCreationHeader";
import { SpaceCreationLoading } from "@/components/spaces/SpaceCreationLoading";
import { useSpaceCreation } from "@/hooks/useSpaceCreation";

const SpaceNew = () => {
  const { isLoading, canAccess } = useSpaceCreation();

  if (isLoading) {
    return <SpaceCreationLoading />;
  }

  if (!canAccess) {
    return null;
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <SpaceCreationHeader />
      <SpaceForm />
    </div>
  );
};

export default SpaceNew;
