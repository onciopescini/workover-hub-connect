
import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Navigation, Loader2 } from 'lucide-react';

interface LocationInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onGetCurrentLocation: () => void;
  placeholder?: string;
  isLoading: boolean;
  isGettingLocation: boolean;
  disabled?: boolean;
}

export const LocationInput: React.FC<LocationInputProps> = ({
  value,
  onChange,
  onSubmit,
  onGetCurrentLocation,
  placeholder = "Cerca per città o indirizzo...",
  isLoading,
  isGettingLocation,
  disabled = false
}) => {
  return (
    <form onSubmit={onSubmit} className="relative flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pl-10 pr-4"
          disabled={disabled || isLoading}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
        )}
      </div>
      
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={onGetCurrentLocation}
        disabled={disabled || isLoading}
        title="Usa la mia posizione"
      >
        <Navigation className={`h-4 w-4 ${isGettingLocation ? 'animate-spin' : ''}`} />
      </Button>
      
      <Button type="submit" size="icon" disabled={disabled || isLoading}>
        <Search className="h-4 w-4" />
      </Button>
    </form>
  );
};
