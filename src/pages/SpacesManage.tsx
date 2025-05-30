import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PlusCircle, Edit, Trash2, Eye, EyeOff, Loader2, AlertTriangle } from "lucide-react";
import { SuspendedSpaceBanner } from "@/components/host/SuspendedSpaceBanner";
import { RevisionRequestDialog } from "@/components/host/RevisionRequestDialog";
import { checkSpaceCreationRestriction } from "@/lib/space-moderation-utils";
import type { Space } from "@/types/space";

interface ExtendedSpace extends Omit<Space, 'is_suspended' | 'suspension_reason' | 'revision_requested' | 'revision_notes'> {
  is_suspended?: boolean;
  suspension_reason?: string;
  revision_requested?: boolean;
  revision_notes?: string;
}

const SpacesManage = () => {
  const { authState } = useAuth();
  const navigate = useNavigate();
  const [spaces, setSpaces] = useState<ExtendedSpace[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [revisionDialog, setRevisionDialog] = useState<{isOpen: boolean, spaceId: string, spaceTitle: string}>({
    isOpen: false,
    spaceId: '',
    spaceTitle: ''
  });

  useEffect(() => {
    if (authState.profile?.role !== "host") {
      navigate("/dashboard", { replace: true });
    }
  }, [authState.profile, navigate]);

  useEffect(() => {
    const fetchSpaces = async () => {
      if (!authState.user) return;

      try {
        const { data, error } = await supabase
          .from("spaces")
          .select("*")
          .eq("host_id", authState.user.id)
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        setSpaces(data || []);
      } catch (error) {
        console.error("Error fetching spaces:", error);
        toast.error("Failed to load your spaces");
      } finally {
        setLoading(false);
      }
    };

    fetchSpaces();
  }, [authState.user]);

  const handleCreateSpace = async () => {
    const isRestricted = await checkSpaceCreationRestriction();
    if (!isRestricted) {
      navigate("/spaces/new");
    }
  };

  const handleDeleteSpace = async (spaceId: string) => {
    if (!confirm("Are you sure you want to delete this space? This action cannot be undone.")) {
      return;
    }

    setDeleting(spaceId);

    try {
      const { error } = await supabase
        .from("spaces")
        .delete()
        .eq("id", spaceId);

      if (error) {
        throw error;
      }

      setSpaces(spaces.filter(space => space.id !== spaceId));
      toast.success("Space successfully deleted");
    } catch (error) {
      console.error("Error deleting space:", error);
      toast.error("Failed to delete space");
    } finally {
      setDeleting(null);
    }
  };

  const togglePublishStatus = async (space: ExtendedSpace) => {
    if (space.is_suspended) {
      toast.error("Non puoi pubblicare uno spazio sospeso");
      return;
    }

    try {
      const { error } = await supabase
        .from("spaces")
        .update({ published: !space.published })
        .eq("id", space.id);

      if (error) {
        throw error;
      }

      setSpaces(
        spaces.map(s => 
          s.id === space.id ? { ...s, published: !s.published } : s
        )
      );

      toast.success(
        space.published 
          ? "Space is now hidden from public view" 
          : "Space is now published and visible to coworkers"
      );
    } catch (error) {
      console.error("Error updating publish status:", error);
      toast.error("Failed to update space status");
    }
  };

  const handleRequestRevision = (spaceId: string, spaceTitle: string) => {
    setRevisionDialog({ isOpen: true, spaceId, spaceTitle });
  };

  const handleRevisionSuccess = () => {
    setRevisionDialog({ isOpen: false, spaceId: '', spaceTitle: '' });
    // Refresh spaces
    window.location.reload();
  };

  if (authState.profile?.role !== "host") {
    return null;
  }

  const suspendedSpaces = spaces.filter(space => space.is_suspended);
  const activeSpaces = spaces.filter(space => !space.is_suspended);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Manage Your Spaces</h1>
          <Button
            onClick={handleCreateSpace}
            className="bg-blue-500 hover:bg-blue-600"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Add New Space
          </Button>
        </div>

        {suspendedSpaces.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-red-700 mb-4">
              <AlertTriangle className="w-5 h-5 inline mr-2" />
              Spazi Sospesi
            </h2>
            <div className="space-y-4">
              {suspendedSpaces.map(space => (
                <Card key={space.id} className="border-red-200 overflow-hidden">
                  <CardContent className="pt-6">
                    <SuspendedSpaceBanner
                      spaceTitle={space.title}
                      suspensionReason={space.suspension_reason || "Violazione dei termini di servizio"}
                      revisionRequested={space.revision_requested}
                      onEditSpace={() => navigate(`/spaces/${space.id}/edit`)}
                      onRequestRevision={() => handleRequestRevision(space.id, space.title)}
                    />
                    
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-lg">{space.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{space.address}</p>
                      </div>
                      <Button
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate(`/spaces/${space.id}/edit`)}
                      >
                        <Edit className="w-4 h-4 mr-1" /> Modifica
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          </div>
        ) : spaces.length === 0 ? (
          <Card className="bg-white border-dashed border-2 border-gray-300">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <h2 className="text-xl font-medium text-gray-600 mb-2">No Spaces Yet</h2>
              <p className="text-gray-500 text-center mb-6">
                Create your first space to start hosting coworkers
              </p>
              <Button
                onClick={handleCreateSpace}
                className="bg-blue-500 hover:bg-blue-600"
              >
                <PlusCircle className="w-4 h-4 mr-2" />
                Create Your First Space
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeSpaces.map((space) => (
              <Card key={space.id} className="overflow-hidden bg-white h-full flex flex-col">
                <div
                  className="h-40 bg-gray-200 bg-center bg-cover"
                  style={{
                    backgroundImage: space.photos && space.photos.length > 0
                      ? `url(${space.photos[0]})`
                      : "url(/placeholder.svg)",
                  }}
                />
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg truncate">{space.title}</CardTitle>
                    <Badge 
                      variant="default" 
                      className={space.published ? "bg-green-100 text-green-800" : "text-gray-500"}
                    >
                      {space.published ? "Published" : "Draft"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <p className="text-gray-500 text-sm line-clamp-2">{space.description}</p>
                  <div className="flex items-center mt-2">
                    <Badge variant="secondary" className="mr-2">
                      {space.category}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      Max {space.max_capacity} {space.max_capacity === 1 ? "person" : "people"}
                    </span>
                  </div>
                  <div className="mt-2">
                    <span className="text-blue-600 font-medium">
                      ${space.price_per_hour}/hour · ${space.price_per_day}/day
                    </span>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between mt-auto pt-2">
                  <div className="flex space-x-2">
                    <Button
                      variant="outline" 
                      size="sm"
                      onClick={() => navigate(`/spaces/${space.id}/edit`)}
                    >
                      <Edit className="w-4 h-4 mr-1" /> Edit
                    </Button>
                    <Button
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleDeleteSpace(space.id)}
                      disabled={!!deleting}
                    >
                      {deleting === space.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <><Trash2 className="w-4 h-4 mr-1" /> Delete</>
                      )}
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => togglePublishStatus(space)}
                  >
                    {space.published ? (
                      <><EyeOff className="w-4 h-4 mr-1" /> Unpublish</>
                    ) : (
                      <><Eye className="w-4 h-4 mr-1" /> Publish</>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      <RevisionRequestDialog
        isOpen={revisionDialog.isOpen}
        onClose={() => setRevisionDialog({...revisionDialog, isOpen: false})}
        onSuccess={handleRevisionSuccess}
        spaceId={revisionDialog.spaceId}
        spaceTitle={revisionDialog.spaceTitle}
      />
    </div>
  );
};

export default SpacesManage;
