import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

export const SpaceDetailContent = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { authState } = useAuth();
  const [space, setSpace] = useState<Space | null>(null);
  const [host, setHost] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedStartTime, setSelectedStartTime] = useState<string>('');
  const [selectedEndTime, setSelectedEndTime] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState(0);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate time slots (9 AM to 6 PM in 1-hour intervals)
  const timeSlots = Array.from({ length: 10 }, (_, i) => {
    const hour = 9 + i;
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  // Fetch space details
  useEffect(() => {
    const fetchSpaceDetails = async () => {
      if (!id) {
        setError('ID spazio non valido');
        setLoading(false);
        return;
      }

      try {
        console.log('Fetching space with ID:', id);
        
        const { data: spaceData, error: spaceError } = await supabase
          .from('spaces')
          .select('*')
          .eq('id', id)
          .eq('published', true)
          .maybeSingle();

        if (spaceError) {
          console.error('Space fetch error:', spaceError);
          throw spaceError;
        }
        
        if (!spaceData) {
          console.log('No space found with ID:', id);
          setError('Spazio non trovato o non pubblicato');
          setLoading(false);
          return;
        }
        
        console.log('Space data fetched:', spaceData);
        setSpace(spaceData);

        // Fetch host details
        const { data: hostData, error: hostError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', spaceData.host_id)
          .maybeSingle();

        if (hostError) {
          console.warn('Error fetching host:', hostError);
        } else {
          console.log('Host data fetched:', hostData);
          setHost(hostData);
        }

      } catch (error) {
        console.error('Error fetching space:', error);
        setError('Errore nel caricamento dello spazio');
      } finally {
        setLoading(false);
      }
    };

    fetchSpaceDetails();
  }, [id]);

  const handleBooking = async () => {
    if (!selectedDate || !space || !authState.user) {
      toast.error('Seleziona una data per prenotare');
      return;
    }

    if (!selectedStartTime || !selectedEndTime) {
      toast.error('Seleziona orario di inizio e fine');
      return;
    }

    if (selectedStartTime >= selectedEndTime) {
      toast.error('L\'orario di fine deve essere successivo a quello di inizio');
      return;
    }

    // Check if user has completed onboarding
    if (!authState.profile?.onboarding_completed) {
      toast.error('Completa il tuo profilo per poter prenotare');
      navigate('/onboarding');
      return;
    }

    // Check if user is a coworker
    if (authState.profile?.role !== 'coworker') {
      toast.error('Solo i coworker possono prenotare spazi');
      return;
    }

    setBookingLoading(true);

    try {
      console.log('Creating booking with data:', {
        space_id: space.id,
        user_id: authState.user.id,
        booking_date: format(selectedDate, 'yyyy-MM-dd'),
        start_time: selectedStartTime,
        end_time: selectedEndTime,
        status: space.confirmation_type === 'instant' ? 'confirmed' : 'pending'
      });

      const { data, error } = await supabase
        .from('bookings')
        .insert({
          space_id: space.id,
          user_id: authState.user.id,
          booking_date: format(selectedDate, 'yyyy-MM-dd'),
          start_time: selectedStartTime,
          end_time: selectedEndTime,
          status: space.confirmation_type === 'instant' ? 'confirmed' : 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error('Booking error:', error);
        throw error;
      }

      console.log('Booking created successfully:', data);

      toast.success(
        space.confirmation_type === 'instant' 
          ? 'Prenotazione confermata!' 
          : 'Richiesta di prenotazione inviata all\'host'
      );
      
      // Navigate to bookings page
      navigate('/bookings');
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error('Errore nella prenotazione');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleBackClick = () => {
    if (authState.isAuthenticated && authState.profile?.onboarding_completed) {
      navigate('/dashboard');
    } else {
      navigate('/spaces');
    }
  };

  const handleLoginClick = () => {
    navigate('/login', { state: { from: `/spaces/${id}` } });
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
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error || !space) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">{error || 'Spazio non trovato'}</p>
        <Button onClick={handleBackClick} className="mt-4">
          Torna alla ricerca
        </Button>
      </div>
    );
  }

  const canUserBook = authState.isAuthenticated && 
                      authState.profile?.onboarding_completed && 
                      authState.profile?.role === 'coworker';

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Back button */}
      <Button
        variant="ghost"
        onClick={handleBackClick}
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
            {space.workspace_features && space.workspace_features.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-3">Caratteristiche dello spazio</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {space.workspace_features.map((feature, index) => (
                    <Badge key={index} variant="outline">{feature}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Amenities */}
            {space.amenities && space.amenities.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-3">Servizi inclusi</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {space.amenities.map((amenity, index) => (
                    <div key={index} className="flex items-center">
                      {amenity.includes('WiFi') && <Wifi className="h-4 w-4 mr-2" />}
                      {amenity.includes('Coffee') && <Coffee className="h-4 w-4 mr-2" />}
                      {amenity.includes('Parking') && <Car className="h-4 w-4 mr-2" />}
                      <span className="text-sm">{amenity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

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

              {/* Booking section */}
              {canUserBook ? (
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

                  {/* Time selection */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Orario inizio</label>
                      <Select value={selectedStartTime} onValueChange={setSelectedStartTime}>
                        <SelectTrigger>
                          <SelectValue placeholder="Inizio" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.map((time) => (
                            <SelectItem key={time} value={time}>{time}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Orario fine</label>
                      <Select value={selectedEndTime} onValueChange={setSelectedEndTime}>
                        <SelectTrigger>
                          <SelectValue placeholder="Fine" />
                        </SelectTrigger>
                        <SelectContent>
                          {timeSlots.map((time) => (
                            <SelectItem 
                              key={time} 
                              value={time}
                              disabled={selectedStartTime && time <= selectedStartTime}
                            >
                              {time}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    onClick={handleBooking}
                    disabled={!selectedDate || !selectedStartTime || !selectedEndTime || bookingLoading}
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
              ) : authState.isAuthenticated ? (
                <div className="text-center">
                  {!authState.profile?.onboarding_completed ? (
                    <>
                      <p className="text-sm text-gray-600 mb-4">
                        Completa il tuo profilo per prenotare questo spazio
                      </p>
                      <Button
                        onClick={() => navigate('/onboarding')}
                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                      >
                        Completa Profilo
                      </Button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600 mb-4">
                        Solo i coworker possono prenotare spazi
                      </p>
                      <Button
                        disabled
                        className="w-full"
                      >
                        Prenotazione non disponibile
                      </Button>
                    </>
                  )}
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-4">
                    Accedi per prenotare questo spazio
                  </p>
                  <Button
                    onClick={handleLoginClick}
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
  );
};
