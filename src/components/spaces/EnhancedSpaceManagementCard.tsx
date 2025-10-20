import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Space } from "@/types/space";
import { Edit, Eye, Trash2, MapPin, Users, Euro, RefreshCw, BarChart3 } from "lucide-react";
import { useAuth } from "@/hooks/auth/useAuth";

interface EnhancedSpaceManagementCardProps {
  space: Space;
  onView: (spaceId: string) => void;
  onEdit: (spaceId: string) => void;
  onDelete: (spaceId: string) => void;
  onRestore?: (spaceId: string) => void;
  onRecap: (spaceId: string) => void;
  bookingsCount: number;
  monthlyRevenue: number;
}

export const EnhancedSpaceManagementCard: React.FC<EnhancedSpaceManagementCardProps> = ({
  space,
  onView,
  onEdit,
  onDelete,
  onRestore,
  onRecap,
  bookingsCount,
  monthlyRevenue,
}) => {
  const { authState } = useAuth();
  const getStatusBadge = () => {
    if (space.deleted_at) {
      return <Badge variant="destructive">Eliminato</Badge>;
    }
    if (space.is_suspended) {
      return <Badge variant="destructive">Sospeso</Badge>;
    }
    if (space.published) {
      return <Badge className="bg-green-100 text-green-800">Pubblicato</Badge>;
    }
    return <Badge variant="secondary">Bozza</Badge>;
  };

  const { isAdmin } = useModeratorCheck();
  const isDeleted = !!space.deleted_at;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="aspect-video relative overflow-hidden">
        {space.photos && space.photos.length > 0 ? (
          <img src={space.photos[0]} alt={space.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <span className="text-gray-400">Nessuna foto</span>
          </div>
        )}
        <div className="absolute top-2 right-2">{getStatusBadge()}</div>
      </div>

      <CardContent className="p-4">
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-lg truncate">{space.title}</h3>
            <div className="flex items-center text-sm text-gray-600 mt-1">
              <MapPin className="w-4 h-4 mr-1" />
              <span className="truncate">{space.address}</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-1 text-gray-500" />
              <span>{space.max_capacity}</span>
            </div>
            <div className="flex items-center">
              <Euro className="w-4 h-4 mr-1 text-gray-500" />
              <span>{space.price_per_day}/giorno</span>
            </div>
            <div className="text-center">
              <span className="font-medium text-blue-600">{bookingsCount}</span>
              <p className="text-xs text-gray-500">prenotazioni</p>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            {isDeleted && isAdmin && onRestore ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRestore(space.id)}
                className="flex-1 text-green-600 hover:text-green-700"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Ripristina
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onView(space.id)}
                  className="flex-1"
                  disabled={isDeleted}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Vedi
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onRecap(space.id)}
                  className="flex-1"
                  disabled={isDeleted}
                >
                  <BarChart3 className="w-4 h-4 mr-1" />
                  Recap
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onEdit(space.id)}
                  className="flex-1"
                  disabled={isDeleted}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Modifica
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDelete(space.id)}
                  className="text-red-600 hover:text-red-700"
                  disabled={isDeleted}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
