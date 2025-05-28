
import React from 'react';
import { Button } from '@/components/ui/button';
import { Map, Grid } from 'lucide-react';

interface EventsViewToggleProps {
  showMap: boolean;
  onToggleView: (showMap: boolean) => void;
  eventsCount?: number;
}

export const EventsViewToggle: React.FC<EventsViewToggleProps> = ({ 
  showMap, 
  onToggleView, 
  eventsCount 
}) => {
  return (
    <div className="flex justify-between items-center mb-6">
      <div className="flex items-center gap-2">
        <Button
          variant={!showMap ? "default" : "outline"}
          size="sm"
          onClick={() => onToggleView(false)}
          className="flex items-center gap-2"
        >
          <Grid className="h-4 w-4" />
          Griglia
        </Button>
        <Button
          variant={showMap ? "default" : "outline"}
          size="sm"
          onClick={() => onToggleView(true)}
          className="flex items-center gap-2"
        >
          <Map className="h-4 w-4" />
          Mappa
        </Button>
      </div>
      
      {eventsCount !== undefined && (
        <p className="text-sm text-gray-600">
          {eventsCount} eventi trovati
        </p>
      )}
    </div>
  );
};
