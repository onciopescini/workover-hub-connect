
import { Card, CardContent } from '@/components/ui/card';

interface LoadingCardProps {
  rows?: number;
  className?: string;
}

export function LoadingCard({ rows = 3, className }: LoadingCardProps) {
  return (
    <Card className={className}>
      <CardContent className="p-6">
        <div className="animate-pulse space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <div 
              key={i} 
              className={`h-4 bg-gray-200 rounded ${
                i === 0 ? 'w-3/4' : i === rows - 1 ? 'w-1/2' : 'w-full'
              }`}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
