import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface CompactCardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  maxHeight?: string;
}

export const CompactCard: React.FC<CompactCardProps> = ({
  title,
  icon,
  children,
  action,
  className,
  maxHeight
}) => {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="p-4 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            {icon}
            <span>{title}</span>
          </CardTitle>
          {action}
        </div>
      </CardHeader>
      <CardContent 
        className={cn(
          "p-4 pt-0",
          maxHeight && "overflow-auto"
        )}
        style={maxHeight ? { maxHeight } : undefined}
      >
        {children}
      </CardContent>
    </Card>
  );
};
