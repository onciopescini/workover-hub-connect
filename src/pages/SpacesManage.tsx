
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
        userRole: authState.profile?.role,
        isAuthenticated: authState.isAuthenticated
      });

      if (!authState.user?.id) {
        console.log('❌ No user ID available');
        setIsLoading(false);
        return;
      }

      try {
        const spacesData = await getHostSpaces(authState.user.id);
        console.log('✅ SpacesManage: Fetched spaces:', spacesData);
        setSpaces(spacesData);
      } catch (error) {
        console.error("❌ SpacesManage: Error fetching spaces:", error);
        toast.error("Failed to load spaces.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchSpaces();
  }, [authState.user?.id]);

  const handleCreateSpace = () => {
    navigate('/space/new');
  };

  const handleEditSpace = (spaceId: string) => {
    navigate(`/space/edit/${spaceId}`);
  };

  const handleDeleteSpace = async (spaceId: string) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this space?");
    if (!confirmDelete) return;

    try {
      const { getHostSpaces } = await import("@/lib/host-utils");
      const { supabase } = await import("@/integrations/supabase/client");
      
      const { error } = await supabase
        .from('spaces')
        .delete()
        .eq('id', spaceId)
        .eq('host_id', authState.user?.id); // Extra security check

      if (error) {
        console.error("Error deleting space:", error);
        toast.error("Failed to delete space.");
      } else {
        setSpaces(spaces.filter(space => space.id !== spaceId));
        toast.success("Space deleted successfully.");
      }
    } catch (error) {
      console.error("Error deleting space:", error);
      toast.error("Failed to delete space.");
    }
  };

  const handleViewSpace = (spaceId: string) => {
    navigate(`/spaces/${spaceId}`);
  };

  if (!authState.isAuthenticated) {
    return (
      <AppLayout title="Access Required" subtitle="Please log in to manage your spaces">
        <div className="container mx-auto mt-8">
          <Card>
            <CardContent className="p-8 text-center">
              <h2 className="text-xl font-semibold mb-2">Authentication Required</h2>
              <p className="text-gray-600">
                Please log in to access space management.
              </p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Manage Your Spaces" subtitle="Create, edit, and manage your spaces">
      <div className="container mx-auto mt-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">My Spaces</h1>
            <p className="text-gray-600">
              User: {authState.profile?.first_name} {authState.profile?.last_name} 
              (Role: {authState.profile?.role})
            </p>
          </div>
          <Button onClick={handleCreateSpace} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Create New Space
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500 mx-auto"></div>
            <p className="mt-2">Loading spaces...</p>
          </div>
        ) : spaces.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No spaces created yet
              </h3>
              <p className="text-gray-600 mb-4">
                You haven't created any spaces yet. Create your first space to get started!
              </p>
              <Button onClick={handleCreateSpace} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                <Plus className="w-4 h-4 mr-2" />
                Create your first space
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {spaces.map((space) => (
              <Card key={space.id}>
                <CardHeader>
                  <CardTitle>{space.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-2">Address: {space.address}</p>
                  <p className="text-sm text-gray-600 mb-2">Price: €{space.price_per_day}/day</p>
                  <p className="text-sm text-gray-600 mb-4">
                    Status: {space.published ? (
                      <span className="text-green-600 font-medium">Published</span>
                    ) : (
                      <span className="text-yellow-600 font-medium">Draft</span>
                    )}
                  </p>
                  <div className="flex justify-end mt-4 space-x-2">
                    <Button size="sm" variant="outline" onClick={() => handleViewSpace(space.id)}>
                      <Eye className="w-4 h-4 mr-2" />
                      View
                    </Button>
                    <Button size="sm" onClick={() => handleEditSpace(space.id)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeleteSpace(space.id)}>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default SpacesManage;
