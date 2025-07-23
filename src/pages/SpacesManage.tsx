
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/auth/useAuth";
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import { Space } from "@/types/space";
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { getHostSpaces } from "@/lib/host-utils";
import { SpaceManagementHeader } from "@/components/spaces/SpaceManagementHeader";
import { EnhancedSpaceManagementCard } from "@/components/spaces/EnhancedSpaceManagementCard";

const SpacesManage = () => {
  const { authState } = useAuth();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchSpaces = async () => {
    console.log('🔍 SpacesManage: Current auth state:', {
      userId: authState.user?.id,
      userEmail: authState.user?.email,
      userRole: authState.profile?.role,
      isAuthenticated: authState.isAuthenticated,
      isLoading: authState.isLoading
    });

    if (!authState.user?.id) {
      console.log('❌ No user ID available, waiting...');
      return;
    }

    try {
      console.log('🔍 Fetching spaces for user:', authState.user.id);
      
      const spacesData = await getHostSpaces(authState.user.id);
      console.log('✅ SpacesManage: Fetched spaces:', spacesData);
      
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
    }
  };

  useEffect(() => {
    const loadSpaces = async () => {
      setIsLoading(true);
      await fetchSpaces();
      setIsLoading(false);
    };

    if (!authState.isLoading && authState.user?.id) {
      loadSpaces();
    } else if (!authState.isLoading && !authState.user?.id) {
      setIsLoading(false);
    }
  }, [authState.user?.id, authState.isLoading]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchSpaces();
    setIsRefreshing(false);
    toast.success("Spazi aggiornati!");
  };

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
      
      // Use soft delete instead of hard delete
      const { error } = await supabase
        .from('spaces')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', spaceId)
        .eq('host_id', authState.user?.id ?? '');

      if (error) {
        console.error("Error soft-deleting space:", error);
        toast.error("Errore nell'eliminazione dello spazio.");
      } else {
        setSpaces(spaces.filter(space => space.id !== spaceId));
        toast.success("Spazio eliminato con successo.");
      }
    } catch (error) {
      console.error("Error soft-deleting space:", error);
      toast.error("Errore nell'eliminazione dello spazio.");
    }
  };

  const handleRestoreSpace = async (spaceId: string) => {
    const confirmRestore = window.confirm("Sei sicuro di voler ripristinare questo spazio?");
    if (!confirmRestore) return;

    try {
      const { supabase } = await import("@/integrations/supabase/client");
      
      const { data, error } = await supabase.functions.invoke('restore-space', {
        body: { spaceId }
      });

      if (error) {
        console.error("Error restoring space:", error);
        toast.error("Errore nel ripristino dello spazio.");
      } else {
        await fetchSpaces(); // Refresh the spaces list
        toast.success("Spazio ripristinato con successo.");
      }
    } catch (error) {
      console.error("Error restoring space:", error);
      toast.error("Errore nel ripristino dello spazio.");
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

  const publishedCount = spaces.filter(space => space.published).length;
  const totalRevenue = 0; // TODO: Calcolare dai bookings

  return (
    <AppLayout title="Gestisci i Tuoi Spazi" subtitle="Crea, modifica e gestisci i tuoi spazi">
      <div className="container mx-auto py-6">
        <SpaceManagementHeader
          spacesCount={spaces.length}
          publishedCount={publishedCount}
          totalRevenue={totalRevenue}
          userName={`${authState.profile?.first_name} ${authState.profile?.last_name}`.trim() || 'Host'}
        />

        {/* Azioni e filtri */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">I Tuoi Spazi</h2>
            <p className="text-gray-600 text-sm">
              Gestisci e monitora tutti i tuoi spazi di lavoro
            </p>
          </div>
          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Aggiorna
            </Button>
            <Button 
              onClick={handleCreateSpace}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuovo Spazio
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Caricamento spazi...</p>
          </div>
        ) : spaces.length === 0 ? (
          <Card className="border-2 border-dashed border-gray-300">
            <CardContent className="text-center py-12">
              <div className="max-w-md mx-auto">
                <div className="bg-indigo-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                  <Plus className="w-8 h-8 text-indigo-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Nessuno spazio trovato
                </h3>
                <p className="text-gray-600 mb-6">
                  Non hai ancora creato nessuno spazio. Crea il tuo primo spazio per iniziare a guadagnare!
                </p>
                
                {/* Debug info per sviluppo */}
                {import.meta.env.DEV && (
                  <div className="text-sm text-gray-500 mb-6 bg-gray-50 p-4 rounded border">
                    <p className="font-medium mb-2">Debug Info:</p>
                    <p>User ID: {authState.user?.id}</p>
                    <p>Role: {authState.profile?.role}</p>
                    <p>Email: {authState.user?.email}</p>
                  </div>
                )}
                
                <Button 
                  onClick={handleCreateSpace} 
                  className="bg-indigo-600 hover:bg-indigo-700"
                  size="lg"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Crea il tuo primo spazio
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="text-sm text-gray-600">
              Trovati {spaces.length} spazio/i ({publishedCount} pubblicati)
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {spaces.map((space) => (
                <EnhancedSpaceManagementCard
                  key={space.id}
                  space={space}
                  onView={handleViewSpace}
                  onEdit={handleEditSpace}
                  onDelete={handleDeleteSpace}
                  onRestore={handleRestoreSpace}
                  bookingsCount={0} // TODO: Calcolare dai bookings
                  monthlyRevenue={0} // TODO: Calcolare dai bookings
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default SpacesManage;
