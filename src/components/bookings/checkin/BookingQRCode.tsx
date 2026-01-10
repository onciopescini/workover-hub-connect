import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ticket } from 'lucide-react';
import { isToday, parseISO, isAfter, isBefore, addHours, startOfDay, addMinutes } from 'date-fns';

interface BookingQRCodeProps {
  bookingId: string;
  bookingDate: string;
  status: string;
  startTime?: string;
  endTime?: string;
}

export const BookingQRCode = ({ bookingId, bookingDate, status, startTime, endTime }: BookingQRCodeProps) => {
  // Only show QR if booking is confirmed AND date is today
  const isBookingToday = isToday(parseISO(bookingDate));
  const isConfirmed = status === 'confirmed';
  
  if (!isConfirmed || !isBookingToday) {
    return null;
  }

  // Time Validation Logic
  // Valid Window: Start - 2h <= Now <= End
  const now = new Date(); // Device time is sufficient for UI visibility

  let isTooEarly = false;
  let isExpired = false;

  if (startTime && endTime) {
    // Construct Date objects for start and end times today
    const [startHH, startMM] = startTime.split(':').map(Number);
    const [endHH, endMM] = endTime.split(':').map(Number);

    // Create dates based on "today" (since we checked isToday above)
    // We use device time reference frame as requested
    const startDateTime = new Date();
    startDateTime.setHours(startHH, startMM, 0, 0);

    const endDateTime = new Date();
    endDateTime.setHours(endHH, endMM, 0, 0);

    // Check-in opens 2 hours before
    const checkinOpenTime = addHours(startDateTime, -2);

    if (isBefore(now, checkinOpenTime)) {
      isTooEarly = true;
    } else if (isAfter(now, endDateTime)) {
      isExpired = true;
    }
  }

  if (isTooEarly) {
    return (
      <Card className="mt-4 border border-yellow-200 bg-yellow-50">
        <CardContent className="pt-6 text-center text-yellow-800">
          <Ticket className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="font-medium">Check-in disponibile 2h prima</p>
          <p className="text-xs mt-1">Il codice QR apparirà vicino all'orario di inizio</p>
        </CardContent>
      </Card>
    );
  }

  if (isExpired) {
    return (
      <Card className="mt-4 border border-gray-200 bg-gray-50">
        <CardContent className="pt-6 text-center text-gray-500">
          <Ticket className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="font-medium">Prenotazione scaduta</p>
          <p className="text-xs mt-1">L'orario della prenotazione è terminato</p>
        </CardContent>
      </Card>
    );
  }

  // Valid Window -> Show QR
  const qrPayload = JSON.stringify({ booking_id: bookingId });

  return (
    <Card className="mt-4 border-2 border-dashed border-green-300 bg-green-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-green-800">
          <Ticket className="w-4 h-4" />
          Il tuo Check-in QR
          <Badge variant="secondary" className="bg-green-200">OGGI</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="bg-white p-4 rounded-lg shadow-inner">
          <QRCodeSVG 
            value={qrPayload} 
            size={160}
            level="H"
            includeMargin={true}
          />
        </div>
        <p className="text-xs text-green-700 mt-2 text-center">
          Mostra questo codice all'Host per il check-in
        </p>
      </CardContent>
    </Card>
  );
};
