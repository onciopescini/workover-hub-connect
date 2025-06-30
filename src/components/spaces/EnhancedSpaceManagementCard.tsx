
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Eye, 
  Edit, 
  Trash2, 
  Calendar, 
  MapPin, 
  Euro, 
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { Space } from "@/types/space";

interface EnhancedSpaceManagementCardProps {
  space: Space;
  onView: (spaceId: string) => void;
  onEdit: (spaceId: string) => void;
  onDelete: (spaceId: string) => void;
  bookingsCount?: number;
  monthlyRevenue?: number;
}

export const EnhancedSpaceManagementCard = ({
  space,
  onView,
  onEdit,
  onDelete,
  bookingsCount = 0,
  monthlyRevenue = 0
}: EnhancedSpaceManagementCardProps) => {
  const getStatusColor = () => {
    if (space.is_suspended) return 'bg-red-500';
    if (space.published) return 'bg-green-500';
    return 'bg-yellow-500';
  };

  const getStatusText = () => {
    if (space.is_suspended) return 'Sospeso';
    if (space.published) return 'Pubblicato';
    return 'Bozza';
  };

  const getStatusIcon = () => {
    if (space.is_suspended) return <AlertTriangle className="w-4 h-4" />;
    if (space.published) return <CheckCircle className="w-4 h-4" />;
    return <Edit className="w-4 h-4" />;
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-l-4 border-l-indigo-500">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
              {space.title}
            </CardTitle>
            <div className="flex items-center text-sm text-gray-500 mt-1">
              <MapPin className="w-4 h-4 mr-1" />
              {space.address}
            </div>
          </div>
          <Badge 
            variant="secondary" 
            className={`${getStatusColor()} text-white flex items-center space-x-1`}
          >
            {getStatusIcon()}
            <span>{getStatusText()}</span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Foto preview */}
        {space.photos && space.photos.length > 0 && (
          <div className="mb-4 rounded-lg overflow-hidden">
            <img 
              src={space.photos[0] as string} 
              alt={space.title}
              className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}

        {/* Informazioni principali */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center text-sm">
            <Euro className="w-4 h-4 text-green-600 mr-2" />
            <span className="font-medium">€{space.price_per_day}/giorno</span>
          </div>
          <div className="flex items-center text-sm">
            <Users className="w-4 h-4 text-blue-600 mr-2" />
            <span>Max {space.max_capacity} persone</span>
          </div>
        </div>

        {/* Statistiche performance */}
        <div className="bg-gray-50 rounded-lg p-3 mb-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 text-indigo-600 mr-2" />
              <div>
                <p className="font-medium">{bookingsCount}</p>
                <p className="text-gray-500 text-xs">Prenotazioni</p>
              </div>
            </div>
            <div className="flex items-center">
              <TrendingUp className="w-4 h-4 text-green-600 mr-2" />
              <div>
                <p className="font-medium">€{monthlyRevenue.toFixed(2)}</p>
                <p className="text-gray-500 text-xs">Ricavi mese</p>
              </div>
            </div>
          </div>
        </div>

        {/* Azioni */}
        <div className="flex justify-between space-x-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => onView(space.id)}
            className="flex-1"
          >
            <Eye className="w-4 h-4 mr-2" />
            Visualizza
          </Button>
          <Button 
            size="sm" 
            onClick={() => onEdit(space.id)}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700"
          >
            <Edit className="w-4 h-4 mr-2" />
            Modifica
          </Button>
          <Button 
            size="sm" 
            variant="destructive" 
            onClick={() => onDelete(space.id)}
            className="px-3"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Debug info (solo in development) */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <details className="text-xs text-gray-500">
              <summary className="cursor-pointer hover:text-gray-700">Debug Info</summary>
              <div className="mt-2 bg-gray-100 p-2 rounded text-xs">
                <p>ID: {space.id}</p>
                <p>Host ID: {space.host_id}</p>
                <p>Creato: {new Date(space.created_at).toLocaleDateString()}</p>
              </div>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
