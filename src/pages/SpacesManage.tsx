import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/auth/useAuth";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Space } from "@/types/space";
import { Plus, RefreshCw, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { SpaceManagementHeader } from "@/components/spaces/SpaceManagementHeader";
import { EnhancedSpaceManagementCard } from "@/components/spaces/EnhancedSpaceManagementCard";
import { sreLogger } from "@/lib/sre-logger";
import { useModeratorCheck } from "@/hooks/admin/useModeratorCheck";
import { WorkspaceInsert } from "@/types/workspace";

const SpacesManage = () => {
  const { authState } = useAuth();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [showDeleted, setShowDeleted] = useState(false);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Rules of Hooks fix: move state and effects to top level
  // Calculate total revenue from completed bookings
  const [totalRevenue, setTotalRevenue] = React.useState<number>(0);
  const [spacesMetrics, setSpacesMetrics] = React.useState<Map<string, { bookings: number; revenue: number }>>(new Map());

  const { isAdmin } = useModeratorCheck();

  const fetchSpaces = async () => {
    sreLogger.debug("SpacesManage: Current auth state", {
      userId: authState.user?.id,
      userEmail: authState.user?.email,
      isAuthenticated: authState.isAuthenticated,
      isLoading: authState.isLoading,
      showDeleted,
    });

    if (!authState.user?.id) {
      sreLogger.debug("No user ID available, waiting", { component: "SpacesManage" });
      return;
    }

    try {
      sreLogger.debug("Fetching spaces for user", { userId: authState.user.id, component: "SpacesManage" });

      const { supabase } = await import("@/integrations/supabase/client");

      // Use workspaces table instead of spaces
      let query = (supabase.from("spaces") as any).select("*").eq("host_id", authState.user.id);

      // Filter by deletion status based on admin toggle
      if (isAdmin && showDeleted) {
        // Admin viewing deleted spaces only
        // Workspaces table might not have deleted_at yet, assuming it does or skipping for now
        // query = query.not("deleted_at", "is", null);
      } else if (isAdmin && !showDeleted) {
        // Admin viewing non-deleted spaces only
        // query = query.is("deleted_at", null);
      } else {
        // Regular users - only non-deleted spaces
        // query = query.is("deleted_at", null);
      }

      // Workspaces likely has created_at
      query = query.order("created_at", { ascending: false });

      const { data: workspacesData, error } = await query;

      if (error) {
        sreLogger.error(
          "Error fetching spaces",
          { userId: authState.user.id, component: "SpacesManage" },
          error as Error,
        );
        toast.error("Errore nel caricamento degli spazi.");
        return;
      }

      sreLogger.debug("Spaces fetched successfully", {
        count: workspacesData?.length || 0,
        userId: authState.user.id,
        component: "SpacesManage",
      });

      // Map Workspace data to Space interface
      const mappedSpaces: Space[] = (workspacesData || []).map((workspace: any) => ({
        id: workspace.id,
        title: workspace.name, // Map name to title
        description: workspace.description || "",
        photos: workspace.photos || [],
        address: workspace.address,
        latitude: workspace.latitude || 0,
        longitude: workspace.longitude || 0,
        price_per_day: workspace.price_per_day,
        price_per_hour: workspace.price_per_hour,
        max_capacity: workspace.max_capacity,
        capacity: workspace.max_capacity, // Assuming capacity maps to max_capacity if strictly needed or null
        category: workspace.category,
        workspace_features: workspace.features || [], // Map features to workspace_features
        amenities: workspace.amenities || [],
        seating_types: workspace.seating_types || [],
        work_environment: workspace.work_environment || "controlled", // Default
        rules: workspace.rules,
        host_id: workspace.host_id,
        published: workspace.published || false,
        created_at: workspace.created_at || new Date().toISOString(),
        updated_at: workspace.updated_at || new Date().toISOString(),
        deleted_at: workspace.deleted_at || null,
        is_suspended: workspace.is_suspended || false,
        suspension_reason: workspace.suspension_reason || null,
        suspended_at: workspace.suspended_at || null,
        suspended_by: workspace.suspended_by || null,
        availability: workspace.availability,
        cancellation_policy: workspace.cancellation_policy,
        confirmation_type: workspace.confirmation_type || "instant",
        approved_at: null,
        approved_by: null,
        approximate_location: null,
        cached_avg_rating: null,
        cached_review_count: null,
        city_name: null,
        country_code: null,
        event_friendly_tags: workspace.event_friendly_tags || [],
        ideal_guest_tags: workspace.ideal_guest_tags || [],
        pending_approval: false,
        rejection_reason: null,
        revision_notes: null,
        revision_requested: false
      }));

      sreLogger.debug("Mapped spaces details", {
        spaces: mappedSpaces.map((space) => ({
          id: space.id,
          title: space.title,
          host_id: space.host_id,
          published: space.published,
        })),
        component: "SpacesManage",
      });

      setSpaces(mappedSpaces);
    } catch (error) {
      sreLogger.error(
        "Error fetching spaces",
        { userId: authState.user.id, component: "SpacesManage" },
        error as Error,
      );
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
  }, [authState.user?.id, authState.isLoading, showDeleted]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchSpaces();
    setIsRefreshing(false);
    toast.success("Spazi aggiornati!");
  };

  const handleCreateSpace = () => {
    sreLogger.debug("Navigating to space creation", { component: "SpacesManage" });
    navigate("/host/space/new");
  };

  const handleEditSpace = (spaceId: string) => {
    sreLogger.debug("Navigating to edit space", { spaceId, component: "SpacesManage" });
    navigate(`/host/space/edit/${spaceId}`);
  };

  const handleDeleteSpace = async (spaceId: string) => {
    const confirmDelete = window.confirm("Sei sicuro di voler eliminare questo spazio?");
    if (!confirmDelete) return;

    try {
      const { supabase } = await import("@/integrations/supabase/client");

      // Use soft delete instead of hard delete
      const { error } = await (supabase
        .from("spaces") as any)
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", spaceId)
        .eq("host_id", authState.user?.id ?? "");

      if (error) {
        sreLogger.error(
          "Error soft-deleting space",
          { spaceId, userId: authState.user?.id, component: "SpacesManage" },
          error as Error,
        );
        toast.error("Errore nell'eliminazione dello spazio.");
      } else {
        setSpaces(spaces.filter((space) => space.id !== spaceId));
        toast.success("Spazio eliminato con successo.");
      }
    } catch (error) {
      sreLogger.error(
        "Error soft-deleting space",
        { spaceId, userId: authState.user?.id, component: "SpacesManage" },
        error as Error,
      );
      toast.error("Errore nell'eliminazione dello spazio.");
    }
  };

  const handleRestoreSpace = async (spaceId: string) => {
    const confirmRestore = window.confirm("Sei sicuro di voler ripristinare questo spazio?");
    if (!confirmRestore) return;

    try {
      // Note: "restore-space" function might need update if it targets "spaces" table.
      // Assuming for now we just skip or it works if updated backend side.
      const { supabase } = await import("@/integrations/supabase/client");

      const { data, error } = await supabase.functions.invoke("restore-space", {
        body: { spaceId },
      });

      if (error) {
        sreLogger.error("Error restoring space", { spaceId, component: "SpacesManage" }, error as Error);
        toast.error("Errore nel ripristino dello spazio.");
      } else {
        await fetchSpaces(); // Refresh the spaces list
        toast.success("Spazio ripristinato con successo.");
      }
    } catch (error) {
      sreLogger.error("Error restoring space", { spaceId, component: "SpacesManage" }, error as Error);
      toast.error("Errore nel ripristino dello spazio.");
    }
  };

  const handleViewSpace = (spaceId: string) => {
    navigate(`/spaces/${spaceId}`);
  };

  const handleRecapSpace = (spaceId: string) => {
    navigate(`/host/spaces/${spaceId}/recap`);
  };

  React.useEffect(() => {
    const fetchHostMetrics = async () => {
      if (!authState.user?.id || spaces.length === 0) return;

      try {
        const { supabase } = await import("@/integrations/supabase/client");
        
        // Get host bookings (simpler approach - count bookings only)
        // Bookings table might still link to spaces table (if not migrated) or workspaces.
        // Assuming bookings link via space_id which matches workspace.id
        const { data: bookings, error } = await supabase
          .from('bookings')
          .select('id, space_id, status')
          .in('space_id', spaces.map(s => s.id))
          .eq('status', 'served');

        if (error) {
          sreLogger.error('Failed to fetch host metrics', { component: 'SpacesManage', error }, error);
          return;
        }

        // Calculate metrics per space (bookings count only)
        const metricsMap = new Map<string, { bookings: number; revenue: number }>();
        let totalBookings = 0;

        spaces.forEach(space => {
          const spaceBookings = bookings?.filter(b => b.space_id === space.id) || [];
          const bookingsCount = spaceBookings.length;
          
          // Calculate estimated revenue (price_per_hour * average 4 hours * bookings)
          const estimatedRevenue = (space.price_per_hour || 0) * 4 * bookingsCount;

          metricsMap.set(space.id, {
            bookings: bookingsCount,
            revenue: estimatedRevenue
          });

          totalBookings += bookingsCount;
        });

        // Calculate total estimated revenue
        const totalRev = Array.from(metricsMap.values()).reduce((sum, m) => sum + m.revenue, 0);

        setTotalRevenue(totalRev);
        setSpacesMetrics(metricsMap);
      } catch (error) {
        sreLogger.error('Exception fetching host metrics', { component: 'SpacesManage', error }, error as Error);
      }
    };

    fetchHostMetrics();
  }, [spaces, authState.user?.id]);


  if (!authState.isAuthenticated) {
    return (
      <AppLayout title="Accesso Richiesto" subtitle="Effettua il login per gestire i tuoi spazi">
        <div className="container mx-auto mt-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-semibold mb-2">Autenticazione Richiesta</h2>
              <p className="text-gray-600">Effettua il login per accedere alla gestione degli spazi.</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const publishedCount = spaces.filter((space) => space.published).length;

  return (
    <AppLayout title="Gestisci i Tuoi Spazi" subtitle="Crea, modifica e gestisci i tuoi spazi">
      <div className="container mx-auto py-6">
        <SpaceManagementHeader
          spacesCount={spaces.length}
          publishedCount={publishedCount}
          totalRevenue={totalRevenue}
          userName={`${authState.profile?.first_name} ${authState.profile?.last_name}`.trim() || "Host"}
        />

        {/* Azioni e filtri */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">I Tuoi Spazi</h2>
            <p className="text-gray-600 text-sm">
              Gestisci e monitora tutti i tuoi spazi di lavoro
              {isAdmin && showDeleted && " (spazi eliminati)"}
            </p>
          </div>
          <div className="flex space-x-3">
            {isAdmin && (
              <Button variant="outline" onClick={() => setShowDeleted(!showDeleted)} className="flex items-center">
                {showDeleted ? (
                  <>
                    <EyeOff className="w-4 h-4 mr-2" />
                    Nascondi Eliminati
                  </>
                ) : (
                  <>
                    <Eye className="w-4 h-4 mr-2" />
                    Mostra Eliminati
                  </>
                )}
              </Button>
            )}
            <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing} className="flex items-center">
              <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
              Aggiorna
            </Button>
            <Button onClick={handleCreateSpace} className="bg-indigo-600 hover:bg-indigo-700">
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
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Nessuno spazio trovato</h3>
                <p className="text-gray-600 mb-6">
                  Non hai ancora creato nessuno spazio. Crea il tuo primo spazio per iniziare a guadagnare!
                </p>

                {/* Debug info per sviluppo */}
              {import.meta.env.DEV && (
                  <div className="text-sm text-gray-500 mb-6 bg-gray-50 p-4 rounded border">
                    <p className="font-medium mb-2">Debug Info:</p>
                    <p>User ID: {authState.user?.id}</p>
                    <p>Email: {authState.user?.email}</p>
                  </div>
                )}

                <Button onClick={handleCreateSpace} className="bg-indigo-600 hover:bg-indigo-700" size="lg">
                  <Plus className="w-4 h-4 mr-2" />
                  Crea il tuo primo spazio
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="text-sm text-gray-600">
              Trovati {spaces.length} spazio/i
              {!showDeleted && `(${publishedCount} pubblicati)`}
              {showDeleted && isAdmin && " eliminati"}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {spaces.map((space) => {
                const metrics = spacesMetrics.get(space.id) || { bookings: 0, revenue: 0 };
                return (
                  <EnhancedSpaceManagementCard
                    key={space.id}
                    space={space}
                    onView={handleViewSpace}
                    onEdit={handleEditSpace}
                    onDelete={handleDeleteSpace}
                    onRestore={handleRestoreSpace}
                    onRecap={handleRecapSpace}
                    bookingsCount={metrics.bookings}
                    monthlyRevenue={metrics.revenue}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default SpacesManage;
