import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { SpaceMetrics } from "@/hooks/queries/useSpaceMetrics";
import { Eye, MousePointer, CheckCircle, AlertCircle } from "lucide-react";

interface ConversionMetricsProps {
  metrics: SpaceMetrics;
}

export const ConversionMetrics = ({ metrics }: ConversionMetricsProps) => {
  const getConversionStatus = (rate: number) => {
    if (rate >= 8) return { label: 'Eccellente', color: 'bg-green-500', variant: 'default' as const };
    if (rate >= 5) return { label: 'Buono', color: 'bg-blue-500', variant: 'secondary' as const };
    if (rate >= 3) return { label: 'Medio', color: 'bg-yellow-500', variant: 'outline' as const };
    return { label: 'Da Migliorare', color: 'bg-red-500', variant: 'destructive' as const };
  };

  const conversionStatus = getConversionStatus(metrics.conversion_rate);

  const estimatedViews = Math.max(metrics.total_views, metrics.total_bookings * 15);
  const estimatedInterested = Math.round(estimatedViews * 0.3); // 30% degli utenti mostrano interesse
  const actualBookings = metrics.total_bookings;

  return (
    <div className="space-y-6">
      {/* Funnel di conversione */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MousePointer className="h-5 w-5" />
            <span>Funnel di Conversione</span>
          </CardTitle>
          <CardDescription>Percorso degli utenti dalla visualizzazione alla prenotazione</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {/* Visualizzazioni */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <Eye className="h-5 w-5 text-blue-500" />
                <div>
                  <div className="font-medium">Visualizzazioni</div>
                  <div className="text-sm text-muted-foreground">Utenti che hanno visto lo spazio</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{estimatedViews}</div>
                <div className="text-sm text-muted-foreground">100%</div>
              </div>
            </div>

            {/* Interesse */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <div>
                  <div className="font-medium">Interesse Mostrato</div>
                  <div className="text-sm text-muted-foreground">Utenti che hanno interagito</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">{estimatedInterested}</div>
                <div className="text-sm text-muted-foreground">
                  {((estimatedInterested / estimatedViews) * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Prenotazioni */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-primary/5">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div>
                  <div className="font-medium">Prenotazioni</div>
                  <div className="text-sm text-muted-foreground">Conversioni completate</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">{actualBookings}</div>
                <div className="text-sm text-muted-foreground">
                  {metrics.conversion_rate}%
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Conversion Rate Complessivo</span>
              <Badge variant={conversionStatus.variant} className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${conversionStatus.color}`} />
                <span>{conversionStatus.label}</span>
              </Badge>
            </div>
            <Progress value={metrics.conversion_rate} className="h-3" />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>0%</span>
              <span className="font-medium">{metrics.conversion_rate}%</span>
              <span>15%</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metriche di performance */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Views per Booking</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {actualBookings > 0 ? Math.round(estimatedViews / actualBookings) : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Media del settore: 12-20
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Interesse to Booking</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {estimatedInterested > 0 ? ((actualBookings / estimatedInterested) * 100).toFixed(1) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Conversione da interesse
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Revenue per View</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              €{estimatedViews > 0 ? (metrics.total_revenue / estimatedViews).toFixed(2) : '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Valore per visualizzazione
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Suggerimenti per migliorare */}
      <Card>
        <CardHeader>
          <CardTitle>Suggerimenti per Migliorare</CardTitle>
          <CardDescription>Raccomandazioni basate sulle tue metriche</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.conversion_rate < 3 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="font-medium text-yellow-800">Migliora le foto dello spazio</div>
                <div className="text-sm text-yellow-700">
                  Il tuo conversion rate è basso. Foto di qualità possono aumentare le prenotazioni del 40%.
                </div>
              </div>
            )}
            
            {metrics.average_rating < 4.0 && metrics.total_reviews > 5 && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="font-medium text-orange-800">Migliora l'esperienza ospite</div>
                <div className="text-sm text-orange-700">
                  Il rating medio è sotto 4.0. Ascolta i feedback per migliorare il servizio.
                </div>
              </div>
            )}

            {metrics.conversion_rate >= 5 && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <div className="font-medium text-green-800">Ottima performance!</div>
                <div className="text-sm text-green-700">
                  Il tuo spazio ha un ottimo conversion rate. Considera di aumentare la visibilità.
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};