
import { differenceInHours, format } from 'date-fns';
import { Space } from '@/types/space';

export interface BookingDetails {
  date: string;
  timeRange: string;
  duration: number;
  priceBreakdown: string;
  totalCost: number;
  isValid: boolean;
  validationStatus: 'server-validated' | 'client-checked';
}

export interface TwoStepBookingPricing {
  basePrice: number;
  isDayRate: boolean;
  breakdown: string;
}

export const calculateTwoStepBookingPrice = (
  durationHours: number,
  pricePerHour: number,
  pricePerDay: number
): TwoStepBookingPricing => {
  const isDayRate = durationHours >= 8;
  const basePrice = isDayRate ? pricePerDay : durationHours * pricePerHour;
  const breakdown = isDayRate 
    ? `Tariffa giornaliera (${durationHours}h)`
    : `${durationHours}h × €${pricePerHour}/h`;

  return {
    basePrice,
    isDayRate,
    breakdown
  };
};

export const calculateBookingDetails = (
  selectedDate: Date,
  selectedStartTime: string,
  selectedEndTime: string,
  space: Space,
  conflictCheck: { hasConflict: boolean; validated?: boolean },
  isOnline: boolean
): BookingDetails | null => {
  const startDateTime = new Date(`${selectedDate.toISOString().split('T')[0]}T${selectedStartTime}:00`);
  const endDateTime = new Date(`${selectedDate.toISOString().split('T')[0]}T${selectedEndTime}:00`);
  
  const hours = differenceInHours(endDateTime, startDateTime);
  
  // Enhanced price calculation using the new function
  const pricing = calculateTwoStepBookingPrice(hours, space.price_per_hour, space.price_per_day || 0);

  // Validation status
  const isValid = hours > 0 && 
                 !conflictCheck.hasConflict && 
                 isOnline &&
                 (conflictCheck.validated !== false);

  return {
    date: format(selectedDate, 'dd/MM/yyyy'),
    timeRange: `${selectedStartTime} - ${selectedEndTime}`,
    duration: hours,
    priceBreakdown: pricing.breakdown,
    totalCost: pricing.basePrice,
    isValid,
    validationStatus: conflictCheck.validated ? 'server-validated' : 'client-checked'
  };
};

// Helper function for CSS classes
export const cn = (...classes: (string | undefined | boolean)[]): string => {
  return classes.filter(Boolean).join(' ');
};
