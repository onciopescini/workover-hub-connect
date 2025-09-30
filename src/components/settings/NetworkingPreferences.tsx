import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Users, 
  Shield, 
  Eye, 
  MessageCircle, 
  UserCheck,
  Info,
  Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth/useAuth";
import { toast } from "sonner";
import { sreLogger } from '@/lib/sre-logger';

interface NetworkingSettings {
  networking_enabled: boolean;
  collaboration_availability: 'available' | 'limited' | 'not_available';
  collaboration_types: string[];
  preferred_work_mode: 'remoto' | 'presenza' | 'flessibile';
}

export function NetworkingPreferences() {
  const { authState } = useAuth();
  const [settings, setSettings] = useState<NetworkingSettings>({
    networking_enabled: true,
    collaboration_availability: 'available',
    collaboration_types: [],
    preferred_work_mode: 'flessibile'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (authState.user) {
      fetchNetworkingSettings();
    }
  }, [authState.user]);

  const fetchNetworkingSettings = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          networking_enabled,
          collaboration_availability,
          collaboration_types,
          preferred_work_mode
        `)
        .eq('id', authState.user?.id || '')
        .single();

      if (error) throw error;

      if (data) {
        setSettings({
          networking_enabled: data.networking_enabled ?? true,
          collaboration_availability: (data.collaboration_availability as 'available' | 'limited' | 'not_available') || 'available',
          collaboration_types: data.collaboration_types || [],
          preferred_work_mode: (data.preferred_work_mode as 'remoto' | 'presenza' | 'flessibile') || 'flessibile'
        });
      }
    } catch (error) {
      sreLogger.error('Error fetching networking settings', { userId: authState.user?.id }, error as Error);
      toast.error('Errore nel caricamento delle impostazioni');
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    try {
      setIsSaving(true);
      const { error } = await supabase
        .from('profiles')
        .update({
          networking_enabled: settings.networking_enabled,
          collaboration_availability: settings.collaboration_availability,
          collaboration_types: settings.collaboration_types,
          preferred_work_mode: settings.preferred_work_mode
        })
        .eq('id', authState.user?.id || '');

      if (error) throw error;

      setHasChanges(false);
      toast.success('Impostazioni salvate con successo!');
    } catch (error) {
      sreLogger.error('Error saving settings', { userId: authState.user?.id }, error as Error);
      toast.error('Errore nel salvataggio delle impostazioni');
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = <K extends keyof NetworkingSettings>(
    key: K, 
    value: NetworkingSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const collaborationOptions = [
    { value: 'progetti', label: 'Progetti collaborativi' },
    { value: 'mentoring', label: 'Mentoring / Coaching' },
    { value: 'networking', label: 'Eventi di networking' },
    { value: 'skill_sharing', label: 'Condivisione competenze' },
    { value: 'business', label: 'Opportunità di business' },
    { value: 'freelance', label: 'Collaborazioni freelance' }
  ];

  const workModeOptions = [
    { value: 'remoto', label: 'Solo remoto', description: 'Preferisco lavorare sempre da remoto' },
    { value: 'presenza', label: 'Solo in presenza', description: 'Preferisco lavorare sempre in spazi fisici' },
    { value: 'flessibile', label: 'Modalità flessibile', description: 'Sono aperto/a a entrambe le modalità' }
  ];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Preferenze di Networking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Preferenze di Networking
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Gestisci come appari agli altri coworker e le tue preferenze di collaborazione
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Main Networking Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <Label htmlFor="networking-enabled" className="font-medium">
                  Abilita Networking
                </Label>
              </div>
              <p className="text-sm text-muted-foreground">
                Permetti ad altri coworker di trovarti e connettersi con te
              </p>
            </div>
            <Switch
              id="networking-enabled"
              checked={settings.networking_enabled}
              onCheckedChange={(checked) => updateSetting('networking_enabled', checked)}
            />
          </div>

          {!settings.networking_enabled && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Con il networking disabilitato, non sarai visibile negli suggerimenti di connessione 
                e altri coworker non potranno trovarti nei widget "Chi lavora qui".
              </AlertDescription>
            </Alert>
          )}

          {settings.networking_enabled && (
            <>
              <Separator />
              
              {/* Collaboration Availability */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  <Label className="font-medium">Disponibilità per Collaborazioni</Label>
                </div>
                
                <div className="grid gap-3">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="available"
                      name="collaboration"
                      value="available"
                      checked={settings.collaboration_availability === 'available'}
                      onChange={(e) => updateSetting('collaboration_availability', e.target.value as any)}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="available" className="flex-1 cursor-pointer">
                      <div>
                        <p className="font-medium">Disponibile</p>
                        <p className="text-sm text-muted-foreground">
                          Sono attivamente alla ricerca di collaborazioni
                        </p>
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="limited"
                      name="collaboration"
                      value="limited"
                      checked={settings.collaboration_availability === 'limited'}
                      onChange={(e) => updateSetting('collaboration_availability', e.target.value as any)}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="limited" className="flex-1 cursor-pointer">
                      <div>
                        <p className="font-medium">Limitata</p>
                        <p className="text-sm text-muted-foreground">
                          Valuto collaborazioni caso per caso
                        </p>
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="not_available"
                      name="collaboration"
                      value="not_available"
                      checked={settings.collaboration_availability === 'not_available'}
                      onChange={(e) => updateSetting('collaboration_availability', e.target.value as any)}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="not_available" className="flex-1 cursor-pointer">
                      <div>
                        <p className="font-medium">Non disponibile</p>
                        <p className="text-sm text-muted-foreground">
                          Non sono interessato/a a collaborazioni al momento
                        </p>
                      </div>
                    </Label>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Collaboration Types */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  <Label className="font-medium">Tipi di Collaborazione</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Seleziona i tipi di collaborazione che ti interessano
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {collaborationOptions.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={option.value}
                        checked={settings.collaboration_types.includes(option.value)}
                        onChange={(e) => {
                          const types = e.target.checked
                            ? [...settings.collaboration_types, option.value]
                            : settings.collaboration_types.filter(t => t !== option.value);
                          updateSetting('collaboration_types', types);
                        }}
                        className="w-4 h-4"
                      />
                      <Label htmlFor={option.value} className="cursor-pointer">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Work Mode Preference */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  <Label className="font-medium">Modalità di Lavoro Preferita</Label>
                </div>
                
                <div className="grid gap-3">
                  {workModeOptions.map((option) => (
                    <div key={option.value} className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id={option.value}
                        name="work_mode"
                        value={option.value}
                        checked={settings.preferred_work_mode === option.value}
                        onChange={(e) => updateSetting('preferred_work_mode', e.target.value as any)}
                        className="w-4 h-4"
                      />
                      <Label htmlFor={option.value} className="flex-1 cursor-pointer">
                        <div>
                          <p className="font-medium">{option.label}</p>
                          <p className="text-sm text-muted-foreground">
                            {option.description}
                          </p>
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Save Button */}
          {hasChanges && (
            <div className="flex justify-end pt-4">
              <Button onClick={saveSettings} disabled={isSaving}>
                {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salva Impostazioni
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}