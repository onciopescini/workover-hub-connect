import { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Ticket, CircleCheckBig } from 'lucide-react';
import { BookingStatus } from '@/types/booking';
import { supabase } from '@/integrations/supabase/client';
import { QR_BOOKINGS_REALTIME, QR_CHECKIN_INVALIDATION_KEYS } from '@/constants/qrCheckin';

interface BookingQRCodeProps {
  bookingId: string;
  qrCodeToken?: string | null;
  status: BookingStatus;
}

const ALLOWED_QR_STATUSES: ReadonlySet<BookingStatus> = new Set(['confirmed', 'checked_in', 'checked_out']);

const isBookingStatus = (value: unknown): value is BookingStatus => {
  return typeof value === 'string' && ALLOWED_QR_STATUSES.has(value as BookingStatus);
};

const QR_STATUS_BADGE_LABELS: Record<'confirmed' | 'checked_in' | 'checked_out', string> = {
  confirmed: 'CONFERMATA',
  checked_in: 'CHECKED-IN',
  checked_out: 'CHECKED-OUT',
};

export const BookingQRCode = ({ bookingId, qrCodeToken, status }: BookingQRCodeProps) => {
  const [liveStatus, setLiveStatus] = useState<BookingStatus>(status);
  const queryClient = useQueryClient();

  useEffect(() => {
    setLiveStatus(status);
  }, [status]);

  useEffect(() => {
    if (!bookingId) {
      return;
    }

    const channel = supabase
      .channel(`${QR_BOOKINGS_REALTIME.CHANNEL_PREFIX}-${bookingId}`)
      .on(
        'postgres_changes',
        {
          event: QR_BOOKINGS_REALTIME.EVENT,
          schema: QR_BOOKINGS_REALTIME.SCHEMA,
          table: QR_BOOKINGS_REALTIME.TABLE,
          filter: `id=eq.${bookingId}`,
        },
        (payload) => {
          const nextStatus = payload.new.status;

          if (!isBookingStatus(nextStatus)) {
            return;
          }

          setLiveStatus(nextStatus);
          void queryClient.invalidateQueries({
            queryKey: [QR_CHECKIN_INVALIDATION_KEYS.COWORKER_BOOKINGS],
          });
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [bookingId, queryClient]);

  const statusForUi = useMemo(() => {
    if (liveStatus === 'checked_out') {
      return 'checked_out' as const;
    }
    if (liveStatus === 'checked_in') {
      return 'checked_in' as const;
    }
    return 'confirmed' as const;
  }, [liveStatus]);

  if (statusForUi === 'checked_out') {
    return (
      <Card className="mt-4 border border-teal-300 bg-teal-50">
        <CardContent className="py-5">
          <p className="text-sm font-medium text-teal-900 text-center">
            Check-out completato. Speriamo tu abbia lavorato bene!
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!qrCodeToken) {
    return null;
  }

  const isCheckedIn = statusForUi === 'checked_in';

  return (
    <Card className="mt-4 border-2 border-dashed border-green-300 bg-green-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-green-800">
          <Ticket className="w-4 h-4" />
          Il tuo QR Pass
          <Badge variant="secondary" className="bg-green-200">
            {QR_STATUS_BADGE_LABELS[statusForUi]}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        {isCheckedIn && (
          <div className="w-full mb-3 rounded-md border border-emerald-200 bg-emerald-100 px-3 py-2 text-emerald-900 text-xs font-medium flex items-center gap-2">
            <CircleCheckBig className="h-4 w-4" />
            Sei all'interno dello spazio!
          </div>
        )}
        <div className={`bg-white p-4 rounded-lg shadow-inner transition-opacity ${isCheckedIn ? 'opacity-90' : 'opacity-100'}`}>
          <QRCodeSVG value={qrCodeToken} size={220} level="H" includeMargin />
        </div>
        <p className="text-xs text-green-700 mt-3 text-center">
          {isCheckedIn
            ? "Mostra questo QR all'Host per il Check-out"
            : "Mostra questo QR all'Host per il Check-in"}
        </p>
      </CardContent>
    </Card>
  );
};
