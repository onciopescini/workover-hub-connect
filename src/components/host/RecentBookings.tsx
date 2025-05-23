
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { BookingWithDetails, BOOKING_STATUS_COLORS, BOOKING_STATUS_LABELS } from "@/types/booking";
import { Calendar, MapPin, User } from "lucide-react";

interface RecentBookingsProps {
  bookings: BookingWithDetails[];
}

export function RecentBookings({ bookings }: RecentBookingsProps) {
  if (bookings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Prenotazioni Recenti</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-center py-4">
            Nessuna prenotazione recente
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Prenotazioni Recenti</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {bookings.slice(0, 5).map((booking) => (
          <div key={booking.id} className="flex items-center space-x-4 p-3 rounded-lg border">
            <Avatar className="h-10 w-10">
              <AvatarImage src={booking.coworker?.profile_photo_url || undefined} />
              <AvatarFallback>
                {booking.coworker?.first_name?.[0]}{booking.coworker?.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-medium truncate">
                  {booking.coworker?.first_name} {booking.coworker?.last_name}
                </p>
                <Badge className={BOOKING_STATUS_COLORS[booking.status]}>
                  {BOOKING_STATUS_LABELS[booking.status]}
                </Badge>
              </div>
              
              <div className="flex items-center text-sm text-gray-500 mt-1">
                <Calendar className="w-3 h-3 mr-1" />
                {new Date(booking.booking_date).toLocaleDateString()}
                <MapPin className="w-3 h-3 ml-2 mr-1" />
                <span className="truncate">{booking.space?.title}</span>
              </div>
            </div>
            
            <Button variant="outline" size="sm">
              Dettagli
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
