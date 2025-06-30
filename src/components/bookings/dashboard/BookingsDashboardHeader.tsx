
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, TrendingUp, Users, DollarSign } from 'lucide-react';
import { useAuth } from "@/contexts/OptimizedAuthContext";

interface BookingsDashboardHeaderProps {
  totalBookings: number;
  pendingCount: number;
  confirmedCount: number;
  totalRevenue: number;
}

export const BookingsDashboardHeader = ({
  totalBookings,
  pendingCount,
  confirmedCount,
  totalRevenue
}: BookingsDashboardHeaderProps) => {
  const { authState } = useAuth();
  const isHost = authState.profile?.role === 'host' || authState.profile?.role === 'admin';
  const userName = `${authState.profile?.first_name || ''} ${authState.profile?.last_name || ''}`.trim() || 'Utente';

  return (
    <div className="mb-8">
      {/* Header principale */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 rounded-xl p-8 text-white mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div className="mb-4 lg:mb-0">
            <h1 className="text-3xl font-bold mb-2">
              {isHost ? 'Prenotazioni Ricevute' : 'Le Mie Prenotazioni'}
            </h1>
            <p className="text-blue-100 text-lg">
              Ciao {userName}! {isHost ? 'Gestisci le prenotazioni dei tuoi spazi.' : 'Monitora le tue prenotazioni.'}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
            {pendingCount > 0 && (
              <Badge className="bg-orange-500 text-white px-4 py-2 text-sm font-medium">
                {pendingCount} {isHost ? 'da approvare' : 'in attesa'}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Prenotazioni Totali</p>
                <p className="text-3xl font-bold text-gray-900">{totalBookings}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Attesa</p>
                <p className="text-3xl font-bold text-orange-600">{pendingCount}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-lg">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Confermate</p>
                <p className="text-3xl font-bold text-green-600">{confirmedCount}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  {isHost ? 'Fatturato' : 'Speso'}
                </p>
                <p className="text-3xl font-bold text-purple-600">€{totalRevenue.toFixed(2)}</p>
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
