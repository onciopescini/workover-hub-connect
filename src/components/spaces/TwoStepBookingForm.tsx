import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CalendarDays, Clock, Euro, CheckCircle, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useLogger } from "@/hooks/useLogger";
import { DateSelectionStep } from "./DateSelectionStep";
import { TimeSlotSelectionStep } from "./TimeSlotSelectionStep";
import { reserveBookingSlot, calculateBookingTotal, handlePaymentFlow } from "@/lib/booking-reservation-utils";

interface TwoStepBookingFormProps {
  spaceId: string;
  pricePerDay: number;
  confirmationType: string;
  onSuccess: () => void;
  onError: (message: string) => void;
}

type BookingStep = 'date-selection' | 'time-selection' | 'processing' | 'completed';

interface BookingData {
  date: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  duration: number;
}

export function TwoStepBookingForm({ 
  spaceId, 
  pricePerDay, 
  confirmationType, 
  onSuccess, 
  onError 
}: TwoStepBookingFormProps) {
  const [currentStep, setCurrentStep] = useState<BookingStep>('date-selection');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { info, error, debug } = useLogger({ context: 'TwoStepBookingForm' });

  debug('TwoStepBookingForm initialized', {
    spaceId,
    pricePerDay,
    confirmationType,
    isInstant: confirmationType === 'instant'
  });

  const handleDateSelection = useCallback((date: string) => {
    info('Date selected in step 1', { date });
    setSelectedDate(date);
    setCurrentStep('time-selection');
  }, [info]);

  const handleTimeSlotSelection = useCallback((startTime: string, endTime: string) => {
    const startDateTime = new Date(`${selectedDate}T${startTime}:00`);
    const endDateTime = new Date(`${selectedDate}T${endTime}:00`);
    const duration = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60);
    
    // Calculate pricing: full day rate for 8+ hours, hourly rate otherwise
    let totalPrice: number;
    if (duration >= 8) {
      totalPrice = pricePerDay;
    } else {
      const hourlyRate = pricePerDay / 8;
      totalPrice = duration * hourlyRate;
    }

    const booking: BookingData = {
      date: selectedDate,
      startTime,
      endTime,
      totalPrice: Math.round(totalPrice * 100) / 100, // Round to 2 decimals
      duration
    };

    info('Time slot selected in step 2', { 
      ...booking,
      isPremiumPricing: duration >= 8 
    });

    setBookingData(booking);
    handleBookingConfirmation(booking);
  }, [selectedDate, pricePerDay, info]);

  const handleBookingConfirmation = async (booking: BookingData) => {
    setIsProcessing(true);
    setCurrentStep('processing');

    try {
      info('Starting booking reservation process', {
        spaceId,
        booking,
        confirmationType
      });

      const reservation = await reserveBookingSlot(
        spaceId,
        booking.date,
        booking.startTime,
        booking.endTime,
        confirmationType
      );

      if (!reservation || !reservation.success) {
        const errorMsg = reservation?.error || 'Errore nella prenotazione dello slot';
        error('Reservation failed in 2-step process', new Error(errorMsg), { 
          spaceId, 
          booking,
          reservation 
        });
        onError(errorMsg);
        setCurrentStep('time-selection'); // Return to time selection
        return;
      }

      info('Slot reserved successfully in 2-step process', { 
        bookingId: reservation.booking_id,
        reservedUntil: reservation.reserved_until 
      });

      // Handle payment flow based on confirmation type
      if (confirmationType === 'instant') {
        info('Processing instant booking payment in 2-step flow', {
          bookingId: reservation.booking_id,
          totalAmount: booking.totalPrice
        });
        
        toast.success('Slot riservato! Reindirizzamento al pagamento...', {
          icon: <CheckCircle className="w-4 h-4" />
        });
        
        setTimeout(() => {
          handlePaymentFlow(
            reservation.booking_id!,
            booking.totalPrice,
            () => {
              info('Payment flow completed successfully in 2-step', { bookingId: reservation.booking_id });
              setCurrentStep('completed');
              onSuccess();
            },
            (paymentError) => {
              error('Payment flow error in 2-step', new Error(paymentError), { 
                bookingId: reservation.booking_id,
                totalAmount: booking.totalPrice 
              });
              onError(paymentError);
              setCurrentStep('time-selection');
            }
          );
        }, 1500);
        
      } else {
        info('Host approval required for 2-step booking', { 
          bookingId: reservation.booking_id 
        });
        toast.success('Richiesta di prenotazione inviata! Attendere l\'approvazione dell\'host.', {
          icon: <CheckCircle className="w-4 h-4" />
        });
        setCurrentStep('completed');
        onSuccess();
      }
      
    } catch (bookingError) {
      error('Unexpected error in 2-step booking process', bookingError as Error, {
        spaceId,
        booking,
        confirmationType
      });
      onError('Errore imprevisto nel processo di prenotazione');
      setCurrentStep('time-selection');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBackToDateSelection = useCallback(() => {
    setCurrentStep('date-selection');
    setSelectedDate('');
    setBookingData(null);
  }, []);

  const handleBackToTimeSelection = useCallback(() => {
    setCurrentStep('time-selection');
    setBookingData(null);
  }, []);

  // Completed state for non-instant bookings
  if (currentStep === 'completed' && confirmationType !== 'instant') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CalendarDays className="w-5 h-5" />
            Richiesta Inviata
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-green-800">
              La tua richiesta di prenotazione è stata inviata all'host. 
              Riceverai una notifica quando verrà approvata.
            </p>
          </div>
          {bookingData && (
            <div className="text-sm text-gray-600 space-y-2">
              <p className="font-medium">Riepilogo prenotazione:</p>
              <p>Data: {new Date(bookingData.date).toLocaleDateString('it-IT')}</p>
              <p>Orario: {bookingData.startTime} - {bookingData.endTime}</p>
              <p>Durata: {bookingData.duration} ore</p>
              <p className="font-medium pt-2">Prezzo: €{bookingData.totalPrice}</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {currentStep === 'date-selection' && <CalendarDays className="w-5 h-5" />}
            {currentStep === 'time-selection' && <Clock className="w-5 h-5" />}
            {currentStep === 'processing' && <Euro className="w-5 h-5" />}
            {currentStep === 'date-selection' && 'Seleziona Data'}
            {currentStep === 'time-selection' && 'Seleziona Orario'}
            {currentStep === 'processing' && 'Elaborazione...'}
          </CardTitle>
          
          {currentStep === 'time-selection' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackToDateSelection}
              disabled={isProcessing}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Indietro
            </Button>
          )}
        </div>
        
        {/* Booking type indicator */}
        <div className="flex items-center gap-2 text-sm">
          {confirmationType === 'instant' ? (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-2 rounded">
              <CheckCircle className="w-4 h-4" />
              Prenotazione immediata
            </div>
          ) : (
            <div className="flex items-center gap-2 text-orange-600 bg-orange-50 p-2 rounded">
              <AlertTriangle className="w-4 h-4" />
              Richiede approvazione dell'host
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {currentStep === 'date-selection' && (
          <DateSelectionStep
            spaceId={spaceId}
            onDateSelect={handleDateSelection}
            isProcessing={isProcessing}
          />
        )}

        {currentStep === 'time-selection' && selectedDate && (
          <TimeSlotSelectionStep
            spaceId={spaceId}
            selectedDate={selectedDate}
            pricePerDay={pricePerDay}
            onTimeSlotSelect={handleTimeSlotSelection}
            isProcessing={isProcessing}
          />
        )}

        {currentStep === 'processing' && bookingData && (
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center">
              <Clock className="w-8 h-8 animate-spin text-primary" />
            </div>
            <div className="space-y-2">
              <p className="font-medium">
                {confirmationType === 'instant' ? 'Prenotando...' : 'Inviando richiesta...'}
              </p>
              <div className="text-sm text-gray-600">
                <p>Data: {new Date(bookingData.date).toLocaleDateString('it-IT')}</p>
                <p>Orario: {bookingData.startTime} - {bookingData.endTime}</p>
                <p>Prezzo: €{bookingData.totalPrice}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}