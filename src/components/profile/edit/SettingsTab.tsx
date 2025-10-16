
import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Mail, FileText } from "lucide-react";
import { ProfileFormData } from "@/hooks/useProfileForm";
import { AuthState } from "@/types/auth";
import { PasswordChangeForm } from "@/components/settings/PasswordChangeForm";
import { DeleteAccountDialog } from "@/components/settings/DeleteAccountDialog";
import { GDPRExportButton } from "@/components/settings/GDPRExportButton";

interface SettingsTabProps {
  formData: ProfileFormData;
  handleInputChange: (field: keyof ProfileFormData, value: string | boolean) => void;
  authState: AuthState;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  formData,
  handleInputChange,
  authState
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Impostazioni Account
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <h3 className="font-medium">Networking Abilitato</h3>
            <p className="text-sm text-gray-600">
              Permetti ad altri utenti di trovarti e connettersi con te
            </p>
          </div>
          <Button
            type="button"
            variant={formData.networking_enabled ? "default" : "outline"}
            onClick={() => handleInputChange('networking_enabled', !formData.networking_enabled)}
          >
            {formData.networking_enabled ? 'Abilitato' : 'Disabilitato'}
          </Button>
        </div>

        <div className="p-4 border rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Mail className="h-4 w-4" />
            <span className="font-medium">Email</span>
            <Badge variant={authState.user?.email_confirmed_at ? "default" : "outline"}>
              {authState.user?.email_confirmed_at ? 'Verificata' : 'Non Verificata'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{authState.user?.email}</p>
          
          {!authState.user?.email_confirmed_at && (
            <p className="text-sm text-amber-600 mt-2">
              Controlla la tua casella email per verificare l'indirizzo
            </p>
          )}
        </div>

        <PasswordChangeForm />

        {authState.profile?.role === 'host' && (
          <div className="p-4 border rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              <span className="font-medium">Stripe Connect</span>
              <Badge variant={authState.profile.stripe_connected ? "default" : "outline"}>
                {authState.profile.stripe_connected ? 'Configurato' : 'Non Configurato'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {authState.profile.stripe_connected 
                ? 'I pagamenti sono configurati correttamente'
                : 'Configura Stripe per ricevere pagamenti'
              }
            </p>
            
            <Link to="/host/fiscal-info">
              <Button variant="outline" size="sm" className="w-full">
                <FileText className="mr-2 h-4 w-4" />
                Gestisci Dati Fiscali
              </Button>
            </Link>
          </div>
        )}

        <GDPRExportButton />

        <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5 space-y-3">
          <h3 className="font-medium text-destructive">Zona Pericolosa</h3>
          <p className="text-sm text-muted-foreground">
            Azioni irreversibili sull'account
          </p>
          <DeleteAccountDialog />
        </div>
      </CardContent>
    </Card>
  );
};
