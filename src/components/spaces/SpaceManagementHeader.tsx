
import React from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, BarChart3, Settings, Eye, DollarSign } from "lucide-react";
import { useNavigate } from 'react-router-dom';

interface SpaceManagementHeaderProps {
  spacesCount: number;
  publishedCount: number;
  totalRevenue?: number;
  userName?: string;
}

export const SpaceManagementHeader = ({ 
  spacesCount, 
  publishedCount, 
  totalRevenue, 
  userName 
}: SpaceManagementHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="mb-8">
      {/* Header principale */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-800 rounded-xl p-8 text-white mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="mb-4 lg:mb-0">
            <h1 className="text-3xl font-bold mb-2">
              Gestisci i Tuoi Spazi
            </h1>
            <p className="text-indigo-100 text-lg">
              Ciao {userName}! Gestisci i tuoi spazi di lavoro e monitora le performance.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            <Button 
              onClick={() => navigate('/host/spaces/new')}
              className="bg-white text-indigo-600 hover:bg-indigo-50 font-semibold"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuovo Spazio
            </Button>
            <Button 
              variant="outline" 
              className="border-white text-white hover:bg-white hover:text-indigo-600"
              onClick={() => navigate('/host/dashboard')}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </div>
        </div>
      </div>

      {/* Cards statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="border-l-4 border-l-indigo-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Spazi Totali</p>
                <p className="text-3xl font-bold text-gray-900">{spacesCount}</p>
              </div>
              <div className="bg-indigo-100 p-3 rounded-lg">
                <Settings className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Spazi Pubblicati</p>
                <p className="text-3xl font-bold text-gray-900">{publishedCount}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <Eye className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ricavi del Mese</p>
                <p className="text-3xl font-bold text-gray-900">
                  €{totalRevenue ? totalRevenue.toFixed(2) : '0.00'}
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
