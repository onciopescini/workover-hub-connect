
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Palette, Layout, Zap, Users } from "lucide-react";
import { toast } from "sonner";

interface UXSettings {
  animationSpeed: number;
  enableSounds: boolean;
  compactMode: boolean;
  autoRefresh: boolean;
  showTooltips: boolean;
  darkMode: boolean;
}

export const NetworkingUXOptimizer = () => {
  const [settings, setSettings] = useState<UXSettings>({
    animationSpeed: 300,
    enableSounds: false,
    compactMode: false,
    autoRefresh: true,
    showTooltips: true,
    darkMode: false
  });

  const [isApplying, setIsApplying] = useState(false);

  const applySettings = async () => {
    setIsApplying(true);
    
    // Simula applicazione delle impostazioni
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Qui normalmente salverebbero in localStorage o database
    localStorage.setItem('networking-ux-settings', JSON.stringify(settings));
    
    setIsApplying(false);
    toast.success("Impostazioni UX applicate!");
  };

  const resetToDefaults = () => {
    setSettings({
      animationSpeed: 300,
      enableSounds: false,
      compactMode: false,
      autoRefresh: true,
      showTooltips: true,
      darkMode: false
    });
    toast.info("Impostazioni ripristinate ai valori predefiniti");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="w-5 h-5" />
          Ottimizzazione UX Networking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Velocità Animazioni */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <label className="font-medium">Velocità Animazioni</label>
            <Badge variant="outline">{settings.animationSpeed}ms</Badge>
          </div>
          <Slider
            value={[settings.animationSpeed]}
            onValueChange={(value) => setSettings(prev => ({ ...prev, animationSpeed: value[0] }))}
            min={100}
            max={1000}
            step={50}
            className="w-full"
          />
          <p className="text-sm text-gray-600">
            Controlla la velocità delle transizioni e animazioni
          </p>
        </div>

        {/* Interruttori UX */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Layout className="w-4 h-4" />
            <span className="font-medium">Opzioni Layout</span>
          </div>
          
          {[
            { 
              key: 'compactMode' as keyof UXSettings, 
              label: 'Modalità Compatta', 
              description: 'Riduce spaziature e dimensioni elementi' 
            },
            { 
              key: 'showTooltips' as keyof UXSettings, 
              label: 'Mostra Tooltip', 
              description: 'Suggerimenti informativi al passaggio del mouse' 
            },
            { 
              key: 'autoRefresh' as keyof UXSettings, 
              label: 'Aggiornamento Automatico', 
              description: 'Aggiorna automaticamente suggerimenti e connessioni' 
            },
            { 
              key: 'enableSounds' as keyof UXSettings, 
              label: 'Suoni Interfaccia', 
              description: 'Feedback audio per azioni importanti' 
            },
            { 
              key: 'darkMode' as keyof UXSettings, 
              label: 'Tema Scuro', 
              description: 'Interfaccia con colori scuri' 
            }
          ].map((option) => (
            <div key={option.key} className="flex items-center justify-between p-3 border rounded">
              <div>
                <p className="font-medium">{option.label}</p>
                <p className="text-sm text-gray-600">{option.description}</p>
              </div>
              <Switch
                checked={settings[option.key] as boolean}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, [option.key]: checked }))
                }
              />
            </div>
          ))}
        </div>

        {/* Anteprima Performance */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-4 h-4 text-blue-600" />
            <span className="font-medium text-blue-800">Anteprima Performance</span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">Velocità UI:</span>
              <span className="ml-2 font-medium">
                {settings.animationSpeed < 200 ? 'Molto Veloce' :
                 settings.animationSpeed < 400 ? 'Veloce' :
                 settings.animationSpeed < 600 ? 'Normale' : 'Lenta'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Modalità:</span>
              <span className="ml-2 font-medium">
                {settings.compactMode ? 'Compatta' : 'Standard'}
              </span>
            </div>
          </div>
        </div>

        {/* Pulsanti Azione */}
        <div className="flex gap-3">
          <Button 
            onClick={applySettings} 
            disabled={isApplying}
            className="flex-1"
          >
            {isApplying ? "Applicando..." : "Applica Impostazioni"}
          </Button>
          <Button 
            onClick={resetToDefaults}
            variant="outline"
          >
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
