import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingForm } from "@/components/spaces/BookingForm";

interface BookingCardProps {
  price?: number; // Made optional to avoid strict type mismatch if called differently, but updated below
  originalPrice?: number | null;
  authorId?: string; // Optional
  spaceId?: string; // Optional
  minBookingHours?: number; // Optional

  // New props passed by SpaceDetailContent
  space?: any;
  isAuthenticated?: boolean;
  onLoginRequired?: () => void;
  onBookingSuccess?: () => void;
  onBookingError?: (error: string) => void;
}

export const BookingCard = (props: BookingCardProps) => {
  // Handle both old and new prop structures
  const spaceData = props.space || {};
  
  const spaceId = props.spaceId || spaceData.id;
  const pricePerHour = props.price || spaceData.price_per_hour;
  const pricePerDay = spaceData.price_per_day;
  const authorId = props.authorId || spaceData.host_id; // Mapping host_id
  const minBookingHours = props.minBookingHours || 1;
  const confirmationType = spaceData.confirmation_type || 'request';
  const maxCapacity = spaceData.max_capacity || 1;
  const hostStripeAccountId = spaceData.host_stripe_account_id;
  const availability = spaceData.availability;
  const timezone = spaceData.timezone;

  const handleSuccess = () => {
    if (props.onBookingSuccess) props.onBookingSuccess();
  };

  const handleError = (msg: string) => {
    if (props.onBookingError) props.onBookingError(msg);
  };

  const displayPrice = pricePerHour || (pricePerDay ? pricePerDay / 8 : 0);

  return (
    <Card className="sticky top-24 shadow-lg border-0 bg-white/80 backdrop-blur-sm z-30">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl flex justify-between items-center">
          <span className="font-heading font-semibold text-primary">
            €{displayPrice ? displayPrice.toFixed(2) : '0'}/ora
          </span>
          {props.originalPrice && props.originalPrice > displayPrice && (
            <span className="text-sm text-muted-foreground line-through decoration-destructive/50">
              €{props.originalPrice}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <BookingForm
          spaceId={spaceId}
          pricePerHour={pricePerHour}
          pricePerDay={pricePerDay || (pricePerHour ? pricePerHour * 8 : 0)}
          confirmationType={confirmationType}
          maxCapacity={maxCapacity}
          hostStripeAccountId={hostStripeAccountId}
          onSuccess={handleSuccess}
          onError={handleError}
          availability={availability}
          authorId={authorId}
          minBookingHours={minBookingHours}
          timezone={timezone}
        />
      </CardContent>
    </Card>
  );
};
