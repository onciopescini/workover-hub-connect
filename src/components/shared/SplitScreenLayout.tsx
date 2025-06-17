
import React from 'react';

interface SplitScreenLayoutProps {
  filters: React.ReactNode;
  map: React.ReactNode;
  cards: React.ReactNode;
}

export const SplitScreenLayout: React.FC<SplitScreenLayoutProps> = ({
  filters,
  map,
  cards
}) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-full mx-auto">
        {/* Filtri in alto a tutta larghezza */}
        <div className="bg-white border-b border-gray-200 p-4">
          {filters}
        </div>

        {/* Layout split-screen */}
        <div className="flex flex-col lg:flex-row h-[calc(100vh-140px)]">
          {/* Mappa a sinistra */}
          <div className="lg:w-1/2 h-64 lg:h-full">
            {map}
          </div>

          {/* Cards a destra */}
          <div className="lg:w-1/2 h-full overflow-hidden">
            <div className="h-full overflow-y-auto p-4">
              {cards}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
