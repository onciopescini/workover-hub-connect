
import React from 'react';
import { SpaceCard } from './SpaceCard';
import { Space } from '@/types/space';

interface SpaceCardsGridProps {
  spaces: Space[];
  onSpaceClick: (spaceId: string) => void;
  highlightedId?: string | null;
}

export const SpaceCardsGrid: React.FC<SpaceCardsGridProps> = ({ 
  spaces, 
  onSpaceClick,
  highlightedId 
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
      {spaces.map((space) => (
        <div
          key={space.id}
          className={`transition-all duration-300 ${
            highlightedId === space.id ? 'ring-2 ring-indigo-500 shadow-lg transform scale-105' : ''
          }`}
        >
          <SpaceCard 
            space={space} 
            onClick={() => onSpaceClick(space.id)}
          />
        </div>
      ))}
    </div>
  );
};
