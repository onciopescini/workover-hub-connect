
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Euro, Shield, Clock } from "lucide-react";
import { BookingForm } from './BookingForm';

interface StickyBookingCardProps {
  space: {
    id: string;
    price_per_day: number;
    max_capacity: number;
    title: string;
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
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const [selectedDays, setSelectedDays] = useState(1);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setIsSticky(scrollY > 400);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const calculateTotal = () => {
    const basePrice = space.price_per_day * selectedDays;
    const serviceFee = basePrice * 0.05; // 5% service fee
    return {
      basePrice,
      serviceFee,
      total: basePrice + serviceFee
    };
  };

  const pricing = calculateTotal();

  if (showBookingForm) {
    return (
      <Card className={`${isSticky ? 'fixed top-4 right-4 w-96 z-50 shadow-2xl' : ''}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Prenota ora</CardTitle>
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
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <Shield className="w-3 h-3 mr-1" />
            Prenotazione sicura
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Quick Date Selection */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Calendar className="w-4 h-4" />
            <span>Seleziona durata</span>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
            {[1, 3, 7].map((days) => (
              <Button
                key={days}
                variant={selectedDays === days ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedDays(days)}
              >
                {days} {days === 1 ? 'giorno' : 'giorni'}
              </Button>
            ))}
          </div>
        </div>

        {/* Capacity Info */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Users className="w-4 h-4" />
          <span>Fino a {space.max_capacity} persone</span>
        </div>

        {/* Price Breakdown */}
        <div className="space-y-2 p-3 bg-gray-50 rounded-lg">
          <div className="flex justify-between text-sm">
            <span>€{space.price_per_day} × {selectedDays} {selectedDays === 1 ? 'giorno' : 'giorni'}</span>
            <span>€{pricing.basePrice.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-600">
            <span>Commissione servizio</span>
            <span>€{pricing.serviceFee.toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-semibold text-lg pt-2 border-t">
            <span>Totale</span>
            <span>€{pricing.total.toFixed(2)}</span>
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
            <span>Conferma immediata</span>
          </div>
        </div>

        {/* Action Button */}
        {isAuthenticated ? (
          <Button 
            onClick={() => setShowBookingForm(true)}
            className="w-full"
            size="lg"
          >
            <Euro className="w-4 h-4 mr-2" />
            Prenota ora
          </Button>
        ) : (
          <Button 
            onClick={onLoginRequired}
            className="w-full"
            size="lg"
          >
            Accedi per prenotare
          </Button>
        )}

        <p className="text-xs text-center text-gray-500">
          Non verrai addebitato subito
        </p>
      </CardContent>
    </Card>
  );
};
