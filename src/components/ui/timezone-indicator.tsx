import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";
import { DEFAULT_TIMEZONE } from "@/lib/date-time/calculations";
import { formatUtcDateForDisplay } from "@/lib/date-time/formatting";

interface TimezoneIndicatorProps {
  className?: string;
  showLabel?: boolean;
}

export function TimezoneIndicator({ className = "", showLabel = true }: TimezoneIndicatorProps) {
  const currentTime = formatUtcDateForDisplay(new Date(), 'HH:mm');
  
  return (
    <Badge variant="outline" className={`text-xs ${className}`}>
      <Clock className="w-3 h-3 mr-1" />
      {showLabel && "IT "}{currentTime}
    </Badge>
  );
}

interface UtcTimestampProps {
  utcDate: string | Date;
  format?: string;
  timezone?: string;
  className?: string;
}

export function UtcTimestamp({ 
  utcDate, 
  format: formatPattern = 'dd/MM/yyyy HH:mm',
  timezone = DEFAULT_TIMEZONE,
  className = ""
}: UtcTimestampProps) {
  const formatted = formatUtcDateForDisplay(utcDate, formatPattern, timezone);
  
  return (
    <span className={className} title={`UTC: ${new Date(utcDate).toISOString()}`}>
      {formatted}
    </span>
  );
}