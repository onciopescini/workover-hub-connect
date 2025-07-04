
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, CalendarDays, Clock, Euro, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { reserveBookingSlot, calculateBookingTotal, handlePaymentFlow } from "@/lib/booking-reservation-utils";
import { useLogger } from "@/hooks/useLogger";

interface BookingFormProps {
  spaceId: string;
  pricePerDay: number;
  confirmationType: string;
  onSuccess: () => void;
  onError: (message: string) => void;
}

export function BookingForm({ spaceId, pricePerDay, confirmationType, onSuccess, onError }: BookingFormProps) {
  const [selectedDate, setSelectedDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [reservationStep, setReservationStep] = useState<'form' | 'reserved' | 'payment'>('form');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const { info, error, debug } = useLogger({ context: 'BookingForm' });

  // Log component initialization
  debug('BookingForm initialized', {
    spaceId,
    pricePerDay,
    confirmationType,
    isInstant: confirmationType === 'instant'
  });

  const validateForm = (): boolean => {
    const errors: string[] = [];
    
    if (!selectedDate) errors.push('Seleziona una data');
    if (!startTime) errors.push('Seleziona orario di inizio');
    if (!endTime) errors.push('Seleziona orario di fine');
    if (startTime && endTime && startTime >= endTime) {
      errors.push('L\'orario di fine deve essere successivo a quello di inizio');
    }
    
    // Fix: Confronto corretto delle date
    if (selectedDate) {
      const selectedDateObj = new Date(selectedDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (selectedDateObj < today) {
        errors.push('Non puoi prenotare per date passate');
      }
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    info('Submit initiated', {
      spaceId,
      selectedDate,
      startTime,
      endTime,
      confirmationType
    });
    
    if (!validateForm()) {
      onError('Correggi gli errori nel form');
      return;
    }

    setIsProcessing(true);
    setValidationErrors([]);
    
    try {
      info('Reserving slot for space', { spaceId });
      
      // Step 1: Reserve the slot (5 minute lock)
      const reservation = await reserveBookingSlot(
        spaceId,
        selectedDate,
        startTime,
        endTime,
        confirmationType
      );

      info('Reservation result', { reservation });

      if (!reservation || !reservation.success) {
        const errorMsg = reservation?.error || 'Errore nella prenotazione dello slot';
        error('Reservation failed', new Error(errorMsg), { 
          spaceId, 
          selectedDate, 
          startTime, 
          endTime,
          reservation 
        });
        onError(errorMsg);
        return;
      }

      info('Slot reserved successfully', { 
        bookingId: reservation.booking_id,
        reservedUntil: reservation.reserved_until 
      });
      setReservationStep('reserved');

      // Step 2: Handle payment flow based on confirmation type
      if (confirmationType === 'instant') {
        // Instant booking -> proceed to payment immediately
        const totalAmount = calculateBookingTotal(pricePerDay, startTime, endTime);
        
        info('Processing instant booking payment', {
          bookingId: reservation.booking_id,
          totalAmount
        });
        
        toast.success('Slot riservato! Reindirizzamento al pagamento...', {
          icon: <CheckCircle className="w-4 h-4" />
        });
        
        // Small delay to show success message
        setTimeout(() => {
          handlePaymentFlow(
            reservation.booking_id!,
            totalAmount,
            () => {
              info('Payment flow completed successfully', { bookingId: reservation.booking_id });
              setReservationStep('payment');
              onSuccess();
            },
            (paymentError) => {
              error('Payment flow error', new Error(paymentError), { 
                bookingId: reservation.booking_id,
                totalAmount 
              });
              onError(paymentError);
            }
          );
        }, 1500);
        
      } else {
        // Host approval required -> show waiting message
        info('Host approval required, showing confirmation', { 
          bookingId: reservation.booking_id 
        });
        toast.success('Richiesta di prenotazione inviata! Attendere l\'approvazione dell\'host.', {
          icon: <CheckCircle className="w-4 h-4" />
        });
        setReservationStep('reserved');
        onSuccess();
      }
      
    } catch (bookingError) {
      error('Unexpected error in booking process', bookingError as Error, {
        spaceId,
        selectedDate,
        startTime,
        endTime,
        confirmationType
      });
      onError('Errore imprevisto nel processo di prenotazione');
    } finally {
      setIsProcessing(false);
    }
  };

  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 9; hour <= 18; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push(timeString);
      }
    }
    return options;
  };

  const calculateDuration = () => {
    if (!startTime || !endTime) return 0;
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);
    return (end.getTime() - start.getTime()) / (1000 * 60 * 60); // hours
  };

  const totalPrice = calculateBookingTotal(pricePerDay, startTime, endTime);

  if (reservationStep === 'reserved' && confirmationType !== 'instant') {
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
          <div className="text-sm text-gray-600">
            <p>Data: {new Date(selectedDate).toLocaleDateString('it-IT')}</p>
            <p>Orario: {startTime} - {endTime}</p>
            <p>Durata: {calculateDuration()} ore</p>
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
          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              required
              disabled={isProcessing}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Orario inizio</Label>
              <Select value={startTime} onValueChange={setStartTime} disabled={isProcessing}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona orario" />
                </SelectTrigger>
                <SelectContent>
                  {generateTimeOptions().map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime">Orario fine</Label>
              <Select value={endTime} onValueChange={setEndTime} disabled={isProcessing}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleziona orario" />
                </SelectTrigger>
                <SelectContent>
                  {generateTimeOptions().map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {startTime && endTime && startTime < endTime && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Durata:</span>
                <span className="font-medium">{calculateDuration()} ore</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-sm text-gray-600">Prezzo totale:</span>
                <span className="font-bold text-lg">€{totalPrice.toFixed(2)}</span>
              </div>
              {confirmationType === 'instant' && (
                <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Slot riservato per 5 minuti durante il pagamento
                </div>
              )}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isProcessing || !selectedDate || !startTime || !endTime}
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
                    Prenota e Paga
                  </>
                ) : (
                  'Richiedi Prenotazione'
                )}
              </>
            )}
          </Button>
          
          {confirmationType === 'instant' && (
            <p className="text-xs text-center text-gray-500">
              Sarai reindirizzato a Stripe per completare il pagamento
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
