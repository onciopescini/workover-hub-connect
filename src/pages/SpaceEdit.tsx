import React from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from "@/hooks/auth/useAuth";
import { useRoleAccess } from "@/hooks/useRoleAccess";
import { AppLayout } from "@/components/layout/AppLayout";
import RefactoredSpaceForm from "@/components/spaces/RefactoredSpaceForm";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Space } from "@/types/space";
import { toast } from "sonner";
import { sreLogger } from '@/lib/sre-logger';

const SpaceEdit = () => {
  const { id } = useParams<{ id: string }>();
  const { authState } = useAuth();
  const { isHost } = useRoleAccess();
  const navigate = useNavigate();
  
  if (!id) {
    navigate('/host/spaces');
    return null;
  }
  const [space, setSpace] = useState<Space | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSpace = async () => {
      if (!id) {
        toast.error("ID spazio non valido");
        navigate('/host/spaces');
        return;
      }

      try {
        setIsLoading(true);
        sreLogger.debug('Fetching space for edit', { spaceId: id, component: 'SpaceEdit' });
        
        const { data, error } = await supabase
          .from('spaces')
          .select('*')
          .eq('id', id)
          .eq('host_id', authState.user?.id ?? '') // Security check
          .single();

        if (error) {
          sreLogger.error('Error fetching space', { spaceId: id, userId: authState.user?.id, component: 'SpaceEdit' }, error as Error);
          toast.error("Errore nel caricamento dello spazio");
          navigate('/host/spaces');
          return;
        }

        if (!data) {
          toast.error("Spazio non trovato o non hai i permessi per modificarlo");
          navigate('/host/spaces');
          return;
        }

        sreLogger.debug('Space loaded for edit', { spaceId: id, title: data.title, component: 'SpaceEdit' });
        setSpace(data);
      } catch (error) {
        sreLogger.error('Exception fetching space', { spaceId: id, component: 'SpaceEdit' }, error as Error);
        toast.error("Errore nel caricamento dello spazio");
        navigate('/host/spaces');
      } finally {
        setIsLoading(false);
      }
    };

    if (authState.user?.id && !authState.isLoading) {
      fetchSpace();
    }
  }, [id, authState.user?.id, authState.isLoading, navigate]);

  if (authState.isLoading || isLoading) {
    return (
      <AppLayout title="Modifica Spazio" subtitle="Caricamento in corso...">
        <div className="container mx-auto py-8">
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-indigo-600" />
                <p className="text-gray-600">Caricamento spazio in corso...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (!authState.isAuthenticated || !isHost) {
    return (
      <AppLayout title="Accesso Negato" subtitle="Solo gli host possono modificare gli spazi">
        <div className="container mx-auto py-8">
          <Card>
            <CardContent className="text-center py-12">
              <h2 className="text-xl font-semibold mb-2 text-red-600">Accesso Negato</h2>
              <p className="text-gray-600 mb-4">
                Solo gli host possono modificare gli spazi.
              </p>
              <Button onClick={() => navigate('/dashboard')} className="bg-indigo-600 hover:bg-indigo-700">
                Torna alla Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (!space) {
    return (
      <AppLayout title="Spazio Non Trovato" subtitle="Lo spazio richiesto non è stato trovato">
        <div className="container mx-auto py-8">
          <Card>
            <CardContent className="text-center py-12">
              <h2 className="text-xl font-semibold mb-2 text-red-600">Spazio Non Trovato</h2>
              <p className="text-gray-600 mb-4">
                Lo spazio richiesto non è stato trovato o non hai i permessi per modificarlo.
              </p>
              <Button onClick={() => navigate('/host/spaces')} className="bg-indigo-600 hover:bg-indigo-700">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Torna alla Gestione Spazi
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title={`Modifica: ${space.title}`} 
      subtitle="Aggiorna le informazioni del tuo spazio"
    >
      <div className="container mx-auto py-6">
        {/* Header con breadcrumb e azioni */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/host/spaces')}
              className="text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Torna alla Gestione Spazi
            </Button>
            
            <div className="flex items-center space-x-2">
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                space.published 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {space.published ? 'Pubblicato' : 'Bozza'}
              </div>
              {space.is_suspended && (
                <div className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Sospeso
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-6 border border-indigo-100">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Modifica il tuo spazio
            </h1>
            <p className="text-gray-600">
              Aggiorna le informazioni, prezzi e disponibilità del tuo spazio. 
              Le modifiche saranno visibili immediatamente agli utenti.
            </p>
          </div>
        </div>

        {/* Form di modifica avanzato */}
        <RefactoredSpaceForm 
          initialData={space} 
          isEdit={true}
        />
      </div>
    </AppLayout>
  );
};

export default SpaceEdit;
