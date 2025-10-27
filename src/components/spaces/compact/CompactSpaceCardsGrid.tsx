import React from 'react';
import { CompactSpaceCard } from './CompactSpaceCard';
import { Space } from '@/types/space';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CompactSpaceCardsGridProps {
  spaces: Space[];
  onSpaceClick: (spaceId: string) => void;
  highlightedId?: string | null;
  isLoading?: boolean;
  onScrollToCard?: (spaceId: string) => void;
  selectedDate?: Date | null;
}

export const CompactSpaceCardsGrid: React.FC<CompactSpaceCardsGridProps> = ({
  spaces,
  onSpaceClick,
  highlightedId,
  isLoading = false,
  onScrollToCard,
  selectedDate = null
}) => {
  const cardRefs = React.useRef<{ [key: string]: HTMLDivElement | null }>({});
  
  // Adaptive card sizing based on number of spaces
  const cardSize: 'compact' | 'standard' | 'comfortable' = 
    spaces.length > 10 ? 'compact' : 
    spaces.length > 5 ? 'standard' : 
    'comfortable';

  // Dynamic skeleton height based on adaptive size
  const skeletonHeight = 
    spaces.length > 10 ? 'h-[110px]' :
    spaces.length > 5 ? 'h-[140px]' :
    'h-[180px]';

  // Auto-scroll to highlighted card
  React.useEffect(() => {
    if (highlightedId && cardRefs.current[highlightedId]) {
      cardRefs.current[highlightedId]?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
    }
  }, [highlightedId]);
  
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className={`${skeletonHeight} w-full rounded-lg`} />
        ))}
      </div>
    );
  }

  if (!spaces || spaces.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="space-y-2">
          <p>Nessuno spazio trovato con i filtri selezionati.</p>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Prova ad ampliare l'area di ricerca</p>
            <p>• Rimuovi alcuni filtri per vedere più risultati</p>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      {spaces.map((space) => (
        <div 
          key={space.id}
          ref={(el) => { cardRefs.current[space.id] = el; }}
        >
            <CompactSpaceCard
              space={space}
              onClick={() => onSpaceClick(space.id)}
              isHighlighted={highlightedId === space.id}
              size={cardSize}
              selectedDate={selectedDate}
            />
        </div>
      ))}
    </div>
  );
};
