import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Euro, Shield, Clock, CheckCircle, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { BookingForm } from './BookingForm';
import { useLogger } from "@/hooks/useLogger";

interface BookingCardProps {
  space: {
    id: string;
    price_per_day: number;
    price_per_hour?: number;
    max_capacity: number;
    title: string;
    confirmation_type?: string;
    host_stripe_account_id?: string;
    host_stripe_connected?: boolean;
    availability?: any;
  };
  isAuthenticated: boolean;
  onLoginRequired: () => void;
  onBookingSuccess: () => void;
  onBookingError: (error: string) => void;
}

export const BookingCard: React.FC<BookingCardProps> = ({
  space,
  isAuthenticated,
  onLoginRequired,
  onBookingSuccess,
  onBookingError
}) => {
  const { debug } = useLogger({ context: 'BookingCard' });
  const [showBookingForm, setShowBookingForm] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const confirmationType = space.confirmation_type || 'host_approval';
  const isInstantBooking = confirmationType === 'instant';
  const canCheckout = Boolean(space?.host_stripe_account_id);
  
  debug('BookingCard rendered', {
    spaceId: space.id,
    confirmationType,
    isInstantBooking,
    canCheckout
  });

  const handleToggleForm = () => {
    const newState = !showBookingForm;
    setShowBookingForm(newState);
    
    if (newState && cardRef.current) {
      setTimeout(() => {
        cardRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }, 100);
    }
  };

  return (
    <Card ref={cardRef} className="w-full transition-all duration-300">
      <CardHeader className="border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">€{space.price_per_day}</span>
            <span className="text-muted-foreground">/ giorno</span>
          </div>
          <Badge 
            variant="secondary" 
            className={isInstantBooking 
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100" 
              : "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100"
            }
          >
            {isInstantBooking ? (
              <>
                <CheckCircle className="w-3 h-3 mr-1" />
                Prenotazione immediata
              </>
            ) : (
              <>
                <AlertTriangle className="w-3 h-3 mr-1" />
                Richiede approvazione
              </>
            )}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 pt-6">
        {/* Booking Info */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="w-4 h-4" />
            <span>Prenotazione flessibile</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Seleziona uno o più giorni con orari personalizzati
          </p>
        </div>

        {/* Capacity Info */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>Fino a {space.max_capacity} persone</span>
        </div>

        {/* Confirmation Type Info */}
        <div className={`flex items-center gap-2 text-sm p-3 rounded-lg ${
          isInstantBooking 
            ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300' 
            : 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300'
        }`}>
          {isInstantBooking ? (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>Conferma automatica</span>
            </>
          ) : (
            <>
              <Clock className="w-4 h-4" />
              <span>Risposta dell'host entro 24h</span>
            </>
          )}
        </div>

        {/* Pricing Info */}
        <div className="space-y-2 p-3 bg-muted rounded-lg">
          <div className="flex justify-between text-sm">
            <span>Prezzo giornaliero</span>
            <span className="font-medium">€{space.price_per_day}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            • Giornata intera (8+ ore): prezzo fisso
          </div>
          <div className="text-xs text-muted-foreground">
            • Orari ridotti: tariffa oraria proporzionale
          </div>
        </div>

        {/* Trust Elements */}
        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            <span>Pagamento sicuro</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{isInstantBooking ? 'Conferma immediata' : 'Risposta entro 24h'}</span>
          </div>
        </div>

        {/* Stripe Warning */}
        {!canCheckout && (
          <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>Host non collegato a Stripe</span>
            </div>
            <p className="text-destructive/80 text-xs mt-1">
              Impossibile procedere con il pagamento. Contatta il proprietario.
            </p>
          </div>
        )}

        {/* Action Button */}
        {isAuthenticated ? (
          <Button 
            onClick={handleToggleForm}
            className="w-full"
            size="lg"
            disabled={!canCheckout}
          >
            <Euro className="w-4 h-4 mr-2" />
            {isInstantBooking ? 'Prenota ora' : 'Richiedi prenotazione'}
            {showBookingForm ? (
              <ChevronUp className="w-4 h-4 ml-2" />
            ) : (
              <ChevronDown className="w-4 h-4 ml-2" />
            )}
          </Button>
        ) : (
          <Button 
            onClick={onLoginRequired}
            className="w-full"
            size="lg"
            disabled={!canCheckout}
          >
            Accedi per prenotare
          </Button>
        )}

        <p className="text-xs text-center text-muted-foreground">
          {isInstantBooking 
            ? 'Pagamento richiesto per confermare la prenotazione'
            : 'Pagamento richiesto solo dopo approvazione'
          }
        </p>

        {/* Booking Form - Expanded inline */}
        {showBookingForm && (
          <div className="animate-in slide-in-from-top-4 duration-300 pt-4 border-t">
            <BookingForm
              spaceId={space.id}
              pricePerDay={space.price_per_day}
              pricePerHour={space.price_per_hour || space.price_per_day / 8}
              confirmationType={confirmationType}
              maxCapacity={space.max_capacity}
              hostStripeAccountId={space.host_stripe_account_id ?? ''}
              availability={space.availability}
              onSuccess={() => {
                onBookingSuccess();
                setShowBookingForm(false);
              }}
              onError={onBookingError}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};
