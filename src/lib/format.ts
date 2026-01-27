/**
 * Centralized formatting utilities for Workover Hub Connect
 * 
 * USAGE:
 * import { formatCurrency, formatDate, formatPercentage } from '@/lib/format';
 * 
 * formatCurrency(1234.56)                    // → "€ 1.234,56"
 * formatCurrency(12345, { cents: true })     // → "€ 123,45" (Stripe cents)
 * formatDate('2024-01-15')                   // → "15/01/2024"
 * formatDate('2024-01-15', 'MMMM yyyy')      // → "gennaio 2024"
 * formatPercentage(15)                       // → "15%"
 * formatPercentage(0.15, { decimal: true })  // → "15%"
 */

import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

/**
 * Formats a number as EUR currency using Italian locale.
 * @param amount - The amount to format.
 * @param options.cents - If true, divides amount by 100 (for Stripe cents). Default: false.
 * @returns Formatted currency string (e.g., "€ 1.234,56")
 */
export const formatCurrency = (
  amount: number | null | undefined,
  options?: { cents?: boolean }
): string => {
  if (amount === null || amount === undefined) return '€ 0,00';
  
  const value = options?.cents ? amount / 100 : amount;
  
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

/**
 * Formats a date string or Date object.
 * @param date - The date to format (ISO string, Date object, null, or undefined).
 * @param formatStr - Optional format string (default: 'dd/MM/yyyy').
 * @returns Formatted date string, or '-' if date is invalid/null.
 */
export const formatDate = (
  date: string | Date | null | undefined,
  formatStr: string = 'dd/MM/yyyy'
): string => {
  if (!date) return '-';
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, formatStr, { locale: it });
  } catch {
    return '-';
  }
};

/**
 * Formats a number as percentage.
 * @param value - The value to format (15 → "15%").
 * @param options.decimal - If true, treats value as decimal (0.15 → 15%). Default: false.
 * @returns Formatted percentage string.
 */
export const formatPercentage = (
  value: number | null | undefined,
  options?: { decimal?: boolean }
): string => {
  if (value === null || value === undefined) return '0%';
  
  const percentage = options?.decimal ? value * 100 : value;
  
  return new Intl.NumberFormat('it-IT', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  }).format(percentage / 100);
};

/**
 * Formats a number with thousands separator (Italian locale).
 * @param value - The number to format.
 * @returns Formatted number string (e.g., "1.234.567").
 */
export const formatNumber = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return '0';
  
  return new Intl.NumberFormat('it-IT').format(value);
};
