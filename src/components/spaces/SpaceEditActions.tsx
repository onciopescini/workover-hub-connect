
import React from 'react';
import { Button } from "@/components/ui/button";

interface SpaceEditActionsProps {
  isLoading: boolean;
  onUpdate: () => void;
  onDelete: () => void;
}

export const SpaceEditActions = ({
  isLoading,
  onUpdate,
  onDelete
}: SpaceEditActionsProps) => {
  return (
    <div className="flex justify-between">
      <Button variant="default" onClick={onUpdate} disabled={isLoading}>
        Update Space
      </Button>
      <Button variant="destructive" onClick={onDelete} disabled={isLoading}>
        Delete Space
      </Button>
    </div>
  );
};
