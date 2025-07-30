import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSpaceMetrics } from "@/hooks/queries/useSpaceMetrics";
import { SpaceAnalyticsDashboard } from "@/components/spaces/analytics/SpaceAnalyticsDashboard";
import { ArrowLeft, Settings, Edit, Calendar, DollarSign } from "lucide-react";
import { AccessGuard } from '@/components/shared/access/AccessGuard';
import { LoadingSkeleton } from '@/components/shared/access/LoadingSkeleton';

const SpaceDashboard = () => {
  const { spaceId } = useParams<{ spaceId: string }>();
  const navigate = useNavigate();
  const { data: metrics, isLoading, error } = useSpaceMetrics(spaceId!);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error || !metrics) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Errore</h1>
          <p className="text-gray-600 mb-4">
            {error && typeof error === 'object' && 'message' in error
              ? (error as any).message
              : 'Impossibile caricare le metriche dello spazio'}
          </p>
          <Button onClick={() => navigate('/host/spaces')}>
            Torna agli Spazi
          </Button>
        </div>
      </div>
    );
  }

  if (typeof metrics === 'object' && 'error' in metrics) {
    return (
      <div className="container mx-auto py-6 px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Spazio Non Trovato</h1>
          <p className="text-gray-600 mb-4">
            Lo spazio richiesto non esiste o non hai i permessi per visualizzarlo.
          </p>
          <Button onClick={() => navigate('/host/spaces')}>
            Torna agli Spazi
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AccessGuard 
      requiredRoles={['host', 'admin']}
      loadingFallback={<LoadingSkeleton />}
    >
      <div className="container mx-auto py-6 px-4 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/host/spaces')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Torna agli Spazi</span>
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{metrics.space_title}</h1>
              <p className="text-muted-foreground">Dashboard Analytics Completa</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              onClick={() => navigate(`/space/edit/${spaceId}`)}
              className="flex items-center space-x-2"
            >
              <Edit className="h-4 w-4" />
              <span>Modifica</span>
            </Button>
            <Button 
              variant="outline"
              className="flex items-center space-x-2"
            >
              <Calendar className="h-4 w-4" />
              <span>Calendario</span>
            </Button>
            <Button 
              variant="outline"
              className="flex items-center space-x-2"
            >
              <DollarSign className="h-4 w-4" />
              <span>Pricing</span>
            </Button>
          </div>
        </div>

        {/* Status e metriche rapide */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <Settings className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <Badge 
                variant={metrics.total_bookings > 0 ? "default" : "secondary"}
                className="w-full justify-center"
              >
                {metrics.total_bookings > 0 ? "Attivo" : "In Attesa"}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Occupancy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.occupancy_rate}%</div>
              <p className="text-xs text-muted-foreground">
                {metrics.booked_days_last_30} giorni attivi
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.conversion_rate}%</div>
              <p className="text-xs text-muted-foreground">
                da {metrics.total_views} visualizzazioni
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rating</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.average_rating.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">
                {metrics.total_reviews} recensioni
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Dashboard Analytics Completa */}
        <SpaceAnalyticsDashboard metrics={metrics} />
      </div>
    </AccessGuard>
  );
};

export default SpaceDashboard;