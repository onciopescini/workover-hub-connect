import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/OptimizedAuthContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { Space } from "@/types/space";
import { Plus, Edit, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/layout/AppLayout";

const SpacesManage = () => {
  const { authState } = useAuth();
  const [spaces, setSpaces] = useState<Space[]>([]);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSpaces = async () => {
      setIsLoading(true);
      if (authState.user) {
        const { data, error } = await supabase
          .from('spaces')
          .select('*')
          .eq('host_id', authState.user.id);

        if (error) {
          console.error("Error fetching spaces:", error);
          toast.error("Failed to load spaces.");
        } else {
          setSpaces(data || []);
        }
      }
      setIsLoading(false);
    };

    fetchSpaces();
  }, [authState.user]);

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
      const { error } = await supabase
        .from('spaces')
        .delete()
        .eq('id', spaceId);

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

  return (
    <AppLayout title="Manage Your Spaces" subtitle="Create, edit, and manage your spaces">
      <div className="container mx-auto mt-8">
        <div className="flex justify-end mb-4">
          <Button onClick={handleCreateSpace} className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Create New Space
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center">Loading spaces...</div>
        ) : spaces.length === 0 ? (
          <div className="text-center">No spaces created yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {spaces.map((space) => (
              <Card key={space.id}>
                <CardHeader>
                  <CardTitle>{space.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>Address: {space.address}</p>
                  <p>Price: ${space.price_per_day}/day</p>
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
