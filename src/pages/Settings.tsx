
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Settings as SettingsIcon, User, Bell, Shield, CreditCard, Users } from 'lucide-react';

const Settings = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Impostazioni
        </h1>
        <p className="text-gray-600">
          Gestisci il tuo account e le preferenze
        </p>
      </div>

      <div className="grid gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/settings/networking')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Networking
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Gestisci le tue preferenze di networking e collaborazione
            </p>
            <Button variant="outline">Gestisci Networking</Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/profile/edit')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-green-600" />
              Profilo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Modifica le tue informazioni personali e professionali
            </p>
            <Button variant="outline">Modifica Profilo</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-orange-600" />
              Notifiche
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Gestisci le tue preferenze di notifica
            </p>
            <Button variant="outline">Gestisci Notifiche</Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/privacy')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-600" />
              Privacy e Sicurezza
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Controlla la privacy dei tuoi dati e le impostazioni di sicurezza
            </p>
            <Button variant="outline">Gestisci Privacy</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-red-600" />
              Pagamenti
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Gestisci i tuoi metodi di pagamento e fatturazione
            </p>
            <Button variant="outline">Gestisci Pagamenti</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
