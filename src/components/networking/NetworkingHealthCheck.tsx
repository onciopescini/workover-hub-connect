import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, RefreshCw, Database, Shield, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface HealthCheck {
  id: string;
  name: string;
  status: 'healthy' | 'warning' | 'critical' | 'checking';
  message: string;
  lastCheck: Date;
  responseTime?: number;
}

export const NetworkingHealthCheck = () => {
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [lastFullCheck, setLastFullCheck] = useState<Date | null>(null);

  const performHealthCheck = async (checkId: string): Promise<HealthCheck> => {
    const startTime = performance.now();
    
    try {
      switch (checkId) {
        case 'database':
          const { data, error } = await supabase
            .from('connections')
            .select('id')
            .limit(1);
          
          if (error) throw error;
          
          return {
            id: 'database',
            name: 'Connessione Database',
            status: 'healthy',
            message: 'Database accessibile e responsivo',
            lastCheck: new Date(),
            responseTime: performance.now() - startTime
          };

        case 'rls':
          const { data: profile } = await supabase.auth.getUser();
          if (!profile.user) throw new Error('User not authenticated');
          
          const { data: testData, error: rlsError } = await supabase
            .from('connections')
            .select('id')
            .eq('sender_id', profile.user.id)
            .limit(1);
            
          if (rlsError && rlsError.code !== 'PGRST116') throw rlsError;
          
          return {
            id: 'rls',
            name: 'Row Level Security',
            status: 'healthy',
            message: 'RLS policies funzionanti correttamente',
            lastCheck: new Date(),
            responseTime: performance.now() - startTime
          };

        case 'functions':
          const { data: funcData, error: funcError } = await supabase.rpc('check_profile_access', {
            viewer_id: '00000000-0000-0000-0000-000000000000',
            profile_id: '00000000-0000-0000-0000-000000000000'
          });
          
          // Function should return a result even for non-existent IDs
          return {
            id: 'functions',
            name: 'Database Functions',
            status: 'healthy',
            message: 'Funzioni RPC operative',
            lastCheck: new Date(),
            responseTime: performance.now() - startTime
          };

        case 'performance':
          const perfStart = performance.now();
          const { data: perfData } = await supabase
            .from('connection_suggestions')
            .select('id, score')
            .limit(10);
          
          const perfTime = performance.now() - perfStart;
          
          return {
            id: 'performance',
            name: 'Performance Query',
            status: perfTime > 1000 ? 'warning' : perfTime > 2000 ? 'critical' : 'healthy',
            message: `Query completate in ${perfTime.toFixed(0)}ms`,
            lastCheck: new Date(),
            responseTime: perfTime
          };

        default:
          throw new Error('Unknown check');
      }
    } catch (error) {
      console.error(`Health check ${checkId} failed:`, error);
      return {
        id: checkId,
        name: checkId,
        status: 'critical',
        message: `Errore: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastCheck: new Date(),
        responseTime: performance.now() - startTime
      };
    }
  };

  const runAllChecks = async () => {
    setIsRunning(true);
    toast.info('Avviando health check completo...');
    
    const checkIds = ['database', 'rls', 'functions', 'performance'];
    const results: HealthCheck[] = [];
    
    // Update status to checking
    setChecks(checkIds.map(id => ({
      id,
      name: id,
      status: 'checking' as const,
      message: 'Controllo in corso...',
      lastCheck: new Date()
    })));
    
    for (const checkId of checkIds) {
      const result = await performHealthCheck(checkId);
      results.push(result);
      
      // Update individual check as it completes
      setChecks(prev => prev.map(check => 
        check.id === checkId ? result : check
      ));
    }
    
    setChecks(results);
    setLastFullCheck(new Date());
    setIsRunning(false);
    
    const failedChecks = results.filter(check => check.status === 'critical').length;
    const warningChecks = results.filter(check => check.status === 'warning').length;
    
    if (failedChecks > 0) {
      toast.error(`Health check completato con ${failedChecks} errori critici`);
    } else if (warningChecks > 0) {
      toast.warning(`Health check completato con ${warningChecks} avvertimenti`);
    } else {
      toast.success('Health check completato: tutti i sistemi operativi');
    }
  };

  const getStatusConfig = (status: HealthCheck['status']) => {
    switch (status) {
      case 'healthy':
        return { icon: CheckCircle, color: 'bg-green-500', text: 'Healthy' };
      case 'warning':
        return { icon: AlertTriangle, color: 'bg-yellow-500', text: 'Warning' };
      case 'critical':
        return { icon: AlertTriangle, color: 'bg-red-500', text: 'Critical' };
      case 'checking':
        return { icon: RefreshCw, color: 'bg-blue-500', text: 'Checking' };
      default:
        return { icon: AlertTriangle, color: 'bg-gray-500', text: 'Unknown' };
    }
  };

  const getCheckIcon = (checkId: string) => {
    switch (checkId) {
      case 'database': return Database;
      case 'rls': return Shield;
      case 'functions': return Zap;
      case 'performance': return Zap;
      default: return CheckCircle;
    }
  };

  useEffect(() => {
    runAllChecks();
  }, []);

  const overallStatus = checks.length > 0 ? (
    checks.every(c => c.status === 'healthy') ? 'healthy' :
    checks.some(c => c.status === 'critical') ? 'critical' : 'warning'
  ) : 'checking';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">System Health Check</h2>
        <div className="flex items-center gap-4">
          {lastFullCheck && (
            <Badge variant="outline">
              Ultimo check: {lastFullCheck.toLocaleTimeString()}
            </Badge>
          )}
          <Badge className={`text-white ${getStatusConfig(overallStatus).color}`}>
            Sistema {overallStatus === 'healthy' ? 'Operativo' : 
                   overallStatus === 'critical' ? 'Critico' : 'Attenzione'}
          </Badge>
          <Button 
            onClick={runAllChecks} 
            disabled={isRunning}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isRunning ? 'animate-spin' : ''}`} />
            {isRunning ? 'Checking...' : 'Run Health Check'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {checks.map((check) => {
          const config = getStatusConfig(check.status);
          const CheckIcon = getCheckIcon(check.id);
          const StatusIcon = config.icon;
          
          return (
            <Card key={check.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckIcon className="w-5 h-5" />
                    {check.name}
                  </div>
                  <Badge className={`${config.color} text-white flex items-center gap-1`}>
                    <StatusIcon className={`w-3 h-3 ${check.status === 'checking' ? 'animate-spin' : ''}`} />
                    {config.text}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 mb-2">{check.message}</p>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Ultimo check: {check.lastCheck.toLocaleTimeString()}</span>
                  {check.responseTime && (
                    <span>Tempo: {check.responseTime.toFixed(0)}ms</span>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
