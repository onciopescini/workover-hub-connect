import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { ProgressiveImage } from '@/components/ui/ProgressiveImage';
import ReportDialog from '@/components/reports/ReportDialog';
import PaymentButton from '@/components/payments/PaymentButton';
import { BookingCalculator } from './BookingCalculator';
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
import { format, differenceInHours } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Footer } from '@/components/layout/Footer';

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
  const [pendingBookingId, setPendingBookingId] = useState<string | null>(null);
  const [existingBookings, setExistingBookings] = useState<any[]>([]);

  // Generate time slots (9 AM to 6 PM in 1-hour intervals)
  const timeSlots = useMemo(() => 
    Array.from({ length: 10 }, (_, i) => {
      const hour = 9 + i;
      return `${hour.toString().padStart(2, '0')}:00`;
    }), []
  );

  // Memoized authorization check
  const canUserBook = useMemo(() => {
    return authState.isAuthenticated && 
           authState.profile?.onboarding_completed && 
           authState.profile?.role === 'coworker';
  }, [authState.isAuthenticated, authState.profile?.onboarding_completed, authState.profile?.role]);

  // Check if current user can report this space (authenticated coworker who is not the space owner)
  const canReportSpace = useMemo(() => {
    return authState.isAuthenticated && 
           authState.profile?.role === 'coworker' && 
           space && 
           authState.user?.id !== space.host_id;
  }, [authState.isAuthenticated, authState.profile?.role, authState.user?.id, space?.host_id]);

  // Check for existing bookings on selected date
  const checkExistingBookings = useCallback(async () => {
    if (!selectedDate || !space || !authState.user) return;

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('user_id', authState.user.id)
        .eq('space_id', space.id)
        .eq('booking_date', format(selectedDate, 'yyyy-MM-dd'))
        .in('status', ['pending', 'confirmed']);

      if (error) throw error;
      setExistingBookings(data || []);
    } catch (error) {
      console.error('Error checking existing bookings:', error);
    }
  }, [selectedDate, space, authState.user]);

  // Check if selected time conflicts with existing bookings
  const hasTimeConflict = useMemo(() => {
    if (!selectedStartTime || !selectedEndTime || existingBookings.length === 0) return false;

    return existingBookings.some(booking => {
      const existingStart = booking.start_time;
      const existingEnd = booking.end_time;
      
      // Check for overlap
      return (selectedStartTime < existingEnd && selectedEndTime > existingStart);
    });
  }, [selectedStartTime, selectedEndTime, existingBookings]);

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

  // Check existing bookings when date changes
  useEffect(() => {
    checkExistingBookings();
  }, [checkExistingBookings]);

  // Calculate booking cost
  const calculateBookingCost = useCallback(() => {
    if (!selectedDate || !selectedStartTime || !selectedEndTime || !space) return 0;

    const startDateTime = new Date(`${selectedDate.toISOString().split('T')[0]}T${selectedStartTime}:00`);
    const endDateTime = new Date(`${selectedDate.toISOString().split('T')[0]}T${selectedEndTime}:00`);
    
    const hours = differenceInHours(endDateTime, startDateTime);
    
    // Se è un'intera giornata (8+ ore) e c'è un prezzo giornaliero, usa quello
    if (hours >= 8 && space.price_per_day) {
      return space.price_per_day;
    }
    
    // Altrimenti calcola per ore
    return hours * space.price_per_hour;
  }, [selectedDate, selectedStartTime, selectedEndTime, space]);

  const bookingCost = calculateBookingCost();

  const handleBookingCreation = useCallback(async () => {
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

    // Check for time conflicts
    if (hasTimeConflict) {
      toast.error('Hai già una prenotazione che si sovrappone con questo orario');
      return;
    }

    // Simplified authorization check
    if (!canUserBook) {
      if (!authState.profile?.onboarding_completed) {
        toast.error('Completa il tuo profilo per poter prenotare');
        navigate('/onboarding');
        return;
      }
      if (authState.profile?.role !== 'coworker') {
        toast.error('Solo i coworker possono prenotare spazi');
        return;
      }
    }

    setBookingLoading(true);

    try {
      console.log('Creating booking with data:', {
        space_id: space.id,
        user_id: authState.user.id,
        booking_date: format(selectedDate, 'yyyy-MM-dd'),
        start_time: selectedStartTime,
        end_time: selectedEndTime,
        status: 'pending'
      });

      // Crea la prenotazione con status pending per il pagamento
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          space_id: space.id,
          user_id: authState.user.id,
          booking_date: format(selectedDate, 'yyyy-MM-dd'),
          start_time: selectedStartTime,
          end_time: selectedEndTime,
          status: 'pending' // Always pending until payment is completed
        })
        .select()
        .single();

      if (error) {
        console.error('Booking creation error:', error);
        
        // Handle specific constraint errors
        if (error.code === '23505') {
          if (error.message.includes('unique_active_booking_per_user_time')) {
            toast.error('Hai già una prenotazione attiva per questo orario. Scegli un orario diverso.');
          } else {
            toast.error('Prenotazione duplicata. Verifica i tuoi orari.');
          }
        } else {
          toast.error('Errore nella creazione della prenotazione');
        }
        
        // Refresh existing bookings to update UI
        checkExistingBookings();
        return;
      }

      console.log('Booking created successfully:', data);
      setPendingBookingId(data.id);
      
      // Refresh existing bookings
      checkExistingBookings();
      
      toast.success('Prenotazione creata! Procedi con il pagamento per confermare.');
    } catch (error) {
      console.error('Error creating booking:', error);
      toast.error('Errore nella creazione della prenotazione');
    } finally {
      setBookingLoading(false);
    }
  }, [selectedDate, space, authState.user, selectedStartTime, selectedEndTime, canUserBook, authState.profile, navigate, hasTimeConflict, checkExistingBookings]);

  const handlePaymentSuccess = useCallback(() => {
    toast.success('Pagamento completato! Prenotazione confermata.');
    setPendingBookingId(null);
    setBookingLoading(false);
    navigate('/bookings');
  }, [navigate]);

  const handleBackClick = useCallback(() => {
    // Sempre reindirizza a /spaces per la lista pubblica
    navigate('/spaces');
  }, [navigate]);

  const handleLoginClick = useCallback(() => {
    navigate('/login', { state: { from: `/spaces/${id}` } });
  }, [navigate, id]);

  // Helper functions for labels
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

  // --- BLOCCO: Se non autenticato, mostra invito login/registrazione e Footer ---
  if (!authState.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="bg-white rounded-lg shadow-md p-8 text-center space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Vuoi esplorare i dettagli di questo spazio?
            </h2>
            <p className="mb-6 text-gray-600">
              Per visualizzare informazioni dettagliate e prenotare lo spazio è necessario registrarsi o accedere.
            </p>
            <div className="flex justify-center gap-4">
              <Button onClick={() => navigate('/login')} className="bg-indigo-600 text-white">
                Accedi
              </Button>
              <Button onClick={() => navigate('/register')} variant="outline">
                Registrati
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <div className="text-center py-12">
          <p>Caricamento dettagli spazio...</p>
        </div>
      </div>
    );
  }

  if (error || !space) {
    return (
      <div className="max-w-7xl mx-auto p-4">
        <Button
          variant="ghost"
          onClick={handleBackClick}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Torna alla ricerca
        </Button>
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Spazio non trovato
          </h2>
          <p className="text-gray-600 mb-4">
            {error || 'Lo spazio che stai cercando non esiste o non è più disponibile.'}
          </p>
          <Button onClick={handleBackClick}>
            Torna alla ricerca spazi
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
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
                <ProgressiveImage
                  src={space.photos?.[selectedImage] || '/placeholder.svg'}
                  alt={space.title}
                  aspectRatio="photo"
                  priority={true}
                  enableWebP={true}
                  enableResponsive={true}
                  onLoadComplete={() => console.log(`Main gallery image loaded: ${space.title}`)}
                  className="w-full h-full"
                />
              </div>
              {space.photos && space.photos.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {space.photos.map((photo, index) => (
                    <div key={index} className="relative flex-shrink-0">
                      <ProgressiveImage
                        src={photo}
                        alt={`${space.title} ${index + 1}`}
                        aspectRatio="square"
                        enableWebP={true}
                        enableResponsive={false} // Thumbnails don't need responsive
                        priority={index < 3} // Priority for first 3 thumbnails
                        onLoadComplete={() => console.log(`Gallery thumbnail ${index + 1} loaded`)}
                        className={cn(
                          "w-20 h-20 object-cover rounded cursor-pointer transition-all",
                          selectedImage === index ? "ring-2 ring-indigo-600 opacity-100" : "opacity-70 hover:opacity-100"
                        )}
                        onClick={() => setSelectedImage(index)}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Space info */}
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{getCategoryLabel()}</Badge>
                    <Badge variant="outline">{getWorkEnvironmentLabel()}</Badge>
                  </div>
                  {/* Report button - only visible to authenticated coworkers who are not the space owner */}
                  {canReportSpace && (
                    <ReportDialog
                      targetType="space"
                      targetId={space.id}
                      triggerText="Segnala"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    />
                  )}
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

                    {/* Show warning if time conflict */}
                    {hasTimeConflict && selectedStartTime && selectedEndTime && (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                        <p className="text-sm text-yellow-800">
                          ⚠️ Hai già una prenotazione che si sovrappone con questo orario. Scegli un orario diverso.
                        </p>
                      </div>
                    )}

                    {/* Show existing bookings for selected date */}
                    {existingBookings.length > 0 && selectedDate && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                        <p className="text-sm font-medium text-blue-800 mb-2">
                          Prenotazioni esistenti per {format(selectedDate, "dd/MM/yyyy")}:
                        </p>
                        {existingBookings.map((booking, index) => (
                          <div key={index} className="text-xs text-blue-700">
                            {booking.start_time} - {booking.end_time} ({booking.status})
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Booking cost calculator */}
                    <BookingCalculator 
                      space={space}
                      selectedDate={selectedDate}
                      selectedStartTime={selectedStartTime}
                      selectedEndTime={selectedEndTime}
                    />

                    {/* Booking/Payment button */}
                    {!pendingBookingId ? (
                      <Button
                        onClick={handleBookingCreation}
                        disabled={!selectedDate || !selectedStartTime || !selectedEndTime || bookingLoading || hasTimeConflict}
                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                      >
                        {bookingLoading ? 'Creazione prenotazione...' : 'Crea prenotazione'}
                      </Button>
                    ) : (
                      <PaymentButton
                        bookingId={pendingBookingId}
                        amount={bookingCost}
                        currency="EUR"
                        onPaymentSuccess={handlePaymentSuccess}
                        className="w-full bg-green-600 hover:bg-green-700"
                      />
                    )}

                    <div className="text-xs text-gray-500 text-center">
                      Il pagamento è richiesto per confermare la prenotazione
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
      <Footer />
    </>
  );
};
