import { formatDistanceToNow, format, Locale } from 'date-fns';
import { it } from 'date-fns/locale';
import { utcToLocal, DEFAULT_TIMEZONE } from './calculations';

export interface DateFormatOptions {
  locale?: Locale;
  addSuffix?: boolean;
  includeTime?: boolean;
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

export function formatRelativeDate(
  date: string | Date,
  options: DateFormatOptions = {}
): string {
  const { locale = it, addSuffix = true } = options;

  return formatDistanceToNow(new Date(date), {
    addSuffix,
    locale
  });
}

export function formatAbsoluteDate(
  date: string | Date,
  options: DateFormatOptions = {}
): string {
  const { locale = it, includeTime = false } = options;

  const formatString = includeTime ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy';

  return format(new Date(date), formatString, { locale });
}

export function formatBookingDate(date: string | Date): string {
  return formatAbsoluteDate(date, { includeTime: false });
}

export function formatMessageTime(date: string | Date): string {
  return formatRelativeDate(date, { addSuffix: true });
}
