
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MapPin, Navigation } from 'lucide-react';

interface GeographicSearchProps {
  onLocationSelect?: (location: string) => void;
  placeholder?: string;
  className?: string;
}

export const GeographicSearch: React.FC<GeographicSearchProps> = ({
  onLocationSelect,
  placeholder = "Cerca per città o indirizzo...",
  className = ""
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const navigate = useNavigate();

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      if (onLocationSelect) {
        onLocationSelect(searchQuery.trim());
      } else {
        // Navigate to spaces page with location filter
        navigate(`/spaces?city=${encodeURIComponent(searchQuery.trim())}`);
      }
    }
  }, [searchQuery, onLocationSelect, navigate]);

  const getCurrentLocation = useCallback(() => {
    setIsGettingLocation(true);
    
    if (!navigator.geolocation) {
      alert('La geolocalizzazione non è supportata dal tuo browser');
      setIsGettingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // For now, we'll use a placeholder. In a real app, you'd reverse geocode
          const locationName = "La tua posizione";
          setSearchQuery(locationName);
          
          if (onLocationSelect) {
            onLocationSelect(locationName);
          } else {
            navigate(`/spaces?lat=${position.coords.latitude}&lng=${position.coords.longitude}`);
          }
        } catch (error) {
          console.error('Error getting location name:', error);
          alert('Errore nel ottenere la posizione');
        } finally {
          setIsGettingLocation(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('Errore nel accedere alla posizione');
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 600000
      }
    );
  }, [onLocationSelect, navigate]);

  return (
    <form onSubmit={handleSearch} className={`relative flex items-center gap-2 ${className}`}>
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-4"
        />
      </div>
      
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={getCurrentLocation}
        disabled={isGettingLocation}
        title="Usa la mia posizione"
      >
        <Navigation className={`h-4 w-4 ${isGettingLocation ? 'animate-spin' : ''}`} />
      </Button>
      
      <Button type="submit" size="icon">
        <Search className="h-4 w-4" />
      </Button>
    </form>
  );
};
