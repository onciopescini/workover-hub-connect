
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  MapPin, 
  Star, 
  Users, 
  Wifi, 
  Car, 
  Coffee, 
  ArrowLeft,
  Calendar as CalendarIcon,
  Clock,
  Euro
} from 'lucide-react';
import { Space } from '@/types/space';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const SpaceDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { authState } = useAuth();
  const [space, setSpace] = useState<Space | null>(null);
  const [host, setHost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedImage, setSelectedImage] = useState(0);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Fetch space details
  useEffect(() => {
    const fetchSpaceDetails = async () => {
      if (!id) return;

      try {
        const { data: spaceData, error: spaceError } = await supabase
          .from('spaces')
          .select('*')
          .eq('id', id)
          .eq('published', true)
          .single();

        if (spaceError) throw spaceError;
        
        setSpace(spaceData);

        // Fetch host details
        const { data: hostData, error: hostError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', spaceData.host_id)
          .single();

        if (hostError) throw hostError;
        setHost(hostData);

      } catch (error) {
        console.error('Error fetching space:', error);
        toast.error('Errore nel caricamento dello spazio');
        navigate('/spaces');
      } finally {
        setLoading(false);
      }
    };

    fetchSpaceDetails();
  }, [id, navigate]);

  const handleBooking = async () => {
    if (!selectedDate || !space || !authState.user) {
      toast.error('Seleziona una data per prenotare');
      return;
    }

    setBookingLoading(true);

    try {
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          space_id: space.id,
          user_id: authState.user.id,
          booking_date: format(selectedDate, 'yyyy-MM-dd'),
          status: space.confirmation_type === 'instant' ? 'confirmed' : 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success(
        space.confirmation_type === 'instant' 
          ? 'Prenotazione confermata!' 
          : 'Richiesta di prenotazione inviata all\'host'
      );
      
      navigate('/bookings');
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error('Errore nella prenotazione');
    } finally {
      setBookingLoading(false);
    }
  };

  const getCategoryLabel = () => {
    switch (space?.category) {
      case 'home': return 'Casa';
      case 'professional': return 'Professionale';
      case 'outdoor': return 'Outdoor';
      default: return space?.category;
    }
  };

  const getWorkEnvironmentLabel = () => {
    switch (space?.work_environment) {
      case 'silent': return 'Silenzioso';
      case 'controlled': return 'Controllato';
      case 'dynamic': return 'Dinamico';
      default: return space?.work_environment;
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
        </div>
      </AppLayout>
    );
  }

  if (!space) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-gray-500">Spazio non trovato</p>
          <Button onClick={() => navigate('/spaces')} className="mt-4">
            Torna alla ricerca
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-4">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna alla ricerca
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2">
            {/* Image gallery */}
            <div className="mb-6">
              <div className="relative h-96 rounded-lg overflow-hidden mb-4">
                <img
                  src={space.photos?.[selectedImage] || '/placeholder.svg'}
                  alt={space.title}
                  className="w-full h-full object-cover"
                />
              </div>
              {space.photos && space.photos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {space.photos.map((photo, index) => (
                    <img
                      key={index}
                      src={photo}
                      alt={`${space.title} ${index + 1}`}
                      className={cn(
                        "w-20 h-20 object-cover rounded cursor-pointer",
                        selectedImage === index ? "ring-2 ring-indigo-600" : ""
                      )}
                      onClick={() => setSelectedImage(index)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Space info */}
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">{getCategoryLabel()}</Badge>
                  <Badge variant="outline">{getWorkEnvironmentLabel()}</Badge>
                </div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{space.title}</h1>
                <div className="flex items-center text-gray-600 mb-4">
                  <MapPin className="h-4 w-4 mr-1" />
                  {space.address}
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    <span>Fino a {space.max_capacity || space.capacity} persone</span>
                  </div>
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-400 fill-current mr-1" />
                    <span>4.8 (12 recensioni)</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h2 className="text-xl font-semibold mb-3">Descrizione</h2>
                <p className="text-gray-700">{space.description}</p>
              </div>

              {/* Features */}
              <div>
                <h2 className="text-xl font-semibold mb-3">Caratteristiche dello spazio</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {space.workspace_features?.map((feature, index) => (
                    <Badge key={index} variant="outline">{feature}</Badge>
                  ))}
                </div>
              </div>

              {/* Amenities */}
              <div>
                <h2 className="text-xl font-semibold mb-3">Servizi inclusi</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {space.amenities?.map((amenity, index) => (
                    <div key={index} className="flex items-center">
                      {amenity.includes('WiFi') && <Wifi className="h-4 w-4 mr-2" />}
                      {amenity.includes('Coffee') && <Coffee className="h-4 w-4 mr-2" />}
                      {amenity.includes('Parking') && <Car className="h-4 w-4 mr-2" />}
                      <span className="text-sm">{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rules */}
              {space.rules && (
                <div>
                  <h2 className="text-xl font-semibold mb-3">Regole dello spazio</h2>
                  <p className="text-gray-700">{space.rules}</p>
                </div>
              )}
            </div>
          </div>

          {/* Booking sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardContent className="p-6">
                {/* Host info */}
                {host && (
                  <div className="flex items-center mb-6">
                    <Avatar className="h-12 w-12 mr-3">
                      <AvatarImage src={host.profile_photo_url} />
                      <AvatarFallback>
                        {host.first_name?.[0]}{host.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{host.first_name} {host.last_name}</p>
                      <p className="text-sm text-gray-600">Host</p>
                    </div>
                  </div>
                )}

                {/* Pricing */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-bold">€{space.price_per_hour}</span>
                    <span className="text-gray-600">/ora</span>
                  </div>
                  {space.price_per_day && (
                    <div className="flex items-center justify-between">
                      <span className="text-lg">€{space.price_per_day}</span>
                      <span className="text-gray-600">/giorno</span>
                    </div>
                  )}
                </div>

                {/* Date selection */}
                {authState.user ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Seleziona data</label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !selectedDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedDate ? format(selectedDate, "dd/MM/yyyy") : "Scegli una data"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={selectedDate}
                            onSelect={setSelectedDate}
                            disabled={(date) => date < new Date()}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <Button
                      onClick={handleBooking}
                      disabled={!selectedDate || bookingLoading}
                      className="w-full bg-indigo-600 hover:bg-indigo-700"
                    >
                      {bookingLoading ? 'Prenotazione...' : 
                       space.confirmation_type === 'instant' ? 'Prenota ora' : 'Richiedi prenotazione'}
                    </Button>

                    <div className="text-xs text-gray-500 text-center">
                      {space.confirmation_type === 'instant' 
                        ? 'Prenotazione immediata - nessuna attesa'
                        : 'L\'host dovrà approvare la tua richiesta'
                      }
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-4">
                      Accedi per prenotare questo spazio
                    </p>
                    <Button
                      onClick={() => navigate('/login')}
                      className="w-full bg-indigo-600 hover:bg-indigo-700"
                    >
                      Accedi
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};

export default SpaceDetail;
