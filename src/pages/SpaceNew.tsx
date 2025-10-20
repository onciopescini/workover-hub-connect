
import React from 'react';
import SpaceForm from "@/components/spaces/SpaceForm";
import { SpaceCreationHeader } from "@/components/spaces/SpaceCreationHeader";
import { SpaceCreationLoading } from "@/components/spaces/SpaceCreationLoading";
import useSpaceCreation from "@/hooks/useSpaceCreation";
import { sreLogger } from "@/lib/sre-logger";

const SpaceNew = () => {
  const { isLoading, canAccess } = useSpaceCreation();

  sreLogger.debug('SpaceNew: Auth state check', { isLoading, canAccess });

  if (isLoading) {
    return <SpaceCreationLoading />;
  }

  if (!canAccess) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Accesso Negato</h1>
          <p className="text-gray-600">Solo gli host possono creare nuovi spazi.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <SpaceCreationHeader />
      <SpaceForm initialData={undefined} />
    </div>
  );
};

export default SpaceNew;
