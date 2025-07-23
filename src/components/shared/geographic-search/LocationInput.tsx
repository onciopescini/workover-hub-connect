
import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserLocationButton } from '@/components/ui/UserLocationButton';
import { Search, Loader2 } from 'lucide-react';

interface LocationInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onGetCurrentLocation: (coordinates: { lat: number; lng: number }) => void;
  onLocationError?: (error: string) => void;
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
  onLocationError,
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
      
      <UserLocationButton
        onLocationObtained={onGetCurrentLocation}
        onError={onLocationError || (() => {})}
        disabled={disabled || isLoading}
        variant="outline"
        size="icon"
      />
      
      <Button type="submit" size="icon" disabled={disabled || isLoading}>
        <Search className="h-4 w-4" />
      </Button>
    </form>
  );
};
