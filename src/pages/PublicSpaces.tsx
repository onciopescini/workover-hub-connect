
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { SpaceMap } from '@/components/spaces/SpaceMap';
import { SpaceFilters } from '@/components/spaces/SpaceFilters';
import { SpaceCard } from '@/components/spaces/SpaceCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MapPin } from 'lucide-react';
import { Space } from '@/types/space';
import { toast } from 'sonner';

const PublicSpaces = () => {
  const navigate = useNavigate();
  const { authState } = useAuth();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [filteredSpaces, setFilteredSpaces] = useState<Space[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchCity, setSearchCity] = useState('');
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [filters, setFilters] = useState({
    category: '',
    priceRange: [0, 200],
    amenities: [] as string[],
    workspaceFeatures: [] as string[],
    workEnvironment: ''
  });

  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log('Geolocation error:', error);
          // Default to Rome if geolocation fails
          setUserLocation({ lat: 41.9028, lng: 12.4964 });
        }
      );
    } else {
      setUserLocation({ lat: 41.9028, lng: 12.4964 });
    }
  }, []);

  // Fetch spaces
  useEffect(() => {
    const fetchSpaces = async () => {
      try {
        const { data, error } = await supabase
          .from('spaces')
          .select(`
            *,
            host:profiles!host_id(first_name, last_name, profile_photo_url)
          `)
          .eq('is_active', true);

        if (error) throw error;
        setSpaces(data || []);
        setFilteredSpaces(data || []);
      } catch (error) {
        console.error('Error fetching spaces:', error);
        toast.error('Errore nel caricamento degli spazi');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSpaces();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...spaces];

    // City search
    if (searchCity) {
      filtered = filtered.filter(space => 
        space.address?.toLowerCase().includes(searchCity.toLowerCase()) ||
        space.city?.toLowerCase().includes(searchCity.toLowerCase())
      );
    }

    // Category filter
    if (filters.category) {
      filtered = filtered.filter(space => space.category === filters.category);
    }

    // Price range filter
    filtered = filtered.filter(space => 
      space.price_per_hour >= filters.priceRange[0] && 
      space.price_per_hour <= filters.priceRange[1]
    );

    // Amenities filter
    if (filters.amenities.length > 0) {
      filtered = filtered.filter(space => 
        filters.amenities.every(amenity => 
          space.amenities?.includes(amenity)
        )
      );
    }

    // Work environment filter
    if (filters.workEnvironment) {
      filtered = filtered.filter(space => space.work_environment === filters.workEnvironment);
    }

    setFilteredSpaces(filtered);
  }, [spaces, searchCity, filters]);

  const handleSpaceClick = (spaceId: string) => {
    if (authState.user) {
      navigate(`/spaces/${spaceId}`);
    } else {
      toast.error('Devi effettuare il login per vedere i dettagli dello spazio');
      navigate('/login');
    }
  };

  if (isLoading) {
    return (
      <PublicLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="flex flex-col h-screen">
        {/* Search and filters header */}
        <div className="bg-white border-b p-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Cerca per città..."
                  value={searchCity}
                  onChange={(e) => setSearchCity(e.target.value)}
                  className="pl-10"
                />
              </div>
              <SpaceFilters filters={filters} onFiltersChange={setFilters} />
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex">
          {/* Map */}
          <div className="w-1/2 relative">
            <SpaceMap 
              spaces={filteredSpaces} 
              userLocation={userLocation}
              onSpaceClick={handleSpaceClick}
            />
          </div>

          {/* Spaces list */}
          <div className="w-1/2 overflow-y-auto bg-gray-50 p-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {filteredSpaces.length} spazi trovati
              </h2>
              {userLocation && (
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  Vicino alla tua posizione
                </p>
              )}
            </div>

            <div className="space-y-4">
              {filteredSpaces.map((space) => (
                <SpaceCard
                  key={space.id}
                  space={space}
                  onClick={() => handleSpaceClick(space.id)}
                />
              ))}
            </div>

            {filteredSpaces.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">Nessuno spazio trovato con i filtri selezionati</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchCity('');
                    setFilters({
                      category: '',
                      priceRange: [0, 200],
                      amenities: [],
                      workspaceFeatures: [],
                      workEnvironment: ''
                    });
                  }}
                  className="mt-4"
                >
                  Rimuovi filtri
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default PublicSpaces;
