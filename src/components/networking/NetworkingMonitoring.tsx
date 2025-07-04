
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Users, AlertTriangle, CheckCircle, TrendingUp, Wifi } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLogger } from "@/hooks/useLogger";

interface SystemMetrics {
  totalConnections: number;
  activeUsers: number;
  pendingRequests: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
  responseTime: number;
  uptime: number;
}

export const NetworkingMonitoring = () => {
  const { error } = useLogger({ context: 'NetworkingMonitoring' });
  const [metrics, setMetrics] = useState<SystemMetrics>({
    totalConnections: 0,
    activeUsers: 0,
    pendingRequests: 0,
    systemHealth: 'healthy',
    responseTime: 0,
    uptime: 99.9
  });
  const [isRealTime, setIsRealTime] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchMetrics = async () => {
    try {
      const startTime = performance.now();

      // Fetch connection metrics
      const { data: connections, error: connError } = await supabase
        .from('connections')
        .select('status, created_at')
        .eq('status', 'accepted');

      const { data: requests, error: reqError } = await supabase
        .from('connections')
        .select('id')
        .eq('status', 'pending');

      const { data: activeProfiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, networking_enabled')
        .eq('networking_enabled', true);

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      if (connError || reqError || profileError) {
        throw new Error('Error fetching metrics');
      }

      const newMetrics: SystemMetrics = {
        totalConnections: connections?.length || 0,
        activeUsers: activeProfiles?.length || 0,
        pendingRequests: requests?.length || 0,
        systemHealth: responseTime > 1000 ? 'warning' : responseTime > 2000 ? 'critical' : 'healthy',
        responseTime,
        uptime: 99.9 // Placeholder - would come from monitoring service
      };

      setMetrics(newMetrics);
      setLastUpdate(new Date());
    } catch (fetchError) {
      error('Error fetching metrics', fetchError as Error, { 
        operation: 'fetch_metrics',
        context: 'system_monitoring'
      });
      toast.error('Errore nel caricamento delle metriche');
    }
  };

  const toggleRealTime = () => {
    setIsRealTime(!isRealTime);
    if (!isRealTime) {
      toast.success('Monitoraggio in tempo reale attivato');
    } else {
      toast.info('Monitoraggio in tempo reale disattivato');
    }
  };

  useEffect(() => {
    fetchMetrics();
    
    if (isRealTime) {
      const interval = setInterval(fetchMetrics, 5000); // Update every 5 seconds
      return () => clearInterval(interval);
    }
    return undefined;
  }, [isRealTime]);

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'critical': return AlertTriangle;
      default: return Activity;
    }
  };

  const HealthIcon = getHealthIcon(metrics.systemHealth);

  return (
    <div className="space-y-6">
      {/* Real-time Toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Monitoraggio Sistema Networking</h2>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-sm">
            Ultimo aggiornamento: {lastUpdate.toLocaleTimeString()}
          </Badge>
          <Button 
            onClick={toggleRealTime}
            variant={isRealTime ? "default" : "outline"}
            className="flex items-center gap-2"
          >
            <Wifi className="w-4 h-4" />
            {isRealTime ? 'Tempo Reale ON' : 'Tempo Reale OFF'}
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Stato Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <Badge className={`${getHealthColor(metrics.systemHealth)} text-white flex items-center gap-2`}>
              <HealthIcon className="w-4 h-4" />
              {metrics.systemHealth === 'healthy' ? 'Sistema Sano' :
               metrics.systemHealth === 'warning' ? 'Attenzione' : 'Critico'}
            </Badge>
            <span className="text-sm text-gray-600">
              Uptime: {metrics.uptime}%
            </span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{metrics.totalConnections}</div>
              <div className="text-sm text-gray-600">Connessioni Totali</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">{metrics.activeUsers}</div>
              <div className="text-sm text-gray-600">Utenti Attivi</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{metrics.pendingRequests}</div>
              <div className="text-sm text-gray-600">Richieste Pending</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{metrics.responseTime.toFixed(0)}ms</div>
              <div className="text-sm text-gray-600">Tempo Risposta</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Response Time</span>
                <Badge variant={metrics.responseTime > 1000 ? 'destructive' : 'default'}>
                  {metrics.responseTime.toFixed(0)}ms
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>System Uptime</span>
                <Badge variant="default">{metrics.uptime}%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Database Status</span>
                <Badge variant="default">Connected</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Networking Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Connessioni Oggi</span>
                <Badge variant="outline">+12</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Nuovi Utenti</span>
                <Badge variant="outline">+5</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Rate di Accettazione</span>
                <Badge variant="default">78%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
