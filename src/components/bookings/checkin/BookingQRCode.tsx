import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ticket } from 'lucide-react';
import { isToday, parseISO } from 'date-fns';

interface BookingQRCodeProps {
  bookingId: string;
  bookingDate: string;
  status: string;
}

export const BookingQRCode = ({ bookingId, bookingDate, status }: BookingQRCodeProps) => {
  // Only show QR if booking is confirmed AND date is today
  const isBookingToday = isToday(parseISO(bookingDate));
  const isConfirmed = status === 'confirmed';
  
  if (!isConfirmed || !isBookingToday) {
    return null;
  }

  // Simple JSON payload - backend validates everything else
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
