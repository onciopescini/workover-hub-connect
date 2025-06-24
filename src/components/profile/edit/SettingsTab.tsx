
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Mail } from "lucide-react";
import { ProfileFormData } from "@/hooks/useProfileForm";
import { AuthState } from "@/types/auth";

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
            <Mail className="h-4 w-4 text-green-600" />
            <span className="font-medium">Email Verificata</span>
            <Badge variant="secondary">Verificato</Badge>
          </div>
          <p className="text-sm text-gray-600">{authState.user?.email}</p>
        </div>

        {authState.profile?.role === 'host' && (
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="h-4 w-4 text-blue-600" />
              <span className="font-medium">Stripe Connect</span>
              <Badge variant={authState.profile.stripe_connected ? "default" : "outline"}>
                {authState.profile.stripe_connected ? 'Configurato' : 'Non Configurato'}
              </Badge>
            </div>
            <p className="text-sm text-gray-600">
              {authState.profile.stripe_connected 
                ? 'I pagamenti sono configurati correttamente'
                : 'Configura Stripe per ricevere pagamenti'
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
