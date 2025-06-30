
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import { Space } from "@/types/space";
import { Plus, Edit, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { getHostSpaces } from "@/lib/host-utils";

const SpacesManage = () => {
  const { authState } = useAuth();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSpaces = async () => {
      setIsLoading(true);
      
      console.log('🔍 SpacesManage: Current auth state:', {
        userId: authState.user?.id,
        userEmail: authState.user?.email,
        userRole: authState.profile?.role,
        isAuthenticated: authState.isAuthenticated,
        isLoading: authState.isLoading
      });

      if (!authState.user?.id) {
        console.log('❌ No user ID available, waiting...');
        setIsLoading(false);
        return;
      }

      try {
        console.log('🔍 Fetching spaces for user:', authState.user.id);
        
        // Fetch degli spazi dell'host usando la funzione corretta
        const spacesData = await getHostSpaces(authState.user.id);
        console.log('✅ SpacesManage: Fetched spaces:', spacesData);
        
        // Debug aggiuntivo per vedere i dati ricevuti
        console.log('📊 Spaces details:', spacesData.map(space => ({
          id: space.id,
          title: space.title,
          host_id: space.host_id,
          published: space.published,
          is_suspended: space.is_suspended
        })));
        
        setSpaces(spacesData);
      } catch (error) {
        console.error("❌ SpacesManage: Error fetching spaces:", error);
        toast.error("Errore nel caricamento degli spazi.");
      } finally {
        setIsLoading(false);
      }
    };

    // Fetch spaces only when we have user data and it's not loading
    if (!authState.isLoading && authState.user?.id) {
      fetchSpaces();
    } else if (!authState.isLoading && !authState.user?.id) {
      setIsLoading(false);
    }
  }, [authState.user?.id, authState.isLoading]);

  const handleCreateSpace = () => {
    console.log('🔍 Navigating to space creation');
    navigate('/space/new');
  };

  const handleEditSpace = (spaceId: string) => {
    console.log('🔍 Navigating to edit space:', spaceId);
    navigate(`/space/edit/${spaceId}`);
  };

  const handleDeleteSpace = async (spaceId: string) => {
    const confirmDelete = window.confirm("Sei sicuro di voler eliminare questo spazio?");
    if (!confirmDelete) return;

    try {
      const { supabase } = await import("@/integrations/supabase/client");
      
      const { error } = await supabase
        .from('spaces')
        .delete()
        .eq('id', spaceId)
        .eq('host_id', authState.user?.id); // Extra security check

      if (error) {
        console.error("Error deleting space:", error);
        toast.error("Errore nell'eliminazione dello spazio.");
      } else {
        setSpaces(spaces.filter(space => space.id !== spaceId));
        toast.success("Spazio eliminato con successo.");
      }
    } catch (error) {
      console.error("Error deleting space:", error);
      toast.error("Errore nell'eliminazione dello spazio.");
    }
  };

  const handleViewSpace = (spaceId: string) => {
    navigate(`/spaces/${spaceId}`);
  };

  if (!authState.isAuthenticated) {
    return (
      <AppLayout title="Accesso Richiesto" subtitle="Effettua il login per gestire i tuoi spazi">
        <div className="container mx-auto mt-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-semibold mb-2">Autenticazione Richiesta</h2>
              <p className="text-gray-600">
                Effettua il login per accedere alla gestione degli spazi.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Gestisci i Tuoi Spazi" subtitle="Crea, modifica e gestisci i tuoi spazi">
      <div className="container mx-auto mt-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">I Miei Spazi</h1>
            <p className="text-gray-600">
              Utente: {authState.profile?.first_name} {authState.profile?.last_name} 
              ({authState.user?.email}) - Ruolo: {authState.profile?.role}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              User ID: {authState.user?.id}
            </p>
          </div>
          <Button onClick={handleCreateSpace} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Crea Nuovo Spazio
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
            <p className="mt-2">Caricamento spazi...</p>
          </div>
        ) : spaces.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nessuno spazio trovato
              </h3>
              <p className="text-gray-600 mb-4">
                Non sono stati trovati spazi per il tuo account. Crea il tuo primo spazio per iniziare!
              </p>
              <div className="text-sm text-gray-500 mb-4 bg-gray-50 p-3 rounded">
                <p>Debug info:</p>
                <p>User ID: {authState.user?.id}</p>
                <p>Role: {authState.profile?.role}</p>
                <p>Email: {authState.user?.email}</p>
              </div>
              <Button onClick={handleCreateSpace} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Crea il tuo primo spazio
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              Trovati {spaces.length} spazio/i
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {spaces.map((space) => (
                <Card key={space.id}>
                  <CardHeader>
                    <CardTitle className="flex justify-between items-start">
                      <span>{space.title}</span>
                      {space.is_suspended && (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                          Sospeso
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-2">Indirizzo: {space.address}</p>
                    <p className="text-sm text-gray-600 mb-2">Prezzo: €{space.price_per_day}/giorno</p>
                    <p className="text-sm text-gray-600 mb-4">
                      Stato: {space.published ? (
                        <span className="text-green-600 font-medium">Pubblicato</span>
                      ) : (
                        <span className="text-yellow-600 font-medium">Bozza</span>
                      )}
                    </p>
                    <div className="text-xs text-gray-400 mb-4 bg-gray-50 p-2 rounded">
                      ID: {space.id}<br/>
                      Host ID: {space.host_id}
                    </div>
                    <div className="flex justify-end mt-4 space-x-2">
                      <Button size="sm" variant="outline" onClick={() => handleViewSpace(space.id)}>
                        <Eye className="w-4 h-4 mr-2" />
                        Visualizza
                      </Button>
                      <Button size="sm" onClick={() => handleEditSpace(space.id)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Modifica
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteSpace(space.id)}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Elimina
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default SpacesManage;
