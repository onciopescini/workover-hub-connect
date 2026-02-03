import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wifi, Coffee, Users, Clock, X } from 'lucide-react';

interface AmenityFiltersProps {
  selectedAmenities: string[];
  onAmenitiesChange: (amenities: string[]) => void;
}

interface AmenityOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  value: string; // Matches database value
}

const AMENITY_OPTIONS: AmenityOption[] = [
  {
    id: 'wifi',
    label: 'WiFi Veloce',
    icon: <Wifi className="h-4 w-4" />,
    value: 'High-speed WiFi',
  },
  {
    id: 'coffee',
    label: 'Caffè incluso',
    icon: <Coffee className="h-4 w-4" />,
    value: 'Coffee & Tea',
  },
  {
    id: 'meeting',
    label: 'Sala Riunioni',
    icon: <Users className="h-4 w-4" />,
    value: 'Meeting room', // This is in workspace_features
  },
  {
    id: 'access24h',
    label: 'Accesso 24/7',
    icon: <Clock className="h-4 w-4" />,
    value: '24/7 Access',
  },
];

export const AmenityFilters: React.FC<AmenityFiltersProps> = ({
  selectedAmenities,
  onAmenitiesChange,
}) => {
  const toggleAmenity = (value: string) => {
    if (selectedAmenities.includes(value)) {
      onAmenitiesChange(selectedAmenities.filter((a) => a !== value));
    } else {
      onAmenitiesChange([...selectedAmenities, value]);
    }
  };

  const clearAll = () => {
    onAmenitiesChange([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Servizi</span>
        {selectedAmenities.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-auto p-1 text-xs text-gray-500 hover:text-gray-700"
          >
            <X className="h-3 w-3 mr-1" />
            Rimuovi filtri
          </Button>
        )}
      </div>
      
      <div className="flex flex-wrap gap-2">
        {AMENITY_OPTIONS.map((amenity) => {
          const isSelected = selectedAmenities.includes(amenity.value);
          
          return (
            <Badge
              key={amenity.id}
              variant={isSelected ? 'default' : 'outline'}
              className={`
                cursor-pointer transition-all duration-200 px-3 py-1.5
                ${isSelected 
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 border-primary' 
                  : 'hover:bg-muted border-border'
                }
              `}
              onClick={() => toggleAmenity(amenity.value)}
            >
              <span className="flex items-center gap-1.5">
                {amenity.icon}
                {amenity.label}
              </span>
            </Badge>
          );
        })}
      </div>
      
      {selectedAmenities.length > 0 && (
        <p className="text-xs text-gray-500">
          {selectedAmenities.length} {selectedAmenities.length === 1 ? 'filtro attivo' : 'filtri attivi'}
        </p>
      )}
    </div>
  );
};
