
import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";

interface SpaceEditLoadingStatesProps {
  isLoading: boolean;
  spaceNotFound: boolean;
}

export const SpaceEditLoadingStates = ({
  isLoading,
  spaceNotFound
}: SpaceEditLoadingStatesProps) => {
  if (isLoading) {
    return (
      <AppLayout title="Edit Space">
        <div className="min-h-screen flex items-center justify-center">
          <Card>
            <CardContent className="p-8">
              Loading space details...
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (spaceNotFound) {
    return (
      <AppLayout title="Edit Space">
        <div className="min-h-screen flex items-center justify-center">
          <Card>
            <CardContent className="p-8">
              Space not found.
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return null;
};
