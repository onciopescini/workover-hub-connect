
import { formatRelativeDate, formatAbsoluteDate } from '@/lib/date-time/formatting';

interface DateFormatterProps {
  date: string | Date;
  format?: 'relative' | 'absolute';
  includeTime?: boolean;
  className?: string;
}

export function DateFormatter({ 
  date, 
  format = 'relative', 
  includeTime = false,
  className = "text-sm text-gray-500"
}: DateFormatterProps) {
  const formattedDate = format === 'relative' 
    ? formatRelativeDate(date)
    : formatAbsoluteDate(date, { includeTime });

  return <span className={className}>{formattedDate}</span>;
}
