import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Archive, Bell, Shield, Info } from "lucide-react";
import { useAuth } from "@/hooks/auth/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MessagesSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MessagesSettingsDialog = ({ open, onOpenChange }: MessagesSettingsDialogProps) => {
  const { authState } = useAuth();
  const [networkingNotifications, setNetworkingNotifications] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [isCoworker, setIsCoworker] = useState(false);

  useEffect(() => {
    if (open && authState.user?.id) {
      fetchNotificationSettings();
    }
  }, [open, authState.user?.id]);

  const fetchNotificationSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, networking_enabled')
        .eq('id', authState.user?.id || '')
        .single();

      if (error) throw error;
      
      setIsCoworker(data.role === 'coworker');
      setNetworkingNotifications(data.networking_enabled || false);
    } catch (error) {
      console.error('Error fetching notification settings:', error);
    }
  };

  const handleNotificationToggle = async (enabled: boolean) => {
    if (!authState.user?.id) return;
    
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ networking_enabled: enabled })
        .eq('id', authState.user.id);

      if (error) throw error;
      
      setNetworkingNotifications(enabled);
      toast.success(enabled ? 'Notifiche networking attivate' : 'Notifiche networking disattivate');
    } catch (error) {
      console.error('Error updating notification settings:', error);
      toast.error('Errore nell\'aggiornare le impostazioni');
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchiveConversations = () => {
    toast.info('Funzionalità di archiviazione in sviluppo');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Impostazioni Messaggi
          </DialogTitle>
          <DialogDescription>
            Gestisci le preferenze per notifiche e conversazioni
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Notifiche Networking */}
          {isCoworker && (
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="networking-notifications" className="text-sm font-medium">
                      Notifiche Networking
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Ricevi notifiche per messaggi da altri coworker connessi
                    </p>
                  </div>
                  <Switch
                    id="networking-notifications"
                    checked={networkingNotifications}
                    onCheckedChange={handleNotificationToggle}
                    disabled={isLoading}
                  />
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Gestione Conversazioni */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Archive className="h-4 w-4" />
              Gestione Conversazioni
            </h4>
            
            {isCoworker ? (
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={handleArchiveConversations}
                >
                  <Archive className="h-4 w-4 mr-2" />
                  Archivia Conversazioni
                </Button>
                <p className="text-xs text-muted-foreground">
                  Le conversazioni archiviate non saranno più visibili nella tua lista
                </p>
              </div>
            ) : (
              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex items-start gap-2">
                  <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
                  <div className="text-xs text-blue-700">
                    <p className="font-medium mb-1">Protezione Host</p>
                    <p>Gli host non possono eliminare le conversazioni per garantire la tutela sia dell'host che del coworker.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Info Notifiche Prenotazioni */}
          <div className="bg-amber-50 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-amber-600 mt-0.5" />
              <div className="text-xs text-amber-700">
                <p className="font-medium mb-1">Notifiche Prenotazioni</p>
                <p>Le notifiche per messaggi relativi a prenotazioni e pagamenti sono sempre attive e non possono essere disattivate.</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};