import { QRCodeSVG } from 'qrcode.react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ticket } from 'lucide-react';
import { BookingStatus } from '@/types/booking';

interface BookingQRCodeProps {
  qrCodeToken?: string | null;
  status: BookingStatus;
}

const CHECKIN_ALLOWED_STATUSES: BookingStatus[] = ['confirmed', 'checked_in'];

export const BookingQRCode = ({ qrCodeToken, status }: BookingQRCodeProps) => {
  if (!qrCodeToken || !CHECKIN_ALLOWED_STATUSES.includes(status)) {
    return null;
  }

  const isCheckedIn = status === 'checked_in';

  return (
    <Card className="mt-4 border-2 border-dashed border-green-300 bg-green-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-green-800">
          <Ticket className="w-4 h-4" />
          Il tuo QR Pass
          <Badge variant="secondary" className="bg-green-200">
            {isCheckedIn ? 'CHECKED-IN' : 'CONFIRMED'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className={`bg-white p-4 rounded-lg shadow-inner transition-opacity ${isCheckedIn ? 'opacity-60' : 'opacity-100'}`}>
          <QRCodeSVG
            value={qrCodeToken}
            size={220}
            level="H"
            includeMargin
          />
        </div>
        <p className="text-xs text-green-700 mt-3 text-center">
          {isCheckedIn
            ? 'Sei attualmente nello spazio. Mostra questo codice per fare il check-out.'
            : "Mostra questo codice all'Host al tuo arrivo"}
        </p>
      </CardContent>
    </Card>
  );
};
