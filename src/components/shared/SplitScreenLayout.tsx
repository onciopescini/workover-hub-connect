
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
    <div className="min-h-screen bg-background">
      <div className="max-w-full mx-auto">
        {/* Filtri in alto a tutta larghezza */}
        <div className="bg-card border-b border-border p-4 shadow-sm">
          {filters}
        </div>

        {/* Layout split-screen ottimizzato */}
        <div className="flex flex-col xl:flex-row">
          {/* Mappa a sinistra - altezza fissa per mobile, dinamica per desktop */}
          <div className="xl:w-1/2 h-[420px] xl:h-[calc(100vh-140px)] xl:min-h-[600px] relative">
            <div className="absolute inset-0 bg-muted/10">
              {map}
            </div>
          </div>

          {/* Cards a destra - scroll indipendente */}
          <div className="xl:w-1/2 min-h-[600px] xl:h-[calc(100vh-140px)] flex flex-col">
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 pb-8">
                {cards}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
