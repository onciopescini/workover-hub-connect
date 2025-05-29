
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BookingWithDetails } from "@/types/booking";
import { ArrowLeft, Calendar, MapPin, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import LoadingScreen from "@/components/LoadingScreen";
import { MessageList } from "@/components/messaging/MessageList";
import { format } from "date-fns";
import { it } from "date-fns/locale";

export default function MessageConversation() {
  const { bookingId } = useParams<{ bookingId: string }>();
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [booking, setBooking] = useState<BookingWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      if (!bookingId || !authState.user) return;

      try {
        setIsLoading(true);
        
        // Prima fetchiamo i dati della prenotazione
        const { data: bookingData, error: bookingError } = await supabase
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
          .eq("id", bookingId)
          .single();

        if (bookingError) throw bookingError;

        // Poi fetchiamo i dati dello spazio
        const { data: spaceData, error: spaceError } = await supabase
          .from("spaces")
          .select(`
            id,
            title,
            address,
            photos,
            host_id,
            price_per_day
          `)
          .eq("id", bookingData.space_id)
          .single();

        if (spaceError) throw spaceError;

        // Infine fetchiamo i dati del profilo del coworker
        const { data: coworkerData, error: coworkerError } = await supabase
          .from("profiles")
          .select(`
            id,
            first_name,
            last_name,
            profile_photo_url
          `)
          .eq("id", bookingData.user_id)
          .single();

        if (coworkerError) {
          console.error('Error fetching coworker profile:', coworkerError);
          // Non lanciamo errore qui, continuiamo senza il profilo
        }

        // Verify user has access to this conversation
        const isHost = authState.user.id === spaceData.host_id;
        const isCoworker = authState.user.id === bookingData.user_id;
        
        if (!isHost && !isCoworker) {
          toast.error("Non hai accesso a questa conversazione");
          navigate("/messages");
          return;
        }

        // Combiniamo tutti i dati
        const combinedBooking: BookingWithDetails = {
          ...bookingData,
          space: spaceData,
          coworker: coworkerData || null
        };

        setBooking(combinedBooking);
      } catch (error) {
        console.error("Error fetching booking:", error);
        toast.error("Errore nel caricamento della conversazione");
        navigate("/messages");
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookingDetails();
  }, [bookingId, authState.user, navigate]);

  if (isLoading || !authState.user) {
    return <LoadingScreen />;
  }

  if (!booking) {
    return null;
  }

  const isHost = authState.user.id === booking.space?.host_id;
  const otherParty = isHost 
    ? {
        name: `${booking.coworker?.first_name} ${booking.coworker?.last_name}`,
        photo: booking.coworker?.profile_photo_url
      }
    : {
        name: booking.space?.title || "Host",
        photo: null
      };

  const formattedDate = format(new Date(booking.booking_date), "d MMMM yyyy", { locale: it });

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b p-4 flex items-center space-x-3">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate("/messages")}
          className="shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <Avatar className="w-10 h-10">
          <AvatarImage src={otherParty.photo || undefined} />
          <AvatarFallback>
            <User className="w-5 h-5" />
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-gray-900 truncate">
            {otherParty.name}
          </h1>
          <div className="flex items-center text-sm text-gray-600 space-x-2">
            <span>{booking.space?.title}</span>
            <span>•</span>
            <div className="flex items-center">
              <Calendar className="w-3 h-3 mr-1" />
              <span>{formattedDate}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Booking info bar */}
      <div className="bg-blue-50 border-b p-3">
        <div className="flex items-center text-sm text-blue-800">
          <MapPin className="w-4 h-4 mr-2" />
          <span>{booking.space?.address}</span>
          <span className="ml-auto text-xs">
            Tu sei: {isHost ? "Host" : "Coworker"}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <MessageList bookingId={booking.id} />
      </div>
    </div>
  );
}
