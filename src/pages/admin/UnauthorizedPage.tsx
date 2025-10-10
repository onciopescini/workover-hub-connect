import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react';

const UnauthorizedPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertTriangle className="w-16 h-16 text-red-500" />
          </div>
          <CardTitle className="text-2xl">Accesso Non Autorizzato</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            Non hai i permessi necessari per accedere a questa pagina.
          </p>
          <p className="text-center text-sm text-muted-foreground">
            Se pensi che questo sia un errore, contatta l'amministratore del sistema.
          </p>
          
          <div className="flex gap-3 pt-4">
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
              className="flex-1 gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Indietro
            </Button>
            <Button
              onClick={() => navigate('/')}
              variant="default"
              className="flex-1 gap-2"
            >
              <Home className="w-4 h-4" />
              Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default UnauthorizedPage;
