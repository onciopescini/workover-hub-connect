import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Navigation, Loader2 } from 'lucide-react';

interface UserLocationButtonProps {
  onLocationObtained: (coordinates: { lat: number; lng: number }) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
  variant?: "default" | "outline" | "ghost" | "secondary" | "destructive" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  title?: string;
}

export const UserLocationButton: React.FC<UserLocationButtonProps> = ({
  onLocationObtained,
  onError,
  disabled = false,
  className = "",
  variant = "outline",
  size = "icon",
  title = "Usa la mia posizione"
}) => {
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const handleGetLocation = () => {
    if (isGettingLocation || disabled) return;
    
    setIsGettingLocation(true);
    
    if (!navigator.geolocation) {
      const errorMsg = 'La geolocalizzazione non è supportata dal tuo browser';
      onError?.(errorMsg);
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        onLocationObtained(coordinates);
        setIsGettingLocation(false);
      },
      (geolocationError) => {
        let errorMessage = 'Errore nel accedere alla posizione';
        
        switch (geolocationError.code) {
          case geolocationError.PERMISSION_DENIED:
            errorMessage = 'Permesso di geolocalizzazione negato';
            break;
          case geolocationError.POSITION_UNAVAILABLE:
            errorMessage = 'Posizione non disponibile';
            break;
          case geolocationError.TIMEOUT:
            errorMessage = 'Timeout della richiesta di posizione';
            break;
        }
        
        onError?.(errorMessage);
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 600000
      }
    );
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleGetLocation}
      disabled={disabled || isGettingLocation}
      title={title}
      className={className}
    >
      {isGettingLocation ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Navigation className="h-4 w-4" />
      )}
    </Button>
  );
};