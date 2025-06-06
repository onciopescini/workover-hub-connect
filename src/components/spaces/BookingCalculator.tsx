
import React from 'react';
import { Space } from '@/types/space';
import { differenceInHours, isSameDay } from 'date-fns';
import { calculatePaymentBreakdown } from '@/lib/payment-utils';

interface BookingCalculatorProps {
  space: Space;
  selectedDate?: Date;
  selectedStartTime: string;
  selectedEndTime: string;
}

export const BookingCalculator = ({ space, selectedDate, selectedStartTime, selectedEndTime }: BookingCalculatorProps) => {
  const calculateBookingCost = () => {
    if (!selectedDate || !selectedStartTime || !selectedEndTime) return 0;

    const startDateTime = new Date(`${selectedDate.toISOString().split('T')[0]}T${selectedStartTime}:00`);
    const endDateTime = new Date(`${selectedDate.toISOString().split('T')[0]}T${selectedEndTime}:00`);
    
    const hours = differenceInHours(endDateTime, startDateTime);
    
    // Se è un'intera giornata (8+ ore) e c'è un prezzo giornaliero, usa quello
    if (hours >= 8 && space.price_per_day) {
      return space.price_per_day;
    }
    
    // Altrimenti calcola per ore
    return hours * space.price_per_hour;
  };

  const baseAmount = calculateBookingCost();
  const breakdown = calculatePaymentBreakdown(baseAmount);
  
  const hours = selectedStartTime && selectedEndTime ? 
    differenceInHours(
      new Date(`2000-01-01T${selectedEndTime}:00`),
      new Date(`2000-01-01T${selectedStartTime}:00`)
    ) : 0;

  if (!selectedStartTime || !selectedEndTime) {
    return null;
  }

  return (
    <div className="bg-gray-50 p-4 rounded-lg mb-4">
      <h3 className="font-semibold mb-2">Riepilogo prenotazione</h3>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span>{hours} ore ({selectedStartTime} - {selectedEndTime})</span>
          <span>€{breakdown.baseAmount.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>Commissione servizio (5%)</span>
          <span>€{breakdown.buyerFeeAmount.toFixed(2)}</span>
        </div>
        {hours >= 8 && space.price_per_day && (
          <div className="text-green-600 text-xs">
            Sconto giornaliero applicato!
          </div>
        )}
      </div>
      <div className="border-t pt-2 mt-2 font-semibold flex justify-between">
        <span>Totale da pagare</span>
        <span>€{breakdown.buyerTotalAmount.toFixed(2)}</span>
      </div>
      
      {/* Host payout information */}
      <div className="mt-2 pt-2 border-t text-xs text-gray-500">
        <div className="flex justify-between">
          <span>L'host riceverà:</span>
          <span>€{breakdown.hostNetPayout.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};
