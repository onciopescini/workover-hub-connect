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
}

export const CompactSpaceCardsGrid: React.FC<CompactSpaceCardsGridProps> = ({
  spaces,
  onSpaceClick,
  highlightedId,
  isLoading = false
}) => {
  
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-[110px] w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (!spaces || spaces.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Nessuno spazio trovato con i filtri selezionati. Prova a modificare i criteri di ricerca.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      {spaces.map((space) => (
        <CompactSpaceCard
          key={space.id}
          space={space}
          onClick={() => onSpaceClick(space.id)}
          isHighlighted={highlightedId === space.id}
        />
      ))}
    </div>
  );
};
