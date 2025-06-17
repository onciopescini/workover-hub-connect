
import React from 'react';
import { SpaceCard } from './SpaceCard';
import { Space } from '@/types/space';

interface SpaceCardsGridProps {
  spaces: Space[];
  onSpaceClick: (spaceId: string) => void;
  highlightedId: string | null;
}

export const SpaceCardsGrid: React.FC<SpaceCardsGridProps> = ({
  spaces,
  onSpaceClick,
  highlightedId
}) => {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {spaces.map((space) => (
        <div
          key={space.id}
          className={`transition-all duration-200 ${
            highlightedId === space.id 
              ? 'ring-2 ring-indigo-500 ring-opacity-50 shadow-lg scale-105' 
              : ''
          }`}
        >
          <SpaceCard 
            space={space} 
            onClick={() => onSpaceClick(space.id)}
          />
        </div>
      ))}
      {spaces.length === 0 && (
        <div className="col-span-full text-center py-12">
          <p className="text-gray-500">Nessuno spazio trovato con i filtri selezionati.</p>
        </div>
      )}
    </div>
  );
};
