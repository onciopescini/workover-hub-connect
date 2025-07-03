import React from 'react';
import { EnhancedNetworkingStats } from '@/types/networking-dashboard';

interface NetworkingHeroSectionProps {
  stats: EnhancedNetworkingStats;
}

export const NetworkingHeroSection = React.memo<NetworkingHeroSectionProps>(({ stats }) => {
  return (
    <div className="bg-gradient-to-r from-primary to-purple-600 rounded-lg p-6 text-white">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2">Il tuo Network Professionale</h1>
          <p className="text-primary-foreground/80">
            Espandi le tue connessioni e crea opportunità di business
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold">{stats.totalConnections}</div>
          <div className="text-primary-foreground/70">Connessioni Attive</div>
        </div>
      </div>
    </div>
  );
});

NetworkingHeroSection.displayName = 'NetworkingHeroSection';