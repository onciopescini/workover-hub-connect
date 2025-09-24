
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Euro, Shield, Clock, CheckCircle, AlertTriangle } from "lucide-react";
import { BookingForm } from './BookingForm';
import { useLogger } from "@/hooks/useLogger";

interface StickyBookingCardProps {
  space: {
    id: string;
    price_per_day: number;
    price_per_hour?: number;
    max_capacity: number;
    title: string;
    confirmation_type?: string;
    host_stripe_account_id?: string; // Required for Stripe Connect payments
    host_stripe_connected?: boolean; // Informational only
  };
  isAuthenticated: boolean;
  onLoginRequired: () => void;
  onBookingSuccess: () => void;
  onBookingError: (error: string) => void;
}

export const StickyBookingCard: React.FC<StickyBookingCardProps> = ({
  space,
  isAuthenticated,
  onLoginRequired,
  onBookingSuccess,
  onBookingError
}) => {
  const { debug } = useLogger({ context: 'StickyBookingCard' });
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  
  // Confirmation type handling
  const confirmationType = space.confirmation_type || 'host_approval';
  const isInstantBooking = confirmationType === 'instant';
  
  // Stripe account check
  const canCheckout = Boolean(space?.host_stripe_account_id);
  
  debug('Space confirmation type validation', {
    operation: 'validate_confirmation_type',
    spaceId: space.id,
    confirmationType,
    isInstantBooking,
    rawConfirmationType: space.confirmation_type
  });

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsSticky(scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (showBookingForm) {
    return (
      <Card className={`${isSticky ? 'fixed top-4 right-4 w-96 z-50 shadow-2xl' : ''}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {isInstantBooking ? 'Prenota ora' : 'Richiedi prenotazione'}
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowBookingForm(false)}
            >
              ✕
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <BookingForm
            spaceId={space.id}
            pricePerDay={space.price_per_day}
            pricePerHour={space.price_per_hour || space.price_per_day / 8}
            confirmationType={confirmationType}
            maxCapacity={space.max_capacity}
            hostStripeAccountId={space.host_stripe_account_id ?? ''}
            onSuccess={() => {
              onBookingSuccess();
              setShowBookingForm(false);
            }}
            onError={onBookingError}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${isSticky ? 'fixed top-4 right-4 w-96 z-50 shadow-2xl' : ''}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">€{space.price_per_day}</span>
            <span className="text-gray-600">/ giorno</span>
          </div>
          <Badge 
            variant="secondary" 
            className={isInstantBooking 
              ? "bg-green-100 text-green-800" 
              : "bg-orange-100 text-orange-800"
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
      
      <CardContent className="space-y-4">
        {/* Booking Info */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>Prenotazione flessibile</span>
          </div>
          <p className="text-sm text-gray-600">
            Seleziona uno o più giorni con orari personalizzati
          </p>
        </div>

        {/* Capacity Info */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="w-4 h-4" />
          <span>Fino a {space.max_capacity} persone</span>
        </div>

        {/* Confirmation Type Info */}
        <div className={`flex items-center gap-2 text-sm p-2 rounded ${
          isInstantBooking 
            ? 'bg-green-50 text-green-700' 
            : 'bg-orange-50 text-orange-700'
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
        <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
          <div className="flex justify-between text-sm">
            <span>Prezzo giornaliero</span>
            <span className="font-medium">€{space.price_per_day}</span>
          </div>
          <div className="text-xs text-gray-600">
            • Giornata intera (8+ ore): prezzo fisso
          </div>
          <div className="text-xs text-gray-600">
            • Orari ridotti: tariffa oraria proporzionale
          </div>
        </div>

        {/* Trust Elements */}
        <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
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
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700 text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>Host non collegato a Stripe</span>
            </div>
            <p className="text-red-600 text-xs mt-1">
              Impossibile procedere con il pagamento. Contatta il proprietario.
            </p>
          </div>
        )}

        {/* Action Button */}
        {isAuthenticated ? (
          <Button 
            onClick={() => setShowBookingForm(true)}
            className="w-full"
            size="lg"
            disabled={!canCheckout}
          >
            <Euro className="w-4 h-4 mr-2" />
            {isInstantBooking ? 'Prenota ora' : 'Richiedi prenotazione'}
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

        <p className="text-xs text-center text-gray-500">
          {isInstantBooking 
            ? 'Pagamento richiesto per confermare la prenotazione'
            : 'Pagamento richiesto solo dopo approvazione'
          }
        </p>
      </CardContent>
    </Card>
  );
};
