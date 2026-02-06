import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookingForm } from '@/components/spaces/BookingForm';
import type { AvailabilityData } from '@/types/availability';

type BookingCardSpace = {
  id: string;
  price_per_hour?: number | null;
  price_per_day?: number | null;
  host_id?: string | null;
  confirmation_type?: string | null;
  max_capacity?: number | null;
  host_stripe_account_id?: string;
  availability?: AvailabilityData | string | null;
  timezone?: string | null;
};

interface BookingCardProps {
  price?: number;
  originalPrice?: number | null;
  authorId?: string;
  spaceId?: string;
  minBookingHours?: number;
  space?: BookingCardSpace;
  isAuthenticated?: boolean;
  onLoginRequired?: () => void;
  onBookingSuccess?: () => void;
  onBookingError?: (error: string) => void;
}

export const BookingCard = (props: BookingCardProps) => {
  const spaceData = props.space;

  const spaceId = props.spaceId ?? spaceData?.id ?? '';
  const pricePerHour = props.price ?? spaceData?.price_per_hour ?? 0;
  const pricePerDay = spaceData?.price_per_day ?? null;
  const authorId = props.authorId ?? spaceData?.host_id ?? undefined;
  const minBookingHours = props.minBookingHours ?? 1;
  const confirmationType = spaceData?.confirmation_type ?? 'request';
  const maxCapacity = spaceData?.max_capacity ?? 1;
  const hostStripeAccountId = spaceData?.host_stripe_account_id;
  const availability = spaceData?.availability ?? undefined;
  const timezone = spaceData?.timezone ?? undefined;

  const displayPrice = useMemo(() => {
    if (pricePerHour && pricePerHour > 0) {
      return pricePerHour;
    }

    if (pricePerDay && pricePerDay > 0) {
      return pricePerDay / 8;
    }

    return 0;
  }, [pricePerDay, pricePerHour]);

  const handleSuccess = (): void => {
    props.onBookingSuccess?.();
  };

  const handleError = (message: string): void => {
    props.onBookingError?.(message);
  };

  return (
    <Card className="sticky top-24 shadow-lg border-0 bg-white/80 backdrop-blur-sm z-30">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl flex justify-between items-center">
          <span className="font-heading font-semibold text-primary">€{displayPrice.toFixed(2)}/ora</span>
          {props.originalPrice && props.originalPrice > displayPrice && (
            <span className="text-sm text-muted-foreground line-through decoration-destructive/50">
              €{props.originalPrice}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!props.isAuthenticated ? (
          <Button type="button" className="w-full" onClick={props.onLoginRequired}>
            Accedi per Prenotare
          </Button>
        ) : (
          <BookingForm
            spaceId={spaceId}
            pricePerHour={pricePerHour}
            pricePerDay={pricePerDay ?? (pricePerHour > 0 ? pricePerHour * 8 : 0)}
            confirmationType={confirmationType}
            maxCapacity={maxCapacity}
            hostStripeAccountId={hostStripeAccountId}
            onSuccess={handleSuccess}
            onError={handleError}
            availability={availability}
            authorId={authorId}
            minBookingHours={minBookingHours}
            timezone={timezone ?? undefined}
          />
        )}
      </CardContent>
    </Card>
  );
};
