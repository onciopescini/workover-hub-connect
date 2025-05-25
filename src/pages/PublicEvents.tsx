
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { EventMap } from '@/components/events/EventMap';
import { EventFilters } from '@/components/events/EventFilters';
import { EventCard } from '@/components/events/EventCard';
import { Input } from '@/components/ui/input';
import { Search, MapPin } from 'lucide-react';
import { EventWithDetails } from '@/types/event';
import { toast } from 'sonner';

const PublicEvents = () => {
  const navigate = useNavigate();
  const { authState } = useAuth();
  const [events, setEvents] = useState<EventWithDetails[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<EventWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchCity, setSearchCity] = useState('');
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [filters, setFilters] = useState({
    dateRange: '',
    eventType: '',
    hasAvailability: false
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
          setUserLocation({ lat: 41.9028, lng: 12.4964 });
        }
      );
    } else {
      setUserLocation({ lat: 41.9028, lng: 12.4964 });
    }
  }, []);

  // Fetch events
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data, error } = await supabase
          .from('events')
          .select(`
            *,
            space:spaces(id, title, address, latitude, longitude),
            creator:profiles!fk_events_created_by(id, first_name, last_name, profile_photo_url)
          `)
          .eq('status', 'active')
          .gte('date', new Date().toISOString())
          .order('date', { ascending: true });

        if (error) throw error;
        
        const eventsWithParticipants = await Promise.all(
          (data || []).map(async (event) => {
            const { data: participants } = await supabase
              .from('event_participants')
              .select('*')
              .eq('event_id', event.id);
            
            return {
              ...event,
              current_participants: participants?.length || 0,
              participants: participants || []
            };
          })
        );

        setEvents(eventsWithParticipants);
        setFilteredEvents(eventsWithParticipants);
      } catch (error) {
        console.error('Error fetching events:', error);
        toast.error('Errore nel caricamento degli eventi');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...events];

    // City search
    if (searchCity) {
      filtered = filtered.filter(event => 
        event.space?.address?.toLowerCase().includes(searchCity.toLowerCase())
      );
    }

    // Date range filter
    if (filters.dateRange) {
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const nextWeek = new Date(today);
      nextWeek.setDate(nextWeek.getDate() + 7);

      switch (filters.dateRange) {
        case 'today':
          filtered = filtered.filter(event => 
            new Date(event.date).toDateString() === today.toDateString()
          );
          break;
        case 'tomorrow':
          filtered = filtered.filter(event => 
            new Date(event.date).toDateString() === tomorrow.toDateString()
          );
          break;
        case 'week':
          filtered = filtered.filter(event => 
            new Date(event.date) <= nextWeek
          );
          break;
      }
    }

    // Availability filter
    if (filters.hasAvailability) {
      filtered = filtered.filter(event => 
        !event.max_participants || 
        (event.current_participants || 0) < event.max_participants
      );
    }

    setFilteredEvents(filtered);
  }, [events, searchCity, filters]);

  const handleEventClick = (eventId: string) => {
    if (authState.user) {
      navigate(`/events/${eventId}`);
    } else {
      toast.error('Devi effettuare il login per vedere i dettagli dell\'evento');
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
                  placeholder="Cerca eventi per località..."
                  value={searchCity}
                  onChange={(e) => setSearchCity(e.target.value)}
                  className="pl-10"
                />
              </div>
              <EventFilters filters={filters} onFiltersChange={setFilters} />
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 flex">
          {/* Map */}
          <div className="w-1/2 relative">
            <EventMap 
              events={filteredEvents} 
              userLocation={userLocation}
              onEventClick={handleEventClick}
            />
          </div>

          {/* Events list */}
          <div className="w-1/2 overflow-y-auto bg-gray-50 p-4">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {filteredEvents.length} eventi trovati
              </h2>
              {userLocation && (
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  Vicino alla tua posizione
                </p>
              )}
            </div>

            <div className="space-y-4">
              {filteredEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onClick={() => handleEventClick(event.id)}
                />
              ))}
            </div>

            {filteredEvents.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">Nessun evento trovato con i filtri selezionati</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
};

export default PublicEvents;
