
import React from 'react';
import { Button } from "@/components/ui/button";
import { Plus, Settings } from "lucide-react";

interface MessagesPageHeaderProps {
  onNewChat?: () => void;
  onSettings?: () => void;
}

export const MessagesPageHeader = ({ onNewChat, onSettings }: MessagesPageHeaderProps) => {
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Centro Messaggi</h1>
          <p className="text-muted-foreground">
            Gestisci tutte le tue conversazioni di prenotazioni e networking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={onSettings}>
            <Settings className="h-4 w-4" />
          </Button>
          <Button onClick={onNewChat}>
            <Plus className="h-4 w-4 mr-2" />
            Nuova Chat
          </Button>
        </div>
      </div>
    </div>
  );
};
