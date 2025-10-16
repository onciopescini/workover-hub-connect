import React, { useState, useEffect } from 'react';
import { TIME_CONSTANTS } from "@/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Briefcase, Building2, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/auth/useAuth";
import { toast } from "sonner";
import { sreLogger } from '@/lib/sre-logger';

interface ProfessionStats {
  profession: string;
  count: number;
  percentage: number;
}

interface WhoWorksHereProps {
  spaceId: string;
  className?: string;
}

export function WhoWorksHere({ spaceId, className = "" }: WhoWorksHereProps) {
  const { authState } = useAuth();
  const [professionStats, setProfessionStats] = useState<ProfessionStats[]>([]);
  const [totalWorkers, setTotalWorkers] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (spaceId) {
      fetchWorkerStats();
    }
  }, [spaceId]);

  const fetchWorkerStats = async () => {
    try {
      setIsLoading(true);
      
      // Fetch aggregated statistics about workers (no personal info)
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          user_id,
          profiles:user_id (
            profession
          )
        `)
        .eq('space_id', spaceId)
        .eq('status', 'confirmed')
        .gte('booking_date', new Date(Date.now() - TIME_CONSTANTS.COWORKER_ACTIVITY_WINDOW).toISOString()); // Last 90 days

      if (error) throw error;

      // Count unique users
      const uniqueUsers = new Set(data?.map(b => b.user_id) || []);
      setTotalWorkers(uniqueUsers.size);

      // Group by profession
      const professionMap = new Map<string, number>();
      
      data?.forEach((booking) => {
        const profession = booking.profiles?.profession || 'Non specificato';
        professionMap.set(profession, (professionMap.get(profession) || 0) + 1);
      });

      // Convert to stats array with percentages
      const totalBookings = data?.length || 0;
      const stats = Array.from(professionMap.entries())
        .map(([profession, count]) => ({
          profession,
          count,
          percentage: totalBookings > 0 ? Math.round((count / totalBookings) * 100) : 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // Top 5 professions

      setProfessionStats(stats);
    } catch (error) {
      sreLogger.error('Error fetching worker stats', { spaceId }, error as Error);
      toast.error('Errore nel caricamento delle statistiche');
    } finally {
      setIsLoading(false);
    }
  };


  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Tipologia Lavoratori
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (totalWorkers === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Tipologia Lavoratori
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">
              Nessun lavoratore recente in questo spazio
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Le statistiche appariranno dopo le prime prenotazioni
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="w-5 h-5" />
          Tipologia Lavoratori
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Statistiche basate sugli ultimi 90 giorni
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total Workers Summary */}
        <div className="flex items-center gap-4 p-4 rounded-lg bg-primary/5 border border-primary/10">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="text-2xl font-bold text-primary">{totalWorkers}</div>
            <div className="text-sm text-muted-foreground">
              {totalWorkers === 1 ? 'Lavoratore unico' : 'Lavoratori unici'}
            </div>
          </div>
        </div>

        {/* Profession Distribution */}
        {professionStats.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="w-4 h-4" />
              Distribuzione per professione
            </div>
            
            {professionStats.map((stat, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{stat.profession}</span>
                  <span className="text-muted-foreground">{stat.percentage}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-primary h-full rounded-full transition-all duration-500"
                    style={{ width: `${stat.percentage}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground">
                  {stat.count} {stat.count === 1 ? 'prenotazione' : 'prenotazioni'}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Privacy Notice */}
        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground text-center">
            Le statistiche sono aggregate per proteggere la privacy dei lavoratori
          </p>
        </div>
      </CardContent>
    </Card>
  );
}