
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BookingWithDetails } from "@/types/booking";
import { Calendar, MessageSquare, MapPin, User, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import LoadingScreen from "@/components/LoadingScreen";
import { MessageDialog } from "@/components/messaging/MessageDialog";
import { CancelBookingDialog } from "@/components/bookings/CancelBookingDialog";
import { BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS } from "@/types/booking";
import { cancelBooking } from "@/lib/booking-utils";

export default function Bookings() {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<BookingWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "confirmed" | "cancelled">("all");
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string>("");
  const [selectedBookingTitle, setSelectedBookingTitle] = useState<string>("");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<BookingWithDetails | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  // Fetch all bookings for current user (both as coworker and host)
  useEffect(() => {
    const fetchBookings = async () => {
      if (!authState.user) return;

      try {
        setIsLoading(true);
        console.log('Fetching bookings for user:', authState.user.id);

        // Fetch bookings where user is the coworker
        const { data: coworkerBookingsRaw, error: coworkerError } = await supabase
          .from("bookings")
          .select(`
            id,
            space_id,
            user_id,
            booking_date,
            start_time,
            end_time,
            status,
            created_at,
            updated_at,
            cancelled_at,
            cancellation_fee,
            cancelled_by_host,
            cancellation_reason
          `)
          .eq("user_id", authState.user.id)
          .order("booking_date", { ascending: false });

        if (coworkerError) {
          console.error('Coworker bookings error:', coworkerError);
          throw coworkerError;
        }

        console.log('Raw coworker bookings:', coworkerBookingsRaw);

        // Get space details for coworker bookings
        let coworkerBookings: BookingWithDetails[] = [];
        if (coworkerBookingsRaw && coworkerBookingsRaw.length > 0) {
          const spaceIds = coworkerBookingsRaw.map(b => b.space_id);
          const { data: spacesData, error: spacesError } = await supabase
            .from("spaces")
            .select(`
              id,
              title,
              address,
              photos,
              host_id,
              price_per_day
            `)
            .in("id", spaceIds);

          if (spacesError) {
            console.error('Spaces fetch error:', spacesError);
            throw spacesError;
          }

          console.log('Spaces data:', spacesData);

          // Combine booking and space data
          coworkerBookings = coworkerBookingsRaw.map(booking => ({
            ...booking,
            space: spacesData?.find(space => space.id === booking.space_id) || {
              title: 'Spazio non trovato',
              address: '',
              photos: [],
              host_id: '',
              price_per_day: 0
            },
            coworker: null
          })) as BookingWithDetails[];
        }

        console.log('Processed coworker bookings:', coworkerBookings);

        // If user is a host, also fetch bookings for their spaces
        let hostBookings: BookingWithDetails[] = [];
        if (authState.profile?.role === "host" || authState.profile?.role === "admin") {
          // First get host's spaces
          const { data: userSpaces, error: spacesError } = await supabase
            .from("spaces")
            .select("id")
            .eq("host_id", authState.user.id);

          if (spacesError) {
            console.error('User spaces error:', spacesError);
            throw spacesError;
          }

          console.log('User spaces:', userSpaces);

          if (userSpaces && userSpaces.length > 0) {
            const spaceIds = userSpaces.map(s => s.id);
            
            // Get bookings for host's spaces
            const { data: hostBookingsRaw, error: hostError } = await supabase
              .from("bookings")
              .select(`
                id,
                space_id,
                user_id,
                booking_date,
                start_time,
                end_time,
                status,
                created_at,
                updated_at,
                cancelled_at,
                cancellation_fee,
                cancelled_by_host,
                cancellation_reason
              `)
              .in("space_id", spaceIds)
              .neq("user_id", authState.user.id) // Exclude own bookings as coworker
              .order("booking_date", { ascending: false });

            if (hostError) {
              console.error('Host bookings error:', hostError);
              throw hostError;
            }

            console.log('Raw host bookings:', hostBookingsRaw);

            if (hostBookingsRaw && hostBookingsRaw.length > 0) {
              // Get space details
              const { data: hostSpacesData, error: hostSpacesError } = await supabase
                .from("spaces")
                .select(`
                  id,
                  title,
                  address,
                  photos,
                  host_id,
                  price_per_day
                `)
                .in("id", spaceIds);

              if (hostSpacesError) {
                console.error('Host spaces fetch error:', hostSpacesError);
                throw hostSpacesError;
              }

              // Get coworker details
              const coworkerIds = hostBookingsRaw.map(b => b.user_id);
              const { data: coworkersData, error: coworkersError } = await supabase
                .from("profiles")
                .select(`
                  id,
                  first_name,
                  last_name,
                  profile_photo_url
                `)
                .in("id", coworkerIds);

              if (coworkersError) {
                console.error('Coworkers fetch error:', coworkersError);
              }

              console.log('Coworkers data:', coworkersData);

              // Combine host booking data
              hostBookings = hostBookingsRaw.map(booking => ({
                ...booking,
                space: hostSpacesData?.find(space => space.id === booking.space_id) || {
                  title: 'Spazio non trovato',
                  address: '',
                  photos: [],
                  host_id: authState.user?.id || '',
                  price_per_day: 0
                },
                coworker: coworkersData?.find(coworker => coworker.id === booking.user_id) || null
              })) as BookingWithDetails[];
            }
          }
        }

        console.log('Processed host bookings:', hostBookings);

        // Combine all bookings and remove duplicates
        const allBookings = [...coworkerBookings, ...hostBookings];
        const uniqueBookings = allBookings.filter((booking, index, self) => 
          index === self.findIndex(b => b.id === booking.id)
        );

        console.log('All unique bookings:', uniqueBookings);

        setBookings(uniqueBookings);
        setFilteredBookings(uniqueBookings);

      } catch (error) {
        console.error("Error fetching bookings:", error);
        toast.error("Errore nel caricamento delle prenotazioni");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookings();
  }, [authState.user, authState.profile]);

  // Filter bookings based on active tab
  useEffect(() => {
    if (activeTab === "all") {
      setFilteredBookings(bookings);
    } else {
      setFilteredBookings(bookings.filter(booking => booking.status === activeTab));
    }
  }, [activeTab, bookings]);

  // Determine if current user is host or coworker for each booking
  const getUserRole = (booking: BookingWithDetails) => {
    return authState.user?.id === booking.space?.host_id ? "host" : "coworker";
  };

  // Get the other party (host or coworker) for display
  const getOtherParty = (booking: BookingWithDetails) => {
    const userRole = getUserRole(booking);
    if (userRole === "host") {
      // Show coworker info
      return {
        name: `${booking.coworker?.first_name || ''} ${booking.coworker?.last_name || ''}`.trim() || 'Coworker',
        photo: booking.coworker?.profile_photo_url,
        role: "Coworker"
      };
    } else {
      // For coworker view, show space title as host identifier
      return {
        name: booking.space?.title || "Spazio",
        photo: null,
        role: "Host"
      };
    }
  };

  // Check if booking can be cancelled
  const canCancelBooking = (booking: BookingWithDetails) => {
    return booking.status === "confirmed" || booking.status === "pending";
  };

  // Open message dialog
  const openMessageDialog = (bookingId: string, spaceTitle: string) => {
    setSelectedBookingId(bookingId);
    setSelectedBookingTitle(spaceTitle);
    setMessageDialogOpen(true);
  };

  // Open cancel dialog
  const openCancelDialog = (booking: BookingWithDetails) => {
    setBookingToCancel(booking);
    setCancelDialogOpen(true);
  };

  // Handle booking cancellation
  const handleCancelBooking = async (reason?: string) => {
    if (!bookingToCancel) return;

    setIsCancelling(true);
    try {
      const userRole = getUserRole(bookingToCancel);
      const result = await cancelBooking(
        bookingToCancel.id, 
        userRole === "host", 
        reason
      );

      if (result.success) {
        // Update the booking in the local state
        setBookings(prev => prev.map(booking => 
          booking.id === bookingToCancel.id 
            ? { ...booking, status: 'cancelled' as const }
            : booking
        ));
        setCancelDialogOpen(false);
        setBookingToCancel(null);
      }
    } catch (error) {
      console.error("Error cancelling booking:", error);
      toast.error("Errore nella cancellazione della prenotazione");
    } finally {
      setIsCancelling(false);
    }
  };

  if (authState.isLoading || isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
            Le tue Prenotazioni
          </h1>
          <p className="text-gray-600 mt-1">
            Gestisci le tue prenotazioni come {authState.profile?.role === "host" ? "host e coworker" : "coworker"}
          </p>
        </div>

        {/* Tabs for filtering */}
        <Tabs value={activeTab} onValueChange={(value: any) => setActiveTab(value)} className="mb-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">Tutte ({bookings.length})</TabsTrigger>
            <TabsTrigger value="pending">
              In attesa ({bookings.filter(b => b.status === "pending").length})
            </TabsTrigger>
            <TabsTrigger value="confirmed">
              Confermate ({bookings.filter(b => b.status === "confirmed").length})
            </TabsTrigger>
            <TabsTrigger value="cancelled">
              Annullate ({bookings.filter(b => b.status === "cancelled").length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {filteredBookings.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Calendar className="w-12 h-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Nessuna prenotazione trovata
                  </h3>
                  <p className="text-gray-600 text-center mb-4">
                    {activeTab === "all" 
                      ? "Non hai ancora nessuna prenotazione."
                      : `Non hai prenotazioni ${activeTab === "pending" ? "in attesa" : activeTab === "confirmed" ? "confermate" : "annullate"}.`
                    }
                  </p>
                  {activeTab === "all" && (
                    <Button onClick={() => navigate("/dashboard")} className="bg-[#4F46E5] hover:bg-[#4F46E5]/90">
                      Trova spazi
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredBookings.map((booking) => {
                  const otherParty = getOtherParty(booking);
                  const userRole = getUserRole(booking);
                  const formattedDate = format(new Date(booking.booking_date), "EEEE d MMMM yyyy", { locale: it });

                  return (
                    <Card key={booking.id} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-lg font-semibold text-gray-900">
                              {booking.space?.title || 'Spazio senza titolo'}
                            </CardTitle>
                            <div className="flex items-center text-sm text-gray-600 mt-1">
                              <MapPin className="w-4 h-4 mr-1" />
                              {booking.space?.address || 'Indirizzo non disponibile'}
                            </div>
                          </div>
                          <Badge className={BOOKING_STATUS_COLORS[booking.status as keyof typeof BOOKING_STATUS_COLORS]}>
                            {BOOKING_STATUS_LABELS[booking.status as keyof typeof BOOKING_STATUS_LABELS]}
                          </Badge>
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={otherParty.photo || undefined} />
                              <AvatarFallback>
                                <User className="w-5 h-5" />
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium text-gray-900">{otherParty.name}</p>
                              <p className="text-sm text-gray-600">{otherParty.role}</p>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="flex items-center text-sm text-gray-600 mb-1">
                              <Calendar className="w-4 h-4 mr-1" />
                              {formattedDate}
                            </div>
                            {booking.start_time && booking.end_time && (
                              <p className="text-xs text-gray-500">
                                {booking.start_time} - {booking.end_time}
                              </p>
                            )}
                            <p className="text-xs text-gray-500">
                              Tu sei: {userRole === "host" ? "Host" : "Coworker"}
                            </p>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex space-x-2 mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex items-center"
                            onClick={() => openMessageDialog(booking.id, booking.space?.title || "Spazio")}
                          >
                            <MessageSquare className="w-4 h-4 mr-1" />
                            Messaggi
                          </Button>
                          {canCancelBooking(booking) && (
                            <Button
                              variant="destructive"
                              size="sm"
                              className="flex items-center"
                              onClick={() => openCancelDialog(booking)}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Cancella
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Message Dialog */}
        <MessageDialog
          open={messageDialogOpen}
          onOpenChange={setMessageDialogOpen}
          bookingId={selectedBookingId}
          bookingTitle={selectedBookingTitle}
        />

        {/* Cancel Booking Dialog */}
        {bookingToCancel && (
          <CancelBookingDialog
            open={cancelDialogOpen}
            onOpenChange={setCancelDialogOpen}
            booking={bookingToCancel}
            onConfirm={handleCancelBooking}
            isLoading={isCancelling}
          />
        )}
      </div>
    </div>
  );
}
