import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, CalendarDays, Clock, Euro, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { reserveBookingSlot, handlePaymentFlow } from "@/lib/booking-reservation-utils";
import { useLogger } from "@/hooks/useLogger";
import { sreLogger } from '@/lib/sre-logger';
import { BookingSlot, MultiDayBookingData } from "@/types/booking";
import { BookingSlotItem } from "./BookingSlotItem";
import { TwoStepBookingForm } from "../booking/TwoStepBookingForm";
import { differenceInHours } from 'date-fns';

interface BookingFormProps {
  spaceId: string;
  pricePerDay: number;
  pricePerHour?: number;
  confirmationType: string;
  maxCapacity: number;
  cancellationPolicy?: string;
  rules?: string;
  onSuccess: () => void;
  onError: (message: string) => void;
  hostStripeAccountId?: string; // Required for Stripe Connect payments
  availability?: any; // Availability configuration from host
  authorId?: string;
  minBookingHours?: number;
  timezone?: string;
}

const generateSlotId = () => {
  return Math.random().toString(36).substr(2, 9);
};

export function BookingForm({ spaceId, pricePerDay, pricePerHour, confirmationType, maxCapacity, cancellationPolicy, rules, onSuccess, onError, hostStripeAccountId, availability, timezone }: BookingFormProps) {
  // Move hooks to top level to comply with Rules of Hooks
  const [bookingSlots, setBookingSlots] = useState<BookingSlot[]>([
    {
      id: generateSlotId(),
      date: '',
      startTime: '',
      endTime: ''
    }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [reservationStep, setReservationStep] = useState<'form' | 'reserved' | 'payment'>('form');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const { info, error, debug } = useLogger({ context: 'MultiDayBookingForm' });

  // Use the new 2-step booking form with visual calendar as default
  // This return renders the new component, making the rest of the code unreachable but hooks must still run.
  return (
    <TwoStepBookingForm
      spaceId={spaceId}
      pricePerDay={pricePerDay}
      pricePerHour={pricePerHour || pricePerDay / 8} // Default to 8-hour workday
      confirmationType={confirmationType}
      maxCapacity={maxCapacity}
      cancellationPolicy={cancellationPolicy || 'moderate'}
      rules={rules || ''}
      onSuccess={onSuccess}
      onError={onError}
      bufferMinutes={0} // Default buffer
      slotInterval={30} // Default 30-minute slots
      availability={availability}
      timezone={timezone || 'Europe/Rome'}
      {...(hostStripeAccountId && { hostStripeAccountId })}
    />
  );
  
  /* Original logic is currently unreachable but kept for reference or future re-enablement
   * Hooks above must remain unconditionally executed.
   */

  debug('BookingForm initialized', {
    spaceId,
    pricePerDay,
    confirmationType,
    isInstant: confirmationType === 'instant'
  });

  const addNewSlot = () => {
    const newSlot: BookingSlot = {
      id: generateSlotId(),
      date: '',
      startTime: '',
      endTime: ''
    };
    setBookingSlots([...bookingSlots, newSlot]);
  };

  const updateSlot = (slotId: string, updatedSlot: BookingSlot) => {
    setBookingSlots(slots => 
      slots.map(slot => slot.id === slotId ? updatedSlot : slot)
    );
  };

  const removeSlot = (slotId: string) => {
    if (bookingSlots.length > 1) {
      setBookingSlots(slots => slots.filter(slot => slot.id !== slotId));
    }
  };

  const validateSlots = (): boolean => {
    const errors: string[] = [];
    
    bookingSlots.forEach((slot, index) => {
      if (!slot.date) {
        errors.push(`Slot ${index + 1}: Seleziona una data`);
      }
      if (!slot.startTime) {
        errors.push(`Slot ${index + 1}: Seleziona orario di inizio`);
      }
      if (!slot.endTime) {
        errors.push(`Slot ${index + 1}: Seleziona orario di fine`);
      }
      if (slot.startTime && slot.endTime && slot.startTime >= slot.endTime) {
        errors.push(`Slot ${index + 1}: L'orario di fine deve essere successivo a quello di inizio`);
      }
      if (slot.date) {
        const selectedDateObj = new Date(slot.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDateObj < today) {
          errors.push(`Slot ${index + 1}: Non puoi prenotare per date passate`);
        }
      }
      if (slot.hasConflict) {
        errors.push(`Slot ${index + 1}: Risolvi i conflitti di prenotazione`);
      }
    });

    // Check for duplicate slots
    const duplicateSlots = bookingSlots.filter((slot, index) => {
      return bookingSlots.findIndex(s => 
        s.date === slot.date && 
        s.startTime === slot.startTime && 
        s.endTime === slot.endTime &&
        slot.date && slot.startTime && slot.endTime
      ) !== index;
    });

    if (duplicateSlots.length > 0) {
      errors.push('Rimuovi slot duplicati');
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const calculateTotalBooking = (): MultiDayBookingData => {
    let totalPrice = 0;
    let totalHours = 0;

    bookingSlots.forEach(slot => {
      if (slot.date && slot.startTime && slot.endTime) {
        const startDateTime = new Date(`${slot.date}T${slot.startTime}:00`);
        const endDateTime = new Date(`${slot.date}T${slot.endTime}:00`);
        const hours = differenceInHours(endDateTime, startDateTime);
        
        // Apply daily rate if 8+ hours, otherwise hourly rate
        if (hours >= 8) {
          totalPrice += pricePerDay;
        } else {
          totalPrice += hours * (pricePerDay / 8); // Assuming 8-hour workday for hourly rate
        }
        
        totalHours += hours;
      }
    });

    return {
      slots: bookingSlots,
      totalPrice,
      totalHours
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    info('Multi-day booking submit initiated', {
      spaceId,
      slotCount: bookingSlots.length,
      confirmationType
    });
    
    if (!validateSlots()) {
      onError('Correggi gli errori nei slot di prenotazione');
      return;
    }

    setIsProcessing(true);
    setValidationErrors([]);
    
    try {
      info('Reserving multiple slots for space', { spaceId, slotCount: bookingSlots.length });
      
      // For now, we'll reserve the first slot and then need to implement multi-slot reservation
      const firstSlot = bookingSlots[0];
      if (!firstSlot || !firstSlot.date || !firstSlot.startTime || !firstSlot.endTime) {
        onError('Completa almeno un slot di prenotazione');
        return;
      }
      
      const reservation = await reserveBookingSlot(
        spaceId,
        firstSlot.date,
        firstSlot.startTime,
        firstSlot.endTime,
        confirmationType
      );

      info('Reservation result', { reservation });

      if (!reservation || !reservation.success) {
        const errorMsg = reservation?.error || 'Errore nella prenotazione degli slot';
        error('Reservation failed', new Error(errorMsg), { 
          spaceId, 
          slots: bookingSlots,
          reservation 
        });
        onError(errorMsg);
        return;
      }

      info('Slots reserved successfully', { 
        bookingId: reservation.booking_id,
        reservedUntil: reservation.reserved_until 
      });
      setReservationStep('reserved');

      // Handle payment flow based on confirmation type
      if (confirmationType === 'instant') {
        const { totalPrice } = calculateTotalBooking();
        
        info('Processing instant booking payment for multiple slots', {
          bookingId: reservation.booking_id,
          totalAmount: totalPrice
        });
        
        toast.success('Slot riservati! Reindirizzamento al pagamento...', {
          icon: <CheckCircle className="w-4 h-4" />
        });
        
        setTimeout(() => {
          // For legacy multi-day booking, use simplified parameters
          const startDateTime = new Date(`${firstSlot.date}T${firstSlot.startTime}:00`);
          const endDateTime = new Date(`${firstSlot.date}T${firstSlot.endTime}:00`);
          const durationHours = Math.abs((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60));
          
          sreLogger.info('Payment flow initiated', {
            component: 'BookingForm',
            action: 'payment_flow',
            bookingId: reservation.booking_id,
            spaceId,
            durationHours,
            pricePerHour: pricePerHour || pricePerDay / 8,
            pricePerDay
          });
          
          handlePaymentFlow(
            reservation.booking_id!,
            spaceId,
            durationHours,
            pricePerHour || pricePerDay / 8,
            pricePerDay,
            hostStripeAccountId || '',
            () => {
              info('Payment flow completed successfully', { bookingId: reservation.booking_id });
              setReservationStep('payment');
              onSuccess();
            },
            (paymentError: string) => {
              error('Payment flow error', new Error(paymentError), { 
                bookingId: reservation.booking_id,
                totalAmount: totalPrice 
              });
              onError(paymentError);
            }
          );
        }, 1500);
        
      } else {
        info('Host approval required for multi-slot booking', { 
          bookingId: reservation.booking_id 
        });
        toast.success('Richiesta di prenotazione multi-giorno inviata! Attendere l\'approvazione dell\'host.', {
          icon: <CheckCircle className="w-4 h-4" />
        });
        setReservationStep('reserved');
        onSuccess();
      }
      
    } catch (bookingError) {
      error('Unexpected error in multi-day booking process', bookingError as Error, {
        spaceId,
        slots: bookingSlots,
        confirmationType
      });
      onError('Errore imprevisto nel processo di prenotazione');
    } finally {
      setIsProcessing(false);
    }
  };

  const bookingData = calculateTotalBooking();
  const validSlots = bookingSlots.filter(slot => 
    slot.date && slot.startTime && slot.endTime && slot.startTime < slot.endTime
  );

  if (reservationStep === 'reserved' && confirmationType !== 'instant') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <CalendarDays className="w-5 h-5" />
            Richiesta Multi-Giorno Inviata
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-green-800">
              La tua richiesta di prenotazione multi-giorno è stata inviata all'host. 
              Riceverai una notifica quando verrà approvata.
            </p>
          </div>
          <div className="text-sm text-gray-600 space-y-2">
            <p className="font-medium">Riepilogo prenotazione:</p>
            {validSlots.map((slot, index) => (
              <div key={slot.id} className="border-b pb-1">
                <p>Giorno {index + 1}: {new Date(slot.date).toLocaleDateString('it-IT')}</p>
                <p>Orario: {slot.startTime} - {slot.endTime}</p>
              </div>
            ))}
            <p className="font-medium pt-2">Totale: {bookingData.totalHours} ore</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarDays className="w-5 h-5" />
          {confirmationType === 'instant' ? 'Prenota Subito' : 'Richiedi Prenotazione'}
        </CardTitle>
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
        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-400 rounded">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Correggi questi errori:
                </h3>
                <ul className="mt-2 text-sm text-red-700">
                  {validationErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Booking Slots */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Slot di prenotazione</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addNewSlot}
                disabled={isProcessing}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Aggiungi giorno
              </Button>
            </div>

            {bookingSlots.map((slot, index) => (
              <BookingSlotItem
                key={slot.id}
                slot={slot}
                onUpdate={(updatedSlot) => updateSlot(slot.id, updatedSlot)}
                onRemove={() => removeSlot(slot.id)}
                canRemove={bookingSlots.length > 1}
                isProcessing={isProcessing}
              />
            ))}
          </div>

          {/* Price Summary */}
          {validSlots.length > 0 && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Slot validi:</span>
                <span className="font-medium">{validSlots.length}</span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-sm text-gray-600">Durata totale:</span>
                <span className="font-medium">{bookingData.totalHours} ore</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-gray-600">Prezzo totale:</span>
                <span className="font-bold text-lg">€{bookingData.totalPrice.toFixed(2)}</span>
              </div>
              {confirmationType === 'instant' && (
                <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Slot riservati per 5 minuti durante il pagamento
                </div>
              )}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isProcessing || validSlots.length === 0 || (confirmationType === 'instant' && !hostStripeAccountId)}
          >
            {isProcessing ? (
              <>
                <Clock className="mr-2 h-4 w-4 animate-spin" />
                {confirmationType === 'instant' ? 'Prenotando...' : 'Inviando richiesta...'}
              </>
            ) : (
              <>
                {confirmationType === 'instant' ? (
                  <>
                    <Euro className="mr-2 h-4 w-4" />
                    Prenota e Paga ({validSlots.length} slot)
                  </>
                ) : (
                  `Richiedi Prenotazione (${validSlots.length} slot)`
                )}
              </>
            )}
          </Button>
          
          {confirmationType === 'instant' && !hostStripeAccountId && (
            <p className="text-sm text-red-600 mt-2">
              Host non collegato a Stripe — impossibile procedere al pagamento.
            </p>
          )}
          
          {confirmationType === 'instant' && hostStripeAccountId && (
            <p className="text-xs text-center text-gray-500">
              Sarai reindirizzato a Stripe per completare il pagamento
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
