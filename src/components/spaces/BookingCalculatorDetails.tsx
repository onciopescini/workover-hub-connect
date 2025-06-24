
import React from 'react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Euro } from 'lucide-react';
import { BookingDetails } from '@/lib/booking-calculator-utils';

interface BookingCalculatorDetailsProps {
  bookingDetails: BookingDetails;
}

export const BookingCalculatorDetails: React.FC<BookingCalculatorDetailsProps> = ({
  bookingDetails
}) => {
  return (
    <>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Data:</span>
          <span className="font-medium">{bookingDetails.date}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Orario:</span>
          <span className="font-medium">{bookingDetails.timeRange}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Durata:</span>
          <span className="font-medium">{bookingDetails.duration}h</span>
        </div>
      </div>

      <Separator />

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">{bookingDetails.priceBreakdown}:</span>
          <span className="font-medium">€{bookingDetails.totalCost}</span>
        </div>
        
        <div className="flex justify-between text-lg font-semibold">
          <span>Totale:</span>
          <div className="flex items-center">
            <Euro className="h-4 w-4 mr-1" />
            <span>€{bookingDetails.totalCost}</span>
          </div>
        </div>
      </div>

      {/* Validation success */}
      {bookingDetails.isValid && (
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            💡 Prezzo finale confermato al checkout
          </span>
          {bookingDetails.validationStatus === 'server-validated' && (
            <Badge variant="outline" className="text-xs h-4 text-green-600 border-green-200">
              Verificato server
            </Badge>
          )}
        </div>
      )}
    </>
  );
};
