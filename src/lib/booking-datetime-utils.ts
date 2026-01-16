import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { createBookingDateTime, formatUtcDateForDisplay, nowUtc, parseBookingDateTime } from './date-time';

/**
 * Utility functions specifically for booking date/time operations
 */

/**
 * Creates a UTC date for a booking slot reservation expiry
 * @param minutesFromNow Minutes from current time (defaults to 15)
 * @returns UTC Date object
 */
export function createSlotReservationExpiry(minutesFromNow: number = 15): Date {
  const now = new Date();
  return new Date(now.getTime() + minutesFromNow * 60 * 1000);
}

/**
 * Formats booking time slots for display
 * @param date Date string (YYYY-MM-DD)
 * @param startTime Time string (HH:mm)  
 * @param endTime Time string (HH:mm)
 * @returns Formatted booking slot string
 */
export function formatBookingSlot(date: string, startTime: string, endTime: string): string {
  const formattedDate = format(new Date(date), 'dd MMM yyyy', { locale: it });
  return `${formattedDate} • ${startTime} - ${endTime}`;
}

/**
 * Creates the proper datetime string for booking database operations
 * @param bookingDate Date string (YYYY-MM-DD)
 * @param startTime Time string (HH:mm)
 * @returns UTC ISO string for database storage
 */
export function createBookingDateTimeForDb(bookingDate: string, startTime: string): string {
  const utcDate = createBookingDateTime(bookingDate, startTime);
  return utcDate.toISOString();
}

/**
 * Validates if a booking time is in the future (for cancellation logic)
 * @param bookingDate Date string (YYYY-MM-DD)
 * @param startTime Time string (HH:mm)
 * @param bufferMinutes Minutes before booking where cancellation is not allowed
 * @returns true if cancellation is allowed
 */
export function canCancelBooking(
  bookingDate: string | null | undefined, 
  startTime: string | null | undefined,
  bufferMinutes: number = 60
): boolean {
  if (!bookingDate || !startTime) return false;
  
  const parsed = parseBookingDateTime(bookingDate, startTime);
  if (!parsed.isValid || !parsed.utcDate) return false;
  
  // Add buffer time before booking starts
  const bufferTime = new Date(parsed.utcDate.getTime() - bufferMinutes * 60 * 1000);
  const now = new Date();
  
  return now < bufferTime;
}

/**
 * Gets the current UTC time for database operations
 * @returns Current UTC time as ISO string
 */
export function getCurrentUtcTime(): string {
  return nowUtc();
}

/**
 * Checks if a slot reservation has expired
 * @param reservedUntil UTC timestamp string
 * @returns true if the reservation has expired
 */
export function isSlotReservationExpired(reservedUntil: string | null | undefined): boolean {
  if (!reservedUntil) return true;
  
  try {
    const expiryTime = new Date(reservedUntil);
    const now = new Date();
    return now > expiryTime;
  } catch {
    return true; // Treat invalid dates as expired
  }
}

/**
 * Formats a UTC slot reservation expiry time for display
 * @param reservedUntil UTC timestamp string
 * @returns Formatted expiry time string
 */
export function formatSlotExpiry(reservedUntil: string): string {
  return formatUtcDateForDisplay(reservedUntil, 'HH:mm');
}