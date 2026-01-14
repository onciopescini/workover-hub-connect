import { format, parseISO, formatDistanceToNow, Locale } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { it } from 'date-fns/locale';

// Default timezone for the application (Italy)
export const DEFAULT_TIMEZONE = 'Europe/Rome';

export interface DateFormatOptions {
  locale?: Locale;
  addSuffix?: boolean;
  includeTime?: boolean;
}

/**
 * Converts a UTC date to local timezone for display
 * @param utcDate UTC date string or Date object
 * @param timezone Target timezone (defaults to Europe/Rome)
 * @returns Date object in the target timezone
 */
export function utcToLocal(utcDate: string | Date, timezone: string = DEFAULT_TIMEZONE): Date {
  const date = typeof utcDate === 'string' ? parseISO(utcDate) : utcDate;
  return toZonedTime(date, timezone);
}

/**
 * Converts a local date to UTC for database storage
 * @param localDate Local date
 * @param timezone Source timezone (defaults to Europe/Rome)
 * @returns UTC Date object
 */
export function localToUtc(localDate: Date, timezone: string = DEFAULT_TIMEZONE): Date {
  return fromZonedTime(localDate, timezone);
}

/**
 * Creates a UTC ISO string for database storage
 * @param date Date to convert (if not provided, uses current time)
 * @returns UTC ISO string
 */
export function createUtcIsoString(date?: Date): string {
  return (date || new Date()).toISOString();
}

/**
 * Creates a local date from date and time strings
 * @param dateString Date string (YYYY-MM-DD)
 * @param timeString Time string (HH:mm)
 * @param timezone Timezone (defaults to Europe/Rome)
 * @returns UTC Date object for database storage
 */
export function createDateFromLocalDateTime(
  dateString: string, 
  timeString: string, 
  timezone: string = DEFAULT_TIMEZONE
): Date {
  const localDateTime = parseISO(`${dateString}T${timeString}`);
  return localToUtc(localDateTime, timezone);
}

/**
 * Formats a UTC date for display in local timezone
 * @param utcDate UTC date string or Date object
 * @param formatPattern Format pattern for date-fns
 * @param timezone Target timezone (defaults to Europe/Rome)
 * @returns Formatted date string
 */
export function formatUtcDateForDisplay(
  utcDate: string | Date,
  formatPattern: string = 'dd/MM/yyyy HH:mm',
  timezone: string = DEFAULT_TIMEZONE
): string {
  const localDate = utcToLocal(utcDate, timezone);
  return format(localDate, formatPattern, { locale: it });
}

/**
 * Formats a date for calendar/booking display
 * @param utcDate UTC date string or Date object
 * @param timezone Target timezone (defaults to Europe/Rome)
 * @returns Object with formatted date and time components
 */
export function formatBookingDateTime(utcDate: string | Date, timezone: string = DEFAULT_TIMEZONE) {
  const localDate = utcToLocal(utcDate, timezone);
  
  return {
    date: format(localDate, 'dd/MM/yyyy', { locale: it }),
    time: format(localDate, 'HH:mm', { locale: it }),
    dayName: format(localDate, 'EEEE', { locale: it }),
    shortDate: format(localDate, 'dd MMM', { locale: it }),
    fullDateTime: format(localDate, 'EEEE dd MMMM yyyy - HH:mm', { locale: it })
  };
}

/**
 * Checks if a UTC date is before current time (useful for cancellation logic)
 * @param utcDate UTC date string or Date object
 * @param timezone Timezone to compare in (defaults to Europe/Rome)
 * @returns true if the date is in the past
 */
export function isDateInPast(utcDate: string | Date, timezone: string = DEFAULT_TIMEZONE): boolean {
  const localDate = utcToLocal(utcDate, timezone);
  const nowLocal = utcToLocal(new Date(), timezone);
  return localDate < nowLocal;
}

/**
 * Creates a booking datetime from separate date and time components
 * @param bookingDate Date string (YYYY-MM-DD) 
 * @param startTime Time string (HH:mm)
 * @param timezone Source timezone (defaults to Europe/Rome)
 * @returns UTC Date object
 */
export function createBookingDateTime(
  bookingDate: string,
  startTime: string,
  timezone: string = DEFAULT_TIMEZONE
): Date {
  // Combine date and time into a local datetime
  const localDateTime = `${bookingDate}T${startTime}:00`;
  const localDate = parseISO(localDateTime);
  
  // Convert to UTC for database storage
  return localToUtc(localDate, timezone);
}

/**
 * Gets the current time in UTC as ISO string
 * @returns Current UTC time as ISO string
 */
export function nowUtc(): string {
  return new Date().toISOString();
}

/**
 * Gets the current time in local timezone
 * @param timezone Target timezone (defaults to Europe/Rome)
 * @returns Current time in target timezone
 */
export function nowLocal(timezone: string = DEFAULT_TIMEZONE): Date {
  return utcToLocal(new Date(), timezone);
}

/**
 * Parses a booking date/time combination safely
 * @param bookingDate Date string (YYYY-MM-DD)
 * @param startTime Time string (HH:mm)
 * @param timezone Source timezone (defaults to Europe/Rome)
 * @returns Object with UTC date, local date, and validation status
 */
export function parseBookingDateTime(
  bookingDate: string | null | undefined,
  startTime: string | null | undefined,
  timezone: string = DEFAULT_TIMEZONE
) {
  if (!bookingDate || !startTime) {
    return {
      utcDate: null,
      localDate: null,
      isValid: false,
      error: 'Missing booking date or start time'
    };
  }

  try {
    const utcDate = createBookingDateTime(bookingDate, startTime, timezone);
    const localDate = utcToLocal(utcDate, timezone);

    if (isNaN(utcDate.getTime())) {
      return {
        utcDate: null,
        localDate: null,
        isValid: false,
        error: 'Invalid date/time combination'
      };
    }

    return {
      utcDate,
      localDate,
      isValid: true,
      error: null
    };
  } catch (error) {
    return {
      utcDate: null,
      localDate: null,
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error'
    };
  }
}

/**
 * Formats a date relative to now (e.g., "2 hours ago")
 * @param date Date string or object
 * @param options Format options
 * @returns Formatted string
 */
export function formatRelativeDate(
  date: string | Date,
  options: DateFormatOptions = {}
): string {
  const { locale = it, addSuffix = true } = options;

  return formatDistanceToNow(typeof date === 'string' ? parseISO(date) : date, {
    addSuffix,
    locale
  });
}

/**
 * Formats a date absolutely (e.g., "dd/MM/yyyy")
 * @param date Date string or object
 * @param options Format options
 * @returns Formatted string
 */
export function formatAbsoluteDate(
  date: string | Date,
  options: DateFormatOptions = {}
): string {
  const { locale = it, includeTime = false } = options;

  const formatString = includeTime ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy';

  return format(typeof date === 'string' ? parseISO(date) : date, formatString, { locale });
}

/**
 * Formats a date for booking display (shorthand for formatAbsoluteDate without time)
 * @param date Date string or object
 * @returns Formatted string
 */
export function formatBookingDate(date: string | Date): string {
  return formatAbsoluteDate(date, { includeTime: false });
}

/**
 * Formats a time for message display (shorthand for formatRelativeDate)
 * @param date Date string or object
 * @returns Formatted string
 */
export function formatMessageTime(date: string | Date): string {
  return formatRelativeDate(date, { addSuffix: true });
}
