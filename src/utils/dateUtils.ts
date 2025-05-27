
import { formatDistanceToNow, format, Locale } from 'date-fns';
import { it } from 'date-fns/locale';

export interface DateFormatOptions {
  locale?: Locale;
  addSuffix?: boolean;
  includeTime?: boolean;
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
