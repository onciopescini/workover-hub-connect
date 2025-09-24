import React from 'react';
import { NetworkingPreferences } from "@/components/settings/NetworkingPreferences";

const NetworkingSettings = () => {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Impostazioni Networking</h1>
          <p className="text-muted-foreground">
            Gestisci le tue preferenze di networking e collaborazione
          </p>
        </div>
        <NetworkingPreferences />
      </div>
    </div>
  );
};

export default NetworkingSettings;