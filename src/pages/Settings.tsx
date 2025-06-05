
import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Shield, FileText, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const Settings = () => {
  const { authState } = useAuth();
  const navigate = useNavigate();

  return (
    <AppLayout
      title="Impostazioni Account"
      subtitle="Gestisci le tue preferenze e informazioni personali"
    >
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Profile Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Informazioni Profilo</CardTitle>
              <CardDescription>
                Aggiorna le tue informazioni personali
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={authState.user?.email || ""}
                  disabled
                  className="bg-gray-50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstName">Nome</Label>
                <Input
                  id="firstName"
                  placeholder="Il tuo nome"
                  value={authState.profile?.first_name || ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Cognome</Label>
                <Input
                  id="lastName"
                  placeholder="Il tuo cognome"
                  value={authState.profile?.last_name || ""}
                />
              </div>
              <Button className="w-full">Salva Modifiche</Button>
            </CardContent>
          </Card>

          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Sicurezza</CardTitle>
              <CardDescription>
                Gestisci password e sicurezza dell'account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Password Attuale</Label>
                <Input id="currentPassword" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Nuova Password</Label>
                <Input id="newPassword" type="password" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Conferma Password</Label>
                <Input id="confirmPassword" type="password" />
              </div>
              <Button variant="outline" className="w-full">
                Cambia Password
              </Button>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Privacy & GDPR Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Privacy e Protezione Dati
            </CardTitle>
            <CardDescription>
              Gestisci i tuoi diritti privacy e conformità GDPR
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Centro Privacy</p>
                  <p className="text-sm text-gray-600">
                    Esporta i tuoi dati, richiedi cancellazione account
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/privacy-center')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Gestisci
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Cronologia Privacy</p>
                  <p className="text-sm text-gray-600">
                    Visualizza le tue richieste GDPR precedenti
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/privacy-center')}>
                  <Clock className="h-4 w-4 mr-2" />
                  Visualizza
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notification Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Preferenze Notifiche</CardTitle>
            <CardDescription>
              Scegli come ricevere le notifiche
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Notifiche Email</p>
                  <p className="text-sm text-gray-600">Ricevi aggiornamenti via email</p>
                </div>
                <Button variant="outline" size="sm">Configura</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Notifiche Push</p>
                  <p className="text-sm text-gray-600">Notifiche nel browser</p>
                </div>
                <Button variant="outline" size="sm">Configura</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Settings;
