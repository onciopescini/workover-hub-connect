import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface NotificationPreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationPreferencesDialog({
  open,
  onOpenChange,
}: NotificationPreferencesDialogProps) {
  const { preferences, isLoading, updatePreference, notificationTypes } =
    useNotificationPreferences();

  const getPreference = (type: string) => {
    return preferences.find(p => p.notification_type === type);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Preferenze Notifiche</DialogTitle>
          <DialogDescription>
            Gestisci come e quando ricevere le notifiche
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Caricamento...
            </div>
          ) : (
            <div className="space-y-6">
              {notificationTypes.map((notifType) => {
                const pref = getPreference(notifType.type);
                const enabled = pref?.enabled ?? true;
                const channel = pref?.channel ?? 'in_app';

                return (
                  <div key={notifType.type} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-base font-medium">
                          {notifType.label}
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {notifType.description}
                        </p>
                      </div>
                      <Switch
                        checked={enabled}
                        onCheckedChange={(checked) =>
                          updatePreference(notifType.type, { enabled: checked })
                        }
                      />
                    </div>

                    {enabled && (
                      <div className="pl-4 space-y-2">
                        <Label className="text-sm text-muted-foreground">
                          Canale di notifica:
                        </Label>
                        <RadioGroup
                          value={channel}
                          onValueChange={(value) =>
                            updatePreference(notifType.type, {
                              channel: value as 'in_app' | 'email' | 'both'
                            })
                          }
                        >
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="in_app" id={`${notifType.type}-in_app`} />
                            <Label htmlFor={`${notifType.type}-in_app`} className="font-normal cursor-pointer">
                              Solo nell'app
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="email" id={`${notifType.type}-email`} />
                            <Label htmlFor={`${notifType.type}-email`} className="font-normal cursor-pointer">
                              Solo via email
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="both" id={`${notifType.type}-both`} />
                            <Label htmlFor={`${notifType.type}-both`} className="font-normal cursor-pointer">
                              Entrambi
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>
                    )}
                    <Separator />
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
