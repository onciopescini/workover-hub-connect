import React from 'react';
import type { AvailabilityData } from '@/types/availability';

interface AvailabilityEditorProps {
  availabilityData: AvailabilityData;
  onAvailabilityChange: (availability: AvailabilityData) => void;
}

export const AvailabilityEditor: React.FC<AvailabilityEditorProps> = ({
  availabilityData,
  onAvailabilityChange
}) => {
  return (
    <div className="p-4 border rounded-lg">
      <p className="text-muted-foreground">Availability Editor - Coming Soon</p>
    </div>
  );
};